// app/manufacturer/group-buys/[id]/page.js
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Editor3DWrapper from "../../../../modules/components/Editor3DWrapper";

const STATUS_STYLES = {
  active: "bg-emerald-100 text-emerald-700",
  scheduled: "bg-blue-100 text-blue-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-600",
};

function Countdown({ endDate }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endDate) - new Date();
      if (diff <= 0) {
        setRemaining("Ended");
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${d}d ${h}h ${m}m ${s}s`);
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [endDate]);

  return <span className="font-mono font-semibold">{remaining}</span>;
}

export default function GroupBuyDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = useParams();

  const [groupBuy, setGroupBuy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && session?.user?.role !== "manufacturer")
      router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch(`/api/group-buys/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success) setGroupBuy(data.groupBuy);
        else router.push("/manufacturer/group-buys");
      })
      .catch(() => {
        if (!cancelled) router.push("/manufacturer/group-buys");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, id, router, refreshKey]);

  const handleAction = async (action) => {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/group-buys/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) setRefreshKey((k) => k + 1);
      else alert(data.error);
    } catch (_) {}
    setActionLoading(null);
  };

  const handleCancel = async () => {
    const reason = prompt("Reason for cancellation:");
    if (reason === null) return;
    try {
      const res = await fetch(`/api/group-buys/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.success) setRefreshKey((k) => k + 1);
      else alert(data.error);
    } catch (_) {}
  };

  const exportParticipants = () => {
    if (!groupBuy?.participants?.length) return;
    const rows = [
      ["Participant #", "Quantity", "Unit Price", "Total", "Joined At"],
      ...groupBuy.participants.map((p, i) => [
        i + 1,
        p.quantity,
        p.unitPrice || groupBuy.basePrice,
        p.totalPrice || "",
        new Date(p.joinedAt).toLocaleDateString(),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `group-buy-participants-${id}.csv`;
    a.click();
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!groupBuy) return null;

  const product = groupBuy.productId;
  const primaryImage =
    product?.images?.find((i) => i.isPrimary)?.url || product?.images?.[0]?.url;
  const revenuePotential =
    (groupBuy.currentQuantity || 0) *
    (groupBuy.currentDiscountedPrice || groupBuy.basePrice);
  const activeTier =
    groupBuy.currentTierIndex >= 0
      ? groupBuy.tiers[groupBuy.currentTierIndex]
      : null;
  const nextTier = groupBuy.tiers[groupBuy.currentTierIndex + 1] || null;
  const hasProductModel3D = Boolean(product?.model3D?.url);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
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
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-900 line-clamp-1">
                {groupBuy.title}
              </h1>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[groupBuy.status]}`}
              >
                {groupBuy.status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {groupBuy.status === "active" && (
              <button
                onClick={() => handleAction("pause")}
                disabled={actionLoading === "pause"}
                className="px-3 py-2 text-sm text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
              >
                Pause
              </button>
            )}
            {groupBuy.status === "paused" && (
              <>
                <button
                  onClick={() => handleAction("resume")}
                  disabled={actionLoading === "resume"}
                  className="px-3 py-2 text-sm text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50"
                >
                  Resume
                </button>
                <button
                  onClick={() => handleAction("end_early")}
                  disabled={actionLoading === "end_early"}
                  className="px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  End Early
                </button>
              </>
            )}
            {groupBuy.status === "active" && (
              <button
                onClick={() => handleAction("end_early")}
                disabled={actionLoading === "end_early"}
                className="px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                End Early
              </button>
            )}
            {["scheduled", "active", "paused"].includes(groupBuy.status) && (
              <Link
                href={`/manufacturer/group-buys/${id}/edit`}
                className="px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit
              </Link>
            )}
            {["active", "scheduled", "paused"].includes(groupBuy.status) && (
              <button
                onClick={handleCancel}
                className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">
                Product
              </h3>
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                  {primaryImage ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={primaryImage}
                        alt={product?.name || ""}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-slate-300"
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
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    {product?.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-slate-500">
                      {product?.category}
                    </p>
                    {hasProductModel3D && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-slate-900 text-white">
                        3D Model
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/manufacturer/products/${product?._id}`}
                    className="text-xs text-slate-400 underline hover:text-slate-600 mt-1 inline-block"
                  >
                    View product →
                  </Link>
                </div>
              </div>
              {groupBuy.description && (
                <p className="text-sm text-slate-600 mt-4 pt-4 border-t border-slate-100">
                  {groupBuy.description}
                </p>
              )}
              {hasProductModel3D && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
                    Product 3D Preview
                  </h4>
                  <Editor3DWrapper
                    modelUrl={product.model3D.url}
                    initialAnnotations={product.model3D.annotations || []}
                    initialCameraState={product.model3D.cameraState || null}
                    readOnly={true}
                    onSave={() => {}}
                  />
                </div>
              )}
            </div>

            {/* Tier Progress */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">
                Tier Progress
              </h3>
              <div className="space-y-4">
                {groupBuy.tiers.map((tier, i) => {
                  const isUnlocked = groupBuy.currentTierIndex >= i;
                  const isActive = groupBuy.currentTierIndex === i;
                  const progress = Math.min(
                    100,
                    Math.round(
                      (groupBuy.currentQuantity / tier.minQuantity) * 100,
                    ),
                  );

                  return (
                    <div
                      key={i}
                      className={`p-4 rounded-xl border ${isActive ? "border-emerald-300 bg-emerald-50" : isUnlocked ? "border-slate-200 bg-slate-50" : "border-slate-200"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isUnlocked ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}
                          >
                            {isUnlocked ? "✓" : i + 1}
                          </span>
                          <span className="text-sm font-medium text-slate-900">
                            Tier {i + 1}
                          </span>
                          {isActive && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">
                            ${tier.discountedPrice}/unit
                          </p>
                          <p className="text-xs text-emerald-600">
                            {tier.discountPercent}% off
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                        <span>Unlocks at {tier.minQuantity} total units</span>
                        <span>·</span>
                        <span>
                          {groupBuy.currentQuantity} / {tier.minQuantity}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isUnlocked ? "bg-emerald-500" : "bg-slate-400"}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {nextTier && (
                <p className="text-xs text-slate-500 mt-3 text-center">
                  {nextTier.minQuantity - groupBuy.currentQuantity} more units
                  needed to unlock Tier {groupBuy.currentTierIndex + 2}
                </p>
              )}
            </div>

            {/* Participants */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Participants ({groupBuy.currentParticipantCount})
                </h3>
                {groupBuy.participants?.length > 0 && (
                  <button
                    onClick={exportParticipants}
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
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Export CSV
                  </button>
                )}
              </div>

              {!groupBuy.participants?.length ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  No participants yet
                </p>
              ) : (
                <div className="space-y-2">
                  {groupBuy.participants.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-xs font-semibold text-slate-600">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm text-slate-600">
                            Participant #{i + 1}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(p.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {p.quantity} units
                        </p>
                        {p.unitPrice && (
                          <p className="text-xs text-slate-400">
                            ${p.unitPrice}/unit
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Live Stats */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">
                Live Stats
              </h3>
              <div className="space-y-3">
                {[
                  {
                    label: "Participants",
                    value: groupBuy.currentParticipantCount,
                  },
                  { label: "Total Units", value: groupBuy.currentQuantity },
                  {
                    label: "Current Price",
                    value: `$${groupBuy.currentDiscountedPrice || groupBuy.basePrice}/unit`,
                  },
                  {
                    label: "Revenue Potential",
                    value: `$${revenuePotential.toLocaleString()}`,
                  },
                  {
                    label: "Active Tier",
                    value: activeTier
                      ? `Tier ${groupBuy.currentTierIndex + 1}`
                      : "None unlocked",
                  },
                ].map((s) => (
                  <div key={s.label} className="flex justify-between text-sm">
                    <span className="text-slate-500">{s.label}</span>
                    <span className="font-semibold text-slate-900">
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Countdown */}
            {["active", "paused", "scheduled"].includes(groupBuy.status) && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">
                  {groupBuy.status === "scheduled"
                    ? "Starts In"
                    : "Time Remaining"}
                </h3>
                <p className="text-2xl text-slate-900">
                  <Countdown
                    endDate={
                      groupBuy.status === "scheduled"
                        ? groupBuy.startDate
                        : groupBuy.endDate
                    }
                  />
                </p>
                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <p>Start: {new Date(groupBuy.startDate).toLocaleString()}</p>
                  <p>End: {new Date(groupBuy.endDate).toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* Pricing */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Pricing
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Base Price</span>
                  <span className="font-semibold text-slate-900">
                    ${groupBuy.basePrice}
                  </span>
                </div>
                {groupBuy.tiers.map((t, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-slate-500">
                      Tier {i + 1} ({t.minQuantity}+ units)
                    </span>
                    <span
                      className={`font-semibold ${groupBuy.currentTierIndex >= i ? "text-emerald-600" : "text-slate-900"}`}
                    >
                      ${t.discountedPrice}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Limits */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Limits
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Min Participants</span>
                  <span className="font-semibold text-slate-900">
                    {groupBuy.minParticipants}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Max Participants</span>
                  <span className="font-semibold text-slate-900">
                    {groupBuy.maxParticipants || "No limit"}
                  </span>
                </div>
              </div>
            </div>

            {/* Terms */}
            {groupBuy.termsAndConditions && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">
                  Terms & Conditions
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {groupBuy.termsAndConditions}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
