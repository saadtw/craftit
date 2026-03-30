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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasParticipants = groupBuy.participants?.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/manufacturer/group-buys/${id}`}
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
              Edit Campaign
            </h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {hasParticipants && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            ⚠️ This campaign has {groupBuy.participants.length} participant(s).
            Only the end date can be extended.
          </div>
        )}

        {/* Campaign Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">
            Campaign Details
          </h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              disabled={hasParticipants}
              className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 ${hasParticipants ? "bg-slate-50 text-slate-400" : "border-slate-200"} ${errors.title ? "border-red-400" : ""}`}
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
              disabled={hasParticipants}
              rows={3}
              className={`w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none ${hasParticipants ? "bg-slate-50 text-slate-400" : ""}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Base Price (USD)
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
                disabled={hasParticipants}
                className={`w-full pl-7 pr-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 ${hasParticipants ? "bg-slate-50 text-slate-400" : "border-slate-200"} ${errors.basePrice ? "border-red-400" : ""}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Start Date
              </label>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => setField("startDate", e.target.value)}
                disabled={hasParticipants}
                className={`w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 ${hasParticipants ? "bg-slate-50 text-slate-400" : ""}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                End Date
                {hasParticipants && (
                  <span className="ml-1 text-xs text-amber-600">
                    (extend only)
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
                className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 ${errors.endDate ? "border-red-400" : "border-slate-200"}`}
              />
              {errors.endDate && (
                <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tiers (only if no participants) */}
        {!hasParticipants && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Pricing Tiers
            </h2>
            <div className="space-y-3">
              {form.tiers.map((tier, index) => (
                <div
                  key={index}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-200"
                >
                  <p className="text-sm font-semibold text-slate-700 mb-3">
                    Tier {index + 1}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        Min Units
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={tier.minQuantity}
                        onChange={(e) =>
                          setTierField(index, "minQuantity", e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
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
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        Price ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tier.discountedPrice}
                        onChange={(e) =>
                          setTierField(index, "discountedPrice", e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Terms */}
        {!hasParticipants && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Terms & Conditions
            </h2>
            <textarea
              value={form.termsAndConditions}
              onChange={(e) => setField("termsAndConditions", e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pb-8">
          <Link
            href={`/manufacturer/group-buys/${id}`}
            className="px-4 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-white transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
