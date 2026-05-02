"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import CustomerMainNavbar from "@/components/CustomerMainNavbar";
import { CUSTOMIZATION_TYPE_OPTIONS } from "@/lib/customization";
import Editor3DWrapper from "@/modules/components/Editor3DWrapper";

function formatCurrency(value) {
  if (!value) return "-";
  return `$${Number(value).toLocaleString()}`;
}

function NewCustomOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const productIdParam = searchParams.get("productId");
  const manufacturerIdParam = searchParams.get("manufacturerId");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    quantity: 1,
    materialPreferences: [],
    colorSpecifications: [],
    deadline: "",
    specialRequirements: "",
    budget: "",
    requestedCustomizationTypes: [],
    customizationDetails: "",
  });

  const [sourceContext, setSourceContext] = useState({
    isLoading: false,
    error: "",
    sourceType: "general_custom",
    sourceProductId: "",
    sourceManufacturerId: "",
    product: null,
    manufacturer: null,
    allowedCustomizationTypes: [],
    minCustomizationQuantity: null,
    capabilityNotes: "",
  });

  const [model3D, setModel3D] = useState(null);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [baseModelUrl, setBaseModelUrl] = useState(null);

  const customizationChoices = useMemo(() => {
    const allowed = sourceContext.allowedCustomizationTypes;
    if (
      sourceContext.sourceType === "product_customization" &&
      Array.isArray(allowed) &&
      allowed.length > 0
    ) {
      return CUSTOMIZATION_TYPE_OPTIONS.filter((type) =>
        allowed.includes(type.id),
      );
    }
    return CUSTOMIZATION_TYPE_OPTIONS;
  }, [sourceContext.allowedCustomizationTypes, sourceContext.sourceType]);

  const loadSourceContext = useCallback(async () => {
    if (!productIdParam && !manufacturerIdParam) {
      setSourceContext((prev) => ({ ...prev, isLoading: false, error: "" }));
      return;
    }
    setSourceContext((prev) => ({ ...prev, isLoading: true, error: "" }));
    try {
      if (productIdParam) {
        const productRes = await fetch(
          `/api/products/${productIdParam}/public`,
          { cache: "no-store" },
        );
        const productData = await productRes.json();
        if (!productRes.ok || !productData.success || !productData.product) {
          throw new Error(
            productData.error || "Unable to load selected product",
          );
        }
        const product = productData.product;
        const productManufacturer = product.manufacturerId || null;
        const productManufacturerId = productManufacturer?._id || "";
        if (!product.customizationOptions) {
          throw new Error(
            "This product does not currently support customization requests.",
          );
        }
        if (
          manufacturerIdParam &&
          productManufacturerId &&
          manufacturerIdParam !== String(productManufacturerId)
        ) {
          throw new Error(
            "Selected manufacturer does not match the selected product.",
          );
        }
        const allowedTypes =
          product.customizationCapabilities?.allowedTypes || [];
        const minCustomizationQuantity =
          product.customizationCapabilities?.minCustomizationQuantity ||
          product.moq ||
          null;
        setSourceContext({
          isLoading: false,
          error: "",
          sourceType: "product_customization",
          sourceProductId: product._id,
          sourceManufacturerId: String(productManufacturerId || ""),
          product,
          manufacturer: productManufacturer,
          allowedCustomizationTypes: allowedTypes,
          minCustomizationQuantity,
          capabilityNotes: product.customizationCapabilities?.notes || "",
        });
        setFormData((prev) => ({
          ...prev,
          title: prev.title || `${product.name} Customization Request`,
          quantity:
            minCustomizationQuantity &&
            Number(prev.quantity) < minCustomizationQuantity
              ? minCustomizationQuantity
              : prev.quantity,
        }));
        return;
      }
      if (manufacturerIdParam) {
        const manufacturerRes = await fetch(
          `/api/manufacturers/${manufacturerIdParam}`,
          { cache: "no-store" },
        );
        const manufacturerData = await manufacturerRes.json();
        if (
          !manufacturerRes.ok ||
          !manufacturerData.success ||
          !manufacturerData.manufacturer
        ) {
          throw new Error(
            manufacturerData.error || "Unable to load selected manufacturer",
          );
        }
        setSourceContext({
          isLoading: false,
          error: "",
          sourceType: "manufacturer_direct",
          sourceProductId: "",
          sourceManufacturerId: String(manufacturerData.manufacturer._id),
          product: null,
          manufacturer: manufacturerData.manufacturer,
          allowedCustomizationTypes: [],
          minCustomizationQuantity: null,
          capabilityNotes: "",
        });
        setFormData((prev) => ({
          ...prev,
          title:
            prev.title ||
            `${manufacturerData.manufacturer.businessName || manufacturerData.manufacturer.name} Custom Request`,
        }));
      }
    } catch (error) {
      setSourceContext((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || "Failed to load source context",
      }));
    }
  }, [manufacturerIdParam, productIdParam]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "customer")
      loadSourceContext();
  }, [loadSourceContext, session?.user?.role, status]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleArrayInput = (e, field) => {
    const array = e.target.value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    setFormData((prev) => ({ ...prev, [field]: array }));
  };

  const toggleCustomizationType = (typeId) => {
    setFormData((prev) => {
      const alreadySelected = prev.requestedCustomizationTypes.includes(typeId);
      return {
        ...prev,
        requestedCustomizationTypes: alreadySelected
          ? prev.requestedCustomizationTypes.filter((type) => type !== typeId)
          : [...prev.requestedCustomizationTypes, typeId],
      };
    });
  };

  const handle3DUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("type", "3d-model");
      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadData,
      });
      const data = await response.json();
      if (data.success) {
        setBaseModelUrl(data.file.url);
        setModel3D(data.file);
        setIsEditorOpen(true);
      } else alert("Upload failed: " + data.error);
    } catch (error) {
      alert("Upload error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEditorSave = async (savedData) => {
    try {
      const response = await fetch("/api/upload/3d-annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalUrl: baseModelUrl,
          annotations: savedData.annotations,
          cameraState: savedData.cameraState,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setModel3D((prev) => ({
          ...prev,
          url: data.file.url,
          annotations: savedData.annotations,
          cameraState: savedData.cameraState,
        }));
        setIsEditorOpen(false);
      } else {
        alert("Failed to save annotations: " + data.error);
      }
    } catch (error) {
      alert("Error saving 3D model: " + error.message);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploadData = new FormData();
      files.forEach((file) => uploadData.append("files", file));
      uploadData.append("folder", "images");
      const response = await fetch("/api/upload/multiple", {
        method: "POST",
        body: uploadData,
      });
      const data = await response.json();
      if (data.success) setImages((prev) => [...prev, ...data.files]);
      else alert("Upload failed: " + data.error);
    } catch (error) {
      alert("Upload error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sourceContext.error) {
      alert(sourceContext.error);
      return;
    }
    const quantity = Number(formData.quantity);
    if (sourceContext.sourceType === "product_customization") {
      if (!formData.requestedCustomizationTypes.length) {
        alert("Please select at least one requested customization type.");
        return;
      }
      if (
        sourceContext.minCustomizationQuantity &&
        quantity < sourceContext.minCustomizationQuantity
      ) {
        alert(
          `Minimum customization quantity is ${sourceContext.minCustomizationQuantity}.`,
        );
        return;
      }
    }
    setLoading(true);
    try {
      const response = await fetch("/api/custom-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          model3D,
          images,
          status: "draft",
          budget: formData.budget ? Number(formData.budget) : undefined,
          quantity,
          sourceType: sourceContext.sourceType,
          sourceProductId: sourceContext.sourceProductId || undefined,
          sourceManufacturerId: sourceContext.sourceManufacturerId || undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        alert("Custom order created!");
        router.push(`/custom-orders/${data.order._id}/review`);
      } else alert("Error: " + data.error);
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#eb9728]/40 focus:bg-white/[0.06] transition-all";
  const labelClass =
    "block text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 mb-2";

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-[#eb9728] animate-spin" />
          <GlobalLoader text="Loading..." />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  if (session?.user?.role !== "customer") {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-red-400/40 block mb-3">
            lock
          </span>
          <p className="text-sm text-white/40">
            Access denied. Customers only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <CustomerMainNavbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728] mb-1">
            New Request
          </p>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Create Custom Order
          </h1>
        </div>

        {/* Source Context Loading */}
        {sourceContext.isLoading && (
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-blue-500/20 bg-blue-500/8">
            <div className="h-4 w-4 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin shrink-0" />
            <GlobalLoader text="Loading product/manufacturer details..." />
          </div>
        )}

        {/* Source Context Error */}
        {sourceContext.error && (
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-red-500/20 bg-red-500/8">
            <span className="material-symbols-outlined text-[16px] text-red-400 shrink-0 mt-0.5">
              error
            </span>
            <p className="text-sm text-red-400">{sourceContext.error}</p>
          </div>
        )}

        {/* Request Context Card */}
        {!sourceContext.error &&
          sourceContext.sourceType !== "general_custom" && (
            <div className="rounded-2xl border border-[#eb9728]/20 bg-[#eb9728]/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-[#eb9728]/15">
                <h2 className="text-sm font-bold text-[#eb9728] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">
                    link
                  </span>
                  Request Context
                </h2>
              </div>
              <div className="px-6 py-4 space-y-3">
                {sourceContext.sourceType === "product_customization" &&
                  sourceContext.product && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          {
                            label: "Product",
                            value: sourceContext.product.name,
                            icon: "inventory_2",
                          },
                          {
                            label: "Manufacturer",
                            value:
                              sourceContext.manufacturer?.businessName ||
                              sourceContext.manufacturer?.name ||
                              "Unknown",
                            icon: "factory",
                          },
                          {
                            label: "Product Price",
                            value: formatCurrency(sourceContext.product.price),
                            icon: "payments",
                          },
                          sourceContext.minCustomizationQuantity && {
                            label: "Min Custom Qty",
                            value: sourceContext.minCustomizationQuantity,
                            icon: "numbers",
                          },
                        ]
                          .filter(Boolean)
                          .map((item) => (
                            <div
                              key={item.label}
                              className="rounded-xl border border-[#eb9728]/15 bg-[#eb9728]/5 p-3"
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="material-symbols-outlined text-[12px] text-[#eb9728]/60">
                                  {item.icon}
                                </span>
                                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#eb9728]/60">
                                  {item.label}
                                </p>
                              </div>
                              <p className="text-sm font-bold text-[#eb9728]/90">
                                {item.value}
                              </p>
                            </div>
                          ))}
                      </div>
                      {sourceContext.capabilityNotes && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-[#eb9728]/15 bg-[#eb9728]/5">
                          <span className="material-symbols-outlined text-[14px] text-[#eb9728]/60 shrink-0 mt-0.5">
                            note
                          </span>
                          <p className="text-[11px] text-[#eb9728]/70 leading-relaxed">
                            <span className="font-bold">
                              Manufacturer Notes:{" "}
                            </span>
                            {sourceContext.capabilityNotes}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                {sourceContext.sourceType === "manufacturer_direct" &&
                  sourceContext.manufacturer && (
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-[#eb9728]/15 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[16px] text-[#eb9728]">
                          factory
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#eb9728]/90">
                          {sourceContext.manufacturer.businessName ||
                            sourceContext.manufacturer.name}
                        </p>
                        <p className="text-[11px] text-[#eb9728]/50 mt-0.5">
                          This request will default to a direct RFQ flow unless
                          you choose to broadcast later.
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <div className="rounded-2xl border border-white/8 bg-[#0c0c11] p-6 space-y-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#eb9728]">
                info
              </span>
              Basic Information
            </h2>

            <div>
              <label className={labelClass}>Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Enter order title"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Describe your order in detail..."
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Quantity *</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  min={sourceContext.minCustomizationQuantity || 1}
                  required
                  className={inputClass}
                />
                {sourceContext.minCustomizationQuantity && (
                  <p className="text-[11px] text-white/25 mt-1.5">
                    Minimum: {sourceContext.minCustomizationQuantity}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Budget ($)</label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  min="0"
                  placeholder="Optional"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Deadline</label>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className={`${inputClass} [color-scheme:dark]`}
              />
            </div>
          </div>

          {/* Customization */}
          <div className="rounded-2xl border border-white/8 bg-[#0c0c11] p-6 space-y-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#eb9728]">
                tune
              </span>
              Customization
              {sourceContext.sourceType === "product_customization" && (
                <span className="text-[10px] font-bold text-red-400 ml-1">
                  *required
                </span>
              )}
            </h2>

            <div>
              <label className={labelClass}>
                Requested Customization Types
                {sourceContext.sourceType === "product_customization"
                  ? " *"
                  : ""}
              </label>
              <div className="flex flex-wrap gap-2">
                {customizationChoices.map((type) => {
                  const isSelected =
                    formData.requestedCustomizationTypes.includes(type.id);
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => toggleCustomizationType(type.id)}
                      title={type.description}
                      className={`px-3 py-1.5 text-[11px] font-bold rounded-full border transition-all ${
                        isSelected
                          ? "bg-[#eb9728]/15 border-[#eb9728]/40 text-[#eb9728]"
                          : "bg-white/[0.04] border-white/10 text-white/50 hover:border-white/25 hover:text-white/70"
                      }`}
                    >
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className={labelClass}>Customization Details</label>
              <textarea
                name="customizationDetails"
                value={formData.customizationDetails}
                onChange={handleChange}
                rows={4}
                placeholder="Mention logo specs, dimensions to change, finishes, packaging text, etc."
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          {/* Specifications */}
          <div className="rounded-2xl border border-white/8 bg-[#0c0c11] p-6 space-y-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#eb9728]">
                category
              </span>
              Specifications
            </h2>

            <div>
              <label className={labelClass}>Material Preferences</label>
              <input
                type="text"
                placeholder="Aluminum, Steel, Plastic"
                onChange={(e) => handleArrayInput(e, "materialPreferences")}
                className={inputClass}
              />
              <p className="text-[11px] text-white/25 mt-1.5">
                Separate multiple materials with commas
              </p>
            </div>

            <div>
              <label className={labelClass}>Color Specifications</label>
              <input
                type="text"
                placeholder="Black, White, Silver"
                onChange={(e) => handleArrayInput(e, "colorSpecifications")}
                className={inputClass}
              />
              <p className="text-[11px] text-white/25 mt-1.5">
                Separate multiple colors with commas
              </p>
            </div>

            <div>
              <label className={labelClass}>Special Requirements</label>
              <textarea
                name="specialRequirements"
                value={formData.specialRequirements}
                onChange={handleChange}
                rows={4}
                placeholder="Any special requirements or notes..."
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          {/* Attachments */}
          <div className="rounded-2xl border border-white/8 bg-[#0c0c11] p-6 space-y-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#eb9728]">
                attach_file
              </span>
              Attachments
            </h2>

            {/* 3D Model */}
            <div>
              <label className={labelClass}>3D Model</label>
              
              {!model3D ? (
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 cursor-pointer hover:border-[#eb9728]/30 hover:bg-white/[0.04] transition-all group">
                  <span className="material-symbols-outlined text-3xl text-white/20 group-hover:text-[#eb9728]/50 transition-colors">
                    view_in_ar
                  </span>
                  <p className="text-sm text-white/40 group-hover:text-white/60 transition-colors">
                    Click to upload 3D model
                  </p>
                  <p className="text-[11px] text-white/20">
                    .stl, .obj, .gltf, .glb
                  </p>
                  <input
                    type="file"
                    accept=".stl,.obj,.gltf,.glb"
                    onChange={handle3DUpload}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="rounded-xl border border-white/8 bg-[#0c0c11] overflow-hidden">
                  <div className="p-4 border-b border-white/8 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[15px] text-emerald-400">
                        check_circle
                      </span>
                      <p className="text-[11px] font-semibold text-emerald-400">
                        {model3D.filename || "Model Uploaded"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditorOpen(true)}
                      className="px-3 py-1.5 text-xs font-bold text-[#eb9728] bg-[#eb9728]/10 rounded-lg hover:bg-[#eb9728]/20 transition-colors"
                    >
                      Edit 3D Model
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="rounded-xl overflow-hidden border border-white/8 bg-white/[0.02]">
                      <Editor3DWrapper
                        modelUrl={model3D.url}
                        initialAnnotations={model3D.annotations}
                        initialCameraState={model3D.cameraState}
                        readOnly={true}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Images */}
            <div>
              <label className={labelClass}>Reference Images</label>
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 cursor-pointer hover:border-[#eb9728]/30 hover:bg-white/[0.04] transition-all group">
                <span className="material-symbols-outlined text-3xl text-white/20 group-hover:text-[#eb9728]/50 transition-colors">
                  image
                </span>
                <p className="text-sm text-white/40 group-hover:text-white/60 transition-colors">
                  Click to upload images
                </p>
                <p className="text-[11px] text-white/20">
                  .jpg, .jpeg, .png, .webp — multiple allowed
                </p>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              {images.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/8"
                    >
                      <span className="material-symbols-outlined text-[15px] text-emerald-400">
                        check_circle
                      </span>
                      <p className="text-[11px] font-semibold text-emerald-400">
                        {img.filename}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Uploading indicator */}
            {uploading && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#eb9728]/20 bg-[#eb9728]/8">
                <div className="h-4 w-4 rounded-full border-2 border-[#eb9728]/30 border-t-[#eb9728] animate-spin shrink-0" />
                <p className="text-[11px] font-semibold text-[#eb9728]">
                  Uploading files...
                </p>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || uploading || sourceContext.isLoading}
            className="w-full py-3.5 rounded-xl bg-[#eb9728] text-white text-sm font-bold hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_8px_24px_rgba(235,151,40,0.2)] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">
                  add_circle
                </span>
                Create Custom Order
              </>
            )}
          </button>
        </form>
      </main>
      {isEditorOpen && baseModelUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-6xl max-h-[90vh] bg-[#0c0c11] rounded-[24px] border border-white/10 overflow-hidden flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-white/10 bg-white/[0.02]">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#eb9728]">
                  view_in_ar
                </span>
                Edit 3D Model
              </h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <Editor3DWrapper
                modelUrl={baseModelUrl}
                initialAnnotations={model3D?.annotations}
                initialCameraState={model3D?.cameraState}
                onSave={handleEditorSave}
                onCancel={() => setIsEditorOpen(false)}
                readOnly={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewCustomOrder() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050507] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-[#eb9728] animate-spin" />
            <GlobalLoader text="Loading..." />
          </div>
        </div>
      }
    >
      <NewCustomOrderContent />
    </Suspense>
  );
}
// "use client";

// import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import { useSession } from "next-auth/react";
// import CustomerMainNavbar from "@/components/CustomerMainNavbar";
// import { CUSTOMIZATION_TYPE_OPTIONS } from "@/lib/customization";

// function formatCurrency(value) {
//   if (!value) return "-";
//   return `$${Number(value).toLocaleString()}`;
// }

// function NewCustomOrderContent() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const { data: session, status } = useSession();

//   const productIdParam = searchParams.get("productId");
//   const manufacturerIdParam = searchParams.get("manufacturerId");

//   const [formData, setFormData] = useState({
//     title: "",
//     description: "",
//     quantity: 1,
//     materialPreferences: [],
//     colorSpecifications: [],
//     deadline: "",
//     specialRequirements: "",
//     budget: "",
//     requestedCustomizationTypes: [],
//     customizationDetails: "",
//   });

//   const [sourceContext, setSourceContext] = useState({
//     isLoading: false,
//     error: "",
//     sourceType: "general_custom",
//     sourceProductId: "",
//     sourceManufacturerId: "",
//     product: null,
//     manufacturer: null,
//     allowedCustomizationTypes: [],
//     minCustomizationQuantity: null,
//     capabilityNotes: "",
//   });

//   const [model3D, setModel3D] = useState(null);
//   const [images, setImages] = useState([]);
//   const [uploading, setUploading] = useState(false);
//   const [loading, setLoading] = useState(false);

//   const customizationChoices = useMemo(() => {
//     const allowed = sourceContext.allowedCustomizationTypes;

//     if (
//       sourceContext.sourceType === "product_customization" &&
//       Array.isArray(allowed) &&
//       allowed.length > 0
//     ) {
//       return CUSTOMIZATION_TYPE_OPTIONS.filter((type) =>
//         allowed.includes(type.id),
//       );
//     }

//     return CUSTOMIZATION_TYPE_OPTIONS;
//   }, [sourceContext.allowedCustomizationTypes, sourceContext.sourceType]);

//   const loadSourceContext = useCallback(async () => {
//     if (!productIdParam && !manufacturerIdParam) {
//       setSourceContext((prev) => ({
//         ...prev,
//         isLoading: false,
//         error: "",
//       }));
//       return;
//     }

//     setSourceContext((prev) => ({
//       ...prev,
//       isLoading: true,
//       error: "",
//     }));

//     try {
//       if (productIdParam) {
//         const productRes = await fetch(
//           `/api/products/${productIdParam}/public`,
//           {
//             cache: "no-store",
//           },
//         );
//         const productData = await productRes.json();

//         if (!productRes.ok || !productData.success || !productData.product) {
//           throw new Error(
//             productData.error || "Unable to load selected product",
//           );
//         }

//         const product = productData.product;
//         const productManufacturer = product.manufacturerId || null;
//         const productManufacturerId = productManufacturer?._id || "";

//         if (!product.customizationOptions) {
//           throw new Error(
//             "This product does not currently support customization requests.",
//           );
//         }

//         if (
//           manufacturerIdParam &&
//           productManufacturerId &&
//           manufacturerIdParam !== String(productManufacturerId)
//         ) {
//           throw new Error(
//             "Selected manufacturer does not match the selected product.",
//           );
//         }

//         const allowedTypes =
//           product.customizationCapabilities?.allowedTypes || [];
//         const minCustomizationQuantity =
//           product.customizationCapabilities?.minCustomizationQuantity ||
//           product.moq ||
//           null;

//         setSourceContext({
//           isLoading: false,
//           error: "",
//           sourceType: "product_customization",
//           sourceProductId: product._id,
//           sourceManufacturerId: String(productManufacturerId || ""),
//           product,
//           manufacturer: productManufacturer,
//           allowedCustomizationTypes: allowedTypes,
//           minCustomizationQuantity,
//           capabilityNotes: product.customizationCapabilities?.notes || "",
//         });

//         setFormData((prev) => ({
//           ...prev,
//           title: prev.title || `${product.name} Customization Request`,
//           quantity:
//             minCustomizationQuantity &&
//             Number(prev.quantity) < minCustomizationQuantity
//               ? minCustomizationQuantity
//               : prev.quantity,
//         }));

//         return;
//       }

//       if (manufacturerIdParam) {
//         const manufacturerRes = await fetch(
//           `/api/manufacturers/${manufacturerIdParam}`,
//           { cache: "no-store" },
//         );
//         const manufacturerData = await manufacturerRes.json();

//         if (
//           !manufacturerRes.ok ||
//           !manufacturerData.success ||
//           !manufacturerData.manufacturer
//         ) {
//           throw new Error(
//             manufacturerData.error || "Unable to load selected manufacturer",
//           );
//         }

//         setSourceContext({
//           isLoading: false,
//           error: "",
//           sourceType: "manufacturer_direct",
//           sourceProductId: "",
//           sourceManufacturerId: String(manufacturerData.manufacturer._id),
//           product: null,
//           manufacturer: manufacturerData.manufacturer,
//           allowedCustomizationTypes: [],
//           minCustomizationQuantity: null,
//           capabilityNotes: "",
//         });

//         setFormData((prev) => ({
//           ...prev,
//           title:
//             prev.title ||
//             `${manufacturerData.manufacturer.businessName || manufacturerData.manufacturer.name} Custom Request`,
//         }));
//       }
//     } catch (error) {
//       setSourceContext((prev) => ({
//         ...prev,
//         isLoading: false,
//         error: error.message || "Failed to load source context",
//       }));
//     }
//   }, [manufacturerIdParam, productIdParam]);

//   useEffect(() => {
//     if (status === "authenticated" && session?.user?.role === "customer") {
//       loadSourceContext();
//     }
//   }, [loadSourceContext, session?.user?.role, status]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//   };

//   const handleArrayInput = (e, field) => {
//     const value = e.target.value;
//     const array = value
//       .split(",")
//       .map((item) => item.trim())
//       .filter(Boolean);
//     setFormData((prev) => ({
//       ...prev,
//       [field]: array,
//     }));
//   };

//   const toggleCustomizationType = (typeId) => {
//     setFormData((prev) => {
//       const alreadySelected = prev.requestedCustomizationTypes.includes(typeId);
//       return {
//         ...prev,
//         requestedCustomizationTypes: alreadySelected
//           ? prev.requestedCustomizationTypes.filter((type) => type !== typeId)
//           : [...prev.requestedCustomizationTypes, typeId],
//       };
//     });
//   };

//   const handle3DUpload = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     setUploading(true);

//     try {
//       const uploadData = new FormData();
//       uploadData.append("file", file);
//       uploadData.append("type", "3d-model");

//       const response = await fetch("/api/upload", {
//         method: "POST",
//         body: uploadData,
//       });

//       const data = await response.json();

//       if (data.success) {
//         setModel3D(data.file);
//       } else {
//         alert("Upload failed: " + data.error);
//       }
//     } catch (error) {
//       alert("Upload error: " + error.message);
//     } finally {
//       setUploading(false);
//     }
//   };

//   const handleImageUpload = async (e) => {
//     const files = Array.from(e.target.files || []);
//     if (!files.length) return;

//     setUploading(true);

//     try {
//       const uploadData = new FormData();
//       files.forEach((file) => uploadData.append("files", file));
//       uploadData.append("folder", "images");

//       const response = await fetch("/api/upload/multiple", {
//         method: "POST",
//         body: uploadData,
//       });

//       const data = await response.json();

//       if (data.success) {
//         setImages((prev) => [...prev, ...data.files]);
//       } else {
//         alert("Upload failed: " + data.error);
//       }
//     } catch (error) {
//       alert("Upload error: " + error.message);
//     } finally {
//       setUploading(false);
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (sourceContext.error) {
//       alert(sourceContext.error);
//       return;
//     }

//     const quantity = Number(formData.quantity);

//     if (sourceContext.sourceType === "product_customization") {
//       if (!formData.requestedCustomizationTypes.length) {
//         alert("Please select at least one requested customization type.");
//         return;
//       }

//       if (
//         sourceContext.minCustomizationQuantity &&
//         quantity < sourceContext.minCustomizationQuantity
//       ) {
//         alert(
//           `Minimum customization quantity is ${sourceContext.minCustomizationQuantity}.`,
//         );
//         return;
//       }
//     }

//     setLoading(true);

//     try {
//       const response = await fetch("/api/custom-orders", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           ...formData,
//           model3D,
//           images,
//           status: "draft",
//           budget: formData.budget ? Number(formData.budget) : undefined,
//           quantity,
//           sourceType: sourceContext.sourceType,
//           sourceProductId: sourceContext.sourceProductId || undefined,
//           sourceManufacturerId: sourceContext.sourceManufacturerId || undefined,
//         }),
//       });

//       const data = await response.json();

//       if (data.success) {
//         alert("Custom order created!");
//         router.push(`/custom-orders/${data.order._id}/review`);
//       } else {
//         alert("Error: " + data.error);
//       }
//     } catch (error) {
//       alert("Error: " + error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (status === "loading") return <GlobalLoader fullScreen text="Loading..." />;

//   if (status === "unauthenticated") {
//     router.push("/auth/login");
//     return <div>Redirecting to login...</div>;
//   }

//   if (session?.user?.role !== "customer") {
//     return <div>Access denied. Customers only.</div>;
//   }

//   return (
//     <div className="min-h-screen bg-[#f8f7f6]">
//       <CustomerMainNavbar />
//       <div className="max-w-4xl mx-auto p-6">
//         <h1 className="text-3xl font-bold mb-6">Create Custom Order</h1>

//         {sourceContext.isLoading && (
//           <div className="mb-6 p-4 rounded border border-blue-200 bg-blue-50 text-blue-700">
//             Loading selected product/manufacturer details...
//           </div>
//         )}

//         {sourceContext.error && (
//           <div className="mb-6 p-4 rounded border border-red-200 bg-red-50 text-red-700">
//             {sourceContext.error}
//           </div>
//         )}

//         {!sourceContext.error &&
//           sourceContext.sourceType !== "general_custom" && (
//             <div className="mb-6 bg-white border rounded p-4 space-y-2">
//               <h2 className="font-bold text-lg">Request Context</h2>

//               {sourceContext.sourceType === "product_customization" &&
//                 sourceContext.product && (
//                   <>
//                     <p>
//                       <strong>Product:</strong> {sourceContext.product.name}
//                     </p>
//                     <p>
//                       <strong>Manufacturer:</strong>{" "}
//                       {sourceContext.manufacturer?.businessName ||
//                         sourceContext.manufacturer?.name ||
//                         "Unknown"}
//                     </p>
//                     <p>
//                       <strong>Product Price:</strong>{" "}
//                       {formatCurrency(sourceContext.product.price)}
//                     </p>
//                     {sourceContext.minCustomizationQuantity && (
//                       <p>
//                         <strong>Minimum Custom Quantity:</strong>{" "}
//                         {sourceContext.minCustomizationQuantity}
//                       </p>
//                     )}
//                     {sourceContext.capabilityNotes && (
//                       <p className="text-sm text-gray-700">
//                         <strong>Manufacturer Notes:</strong>{" "}
//                         {sourceContext.capabilityNotes}
//                       </p>
//                     )}
//                   </>
//                 )}

//               {sourceContext.sourceType === "manufacturer_direct" &&
//                 sourceContext.manufacturer && (
//                   <>
//                     <p>
//                       <strong>Manufacturer:</strong>{" "}
//                       {sourceContext.manufacturer.businessName ||
//                         sourceContext.manufacturer.name}
//                     </p>
//                     <p className="text-sm text-gray-600">
//                       This request will default to a direct RFQ flow unless you
//                       choose to broadcast later.
//                     </p>
//                   </>
//                 )}
//             </div>
//           )}

//         <form onSubmit={handleSubmit}>
//           <div className="mb-4">
//             <label className="block mb-2 font-semibold">Title *</label>
//             <input
//               type="text"
//               name="title"
//               value={formData.title}
//               onChange={handleChange}
//               className="w-full border p-2 rounded"
//               required
//             />
//           </div>

//           <div className="mb-4">
//             <label className="block mb-2 font-semibold">Description *</label>
//             <textarea
//               name="description"
//               value={formData.description}
//               onChange={handleChange}
//               className="w-full border p-2 rounded h-24"
//               required
//             />
//           </div>

//           <div className="mb-4">
//             <label className="block mb-2 font-semibold">Quantity *</label>
//             <input
//               type="number"
//               name="quantity"
//               value={formData.quantity}
//               onChange={handleChange}
//               min={sourceContext.minCustomizationQuantity || 1}
//               className="w-full border p-2 rounded"
//               required
//             />
//           </div>

//           <div className="mb-4">
//             <label className="block mb-2 font-semibold">
//               Requested Customization Types
//               {sourceContext.sourceType === "product_customization" ? " *" : ""}
//             </label>
//             <div className="flex flex-wrap gap-2">
//               {customizationChoices.map((type) => {
//                 const isSelected =
//                   formData.requestedCustomizationTypes.includes(type.id);

//                 return (
//                   <button
//                     key={type.id}
//                     type="button"
//                     onClick={() => toggleCustomizationType(type.id)}
//                     className={`px-3 py-1.5 text-sm border rounded-full ${
//                       isSelected
//                         ? "bg-blue-600 text-white border-blue-600"
//                         : "bg-white text-gray-700 border-gray-300"
//                     }`}
//                     title={type.description}
//                   >
//                     {type.label}
//                   </button>
//                 );
//               })}
//             </div>
//           </div>

//           <div className="mb-4">
//             <label className="block mb-2 font-semibold">
//               Customization Details
//             </label>
//             <textarea
//               name="customizationDetails"
//               value={formData.customizationDetails}
//               onChange={handleChange}
//               className="w-full border p-2 rounded h-24"
//               placeholder="Mention logo specs, dimensions to change, finishes, packaging text, etc."
//             />
//           </div>

//           <div className="mb-4">
//             <label className="block mb-2 font-semibold">
//               Material Preferences (comma-separated)
//             </label>
//             <input
//               type="text"
//               placeholder="Aluminum, Steel, Plastic"
//               onChange={(e) => handleArrayInput(e, "materialPreferences")}
//               className="w-full border p-2 rounded"
//             />
//           </div>

//           <div className="mb-4">
//             <label className="block mb-2 font-semibold">
//               Color Specifications (comma-separated)
//             </label>
//             <input
//               type="text"
//               placeholder="Black, White, Silver"
//               onChange={(e) => handleArrayInput(e, "colorSpecifications")}
//               className="w-full border p-2 rounded"
//             />
//           </div>

//           <div className="mb-4">
//             <label className="block mb-2 font-semibold">Deadline</label>
//             <input
//               type="date"
//               name="deadline"
//               value={formData.deadline}
//               onChange={handleChange}
//               className="w-full border p-2 rounded"
//             />
//           </div>

//           <div className="mb-4">
//             <label className="block mb-2 font-semibold">Budget ($)</label>
//             <input
//               type="number"
//               name="budget"
//               value={formData.budget}
//               onChange={handleChange}
//               className="w-full border p-2 rounded"
//               min="0"
//             />
//           </div>

//           <div className="mb-4">
//             <label className="block mb-2 font-semibold">
//               Special Requirements
//             </label>
//             <textarea
//               name="specialRequirements"
//               value={formData.specialRequirements}
//               onChange={handleChange}
//               className="w-full border p-2 rounded h-24"
//             />
//           </div>

//           <div className="mb-4">
//             <label className="block mb-2 font-semibold">Upload 3D Model</label>
//             <input
//               type="file"
//               accept=".stl,.obj,.gltf,.glb"
//               onChange={handle3DUpload}
//               className="w-full border p-2 rounded"
//             />
//             {model3D && (
//               <div className="mt-2 p-2 bg-green-100 rounded">
//                 {model3D.filename} uploaded
//               </div>
//             )}
//           </div>

//           <div className="mb-4">
//             <label className="block mb-2 font-semibold">Upload Images</label>
//             <input
//               type="file"
//               accept=".jpg,.jpeg,.png,.webp"
//               multiple
//               onChange={handleImageUpload}
//               className="w-full border p-2 rounded"
//             />
//             {images.length > 0 && (
//               <div className="mt-2">
//                 {images.map((img, idx) => (
//                   <div key={idx} className="p-2 bg-green-100 rounded mb-1">
//                     {img.filename}
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>

//           {uploading && <p className="text-blue-600">Uploading files...</p>}

//           <button
//             type="submit"
//             disabled={loading || uploading || sourceContext.isLoading}
//             className="w-full px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
//           >
//             {loading ? "Creating..." : "Create Custom Order"}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }

// export default function NewCustomOrder() {
//   return (
//     <Suspense
//       fallback={
//         <div className="min-h-screen bg-[#f8f7f6] flex items-center justify-center">
//           <div className="w-8 h-8 border-2 border-gray-300 border-t-[#eb9728] rounded-full animate-spin" />
//         </div>
//       }
//     >
//       <NewCustomOrderContent />
//     </Suspense>
//   );
// }
