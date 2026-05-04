// app/manufacturer/products/[id]/edit/page.js
"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CUSTOMIZATION_TYPE_OPTIONS } from "@/lib/customization";
import ModelViewerPreview from "@/modules/components/ModelViewerPreview";
import GlobalLoader from "@/components/ui/GlobalLoader";

// Key shared between this page and the dedicated model-editor route
const DRAFT_MODEL_KEY = "draftModel3D";

const STEPS = [
  { id: 1, label: "Basic Info" },
  { id: 2, label: "Pricing" },
  { id: 3, label: "Specs" },
  { id: 4, label: "Media" },
  { id: 5, label: "SEO & Tags" },
];

const CATEGORIES = [
  "Electronics",
  "Metals",
  "Plastics",
  "Textiles",
  "Wood",
  "Composites",
  "Ceramics",
  "Rubber",
  "Glass",
  "Other",
];

const MATERIALS = [
  "Steel",
  "Aluminum",
  "Plastic",
  "Copper",
  "Brass",
  "Wood",
  "Carbon Fiber",
  "Titanium",
  "Rubber",
  "Glass",
  "Other",
];

const COLORS_PRESETS = [
  "Red",
  "Blue",
  "Green",
  "Yellow",
  "Black",
  "White",
  "Silver",
  "Gold",
  "Natural",
  "Custom",
];

