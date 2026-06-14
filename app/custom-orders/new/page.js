"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useToast } from "@/components/ui/ToastProvider";
import CustomerMainNavbar from "@/components/CustomerMainNavbar";
import { CUSTOMIZATION_TYPE_OPTIONS } from "@/lib/customization";
import ModelViewerPreview from "@/modules/components/ModelViewerPreview";
import { uploadFileDirect } from "@/lib/uploadDirect";
import { formatPKR } from "@/lib/currency";

function formatCurrency(value) {
  return formatPKR(value);
}

const MODEL_EXTENSIONS = [".stl", ".obj", ".gltf", ".glb"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_MODEL_SIZE = 50 * 1024 * 1024;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

function getFileExtension(fileName) {
  const idx = fileName.lastIndexOf(".");
  return idx >= 0 ? fileName.slice(idx).toLowerCase() : "";
}

function formatFileSize(bytes) {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(1)}MB`;
}

function NewCustomOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const toast = useToast();

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

  const [pendingModel, setPendingModel] = useState(null);
  const [pendingImages, setPendingImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

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
    const ext = getFileExtension(file.name || "");
    if (!MODEL_EXTENSIONS.includes(ext)) {
      toast.error(
        `Invalid model type. Allowed: ${MODEL_EXTENSIONS.join(", ")}`,
      );
      return;
    }
    if (file.size > MAX_MODEL_SIZE) {
      toast.error(
        `Model too large. Max size is ${formatFileSize(MAX_MODEL_SIZE)}.`,
      );
      return;
    }

    if (pendingModel?.previewUrl) {
      URL.revokeObjectURL(pendingModel.previewUrl);
    }
    const previewUrl = URL.createObjectURL(file);
    setPendingModel({ file, previewUrl });
  };

  const removeModel = () => {
    if (pendingModel?.previewUrl) {
      URL.revokeObjectURL(pendingModel.previewUrl);
    }
    setPendingModel(null);
  };

  const removeImage = (index) => {
    setPendingImages((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validFiles = [];
    for (const file of files) {
      const ext = getFileExtension(file.name || "");
      if (!IMAGE_EXTENSIONS.includes(ext)) {
        toast.error(
          `${file.name} has an invalid type. Allowed: ${IMAGE_EXTENSIONS.join(", ")}`,
        );
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error(
          `${file.name} is too large. Max size is ${formatFileSize(MAX_IMAGE_SIZE)}.`,
        );
        continue;
      }
      validFiles.push({ file, previewUrl: URL.createObjectURL(file) });
    }

    if (validFiles.length) {
      setPendingImages((prev) => [...prev, ...validFiles]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sourceContext.error) {
      toast.error(sourceContext.error);
      return;
    }
    const quantity = Number(formData.quantity);
    if (sourceContext.sourceType === "product_customization") {
      if (!formData.requestedCustomizationTypes.length) {
        toast.error("Please select at least one requested customization type.");
        return;
      }
      if (
        sourceContext.minCustomizationQuantity &&
        quantity < sourceContext.minCustomizationQuantity
      ) {
        toast.error(
          `Minimum customization quantity is ${sourceContext.minCustomizationQuantity}.`,
        );
        return;
      }
    }
    setLoading(true);
    setUploading(true);
    try {
      let uploadedModel = null;
      let uploadedImages = [];

      if (pendingModel?.file) {
        try {
          uploadedModel = await uploadFileDirect(pendingModel.file, "3d-model");
        } catch (error) {
          toast.error("Upload failed: " + error.message);
          return;
        }
      }

      if (pendingImages.length > 0) {
        try {
          for (const item of pendingImages) {
            const data = await uploadFileDirect(item.file, "image");
            uploadedImages.push(data);
          }
        } catch (error) {
          toast.error("Some image uploads failed: " + error.message);
          return;
        }
      }

      const response = await fetch("/api/custom-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          model3D: uploadedModel,
          images: uploadedImages,
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
        toast.success("Custom order created!");
        router.push(`/custom-orders/${data.order._id}/review`);
      } else toast.error("Error: " + data.error);
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setUploading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  const inputClass =
    "w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#eb9728]/40 focus:bg-white/[0.06] transition-all";
  const labelClass =
    "block text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 mb-2";

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <GlobalLoader text="Loading..." />
      </div>
    );
  }



  if (status === "unauthenticated") {
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
          {sourceContext.sourceType === "product_customization" &&
            sourceContext.sourceProductId && (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/customer/products/${sourceContext.sourceProductId}`,
                  )
                }
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold text-white/60 hover:text-white hover:bg-white/10 mb-4 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">
                  arrow_back
                </span>
                Back to Product
              </button>
            )}
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
                      <div className="flex gap-4 items-start mb-4">
                        {sourceContext.product.images?.[0]?.url && (
                          <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#eb9728]/20 shrink-0">
                            <Image
                              src={sourceContext.product.images[0].url}
                              alt={sourceContext.product.name}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="text-sm font-bold text-[#eb9728]/90">
                            {sourceContext.product.name}
                          </h3>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {sourceContext.product.category && (
                              <span className="px-2 py-0.5 rounded border border-[#eb9728]/20 bg-[#eb9728]/10 text-[9px] font-bold text-[#eb9728]/70">
                                {sourceContext.product.category}
                              </span>
                            )}
                            {sourceContext.product.specifications?.material && (
                              <span className="px-2 py-0.5 rounded border border-[#eb9728]/20 bg-[#eb9728]/10 text-[9px] font-bold text-[#eb9728]/70">
                                Material:{" "}
                                {sourceContext.product.specifications.material}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[
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
                      {sourceContext.allowedCustomizationTypes?.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[10px] font-bold uppercase text-[#eb9728]/50 mb-2">
                            Allowed Customizations
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {sourceContext.allowedCustomizationTypes.map(
                              (typeId) => {
                                const label =
                                  customizationChoices.find(
                                    (t) => t.id === typeId,
                                  )?.label || typeId;
                                return (
                                  <span
                                    key={typeId}
                                    className="px-2 py-1 rounded-md border border-[#eb9728]/30 bg-[#eb9728]/10 text-[9px] font-bold text-[#eb9728]/80"
                                  >
                                    {label}
                                  </span>
                                );
                              },
                            )}
                          </div>
                        </div>
                      )}
                      {sourceContext.capabilityNotes && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-[#eb9728]/15 bg-[#eb9728]/5 mt-3">
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
                <label className={labelClass}>Budget (PKR)</label>
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

              {!pendingModel ? (
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 cursor-pointer hover:border-[#eb9728]/30 hover:bg-white/[0.04] transition-all group">
                  <span className="material-symbols-outlined text-3xl text-white/20 group-hover:text-[#eb9728]/50 transition-colors">
                    view_in_ar
                  </span>
                  <p className="text-sm text-white/40 group-hover:text-white/60 transition-colors">
                    Click to upload 3D model
                  </p>
                  <p className="text-[11px] text-white/20">
                    .stl, .obj, .gltf, .glb · Max{" "}
                    {formatFileSize(MAX_MODEL_SIZE)}
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
                        {pendingModel.file?.name || "Model Selected"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removeModel}
                      className="px-3 py-1.5 text-xs font-bold text-red-300 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="aspect-video overflow-hidden rounded-xl border border-white/8 bg-white/[0.02]">
                      {pendingModel.file?.name?.toLowerCase().match(/\.(glb|gltf)$/) ? (
                        <ModelViewerPreview
                          modelUrl={pendingModel.previewUrl}
                          annotations={[]}
                          measurements={[]}
                          height="100%"
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                          <span className="material-symbols-outlined text-4xl text-white/10 mb-3">view_in_ar</span>
                          <p className="text-sm font-bold text-white/70">Model selected</p>
                          <p className="text-xs text-white/40 mt-1 max-w-[250px]">
                            Preview will be available after the order is submitted and the model is processed.
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="mt-3 text-[11px] text-white/35">
                      Uploads happen when you create the order. You can edit the
                      model after submission.
                    </p>
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
                  .jpg, .jpeg, .png, .webp — max{" "}
                  {formatFileSize(MAX_IMAGE_SIZE)}
                  each
                </p>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              {pendingImages.length > 0 && (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {pendingImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5"
                    >
                      {img.previewUrl && (
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/[0.05]">
                          <Image
                            src={img.previewUrl}
                            alt={img.file?.name || "Reference image"}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <p className="min-w-0 flex-1 truncate text-[11px] font-semibold text-white/70">
                        {img.file?.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/35 hover:bg-red-500/10 hover:text-red-300"
                        aria-label={`Remove ${img.file?.name || "image"}`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          close
                        </span>
                      </button>
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
    </div>
  );
}

export default function NewCustomOrder() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050507] flex items-center justify-center">
          <GlobalLoader text="Loading..." />
        </div>
      }
    >
      <NewCustomOrderContent />
    </Suspense>
  );
}
