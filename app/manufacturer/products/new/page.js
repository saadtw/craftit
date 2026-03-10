"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

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

  const imageInputRef = useRef();
  const modelInputRef = useRef();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
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
      Array.from(files).forEach((f) => formData.append("files", f));
      const res = await fetch("/api/upload/multiple", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        const newImgs = data.urls.map((url, i) => ({
          url,
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
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setForm((prev) => ({
          ...prev,
          model3D: { url: data.url, filename: file.name, fileSize: file.size },
        }));
      }
    } catch (_) {}
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/manufacturer/products"
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-slate-900">
              New Product
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="px-4 py-2 text-sm bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Publish
            </button>
          </div>
        </div>

        {/* Step Progress */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-4">
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <button
                  onClick={() => s.id < step && setStep(s.id)}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                    step === s.id
                      ? "text-slate-900"
                      : s.id < step
                        ? "text-emerald-600 cursor-pointer"
                        : "text-slate-400"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border ${
                      step === s.id
                        ? "bg-slate-900 text-white border-slate-900"
                        : s.id < step
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "border-slate-200 text-slate-400"
                    }`}
                  >
                    {s.id < step ? "✓" : s.id}
                  </span>
                  <span className="hidden sm:block">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-2 ${s.id < step ? "bg-emerald-400" : "bg-slate-200"}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-6 sm:p-8">
            {/* ── Step 1: Basic Info ── */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Basic Information
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Name, description and categorization of your product.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="e.g. CNC Machined Aluminum Bracket"
                    className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 ${errors.name ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    placeholder="Describe your product in detail — materials used, intended use, capabilities..."
                    rows={5}
                    className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none ${errors.description ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {form.description.length} characters
                  </p>
                  {errors.description && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setField("category", e.target.value)}
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white ${errors.category ? "border-red-400" : "border-slate-200"}`}
                    >
                      <option value="">Select category</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.category}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Sub-Category
                    </label>
                    <input
                      type="text"
                      value={form.subCategory}
                      onChange={(e) => setField("subCategory", e.target.value)}
                      placeholder="e.g. Structural Parts"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Pricing & Inventory ── */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Pricing & Inventory
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Set your price, MOQ, and stock details.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Unit Price (USD) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={(e) => setField("price", e.target.value)}
                        placeholder="0.00"
                        className={`w-full pl-7 pr-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 ${errors.price ? "border-red-400" : "border-slate-200"}`}
                      />
                    </div>
                    {errors.price && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.price}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Minimum Order Qty (MOQ){" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.moq}
                      onChange={(e) => setField("moq", e.target.value)}
                      placeholder="e.g. 50"
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 ${errors.moq ? "border-red-400" : "border-slate-200"}`}
                    />
                    {errors.moq && (
                      <p className="text-xs text-red-500 mt-1">{errors.moq}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Available Stock
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.stock}
                      onChange={(e) => setField("stock", e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Lead Time (days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.leadTime}
                      onChange={(e) => setField("leadTime", e.target.value)}
                      placeholder="e.g. 14"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    id="customization"
                    checked={form.customizationOptions}
                    onChange={(e) =>
                      setField("customizationOptions", e.target.checked)
                    }
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <label
                    htmlFor="customization"
                    className="text-sm font-medium text-slate-700"
                  >
                    This product supports customization
                    <span className="block text-xs font-normal text-slate-500 mt-0.5">
                      Customers can request modifications or custom specs
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* ── Step 3: Specifications ── */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Specifications
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Physical and technical details about your product.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Primary Material
                    </label>
                    <select
                      value={form.specifications.material}
                      onChange={(e) =>
                        setField("specifications.material", e.target.value)
                      }
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                    >
                      <option value="">Select material</option>
                      {MATERIALS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dimensions */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Product Dimensions
                    </label>
                    <div className="flex gap-2 items-center">
                      {["length", "width", "height"].map((dim) => (
                        <div key={dim} className="flex-1">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={form.specifications.dimensions[dim]}
                            onChange={(e) =>
                              setField(
                                `specifications.dimensions.${dim}`,
                                e.target.value,
                              )
                            }
                            placeholder={
                              dim.charAt(0).toUpperCase() + dim.slice(1)
                            }
                            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                          />
                        </div>
                      ))}
                      <select
                        value={form.specifications.dimensions.unit}
                        onChange={(e) =>
                          setField(
                            "specifications.dimensions.unit",
                            e.target.value,
                          )
                        }
                        className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                      >
                        {["mm", "cm", "m", "in"].map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">L × W × H</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.specifications.weight}
                      onChange={(e) =>
                        setField("specifications.weight", e.target.value)
                      }
                      placeholder="e.g. 0.5"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Shipping Weight (kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.shippingWeight}
                      onChange={(e) =>
                        setField("shippingWeight", e.target.value)
                      }
                      placeholder="e.g. 0.8"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                {/* Colors */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Available Colors
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {COLORS_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => addColor(c)}
                        disabled={form.specifications.color.includes(c)}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                          form.specifications.color.includes(c)
                            ? "bg-slate-900 text-white border-slate-900"
                            : "border-slate-200 text-slate-600 hover:border-slate-400"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={colorInput}
                      onChange={(e) => setColorInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), addColor(colorInput))
                      }
                      placeholder="Add custom color..."
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => addColor(colorInput)}
                      className="px-3 py-2 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {form.specifications.color.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.specifications.color.map((c) => (
                        <span
                          key={c}
                          className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs rounded-full"
                        >
                          {c}
                          <button
                            onClick={() => removeColor(c)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 4: Media ── */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Media
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Upload product images and optional 3D model.
                  </p>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Product Images
                    <span className="text-slate-400 font-normal ml-1">
                      (up to 10)
                    </span>
                  </label>
                  <div
                    onClick={() => imageInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all"
                  >
                    {imageUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-slate-500">Uploading...</p>
                      </div>
                    ) : (
                      <>
                        <svg
                          className="w-10 h-10 text-slate-300 mx-auto mb-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <p className="text-sm font-medium text-slate-600">
                          Click to upload images
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          PNG, JPG, WEBP up to 10MB each
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files)}
                  />

                  {/* Image Previews */}
                  {form.images.length > 0 && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-3">
                      {form.images.map((img, idx) => (
                        <div key={idx} className="relative group aspect-square">
                          <Image
                            src={img.url}
                            alt=""
                            fill
                            className={`object-cover rounded-lg border-2 ${img.isPrimary ? "border-slate-900" : "border-transparent"}`}
                            sizes="(max-width: 640px) 25vw, 16vw"
                          />
                          {img.isPrimary && (
                            <span className="absolute bottom-1 left-1 right-1 text-center bg-slate-900 text-white text-xs rounded py-0.5">
                              Primary
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded-lg transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                            {!img.isPrimary && (
                              <button
                                onClick={() => setPrimaryImage(idx)}
                                className="p-1 bg-white rounded text-xs text-slate-700 font-medium"
                              >
                                Set Primary
                              </button>
                            )}
                            <button
                              onClick={() => removeImage(idx)}
                              className="p-1 bg-red-500 text-white rounded"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3D Model Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    3D Model
                    <span className="text-slate-400 font-normal ml-1">
                      (optional)
                    </span>
                  </label>
                  {form.model3D ? (
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-slate-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {form.model3D.filename}
                        </p>
                        <p className="text-xs text-slate-400">
                          {(form.model3D.fileSize / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setForm((prev) => ({ ...prev, model3D: null }))
                        }
                        className="text-sm text-red-500 hover:text-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => modelInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all"
                    >
                      {modelUploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                          <p className="text-sm text-slate-500">
                            Uploading 3D model...
                          </p>
                        </div>
                      ) : (
                        <>
                          <svg
                            className="w-8 h-8 text-slate-300 mx-auto mb-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                            />
                          </svg>
                          <p className="text-sm font-medium text-slate-600">
                            Upload 3D model
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            .GLB, .OBJ, or .STL files
                          </p>
                        </>
                      )}
                    </div>
                  )}
                  <input
                    ref={modelInputRef}
                    type="file"
                    accept=".glb,.obj,.stl,.gltf"
                    className="hidden"
                    onChange={(e) => handleModelUpload(e.target.files?.[0])}
                  />
                </div>
              </div>
            )}

            {/* ── Step 5: SEO & Tags ── */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    SEO & Tags
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Help customers discover your product with the right
                    keywords.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Tags / Keywords
                  </label>
                  <div className="flex gap-2">
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
                      className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-4 py-2.5 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.tags.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs rounded-full"
                        >
                          #{tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <p className="text-sm font-medium text-slate-700 mb-4">
                    SEO Override (optional)
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1.5">
                        SEO Title
                      </label>
                      <input
                        type="text"
                        value={form.seoTitle}
                        onChange={(e) => setField("seoTitle", e.target.value)}
                        placeholder={
                          form.name || "Will use product name by default"
                        }
                        maxLength={60}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        {form.seoTitle.length}/60 characters
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1.5">
                        SEO Description
                      </label>
                      <textarea
                        value={form.seoDescription}
                        onChange={(e) =>
                          setField("seoDescription", e.target.value)
                        }
                        placeholder={
                          form.description.slice(0, 160) ||
                          "Will use product description by default"
                        }
                        maxLength={160}
                        rows={3}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        {form.seoDescription.length}/160 characters
                      </p>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">
                      Search Preview
                    </p>
                    <p className="text-blue-600 text-sm font-medium line-clamp-1">
                      {form.seoTitle || form.name || "Your Product Name"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                      {form.seoDescription ||
                        form.description ||
                        "Product description will appear here..."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step Navigation */}
          <div className="px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={step === 1}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-white transition-colors disabled:opacity-40"
            >
              ← Previous
            </button>
            <span className="text-xs text-slate-400">
              Step {step} of {STEPS.length}
            </span>
            {step < STEPS.length ? (
              <button
                onClick={nextStep}
                className="px-4 py-2 text-sm bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-700 transition-colors"
              >
                Next →
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Publish Product
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
