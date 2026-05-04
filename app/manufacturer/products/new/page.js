// app/manufacturer/products/new/page.js
"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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

const initialForm = {
  name: "",
  description: "",
  category: "",
  subCategory: "",
  price: "",
  moq: "",
  stock: "",
  leadTime: "",
  customizationOptions: false,
  customizationCapabilities: {
    allowedTypes: [],
    minCustomizationQuantity: "",
    notes: "",
  },
  specifications: {
    material: "",
    dimensions: { length: "", width: "", height: "", unit: "cm" },
    weight: "",
    color: [],
  },
  shippingWeight: "",
  shippingDimensions: { length: "", width: "", height: "", unit: "cm" },
  images: [],
  model3D: null,
  tags: [],
  seoTitle: "",
  seoDescription: "",
};

export default function NewProductPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && session?.user?.role !== "manufacturer")
      router.push("/");
  }, [status, session, router]);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [tagInput, setTagInput] = useState("");
  const [colorInput, setColorInput] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [modelUploading, setModelUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Hydration: restore annotation data written by the model-editor page ────
  // Runs once on mount. If the user visited /model-editor and saved their
  // annotations, the editor writes the updated model3D JSON into sessionStorage
  // before navigating back here. We pick it up, merge it into form state, and
  // clear it so subsequent mounts start clean.
  useEffect(() => {
    // 1. Restore the full form state if the user was sent back from the editor
    const rawForm = sessionStorage.getItem("draftProductForm");
    if (rawForm) {
      try {
        const parsed = JSON.parse(rawForm);
        if (parsed.form) setForm(parsed.form);
        if (parsed.step) setStep(parsed.step);
      } catch (e) {}
    }

    // 2. Restore the model annotations returned from the editor
    const raw = sessionStorage.getItem(DRAFT_MODEL_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (saved?.url) {
        setForm((prev) => ({ ...prev, model3D: saved }));
      }
    } catch {
      // Corrupted data — discard silently
    } finally {
      sessionStorage.removeItem(DRAFT_MODEL_KEY);
    }
  }, []);

  const imageInputRef = useRef();
  const modelInputRef = useRef();

  if (status === "loading") {
    return <GlobalLoader fullScreen text="Loading..." />;
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

  // Image upload
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

  // 3D model upload
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
        // ✓ Editor no longer auto-mounts here.
        // The user sees ModelViewerPreview and can optionally click
        // "Edit / Annotate" to navigate to the dedicated editor page.
      }
    } catch (_) {}
    setModelUploading(false);
  };

  // Navigate to the dedicated model-editor route.
  // We serialise the current model3D state into sessionStorage so the
  // editor page can read it without any server round-trip.
  const handleOpenModelEditor = () => {
    if (!form.model3D?.url) return;
    sessionStorage.setItem("draftProductForm", JSON.stringify({ form, step }));
    sessionStorage.setItem(DRAFT_MODEL_KEY, JSON.stringify(form.model3D));
    router.push("/manufacturer/products/model-editor");
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

  const handleSave = async (publishNow = false) => {
    if (!validateStep()) return;
    // Validate step 1 and 2 regardless of current step
    if (!form.name.trim() || !form.description.trim() || !form.category) {
      setStep(1);
      setErrors({
        name: !form.name.trim() ? "Required" : undefined,
        description: !form.description.trim() ? "Required" : undefined,
        category: !form.category ? "Required" : undefined,
      });
      return;
    }
    if (!form.price || !form.moq) {
      setStep(2);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...buildPayload(), publishNow }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.removeItem("draftProductForm");
        router.push(`/manufacturer/products/${data.product._id}`);
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/manufacturer/products"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-400 to-indigo-400">
                New Product
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Configuration Studio</p>
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
              Publish Product
            </button>
          </div>
        </div>

        {/* Step Progress - Linear Timeline */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
          <div className="relative flex items-center justify-between">
            {/* Background Line */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-white/5" />
            
            {/* Active Progress Line */}
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/40 backdrop-blur-md shadow-2xl">
          <div className="p-8 sm:p-10">
            {/* ── Step 1: Basic Info ── */}
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-l-4 border-purple-600 pl-6">
                  <h2 className="text-2xl font-black tracking-tight uppercase text-white">
                    Basic Information
                  </h2>
                  <p className="text-sm text-white/40 mt-1">
                    Name, description and categorization of your product.
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
                      placeholder="e.g. CNC Machined Aluminum Bracket"
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
                      placeholder="Describe your product in detail — materials used, intended use, capabilities..."
                      rows={5}
                      className={`w-full px-5 py-3.5 bg-white/[0.03] border-2 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white placeholder:text-white/10 resize-none transition-all ${
                        errors.description ? "border-red-500/50 bg-red-500/5" : "border-purple-500/20"
                      }`}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
                        {form.description.length} characters
                      </p>
                      {errors.description && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-400">
                          {errors.description}
                        </p>
                      )}
                    </div>
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
                      {errors.category && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mt-2">
                          {errors.category}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2.5">
                        Sub-Category
                      </label>
                      <input
                        type="text"
                        value={form.subCategory}
                        onChange={(e) => setField("subCategory", e.target.value)}
                        placeholder="e.g. Structural Parts"
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
                    Set your price, MOQ, and stock details.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2.5">
                      Unit Price (USD) <span className="text-purple-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 text-xs font-black">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={(e) => setField("price", e.target.value)}
                        placeholder="0.00"
                        className={`w-full pl-10 pr-5 py-3.5 bg-white/[0.03] border-2 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white placeholder:text-white/10 transition-all ${
                          errors.price ? "border-red-500/50" : "border-purple-500/20"
                        }`}
                      />
                    </div>
                    {errors.price && (
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mt-2">{errors.price}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2.5">
                      Minimum Order Qty (MOQ) <span className="text-purple-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.moq}
                      onChange={(e) => setField("moq", e.target.value)}
                      placeholder="e.g. 50"
                      className={`w-full px-5 py-3.5 bg-white/[0.03] border-2 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white placeholder:text-white/10 transition-all ${
                        errors.moq ? "border-red-500/50" : "border-purple-500/20"
                      }`}
                    />
                    {errors.moq && (
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mt-2">{errors.moq}</p>
                    )}
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
                      placeholder="0"
                      className="w-full px-5 py-3.5 bg-white/[0.03] border-2 border-purple-500/20 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white placeholder:text-white/10 transition-all"
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
                      placeholder="e.g. 14"
                      className="w-full px-5 py-3.5 bg-white/[0.03] border-2 border-purple-500/20 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white placeholder:text-white/10 transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 p-6 bg-white/[0.03] rounded-3xl border-2 border-purple-500/40 backdrop-blur-md">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      id="customization"
                      checked={form.customizationOptions}
                      onChange={(e) =>
                        setField("customizationOptions", e.target.checked)
                      }
                      className="w-6 h-6 rounded-lg bg-white/5 border-2 border-purple-500/30 checked:bg-purple-600 checked:border-purple-400 transition-all appearance-none cursor-pointer"
                    />
                    {form.customizationOptions && (
                      <svg className="w-4 h-4 text-white absolute left-1 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <label
                    htmlFor="customization"
                    className="flex-1 cursor-pointer"
                  >
                    <span className="block text-xs font-black uppercase tracking-widest text-white">This product supports customization</span>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">
                      Customers can request modifications or custom specs
                    </span>
                  </label>
                </div>

                {form.customizationOptions && (
                  <div className="space-y-6 p-8 bg-purple-600/5 rounded-3xl border-2 border-purple-500/20 animate-in zoom-in-95 duration-300">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-3">
                        Allowed Customization Types
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {CUSTOMIZATION_TYPE_OPTIONS.map((type) => {
                          const isSelected =
                            form.customizationCapabilities.allowedTypes.includes(
                              type.id,
                            );

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
                              title={type.description}
                            >
                              {type.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2.5">
                          Min Custom Order Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={
                            form.customizationCapabilities
                              .minCustomizationQuantity
                          }
                          onChange={(e) =>
                            setField(
                              "customizationCapabilities.minCustomizationQuantity",
                              e.target.value,
                            )
                          }
                          placeholder="Defaults to MOQ"
                          className="w-full px-5 py-3.5 bg-white/[0.03] border-2 border-purple-500/20 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white placeholder:text-white/10 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2.5">
                          Customization Notes
                        </label>
                        <input
                          type="text"
                          value={form.customizationCapabilities.notes}
                          onChange={(e) =>
                            setField(
                              "customizationCapabilities.notes",
                              e.target.value,
                            )
                          }
                          placeholder="Brand guide, print method..."
                          className="w-full px-5 py-3.5 bg-white/[0.03] border-2 border-purple-500/20 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white placeholder:text-white/10 transition-all"
                        />
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
                  <h2 className="text-2xl font-black tracking-tight uppercase text-white">
                    Specifications
                  </h2>
                  <p className="text-sm text-white/40 mt-1">
                    Physical and technical details about your product.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2.5">
                      Primary Material
                    </label>
                    <CustomDropdown
                      value={form.specifications.material}
                      onChange={(val) => setField("specifications.material", val)}
                      options={[{ value: "", label: "Select Material" }, ...MATERIALS.map(m => ({ value: m, label: m }))]}
                      placeholder="Select Material"
                    />
                  </div>

                  {/* Dimensions */}
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2.5">
                      Product Dimensions
                    </label>
                    <div className="flex gap-3 items-center">
                      {["length", "width", "height"].map((dim) => (
                        <div key={dim} className="flex-1">
                          <div className="relative">
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/10 text-[9px] font-black uppercase">
                              {dim[0]}
                            </span>
                            <input
                              type="number"
                              value={form.specifications.dimensions[dim]}
                              onChange={(e) => setField(`specifications.dimensions.${dim}`, e.target.value)}
                              placeholder="0"
                              className="w-full px-5 py-3.5 bg-white/[0.03] border-2 border-purple-500/20 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white placeholder:text-white/5 transition-all"
                            />
                          </div>
                        </div>
                      ))}
                      <select
                        value={form.specifications.dimensions.unit}
                        onChange={(e) => setField("specifications.dimensions.unit", e.target.value)}
                        className="w-24 px-3 py-3.5 bg-[#0B011D] border-2 border-purple-500/20 rounded-2xl text-white text-[10px] font-black uppercase focus:outline-none focus:border-purple-500/50 appearance-none"
                      >
                        <option value="cm">CM</option>
                        <option value="mm">MM</option>
                        <option value="in">IN</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2.5">
                      Net Weight (kg)
                    </label>
                    <input
                      type="number"
                      value={form.specifications.weight}
                      onChange={(e) => setField("specifications.weight", e.target.value)}
                      placeholder="0.00"
                      className="w-full px-5 py-3.5 bg-white/[0.03] border-2 border-purple-500/20 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white placeholder:text-white/5 transition-all"
                    />
                  </div>

                  {/* Colors */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2.5">
                      Available Colors
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={colorInput}
                        onChange={(e) => setColorInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addColor(colorInput)}
                        placeholder="Add color..."
                        className="flex-1 px-5 py-3.5 bg-white/[0.03] border-2 border-purple-500/20 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white placeholder:text-white/5 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => addColor(colorInput)}
                        className="px-4 py-3.5 bg-white/5 border border-white/10 text-white rounded-2xl hover:bg-white/10 transition-all text-[10px] font-black uppercase"
                      >
                        Add
                      </button>
                    </div>
                    {form.specifications.color.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {form.specifications.color.map((c) => (
                          <span
                            key={c}
                            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 border border-purple-500/30 text-white text-[9px] font-black uppercase rounded-full"
                          >
                            {c}
                            <button onClick={() => removeColor(c)} className="text-white/40 hover:text-white">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Shipping Details */}
                <div className="p-8 bg-white/[0.02] border-2 border-purple-500/20 rounded-[2rem] space-y-6">
                  <div className="flex items-center gap-3 text-white/20 mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4a2 2 0 012-2m16 0h-2M4 13H6" />
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Shipping Details</span>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">
                        Shipping Weight (kg)
                      </label>
                      <input
                        type="number"
                        value={form.shippingWeight}
                        onChange={(e) => setField("shippingWeight", e.target.value)}
                        placeholder="0.00"
                        className="w-full px-5 py-3.5 bg-white/[0.03] border-2 border-purple-500/10 rounded-2xl focus:outline-none focus:border-purple-500/40 text-white placeholder:text-white/5 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">
                        Shipping Dimensions
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {["length", "width", "height"].map((dim) => (
                          <input
                            key={dim}
                            type="number"
                            value={form.shippingDimensions[dim]}
                            onChange={(e) => setField(`shippingDimensions.${dim}`, e.target.value)}
                            placeholder={dim[0].toUpperCase()}
                            className="w-full px-3 py-3.5 bg-white/[0.03] border-2 border-purple-500/10 rounded-xl text-white text-xs placeholder:text-white/5 focus:outline-none focus:border-purple-500/40 transition-all"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 4: Media ── */}
            {step === 4 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-l-4 border-purple-600 pl-6">
                  <h2 className="text-2xl font-black tracking-tight uppercase text-white">
                    Product Media
                  </h2>
                  <p className="text-sm text-white/40 mt-1">
                    Upload high-quality images and a 3D model for your product.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Images */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
                        Images ({form.images.length}/10)
                      </label>
                      <button
                        type="button"
                        onClick={() => imageInputRef.current.click()}
                        className="text-[10px] font-black uppercase tracking-widest text-purple-400 hover:text-purple-300"
                      >
                        + Add Images
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {form.images.map((img, i) => (
                        <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border-2 border-purple-500/20 bg-white/5">
                          <Image src={img.url} alt="" fill className="object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                            <button
                              onClick={() => setPrimaryImage(i)}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                                img.isPrimary ? "bg-purple-600 text-white" : "bg-white/10 text-white hover:bg-white/20"
                              }`}
                            >
                              {img.isPrimary ? "Main Cover" : "Make Main"}
                            </button>
                            <button
                              onClick={() => removeImage(i)}
                              className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-[9px] font-black uppercase hover:bg-red-500/40"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {form.images.length < 10 && (
                        <button
                          onClick={() => imageInputRef.current.click()}
                          disabled={imageUploading}
                          className="aspect-square rounded-2xl border-2 border-dashed border-purple-500/20 bg-white/[0.02] flex flex-col items-center justify-center gap-2 text-white/20 hover:text-purple-400 hover:border-purple-500/40 transition-all group"
                        >
                          {imageUploading ? (
                            <span className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <svg className="w-8 h-8 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                              </svg>
                              <span className="text-[10px] font-black uppercase tracking-widest">Upload</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <input ref={imageInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files)} />
                  </div>

                  {/* 3D Model */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-3">
                      3D Configuration Model
                    </label>
                    <div className="p-8 bg-white/[0.02] border-2 border-purple-500/20 rounded-[2rem] flex flex-col items-center text-center">
                      {form.model3D ? (
                        <div className="w-full space-y-6">
                          <div className="aspect-video w-full rounded-2xl border-2 border-purple-500/40 overflow-hidden bg-[#0B011D]">
                            <ModelViewerPreview modelUrl={form.model3D.url} />
                          </div>
                          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                            <div className="text-left">
                              <p className="text-[10px] font-black uppercase tracking-widest text-white truncate max-w-[200px]">{form.model3D.filename}</p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mt-1">Ready for annotation</p>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={handleOpenModelEditor} className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.3)]">
                                Annotate Model
                              </button>
                              <button onClick={() => setField("model3D", null)} className="px-5 py-2.5 bg-white/5 text-white/40 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white">
                                Replace
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => modelInputRef.current.click()}
                          disabled={modelUploading}
                          className="flex flex-col items-center gap-4 group"
                        >
                          <div className="w-16 h-16 rounded-2xl bg-purple-600/10 border-2 border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 group-hover:border-purple-500 transition-all">
                            {modelUploading ? (
                              <span className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Upload 3D Engine Assets</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mt-2">.GLB, .OBJ, or .STL files allowed</p>
                          </div>
                        </button>
                      )}
                    </div>
                    <input ref={modelInputRef} type="file" accept=".glb,.obj,.stl,.gltf" className="hidden" onChange={(e) => handleModelUpload(e.target.files?.[0])} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 5: SEO & Tags ── */}
            {step === 5 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-l-4 border-purple-600 pl-6">
                  <h2 className="text-2xl font-black tracking-tight uppercase text-white">
                    SEO & Discoverability
                  </h2>
                  <p className="text-sm text-white/40 mt-1">
                    Optimize how your product appears in search results and within the platform.
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2.5">
                      Search Tags
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                        placeholder="Type a tag and press Enter"
                        className="flex-1 px-5 py-3.5 bg-white/[0.03] border-2 border-purple-500/20 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white placeholder:text-white/10 transition-all"
                      />
                      <button
                        type="button"
                        onClick={addTag}
                        className="px-6 py-3.5 text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-white rounded-2xl hover:bg-white/10 transition-all"
                      >
                        Add
                      </button>
                    </div>
                    {form.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {form.tags.map((tag) => (
                          <span
                            key={tag}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/30 text-white text-[10px] font-black uppercase tracking-widest rounded-full"
                          >
                            #{tag}
                            <button
                              onClick={() => removeTag(tag)}
                              className="text-white/40 hover:text-white transition-colors"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-8 bg-white/[0.02] border-2 border-purple-500/20 rounded-[2rem] space-y-6">
                    <div className="flex items-center gap-3 text-white/20 mb-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">SEO Overrides</span>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">
                          SEO Title
                        </label>
                        <input
                          type="text"
                          value={form.seoTitle}
                          onChange={(e) => setField("seoTitle", e.target.value)}
                          placeholder={form.name || "Default Product Name"}
                          maxLength={60}
                          className="w-full px-5 py-3.5 bg-white/[0.03] border-2 border-purple-500/10 rounded-2xl focus:outline-none focus:border-purple-500/40 text-white placeholder:text-white/5 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">
                          SEO Description
                        </label>
                        <textarea
                          value={form.seoDescription}
                          onChange={(e) => setField("seoDescription", e.target.value)}
                          placeholder={form.description.slice(0, 160) || "Default Description"}
                          maxLength={160}
                          rows={3}
                          className="w-full px-5 py-3.5 bg-white/[0.03] border-2 border-purple-500/10 rounded-2xl focus:outline-none focus:border-purple-500/40 text-white placeholder:text-white/5 resize-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="p-6 bg-[#0B011D] rounded-2xl border border-purple-500/30">
                      <p className="text-[10px] font-black uppercase tracking-widest text-purple-400/60 mb-3">
                        Search Preview
                      </p>
                      <p className="text-indigo-400 text-sm font-black line-clamp-1">
                        {form.seoTitle || form.name || "Your Product Name"}
                      </p>
                      <p className="text-white/40 text-xs mt-1.5 line-clamp-2 font-medium leading-relaxed">
                        {form.seoDescription || form.description || "Product description will appear here..."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="p-6 sm:p-8 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={step === 1}
              className={`px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${
                step === 1
                  ? "opacity-40 cursor-not-allowed text-white"
                  : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
              }`}
            >
              ← Previous
            </button>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">
              Step {step} <span className="mx-2 text-white/20">/</span> {STEPS.length}
            </div>
            {step < 5 ? (
              <button
                onClick={nextStep}
                className="px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] bg-white text-[#050507] rounded-xl hover:bg-white/90 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center gap-2 group"
              >
                Next Step
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] bg-purple-600 text-white rounded-xl hover:bg-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Complete & Publish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomDropdown({ value, options, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selectedOption = options.find(opt => opt.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
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
        <svg
          className={`w-4 h-4 text-white/20 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-[100] mt-2 w-full bg-[#080112] border-2 border-purple-500/40 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200 backdrop-blur-2xl">
          <div className="max-h-[200px] overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-5 py-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-between ${
                  value === opt.value
                    ? "bg-purple-600 text-white"
                    : "text-white/40 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{opt.label}</span>
                {value === opt.value && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
