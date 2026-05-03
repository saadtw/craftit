// app/manufacturer/group-buys/new/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useRef } from "react";
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
  const [productOpen, setProductOpen] = useState(false);
  const productRef = useRef(null);

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
    const handleClickOutside = (e) => {
      if (productRef.current && !productRef.current.contains(e.target)) {
        setProductOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    return <GlobalLoader fullScreen text="Setting up campaign builder..." />;
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-20 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col gap-8 mb-10">
          <div className="flex items-center justify-between">
            <Link
              href="/manufacturer/group-buys"
              className="group flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-sm">arrow_back</span>
              </div>
              Campaign Hub
            </Link>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPreview((v) => !v)}
                className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/70 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">{showPreview ? "visibility_off" : "visibility"}</span>
                {showPreview ? "Hide Preview" : "Live Preview"}
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-500/20"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-sm">rocket_launch</span>
                )}
                Publish Campaign
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-purple-500 via-orange-500 to-[#eb9728] bg-clip-text text-transparent">
              Launch Campaign
            </h1>
            <p className="text-sm text-white/35 font-medium">
              Configure your bulk ordering parameters and volume milestones
            </p>
          </div>
        </div>
        {/* Product Selection */}
        <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[100px] pointer-events-none" />
          <h2 className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">inventory_2</span>
            01. Product Selection
          </h2>
          {productsLoading ? (
            <div className="h-12 bg-white/5 animate-pulse rounded-2xl border border-white/5" />
          ) : products.length === 0 ? (
            <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-amber-400">
              You have no active products.{" "}
              <Link
                href="/manufacturer/products/new"
                className="underline text-white"
              >
                Add a product first
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Custom Product Dropdown */}
              <div className="relative" ref={productRef}>
                <button
                  type="button"
                  onClick={() => setProductOpen((o) => !o)}
                  className={`w-full flex items-center justify-between px-5 py-4 bg-white/5 border rounded-2xl text-sm font-bold focus:outline-none transition-all ${
                    errors.productId ? "border-red-500/50" : "border-purple-500/20 hover:border-purple-500/40"
                  }`}
                >
                  <span className={selectedProduct ? "text-white" : "text-white/30"}>
                    {selectedProduct ? `${selectedProduct.name} — $${selectedProduct.price}` : "Select a product..."}
                  </span>
                  <span className={`material-symbols-outlined text-white/30 transition-transform duration-200 ${productOpen ? "rotate-180" : ""}`}>
                    expand_more
                  </span>
                </button>

                {productOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-[#0f0f14] border border-purple-500/20 rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.6)] max-h-64 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        handleProductSelect("");
                        setProductOpen(false);
                      }}
                      className="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white/20 hover:bg-white/5 hover:text-white transition-all"
                    >
                      Select a product...
                    </button>
                    {products.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => {
                          handleProductSelect(p._id);
                          setProductOpen(false);
                        }}
                        className={`w-full text-left px-5 py-3 text-sm font-bold transition-all ${
                          form.productId === p._id
                            ? "bg-purple-600/20 text-purple-300"
                            : "text-white/60 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {p.name} — ${p.price}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {errors.productId && (
                <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mt-2">{errors.productId}</p>
              )}

              {selectedProduct && (
                <div className="flex items-center gap-5 p-4 bg-white/[0.02] rounded-3xl border border-white/10 group-hover:border-white/20 transition-all">
                  {selectedProduct.images?.[0]?.url && (
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-white/10">
                      <Image
                        src={selectedProduct.images[0].url}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-black text-white">
                      {selectedProduct.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                        {selectedProduct.category}
                      </span>
                      <div className="w-1 h-1 rounded-full bg-white/10" />
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                        ${selectedProduct.price} BASE PRICE
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Campaign Info */}
        <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] pointer-events-none" />
          <h2 className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-8 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">campaign</span>
            02. Campaign Architecture
          </h2>

          <div className="grid grid-cols-1 gap-8">
            <div>
              <label className="block text-[10px] font-black text-white/20 uppercase tracking-widest mb-3 px-1">
                Campaign Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="e.g. Exclusive Launch: CNC Aluminum Brackets"
                className={`w-full px-5 py-4 bg-white/5 border rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${errors.title ? "border-red-500/50 bg-red-500/5" : "border-white/10"}`}
              />
              {errors.title && (
                <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mt-2 px-1">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black text-white/20 uppercase tracking-widest mb-3 px-1">
                Campaign Brief
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Explain the technical details, production timeline, and value proposition..."
                rows={4}
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-[10px] font-black text-white/20 uppercase tracking-widest mb-3 px-1">
                  Base Unit Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 text-sm font-black">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.basePrice}
                    onChange={(e) => setField("basePrice", e.target.value)}
                    placeholder="0.00"
                    className={`w-full pl-10 pr-5 py-4 bg-white/5 border rounded-2xl text-sm font-black focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${errors.basePrice ? "border-red-500/50" : "border-white/10"}`}
                  />
                </div>
                {errors.basePrice && (
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mt-2 px-1">{errors.basePrice}</p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-black text-white/20 uppercase tracking-widest mb-3 px-1">
                  Min Participants
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.minParticipants}
                  onChange={(e) => setField("minParticipants", e.target.value)}
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-black focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-white/20 uppercase tracking-widest mb-3 px-1">
                  Max Limit
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.maxParticipants}
                  onChange={(e) => setField("maxParticipants", e.target.value)}
                  placeholder="Unlimited"
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-black focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-white/20 uppercase tracking-widest mb-3 px-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  min={minDateTime}
                  value={form.startDate}
                  onChange={(e) => setField("startDate", e.target.value)}
                  className={`w-full px-5 py-4 bg-white/5 border rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white inverted-scheme-icon ${errors.startDate ? "border-red-500/50" : "border-white/10"}`}
                />
                {errors.startDate && (
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mt-2 px-1">{errors.startDate}</p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-black text-white/20 uppercase tracking-widest mb-3 px-1">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  min={form.startDate || minDateTime}
                  value={form.endDate}
                  onChange={(e) => setField("endDate", e.target.value)}
                  className={`w-full px-5 py-4 bg-white/5 border rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white inverted-scheme-icon ${errors.endDate ? "border-red-500/50" : "border-white/10"}`}
                />
                {errors.endDate && (
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mt-2 px-1">{errors.endDate}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Tiers */}
        <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] pointer-events-none" />
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">stacked_bar_chart</span>
                03. Pricing Milestones
              </h2>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                Tier incentives for volume scaling
              </p>
            </div>
            {form.tiers.length < 5 && (
              <button
                onClick={addTier}
                className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/70 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Add Milestone
              </button>
            )}
          </div>

          {errors.tiers && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-400">
              {errors.tiers}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {form.tiers.map((tier, index) => (
              <div
                key={index}
                className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-white/40">
                      #{index + 1}
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">
                        Tier Milestone {index + 1}
                      </span>
                      {index === 0 && (
                        <p className="text-[8px] font-black text-purple-400 uppercase tracking-widest mt-0.5">MINIMUM UNLOCK THRESHOLD</p>
                      )}
                    </div>
                  </div>
                  {form.tiers.length > 1 && (
                    <button
                      onClick={() => removeTier(index)}
                      className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[9px] font-black text-white/20 uppercase tracking-widest mb-2 px-1">
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
                      className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-sm font-black focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${errors[`tier_${index}`] ? "border-red-500/50" : "border-white/10"}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-white/20 uppercase tracking-widest mb-2 px-1">
                      Discount (%)
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
                      placeholder="e.g. 15"
                      className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-sm font-black focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${errors[`tier_${index}`] ? "border-red-500/50" : "border-white/10"}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-white/20 uppercase tracking-widest mb-2 px-1">
                      Discounted Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-xs font-black">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tier.discountedPrice}
                        onChange={(e) =>
                          setTierField(index, "discountedPrice", e.target.value)
                        }
                        placeholder="0.00"
                        className={`w-full pl-8 pr-4 py-3 bg-white/5 border rounded-xl text-sm font-black focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${errors[`tier_price_${index}`] ? "border-red-500/50" : "border-white/10"}`}
                      />
                    </div>
                  </div>
                </div>

                {(errors[`tier_${index}`] || errors[`tier_price_${index}`]) && (
                  <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mt-4 px-1">
                    {errors[`tier_${index}`] || errors[`tier_price_${index}`]}
                  </p>
                )}

                {tier.minQuantity &&
                  tier.discountPercent &&
                  tier.discountedPrice &&
                  form.basePrice && (
                    <div className="mt-6 flex items-center gap-2 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                      <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                        AT {tier.minQuantity} UNITS → ${tier.discountedPrice} PER UNIT ({tier.discountPercent}% OFF)
                      </p>
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>

        {/* Legal Terms */}
        <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8">
          <h2 className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">gavel</span>
            04. Legal Terms & Conditions
          </h2>
          <textarea
            value={form.termsAndConditions}
            onChange={(e) => setField("termsAndConditions", e.target.value)}
            placeholder="Cancellation policy, refund conditions, production timeline commitments..."
            rows={4}
            className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none"
          />
        </div>

        {/* Preview Panel */}
        {showPreview && form.productId && (
          <div className="bg-gradient-to-br from-purple-600/10 to-indigo-600/10 border border-purple-500/20 rounded-[2.5rem] p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 blur-[100px] pointer-events-none" />
            <h2 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-8 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              Manufacturer Preview
            </h2>
            <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
              {selectedProduct?.images?.[0]?.url && (
                <div className="relative w-32 h-32 rounded-3xl overflow-hidden shrink-0 border border-white/10 shadow-2xl">
                  <Image
                    src={selectedProduct.images[0].url}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-2xl font-black text-white tracking-tighter">
                  {form.title || "Campaign Title"}
                </h3>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">
                  {selectedProduct?.name} · {selectedProduct?.category}
                </p>
                <p className="text-sm text-white/60 mt-4 leading-relaxed font-medium">
                  {form.description || "Enter a description to see it here..."}
                </p>
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Base Price</p>
                    <p className="text-xl font-black text-white">${form.basePrice || "—"}</p>
                  </div>
                  {form.tiers
                    .filter((t) => t.minQuantity && t.discountedPrice)
                    .map((t, i) => (
                      <div key={i} className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
                        <p className="text-[9px] font-black text-emerald-400/40 uppercase tracking-widest mb-1">Tier {i + 1} Target</p>
                        <p className="text-xl font-black text-emerald-400">
                          {t.minQuantity} units → ${t.discountedPrice}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-4 pb-20 border-t border-white/5 pt-10">
          <Link
            href="/manufacturer/group-buys"
            className="px-8 py-3.5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
          >
            Discard Draft
          </Link>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-10 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center gap-3 shadow-2xl shadow-purple-500/40"
          >
            {saving ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-lg">rocket_launch</span>
            )}
            Publish Group Buy Campaign
          </button>
        </div>
      </div>
    </div>
  );
}
