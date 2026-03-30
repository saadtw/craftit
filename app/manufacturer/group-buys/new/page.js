// app/manufacturer/group-buys/new/page.js
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const initialTier = (num) => ({
  tierNumber: num,
  minQuantity: "",
  discountPercent: "",
  discountedPrice: "",
});

export default function NewGroupBuyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [form, setForm] = useState({
    productId: "",
    title: "",
    description: "",
    basePrice: "",
    tiers: [initialTier(1), initialTier(2), initialTier(3)],
    minParticipants: "1",
    maxParticipants: "",
    startDate: "",
    endDate: "",
    termsAndConditions: "",
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [minDateTime] = useState(() =>
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16),
  );

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && session?.user?.role !== "manufacturer")
      router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/products?status=active&limit=100");
        const data = await res.json();
        if (data.success) setProducts(data.products);
      } catch (_) {}
      setProductsLoading(false);
    };
    if (status === "authenticated") fetchProducts();
  }, [status]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key])
      setErrors((e) => {
        const n = { ...e };
        delete n[key];
        return n;
      });
  };

  const setTierField = (index, key, value) => {
    setForm((prev) => {
      const tiers = prev.tiers.map((t, i) =>
        i === index ? { ...t, [key]: value } : t,
      );
      return { ...prev, tiers };
    });
    // Auto-calculate discounted price when base price and discount % are both set
  };

  const autoCalcPrice = (index) => {
    const tier = form.tiers[index];
    if (form.basePrice && tier.discountPercent) {
      const discounted = (
        Number(form.basePrice) *
        (1 - Number(tier.discountPercent) / 100)
      ).toFixed(2);
      setTierField(index, "discountedPrice", discounted);
    }
  };

  const addTier = () => {
    if (form.tiers.length >= 5) return;
    setForm((prev) => ({
      ...prev,
      tiers: [...prev.tiers, initialTier(prev.tiers.length + 1)],
    }));
  };

  const removeTier = (index) => {
    if (form.tiers.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      tiers: prev.tiers
        .filter((_, i) => i !== index)
        .map((t, i) => ({ ...t, tierNumber: i + 1 })),
    }));
  };

  const handleProductSelect = (productId) => {
    const product = products.find((p) => p._id === productId);
    setSelectedProduct(product || null);
    setField("productId", productId);
    if (product) {
      setField("title", `Group Buy: ${product.name}`);
      setField("basePrice", product.price.toString());
    }
  };

  const validate = () => {
    const e = {};
    if (!form.productId) e.productId = "Select a product";
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.basePrice || Number(form.basePrice) <= 0)
      e.basePrice = "Valid base price required";
    if (!form.startDate) e.startDate = "Start date required";
    if (!form.endDate) e.endDate = "End date required";
    if (
      form.startDate &&
      form.endDate &&
      new Date(form.endDate) <= new Date(form.startDate)
    ) {
      e.endDate = "End date must be after start date";
    }

    const filledTiers = form.tiers.filter(
      (t) => t.minQuantity || t.discountPercent || t.discountedPrice,
    );
    if (filledTiers.length === 0) e.tiers = "At least one tier is required";

    filledTiers.forEach((t, i) => {
      if (!t.minQuantity || !t.discountPercent || !t.discountedPrice) {
        e[`tier_${i}`] = "All tier fields required";
      }
      if (Number(t.discountedPrice) >= Number(form.basePrice)) {
        e[`tier_price_${i}`] = "Discounted price must be below base price";
      }
    });

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const filledTiers = form.tiers
        .filter((t) => t.minQuantity && t.discountPercent && t.discountedPrice)
        .map((t, i) => ({
          tierNumber: i + 1,
          minQuantity: Number(t.minQuantity),
          discountPercent: Number(t.discountPercent),
          discountedPrice: Number(t.discountedPrice),
        }));

      const res = await fetch("/api/group-buys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: form.productId,
          title: form.title,
          description: form.description,
          basePrice: Number(form.basePrice),
          tiers: filledTiers,
          minParticipants: Number(form.minParticipants) || 1,
          maxParticipants: form.maxParticipants
            ? Number(form.maxParticipants)
            : undefined,
          startDate: form.startDate,
          endDate: form.endDate,
          termsAndConditions: form.termsAndConditions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/manufacturer/group-buys/${data.groupBuy._id}`);
      } else {
        alert(data.error || "Failed to create campaign");
      }
    } catch (_) {
      alert("Something went wrong");
    }
    setSaving(false);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/manufacturer/group-buys"
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
              Create Group Buy
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview((v) => !v)}
              className="px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {showPreview ? "Hide Preview" : "Preview"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Publish Campaign
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Product Selection */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            1. Select Product
          </h2>
          {productsLoading ? (
            <div className="h-10 bg-slate-100 animate-pulse rounded-lg" />
          ) : products.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
              You have no active products.{" "}
              <Link
                href="/manufacturer/products/new"
                className="underline font-medium"
              >
                Add a product first
              </Link>
              .
            </div>
          ) : (
            <div>
              <select
                value={form.productId}
                onChange={(e) => handleProductSelect(e.target.value)}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white ${errors.productId ? "border-red-400" : "border-slate-200"}`}
              >
                <option value="">Select a product...</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} — ${p.price}
                  </option>
                ))}
              </select>
              {errors.productId && (
                <p className="text-xs text-red-500 mt-1">{errors.productId}</p>
              )}

              {selectedProduct && (
                <div className="flex items-center gap-3 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  {selectedProduct.images?.[0]?.url && (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                      <Image
                        src={selectedProduct.images[0].url}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {selectedProduct.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedProduct.category} · Base price: $
                      {selectedProduct.price}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">
            2. Campaign Details
          </h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Campaign Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="e.g. Group Buy: CNC Aluminum Brackets"
              className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 ${errors.title ? "border-red-400 bg-red-50" : "border-slate-200"}`}
            />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1">{errors.title}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Explain the campaign, what customers get, any special conditions..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Base Price (USD) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                $
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.basePrice}
                onChange={(e) => setField("basePrice", e.target.value)}
                placeholder="0.00"
                className={`w-full pl-7 pr-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 ${errors.basePrice ? "border-red-400" : "border-slate-200"}`}
              />
            </div>
            {errors.basePrice && (
              <p className="text-xs text-red-500 mt-1">{errors.basePrice}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Min Participants
              </label>
              <input
                type="number"
                min="1"
                value={form.minParticipants}
                onChange={(e) => setField("minParticipants", e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Max Participants{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                min="1"
                value={form.maxParticipants}
                onChange={(e) => setField("maxParticipants", e.target.value)}
                placeholder="No limit"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                min={minDateTime}
                value={form.startDate}
                onChange={(e) => setField("startDate", e.target.value)}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 ${errors.startDate ? "border-red-400" : "border-slate-200"}`}
              />
              {errors.startDate && (
                <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                min={form.startDate || minDateTime}
                value={form.endDate}
                onChange={(e) => setField("endDate", e.target.value)}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 ${errors.endDate ? "border-red-400" : "border-slate-200"}`}
              />
              {errors.endDate && (
                <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>
              )}
            </div>
          </div>
        </div>

        {/* Discount Tiers */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                3. Pricing Tiers
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quantities and discounts must be strictly increasing across
                tiers
              </p>
            </div>
            {form.tiers.length < 5 && (
              <button
                onClick={addTier}
                className="px-3 py-1.5 text-xs border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Tier
              </button>
            )}
          </div>

          {errors.tiers && (
            <p className="text-xs text-red-500 mb-3">{errors.tiers}</p>
          )}

          <div className="space-y-3">
            {form.tiers.map((tier, index) => (
              <div
                key={index}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-700">
                    Tier {index + 1}
                    {index === 0 && (
                      <span className="ml-1.5 text-xs font-normal text-slate-400">
                        (first unlock)
                      </span>
                    )}
                  </span>
                  {form.tiers.length > 1 && (
                    <button
                      onClick={() => removeTier(index)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
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
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      Min Total Units
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={tier.minQuantity}
                      onChange={(e) =>
                        setTierField(index, "minQuantity", e.target.value)
                      }
                      placeholder="e.g. 50"
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white ${errors[`tier_${index}`] ? "border-red-400" : "border-slate-200"}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      Discount %
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={tier.discountPercent}
                      onChange={(e) =>
                        setTierField(index, "discountPercent", e.target.value)
                      }
                      onBlur={() => autoCalcPrice(index)}
                      placeholder="e.g. 10"
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white ${errors[`tier_${index}`] ? "border-red-400" : "border-slate-200"}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      Discounted Price ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tier.discountedPrice}
                      onChange={(e) =>
                        setTierField(index, "discountedPrice", e.target.value)
                      }
                      placeholder="Auto-calc"
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white ${errors[`tier_price_${index}`] ? "border-red-400" : "border-slate-200"}`}
                    />
                  </div>
                </div>

                {errors[`tier_${index}`] && (
                  <p className="text-xs text-red-500 mt-1.5">
                    {errors[`tier_${index}`]}
                  </p>
                )}
                {errors[`tier_price_${index}`] && (
                  <p className="text-xs text-red-500 mt-1.5">
                    {errors[`tier_price_${index}`]}
                  </p>
                )}

                {tier.minQuantity &&
                  tier.discountPercent &&
                  tier.discountedPrice &&
                  form.basePrice && (
                    <p className="text-xs text-emerald-600 mt-2">
                      ✓ At {tier.minQuantity} units total → $
                      {tier.discountedPrice}/unit ({tier.discountPercent}% off)
                    </p>
                  )}
              </div>
            ))}
          </div>
        </div>

        {/* Terms */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            4. Terms & Conditions{" "}
            <span className="text-slate-400 font-normal text-sm">
              (optional)
            </span>
          </h2>
          <textarea
            value={form.termsAndConditions}
            onChange={(e) => setField("termsAndConditions", e.target.value)}
            placeholder="Cancellation policy, refund conditions, production timeline commitments..."
            rows={4}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
          />
        </div>

        {/* Preview */}
        {showPreview && form.productId && (
          <div className="bg-white rounded-2xl border border-slate-900 p-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Customer Preview
            </p>
            <div className="flex gap-4 items-start">
              {selectedProduct?.images?.[0]?.url && (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0">
                  <Image
                    src={selectedProduct.images[0].url}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">
                  {form.title || "Campaign Title"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedProduct?.name}
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  {form.description}
                </p>
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs text-slate-500">
                    Base price:{" "}
                    <span className="font-semibold text-slate-900">
                      ${form.basePrice || "—"}
                    </span>
                  </p>
                  {form.tiers
                    .filter((t) => t.minQuantity && t.discountedPrice)
                    .map((t, i) => (
                      <p key={i} className="text-xs text-emerald-700">
                        🏷 Tier {i + 1}: {t.minQuantity} units → $
                        {t.discountedPrice}/unit ({t.discountPercent}% off)
                      </p>
                    ))}
                </div>
                {form.startDate && form.endDate && (
                  <p className="text-xs text-slate-400 mt-2">
                    {new Date(form.startDate).toLocaleDateString()} →{" "}
                    {new Date(form.endDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3 pb-8">
          <Link
            href="/manufacturer/group-buys"
            className="px-4 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-white transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Publish Campaign
          </button>
        </div>
      </div>
    </div>
  );
}
