// app/manufacturer/group-buys/[id]/edit/page.js
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function EditGroupBuyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = useParams();

  const [groupBuy, setGroupBuy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(null);
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
    const fetch_ = async () => {
      try {
        const res = await fetch(`/api/group-buys/${id}`);
        const data = await res.json();
        if (data.success) {
          const gb = data.groupBuy;

          // Cancelled/completed campaigns cannot be edited
          if (["completed", "cancelled"].includes(gb.status)) {
            router.push(`/manufacturer/group-buys/${id}`);
            return;
          }

          setGroupBuy(gb);

          // Only scheduled (no participants) can be fully edited
          // Active with participants: only endDate extension
          setForm({
            title: gb.title,
            description: gb.description || "",
            basePrice: gb.basePrice.toString(),
            tiers: gb.tiers.map((t) => ({
              tierNumber: t.tierNumber,
              minQuantity: t.minQuantity.toString(),
              discountPercent: t.discountPercent.toString(),
              discountedPrice: t.discountedPrice.toString(),
            })),
            minParticipants: gb.minParticipants.toString(),
            maxParticipants: gb.maxParticipants?.toString() || "",
            startDate: new Date(gb.startDate).toISOString().slice(0, 16),
            endDate: new Date(gb.endDate).toISOString().slice(0, 16),
            termsAndConditions: gb.termsAndConditions || "",
          });
        } else {
          router.push("/manufacturer/group-buys");
        }
      } catch (_) {
        router.push("/manufacturer/group-buys");
      }
      setLoading(false);
    };
    if (status === "authenticated") fetch_();
  }, [id, status, router]);

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
    setForm((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t, i) =>
        i === index ? { ...t, [key]: value } : t,
      ),
    }));
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

  const validate = () => {
    const e = {};
    if (!form.endDate) e.endDate = "End date required";
    if (
      form.endDate &&
      new Date(form.endDate) <= new Date(groupBuy.endDate) &&
      groupBuy.participants?.length > 0
    ) {
      e.endDate = "New end date must be later than current end date";
    }

    // Full validation only if no participants yet
    if (!groupBuy.participants?.length) {
      if (!form.title.trim()) e.title = "Title required";
      if (!form.basePrice || Number(form.basePrice) <= 0)
        e.basePrice = "Valid price required";
      if (!form.startDate) e.startDate = "Start date required";
      if (
        form.startDate &&
        form.endDate &&
        new Date(form.endDate) <= new Date(form.startDate)
      ) {
        e.endDate = "End date must be after start date";
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      let payload;

      if (groupBuy.participants?.length > 0) {
        // Only allow endDate extension
        payload = { endDate: form.endDate };
      } else {
        payload = {
          title: form.title,
          description: form.description,
          basePrice: Number(form.basePrice),
          tiers: form.tiers.map((t, i) => ({
            tierNumber: i + 1,
            minQuantity: Number(t.minQuantity),
            discountPercent: Number(t.discountPercent),
            discountedPrice: Number(t.discountedPrice),
          })),
          minParticipants: Number(form.minParticipants) || 1,
          maxParticipants: form.maxParticipants
            ? Number(form.maxParticipants)
            : undefined,
          startDate: form.startDate,
          endDate: form.endDate,
          termsAndConditions: form.termsAndConditions,
        };
      }

      const res = await fetch(`/api/group-buys/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/manufacturer/group-buys/${id}`);
      } else {
        alert(data.error || "Failed to save");
      }
    } catch (_) {
      alert("Something went wrong");
    }
    setSaving(false);
  };

  if (loading || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050507]">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasParticipants = groupBuy.participants?.length > 0;

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-20 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col gap-8 mb-10">
          <div className="flex items-center justify-between">
            <Link
              href={`/manufacturer/group-buys/${id}`}
              className="group flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-sm">arrow_back</span>
              </div>
              Discard Adjustments
            </Link>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-500/20"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-sm">save</span>
              )}
              Save Changes
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-purple-500 via-orange-500 to-[#eb9728] bg-clip-text text-transparent">
              Adjust Campaign
            </h1>
            <p className="text-sm text-white/35 font-medium">
              Fine-tune campaign parameters and extend active milestones
            </p>
          </div>
        </div>
        {hasParticipants && (
          <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-[2rem] flex items-center gap-4 shadow-lg shadow-amber-500/5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <span className="material-symbols-outlined">warning</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">ACTIVE CAMPAIGN PROTECTION</p>
              <p className="text-sm font-medium text-amber-400/80 mt-1">
                This campaign has {groupBuy.participants.length} participant(s). Only the end date can be extended to protect existing commitments.
              </p>
            </div>
          </div>
        )}

        {/* Campaign Architecture */}
        <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] pointer-events-none" />
          <h2 className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-8 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">campaign</span>
            Campaign Architecture
          </h2>

          <div className="grid grid-cols-1 gap-8">
            <div>
              <label className="block text-[10px] font-black text-white/20 uppercase tracking-widest mb-3 px-1">
                Campaign Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                disabled={hasParticipants}
                className={`w-full px-5 py-4 bg-white/5 border rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${hasParticipants ? "opacity-30 cursor-not-allowed" : "border-white/10 hover:border-white/20"} ${errors.title ? "border-red-500/50 bg-red-500/5" : ""}`}
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
                disabled={hasParticipants}
                rows={4}
                className={`w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none ${hasParticipants ? "opacity-30 cursor-not-allowed" : "hover:border-white/20"}`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-white/20 uppercase tracking-widest mb-3 px-1">
                Base Unit Price (USD)
              </label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 text-sm font-black">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.basePrice}
                  onChange={(e) => setField("basePrice", e.target.value)}
                  disabled={hasParticipants}
                  className={`w-full pl-10 pr-5 py-4 bg-white/5 border rounded-2xl text-sm font-black focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${hasParticipants ? "opacity-30 cursor-not-allowed" : "border-white/10 hover:border-white/20"} ${errors.basePrice ? "border-red-500/50" : ""}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-white/20 uppercase tracking-widest mb-3 px-1">
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setField("startDate", e.target.value)}
                  disabled={hasParticipants}
                  className={`w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white inverted-scheme-icon ${hasParticipants ? "opacity-30 cursor-not-allowed" : "hover:border-white/20"}`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-white/20 uppercase tracking-widest mb-3 px-1">
                  End Date
                  {hasParticipants && (
                    <span className="ml-2 text-[8px] text-amber-400 font-black tracking-widest uppercase bg-amber-500/10 px-2 py-0.5 rounded-full">
                      EXTENSION ONLY
                    </span>
                  )}
                </label>
                <input
                  type="datetime-local"
                  min={
                    hasParticipants
                      ? new Date(groupBuy.endDate).toISOString().slice(0, 16)
                      : minDateTime
                  }
                  value={form.endDate}
                  onChange={(e) => setField("endDate", e.target.value)}
                  className={`w-full px-5 py-4 bg-white/5 border rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white inverted-scheme-icon ${errors.endDate ? "border-red-500/50 bg-red-500/5" : "border-white/10 hover:border-white/20"}`}
                />
                {errors.endDate && (
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mt-2 px-1">{errors.endDate}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Milestones (only if no participants) */}
        {!hasParticipants && (
          <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] pointer-events-none" />
            <h2 className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-8 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">stacked_bar_chart</span>
              Pricing Milestones
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {form.tiers.map((tier, index) => (
                <div
                  key={index}
                  className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 hover:border-white/10 transition-all"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-white/40">
                      #{index + 1}
                    </div>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">
                      Tier Milestone {index + 1}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-[9px] font-black text-white/20 uppercase tracking-widest mb-2 px-1">
                        Min Units
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={tier.minQuantity}
                        onChange={(e) =>
                          setTierField(index, "minQuantity", e.target.value)
                        }
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-black focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
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
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-black focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-white/20 uppercase tracking-widest mb-2 px-1">
                        Price ($)
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
                          className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-black focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legal Terms */}
        {!hasParticipants && (
          <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8">
            <h2 className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">gavel</span>
              Legal Terms & Conditions
            </h2>
            <textarea
              value={form.termsAndConditions}
              onChange={(e) => setField("termsAndConditions", e.target.value)}
              rows={4}
              className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-4 pb-20 border-t border-white/5 pt-10">
          <Link
            href={`/manufacturer/group-buys/${id}`}
            className="px-8 py-3.5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
          >
            Discard Changes
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-10 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center gap-3 shadow-2xl shadow-purple-500/40"
          >
            {saving ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-lg">save</span>
            )}
            Apply Adjustments
          </button>
        </div>
      </div>
    </div>
  );
}
