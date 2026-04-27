"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import CustomerMainNavbar from "@/components/CustomerMainNavbar";
import { CUSTOMIZATION_TYPE_OPTIONS } from "@/lib/customization";
import Editor3DWrapper from "../../../modules/components/Editor3DWrapper";

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
  const [baseModelUrl, setBaseModelUrl] = useState("");

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
      setSourceContext((prev) => ({
        ...prev,
        isLoading: false,
        error: "",
      }));
      return;
    }

    setSourceContext((prev) => ({
      ...prev,
      isLoading: true,
      error: "",
    }));

    try {
      if (productIdParam) {
        const productRes = await fetch(
          `/api/products/${productIdParam}/public`,
          {
            cache: "no-store",
          },
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
    if (status === "authenticated" && session?.user?.role === "customer") {
      loadSourceContext();
    }
  }, [loadSourceContext, session?.user?.role, status]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleArrayInput = (e, field) => {
    const value = e.target.value;
    const array = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    setFormData((prev) => ({
      ...prev,
      [field]: array,
    }));
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
        setIsEditorOpen(true);
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (error) {
      alert("Upload error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEditorSave = async (gltfBlob, annotations, cameraState) => {
    setUploading(true);
    try {
      const file = new File([gltfBlob], 'annotated-model.glb', { type: 'model/gltf-binary' });
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "3d-model");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        setModel3D({
          url: data.file.url,
          filename: file.name,
          fileSize: file.size,
          annotations: annotations,
          cameraState: cameraState
        });
        setIsEditorOpen(false);
      } else {
        alert("Save failed: " + data.error);
      }
    } catch (error) {
      alert("Save error: " + error.message);
    } finally {
      setUploading(false);
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

      if (data.success) {
        setImages((prev) => [...prev, ...data.files]);
      } else {
        alert("Upload failed: " + data.error);
      }
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
        headers: {
          "Content-Type": "application/json",
        },
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
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") return <div>Loading...</div>;

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return <div>Redirecting to login...</div>;
  }

  if (session?.user?.role !== "customer") {
    return <div>Access denied. Customers only.</div>;
  }

  return (
    <div className="min-h-screen bg-[#f8f7f6]">
      <CustomerMainNavbar />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Create Custom Order</h1>

        {sourceContext.isLoading && (
          <div className="mb-6 p-4 rounded border border-blue-200 bg-blue-50 text-blue-700">
            Loading selected product/manufacturer details...
          </div>
        )}

        {sourceContext.error && (
          <div className="mb-6 p-4 rounded border border-red-200 bg-red-50 text-red-700">
            {sourceContext.error}
          </div>
        )}

        {!sourceContext.error &&
          sourceContext.sourceType !== "general_custom" && (
            <div className="mb-6 bg-white border rounded p-4 space-y-2">
              <h2 className="font-bold text-lg">Request Context</h2>

              {sourceContext.sourceType === "product_customization" &&
                sourceContext.product && (
                  <>
                    <p>
                      <strong>Product:</strong> {sourceContext.product.name}
                    </p>
                    <p>
                      <strong>Manufacturer:</strong>{" "}
                      {sourceContext.manufacturer?.businessName ||
                        sourceContext.manufacturer?.name ||
                        "Unknown"}
                    </p>
                    <p>
                      <strong>Product Price:</strong>{" "}
                      {formatCurrency(sourceContext.product.price)}
                    </p>
                    {sourceContext.minCustomizationQuantity && (
                      <p>
                        <strong>Minimum Custom Quantity:</strong>{" "}
                        {sourceContext.minCustomizationQuantity}
                      </p>
                    )}
                    {sourceContext.capabilityNotes && (
                      <p className="text-sm text-gray-700">
                        <strong>Manufacturer Notes:</strong>{" "}
                        {sourceContext.capabilityNotes}
                      </p>
                    )}
                  </>
                )}

              {sourceContext.sourceType === "manufacturer_direct" &&
                sourceContext.manufacturer && (
                  <>
                    <p>
                      <strong>Manufacturer:</strong>{" "}
                      {sourceContext.manufacturer.businessName ||
                        sourceContext.manufacturer.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      This request will default to a direct RFQ flow unless you
                      choose to broadcast later.
                    </p>
                  </>
                )}
            </div>
          )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2 font-semibold">Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-semibold">Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full border p-2 rounded h-24"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-semibold">Quantity *</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min={sourceContext.minCustomizationQuantity || 1}
              className="w-full border p-2 rounded"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-semibold">
              Requested Customization Types
              {sourceContext.sourceType === "product_customization" ? " *" : ""}
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
                    className={`px-3 py-1.5 text-sm border rounded-full ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300"
                    }`}
                    title={type.description}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-semibold">
              Customization Details
            </label>
            <textarea
              name="customizationDetails"
              value={formData.customizationDetails}
              onChange={handleChange}
              className="w-full border p-2 rounded h-24"
              placeholder="Mention logo specs, dimensions to change, finishes, packaging text, etc."
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-semibold">
              Material Preferences (comma-separated)
            </label>
            <input
              type="text"
              placeholder="Aluminum, Steel, Plastic"
              onChange={(e) => handleArrayInput(e, "materialPreferences")}
              className="w-full border p-2 rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-semibold">
              Color Specifications (comma-separated)
            </label>
            <input
              type="text"
              placeholder="Black, White, Silver"
              onChange={(e) => handleArrayInput(e, "colorSpecifications")}
              className="w-full border p-2 rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-semibold">Deadline</label>
            <input
              type="date"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              className="w-full border p-2 rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-semibold">Budget ($)</label>
            <input
              type="number"
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              min="0"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-semibold">
              Special Requirements
            </label>
            <textarea
              name="specialRequirements"
              value={formData.specialRequirements}
              onChange={handleChange}
              className="w-full border p-2 rounded h-24"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-semibold">Upload 3D Model</label>
            {!isEditorOpen && (
              <>
                <input
                  type="file"
                  accept=".stl,.obj,.gltf,.glb"
                  onChange={handle3DUpload}
                  className="w-full border p-2 rounded"
                />
                {model3D && (
                  <div className="mt-2 p-2 bg-green-100 rounded">
                    ✓ {model3D.filename} uploaded and annotated
                  </div>
                )}
              </>
            )}
            
            {isEditorOpen && baseModelUrl && (
              <div className="mt-4 border rounded p-2">
                <Editor3DWrapper 
                  modelUrl={baseModelUrl}
                  onSave={handleEditorSave}
                />
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-semibold">Upload Images</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              multiple
              onChange={handleImageUpload}
              className="w-full border p-2 rounded"
            />
            {images.length > 0 && (
              <div className="mt-2">
                {images.map((img, idx) => (
                  <div key={idx} className="p-2 bg-green-100 rounded mb-1">
                    {img.filename}
                  </div>
                ))}
              </div>
            )}
          </div>

          {uploading && <p className="text-blue-600">Uploading files...</p>}

          <button
            type="submit"
            disabled={loading || uploading || sourceContext.isLoading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? "Creating..." : "Create Custom Order"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function NewCustomOrder() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8f7f6] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-[#eb9728] rounded-full animate-spin" />
        </div>
      }
    >
      <NewCustomOrderContent />
    </Suspense>
  );
}