export default function EditProductPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [tagInput, setTagInput] = useState("");
  const [colorInput, setColorInput] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [modelUploading, setModelUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [lastSaved, setLastSaved] = useState(null);
  const [showRestockNotice, setShowRestockNotice] = useState(false);

  const imageInputRef = useRef();
  const modelInputRef = useRef();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && session?.user?.role !== "manufacturer")
      router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${id}`);
        const data = await res.json();
        if (data.success) {
          const p = data.product;
          setForm({
            name: p.name || "",
            description: p.description || "",
            category: p.category || "",
            subCategory: p.subCategory || "",
            price: p.price?.toString() || "",
            moq: p.moq?.toString() || "",
            stock: p.stock?.toString() || "0",
            leadTime: p.leadTime?.toString() || "",
            customizationOptions: p.customizationOptions || false,
            customizationCapabilities: {
              allowedTypes: p.customizationCapabilities?.allowedTypes || [],
              minCustomizationQuantity:
                p.customizationCapabilities?.minCustomizationQuantity?.toString() ||
                "",
              notes: p.customizationCapabilities?.notes || "",
            },
            specifications: {
              material: p.specifications?.material || "",
              dimensions: {
                length: p.specifications?.dimensions?.length?.toString() || "",
                width: p.specifications?.dimensions?.width?.toString() || "",
                height: p.specifications?.dimensions?.height?.toString() || "",
                unit: p.specifications?.dimensions?.unit || "cm",
              },
              weight: p.specifications?.weight?.toString() || "",
              color: p.specifications?.color || [],
            },
            shippingWeight: p.shippingWeight?.toString() || "",
            shippingDimensions: {
              length: p.shippingDimensions?.length?.toString() || "",
              width: p.shippingDimensions?.width?.toString() || "",
              height: p.shippingDimensions?.height?.toString() || "",
              unit: p.shippingDimensions?.unit || "cm",
            },
            images: p.images || [],
            model3D: p.model3D || null,
            tags: p.tags || [],
            seoTitle: p.seoTitle || "",
            seoDescription: p.seoDescription || "",
            currentStatus: p.status,
          });
        } else {
          router.push("/manufacturer/products");
        }
      } catch (_) {
        router.push("/manufacturer/products");
      }
      setFetchLoading(false);
    };
    if (status === "authenticated") fetchProduct();
  }, [id, status, router]);

  // ── Hydration: restore annotation data written by the model-editor page ────
  useEffect(() => {
    const raw = sessionStorage.getItem(DRAFT_MODEL_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (saved?.url) {
        setForm((prev) => (prev ? { ...prev, model3D: saved } : prev));
      }
    } catch {
      // Corrupted data — discard silently
    } finally {
      sessionStorage.removeItem(DRAFT_MODEL_KEY);
    }
  }, []);

  if (fetchLoading || status === "loading" || !form) {
    return <GlobalLoader fullScreen text="RESTORING CONFIGURATION MATRIX..." />;
  }

  const setField = (path, value) => {
    setForm((prev) => {
      const updated = { ...prev };
      const parts = path.split(".");
      let curr = updated;
      for (let i = 0; i < parts.length - 1; i++) {
        curr[parts[i]] = { ...curr[parts[i]] };
        curr = curr[parts[i]];
      }
      curr[parts[parts.length - 1]] = value;
      return updated;
    });
    if (errors[path])
      setErrors((e) => {
        const n = { ...e };
        delete n[path];
        return n;
      });
  };

  const validateStep = () => {
    const e = {};
    if (step === 1) {
      if (!form.name.trim()) e.name = "Product name is required";
      if (!form.description.trim()) e.description = "Description is required";
      if (!form.category) e.category = "Category is required";
    }
    if (step === 2) {
      if (!form.price || isNaN(form.price) || Number(form.price) <= 0)
        e.price = "Valid price required";
      if (!form.moq || isNaN(form.moq) || Number(form.moq) < 1)
        e.moq = "MOQ must be at least 1";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) setStep((s) => Math.min(5, s + 1));
  };

  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const handleImageUpload = async (files) => {
    if (!files.length) return;
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("type", "image");
      Array.from(files).forEach((f) => formData.append("files", f));
      const res = await fetch("/api/upload/multiple", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        const newImgs = data.files.map((f, i) => ({
          url: f.url,
          isPrimary: form.images.length === 0 && i === 0,
        }));
        setForm((prev) => ({ ...prev, images: [...prev.images, ...newImgs] }));
      }
    } catch (_) {}
    setImageUploading(false);
  };

  const setPrimaryImage = (idx) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.map((img, i) => ({ ...img, isPrimary: i === idx })),
    }));
  };

  const removeImage = (idx) => {
    setForm((prev) => {
      const imgs = prev.images.filter((_, i) => i !== idx);
      if (imgs.length > 0 && !imgs.some((i) => i.isPrimary))
        imgs[0].isPrimary = true;
      return { ...prev, images: imgs };
    });
  };

  const handleModelUpload = async (file) => {
    if (!file) return;
    setModelUploading(true);
    try {
      const formData = new FormData();
      formData.append("type", "3d-model");
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setForm((prev) => ({
          ...prev,
          model3D: {
            url: data.file.url,
            filename: file.name,
            fileSize: file.size,
          },
        }));
      }
    } catch (_) {}
    setModelUploading(false);
  };

const handleModelEditorSave = async (gltfBlob, annotations, cameraState, snapshotBlob) => {
    setModelUploading(true);
    try {
      const timestamp = Date.now();

      // 1. Upload the new edited model to S3 with a cache-busting timestamp
      const modelFile = new File([gltfBlob], `model_${timestamp}.glb`, {
        type: "model/gltf-binary",
      });
      const modelFormData = new FormData();
      modelFormData.append("type", "3d-model");
      modelFormData.append("file", modelFile);

      const modelRes = await fetch("/api/upload", { method: "POST", body: modelFormData });
      const modelData = await modelRes.json();

      if (!modelData.success) {
        alert(modelData.error || "Failed to upload edited model");
        return;
      }

      // 2. Upload the snapshot image to S3 (if captured)
      let snapshotUrl = null;
      if (snapshotBlob) {
        const snapshotFile = new File([snapshotBlob], `snapshot_${timestamp}.png`, {
          type: "image/png",
        });
        const snapFormData = new FormData();
        snapFormData.append("type", "image");
        snapFormData.append("file", snapshotFile);

        const snapRes = await fetch("/api/upload", { method: "POST", body: snapFormData });
        const snapData = await snapRes.json();

        if (snapData.success) {
          snapshotUrl = snapData.file.url;
        } else {
          console.warn("[model-editor] Snapshot upload failed:", snapData.error);
        }
      }

      // 3. Atomic Update: Call PATCH /api/models/update to swap URLs and delete old S3 objects
      const updateRes = await fetch("/api/models/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: id,
          resourceType: "product",
          newModelUrl: modelData.file.url,
          newThumbnailUrl: snapshotUrl || undefined,
          newFileSize: gltfBlob.size,
          annotations,
          cameraState,
        }),
      });
      const updateData = await updateRes.json();

      if (!updateData.success) {
        console.error("[model-editor] DB update failed:", updateData.error);
      }

      // 4. Update local form state so the UI reflects the new URLs immediately
      const nextModel = {
        url: modelData.file.url,
        filename: modelFile.name,
        fileSize: gltfBlob.size,
        thumbnailUrl: snapshotUrl || form.model3D?.thumbnailUrl,
        annotations,
        cameraState,
      };
      setForm((prev) => ({ ...prev, model3D: nextModel }));
      setBaseModelUrl(nextModel.url);
      setIsModelEditorOpen(false);
    } catch (err) {
      console.error("[model-editor] Save error:", err);
      alert("Failed to save 3D model edits");
    }
    setModelUploading(false);
};

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, t] }));
    }
    setTagInput("");
  };

  const removeTag = (tag) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const addColor = (color) => {
    const c = color.trim();
    if (c && !form.specifications.color.includes(c)) {
      setField("specifications.color", [...form.specifications.color, c]);
    }
    setColorInput("");
  };

  const removeColor = (color) => {
    setField(
      "specifications.color",
      form.specifications.color.filter((c) => c !== color),
    );
  };

  const toggleCustomizationType = (typeId) => {
    const selectedTypes = form.customizationCapabilities.allowedTypes || [];
    const nextTypes = selectedTypes.includes(typeId)
      ? selectedTypes.filter((type) => type !== typeId)
      : [...selectedTypes, typeId];

    setField("customizationCapabilities.allowedTypes", nextTypes);
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category,
    subCategory: form.subCategory,
    price: Number(form.price),
    moq: Number(form.moq),
    stock: form.stock ? Number(form.stock) : 0,
    leadTime: form.leadTime ? Number(form.leadTime) : undefined,
    customizationOptions: form.customizationOptions,
    customizationCapabilities: form.customizationOptions
      ? {
          allowedTypes: form.customizationCapabilities.allowedTypes,
          minCustomizationQuantity: form.customizationCapabilities
            .minCustomizationQuantity
            ? Number(form.customizationCapabilities.minCustomizationQuantity)
            : undefined,
          notes: form.customizationCapabilities.notes?.trim() || undefined,
        }
      : {
          allowedTypes: [],
        },
    specifications: {
      material: form.specifications.material,
      dimensions: {
        length: Number(form.specifications.dimensions.length) || 0,
        width: Number(form.specifications.dimensions.width) || 0,
        height: Number(form.specifications.dimensions.height) || 0,
        unit: form.specifications.dimensions.unit,
      },
      weight: Number(form.specifications.weight) || 0,
      color: form.specifications.color,
    },
    shippingWeight: form.shippingWeight
      ? Number(form.shippingWeight)
      : undefined,
    shippingDimensions: {
      length: Number(form.shippingDimensions.length) || 0,
      width: Number(form.shippingDimensions.width) || 0,
      height: Number(form.shippingDimensions.height) || 0,
      unit: form.shippingDimensions.unit,
    },
    images: form.images,
    model3D: form.model3D,
    tags: form.tags,
    seoTitle: form.seoTitle,
    seoDescription: form.seoDescription,
  });

  const handleMarkActive = async () => {
    try {
      const res = await fetch(`/api/products/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      const data = await res.json();
      if (data.success) {
        setForm((prev) => ({ ...prev, currentStatus: "active" }));
        setShowRestockNotice(false);
      }
    } catch (_) {}
  };

  const handleSave = async (publishNow = false) => {
    if (!validateStep()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...buildPayload(), publishNow }),
      });
      const data = await res.json();
      if (data.success) {
        setLastSaved(new Date());
        setForm((prev) => ({ ...prev, currentStatus: data.product.status }));
        if (Number(form.stock) > 0 && form.currentStatus === "out_of_stock" && !publishNow) {
          setShowRestockNotice(true);
        } else {
          setShowRestockNotice(false);
        }
        if (publishNow) {
          router.push(`/manufacturer/products/${id}`);
        }
      } else {
        alert(data.error || "Failed to save product");
      }
    } catch (_) {
      alert("Something went wrong. Please try again.");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {/* Header */}
      <div className="bg-[#050507]/80 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/manufacturer/products/${id}`}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-400 to-indigo-400">
                Edit Product
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Configuration Studio</p>
                {lastSaved && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-emerald-500/40" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/60">
                      Saved {lastSaved.toLocaleTimeString()}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/60 border border-white/10 rounded-xl hover:bg-white/5 transition-all disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] bg-purple-600 text-white rounded-xl hover:bg-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {form.currentStatus === "active" ? "Update Product" : "Publish Product"}
            </button>
          </div>
        </div>

        {/* Step Progress - Linear Timeline */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
          <div className="relative flex items-center justify-between">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-white/5" />
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-purple-500 transition-all duration-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
              style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
            />

            {STEPS.map((s, i) => (
              <div key={s.id} className="relative z-10 flex flex-col items-center">
                <button
                  onClick={() => s.id < step && setStep(s.id)}
                  className={`group flex flex-col items-center gap-3 transition-all ${
                    s.id <= step ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all duration-500 ${
                      step === s.id
                        ? "bg-purple-600 border-purple-400 text-white shadow-[0_0_20px_rgba(147,51,234,0.5)] scale-110"
                        : s.id < step
                          ? "bg-emerald-500 border-emerald-400 text-white"
                          : "bg-[#050507] border-white/10 text-white/20"
                    }`}
                  >
                    {s.id < step ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      s.id
                    )}
                  </div>
                  <span 
                    className={`text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${
                      step === s.id ? "text-white" : s.id < step ? "text-emerald-400" : "text-white/20"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Restock notification */}
      {showRestockNotice && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[1.5rem] px-6 py-4 flex items-center justify-between gap-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                Stock replenished — Mark as Active to make it visible to customers.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleMarkActive}
                className="px-4 py-2 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                Mark Active
              </button>
              <button
                onClick={() => setShowRestockNotice(false)}
                className="text-emerald-500/40 hover:text-emerald-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/40 backdrop-blur-md shadow-2xl overflow-hidden">
          <div className="p-8 sm:p-10">
            {/* ── Step 1: Basic Info ── */}
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-l-4 border-purple-600 pl-6">
                  <h2 className="text-2xl font-black tracking-tight uppercase text-white">
                    Basic Information
                  </h2>
                  <p className="text-sm text-white/40 mt-1">
                    Update product name, description and categorization.
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2.5">
                      Product Name <span className="text-purple-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                      className={`w-full px-5 py-3.5 bg-white/[0.03] border-2 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white placeholder:text-white/10 transition-all ${
                        errors.name ? "border-red-500/50 bg-red-500/5" : "border-purple-500/20"
                      }`}
                    />
                    {errors.name && (
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mt-2">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2.5">
                      Description <span className="text-purple-400">*</span>
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setField("description", e.target.value)}
                      rows={5}
                      className={`w-full px-5 py-3.5 bg-white/[0.03] border-2 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white placeholder:text-white/10 resize-none transition-all ${
                        errors.description ? "border-red-500/50 bg-red-500/5" : "border-purple-500/20"
                      }`}
                    />
                    {errors.description && (
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mt-2">{errors.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2.5">
                        Category <span className="text-purple-400">*</span>
                      </label>
                      <CustomDropdown
                        value={form.category}
                        onChange={(val) => setField("category", val)}
                        options={[{ value: "", label: "Select Category" }, ...CATEGORIES.map(c => ({ value: c, label: c }))]}
                        placeholder="Select Category"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2.5">
                        Sub-Category
                      </label>
                      <input
                        type="text"
                        value={form.subCategory}
                        onChange={(e) => setField("subCategory", e.target.value)}
                        className="w-full px-5 py-3.5 bg-white/[0.03] border-2 border-purple-500/20 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white placeholder:text-white/10 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Pricing & Inventory ── */}
            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-l-4 border-purple-600 pl-6">
                  <h2 className="text-2xl font-black tracking-tight uppercase text-white">
                    Pricing & Inventory
                  </h2>
                  <p className="text-sm text-white/40 mt-1">
                    Manage your unit price, MOQ and stock levels.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2.5">
                      Unit Price (USD) <span className="text-purple-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 text-xs font-black">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={(e) => setField("price", e.target.value)}
                        className={`w-full pl-10 pr-5 py-3.5 bg-white/[0.03] border-2 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white placeholder:text-white/10 transition-all ${
                          errors.price ? "border-red-500/50" : "border-purple-500/20"
                        }`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2.5">
                      MOQ <span className="text-purple-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.moq}
                      onChange={(e) => setField("moq", e.target.value)}
                      className={`w-full px-5 py-3.5 bg-white/[0.03] border-2 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white placeholder:text-white/10 transition-all ${
                        errors.moq ? "border-red-500/50" : "border-purple-500/20"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2.5">
                      Available Stock
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.stock}
                      onChange={(e) => setField("stock", e.target.value)}
                      className="w-full px-5 py-3.5 bg-white/[0.03] border-2 border-purple-500/20 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2.5">
                      Lead Time (days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.leadTime}
                      onChange={(e) => setField("leadTime", e.target.value)}
                      className="w-full px-5 py-3.5 bg-white/[0.03] border-2 border-purple-500/20 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 p-6 bg-white/[0.03] rounded-3xl border-2 border-purple-500/40 backdrop-blur-md">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      id="customization"
                      checked={form.customizationOptions}
                      onChange={(e) => setField("customizationOptions", e.target.checked)}
                      className="w-6 h-6 rounded-lg bg-white/5 border-2 border-purple-500/30 checked:bg-purple-600 checked:border-purple-400 transition-all appearance-none cursor-pointer"
                    />
                    {form.customizationOptions && (
                      <svg className="w-4 h-4 text-white absolute left-1 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <label htmlFor="customization" className="flex-1 cursor-pointer">
                    <span className="block text-xs font-black uppercase tracking-widest text-white">This product supports customization</span>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">Customers can request modifications or custom specs</span>
                  </label>
                </div>

                {form.customizationOptions && (
                  <div className="space-y-6 p-8 bg-purple-600/5 rounded-3xl border-2 border-purple-500/20 animate-in zoom-in-95 duration-300">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-3">Allowed Customization Types</p>
                      <div className="flex flex-wrap gap-2">
                        {CUSTOMIZATION_TYPE_OPTIONS.map((type) => {
                          const isSelected = form.customizationCapabilities.allowedTypes.includes(type.id);
                          return (
                            <button
                              key={type.id}
                              type="button"
                              onClick={() => toggleCustomizationType(type.id)}
                              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                                isSelected
                                  ? "bg-purple-600 text-white border-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                                  : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                              }`}
                            >
                              {type.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Specifications ── */}
            {step === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-l-4 border-purple-600 pl-6">
                  <h2 className="text-2xl font-black tracking-tight uppercase text-white">Specifications</h2>
                  <p className="text-sm text-white/40 mt-1">Physical and technical details about your product.</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2.5">Primary Material</label>
                    <CustomDropdown
                      value={form.specifications.material}
                      onChange={(val) => setField("specifications.material", val)}
                      options={[{ value: "", label: "Select Material" }, ...MATERIALS.map(m => ({ value: m, label: m }))]}
                      placeholder="Select Material"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2.5">Dimensions (L × W × H)</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20">L</span>
                        <input
                          type="number"
                          value={form.specifications.dimensions.length}
                          onChange={(e) => setField("specifications.dimensions.length", e.target.value)}
                          className="w-full pl-8 pr-4 py-3.5 bg-white/[0.03] border-2 border-purple-500/20 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white transition-all"
                        />
                      </div>
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20">W</span>
                        <input
                          type="number"
                          value={form.specifications.dimensions.width}
                          onChange={(e) => setField("specifications.dimensions.width", e.target.value)}
                          className="w-full pl-8 pr-4 py-3.5 bg-white/[0.03] border-2 border-purple-500/20 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white transition-all"
                        />
                      </div>
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20">H</span>
                        <input
                          type="number"
                          value={form.specifications.dimensions.height}
                          onChange={(e) => setField("specifications.dimensions.height", e.target.value)}
                          className="w-full pl-8 pr-4 py-3.5 bg-white/[0.03] border-2 border-purple-500/20 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2.5">Unit</label>
                    <div className="flex gap-2">
                      {["cm", "inch", "mm"].map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setField("specifications.dimensions.unit", u)}
                          className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-2xl border transition-all ${
                            form.specifications.dimensions.unit === u
                              ? "bg-purple-600 text-white border-purple-400"
                              : "bg-white/5 border-white/10 text-white/40"
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 4: Media ── */}
            {step === 4 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-l-4 border-purple-600 pl-6">
                  <h2 className="text-2xl font-black tracking-tight uppercase text-white">Product Media</h2>
                  <p className="text-sm text-white/40 mt-1">Visual assets and 3D configuration models.</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-4">Product Gallery</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {form.images.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-[2rem] overflow-hidden border-2 border-purple-500/20 group">
                          <Image src={img.url} alt="" fill className="object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2">
                            <button
                              onClick={() => setPrimaryImage(idx)}
                              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                img.isPrimary ? "bg-emerald-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                              }`}
                            >
                              {img.isPrimary ? "Main Cover" : "Set Primary"}
                            </button>
                            <button
                              onClick={() => removeImage(idx)}
                              className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/40"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        className="aspect-square rounded-[2rem] border-2 border-dashed border-purple-500/20 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-3 group"
                      >
                        <div className="w-10 h-10 rounded-full bg-purple-600/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Add Image</span>
                      </button>
                    </div>
                    <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageUpload(e.target.files)} />
                  </div>

                  <div className="pt-8 border-t border-white/5">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-4">3D Configuration Model</label>
                    {form.model3D ? (
                      <div className="bg-[#0B011D] border-2 border-purple-500/30 rounded-[2rem] p-6">
                        <div className="flex items-center gap-6">
                          <div className="w-20 h-20 bg-purple-600/10 rounded-2xl flex items-center justify-center text-purple-400">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-lg font-black uppercase tracking-tight text-white truncate">{form.model3D.filename}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mt-1">
                              {(form.model3D.fileSize / 1024 / 1024).toFixed(2)} MB • GLTF Engine
                            </p>
                            <div className="flex gap-3 mt-4">
                              <button
                                onClick={handleOpenModelEditor}
                                className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                              >
                                Annotate Model
                              </button>
                              <button
                                onClick={() => setForm((prev) => ({ ...prev, model3D: null }))}
                                className="px-5 py-2.5 bg-white/5 text-white/40 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 transition-all"
                              >
                                Replace Asset
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => modelInputRef.current?.click()}
                        className="w-full py-12 rounded-[2rem] border-2 border-dashed border-purple-500/20 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-4 group"
                      >
                        <div className="w-16 h-16 rounded-2xl bg-purple-600/10 flex items-center justify-center text-purple-400 group-hover:rotate-12 transition-transform">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white">Upload 3D Engine Asset</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mt-1">Supports .GLB, .OBJ, .STL (Max 50MB)</p>
                        </div>
                      </button>
                    )}
                    <input ref={modelInputRef} type="file" accept=".glb,.obj,.stl,.gltf" className="hidden" onChange={(e) => handleModelUpload(e.target.files?.[0])} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 5: SEO & Tags ── */}
            {step === 5 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-l-4 border-purple-600 pl-6">
                  <h2 className="text-2xl font-black tracking-tight uppercase text-white">SEO & Discovery</h2>
                  <p className="text-sm text-white/40 mt-1">Optimize how your product appears in search results.</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-3">Discovery Tags</label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === ",") && (e.preventDefault(), addTag())}
                        placeholder="Type and press Enter..."
                        className="flex-1 px-5 py-3.5 bg-white/[0.03] border-2 border-purple-500/20 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white placeholder:text-white/10 transition-all"
                      />
                      <button onClick={addTag} className="px-6 py-3.5 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/10">Add</button>
                    </div>
                    {form.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {form.tags.map((tag) => (
                          <span key={tag} className="flex items-center gap-2 px-4 py-2 bg-purple-600/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest rounded-xl">
                            #{tag}
                            <button onClick={() => removeTag(tag)} className="hover:text-white transition-colors">✕</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2">SEO Title Override</label>
                        <input
                          type="text"
                          value={form.seoTitle}
                          onChange={(e) => setField("seoTitle", e.target.value)}
                          maxLength={60}
                          className="w-full px-5 py-3.5 bg-white/[0.03] border-2 border-purple-500/20 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2">SEO Meta Description</label>
                        <textarea
                          value={form.seoDescription}
                          onChange={(e) => setField("seoDescription", e.target.value)}
                          maxLength={160}
                          rows={4}
                          className="w-full px-5 py-3.5 bg-white/[0.03] border-2 border-purple-500/20 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white resize-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="p-6 bg-[#0B011D] rounded-[2rem] border-2 border-purple-500/30">
                      <p className="text-[10px] font-black uppercase tracking-widest text-purple-400/60 mb-4">Live Search Preview</p>
                      <div className="space-y-2">
                        <p className="text-indigo-400 text-lg font-black line-clamp-1">{form.seoTitle || form.name || "Product Title"}</p>
                        <p className="text-emerald-400/60 text-[10px] font-medium truncate">https://craftit.ai/products/{id}</p>
                        <p className="text-white/40 text-xs line-clamp-3 font-medium leading-relaxed">
                          {form.seoDescription || form.description || "The product description will appear here as the meta snippet for search engine indexing..."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        <div className="p-8 bg-white/[0.02] border-2 border-white/5 rounded-[2.5rem] flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={step === 1}
            className={`px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all ${
              step === 1 ? "opacity-20 cursor-not-allowed text-white" : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
            }`}
          >
            ← Previous
          </button>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
            Step {step} <span className="mx-2 text-white/5">/</span> {STEPS.length}
          </div>
          {step < 5 ? (
            <button
              onClick={nextStep}
              className="px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] bg-white text-[#050507] rounded-2xl hover:bg-white/90 transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center gap-3 group"
            >
              Continue
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] bg-purple-600 text-white rounded-2xl hover:bg-purple-500 shadow-[0_0_30px_rgba(147,51,234,0.3)] transition-all flex items-center gap-3"
            >
              Update & Publish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomDropdown({ value, options, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-5 py-3.5 text-[10px] font-black uppercase tracking-widest bg-white/[0.03] border-2 border-purple-500/20 rounded-2xl hover:bg-white/[0.08] transition-all text-white group"
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <svg className={`w-4 h-4 text-white/20 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[#0B011D] border-2 border-purple-500/30 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-[200px] overflow-y-auto py-2">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-5 py-2 text-left text-[10px] font-black uppercase tracking-widest transition-all ${
                  value === opt.value ? "bg-purple-600 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
