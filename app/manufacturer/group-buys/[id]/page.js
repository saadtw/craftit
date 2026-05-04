// app/manufacturer/group-buys/[id]/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Editor3DWrapper from "../../../../modules/components/Editor3DWrapper";

const STATUS_STYLES = {
  active: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  scheduled: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  paused: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  completed: "bg-white/5 text-white/40 border border-white/10",
  cancelled: "bg-red-500/10 text-red-400 border border-red-500/20",
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

  return <span className="font-black tracking-tighter">{remaining}</span>;
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
    return <GlobalLoader fullScreen text="Loading campaign..." />;
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
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-20">
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
              {groupBuy.status === "active" && (
                <button
                  onClick={() => handleAction("pause")}
                  disabled={actionLoading === "pause"}
                  className="px-5 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-50"
                >
                  Pause Campaign
                </button>
              )}
              {groupBuy.status === "paused" && (
                <button
                  onClick={() => handleAction("resume")}
                  disabled={actionLoading === "resume"}
                  className="px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                >
                  Resume Campaign
                </button>
              )}
              {["active", "paused"].includes(groupBuy.status) && (
                <button
                  onClick={() => handleAction("end_early")}
                  disabled={actionLoading === "end_early"}
                  className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                >
                  End Early
                </button>
              )}
              {["scheduled", "active", "paused"].includes(groupBuy.status) && (
                <Link
                  href={`/manufacturer/group-buys/${id}/edit`}
                  className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/70 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  Edit Campaign
                </Link>
              )}
              {["active", "scheduled", "paused"].includes(groupBuy.status) && (
                <button
                  onClick={handleCancel}
                  className="px-5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/20 transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-purple-500 via-orange-500 to-[#eb9728] bg-clip-text text-transparent">
                {groupBuy.title}
              </h1>
              <span
                className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full ${STATUS_STYLES[groupBuy.status]}`}
              >
                {groupBuy.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-sm text-white/35 font-medium">
              Campaign detailed performance and participant management
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Product Card */}
            <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[100px] pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                    Campaign Product
                  </h3>
                  <Link
                    href={`/manufacturer/products/${product?._id}`}
                    className="text-[10px] font-black text-purple-400 uppercase tracking-widest hover:text-purple-300 transition-colors flex items-center gap-1"
                  >
                    View product <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="w-48 h-48 bg-white/5 border border-white/10 rounded-3xl overflow-hidden shrink-0 group-hover:border-white/20 transition-colors">
                    {primaryImage ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={primaryImage}
                          alt={product?.name || ""}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-1000"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-20">
                        <span className="material-symbols-outlined text-6xl">inventory_2</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-3xl font-black text-white tracking-tighter mb-2">
                      {product?.name}
                    </h2>
                    <div className="flex items-center gap-3 mb-6">
                      <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white/40">
                        {product?.category}
                      </span>
                      {hasProductModel3D && (
                        <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-[10px] font-black uppercase tracking-widest text-purple-400">
                          3D INTERACTIVE
                        </span>
                      )}
                    </div>
                    {groupBuy.description && (
                      <p className="text-sm text-white/40 leading-relaxed font-medium">
                        {groupBuy.description}
                      </p>
                    )}
                  </div>
                </div>

                {hasProductModel3D && (
                  <div className="mt-8 pt-8 border-t border-white/5">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-[10px] font-black text-white/20 uppercase tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">view_in_ar</span>
                        Interactive 3D Preview
                      </h4>
                    </div>
                    <div className="rounded-3xl overflow-hidden border border-white/10 bg-[#050507]">
                      <Editor3DWrapper
                        modelUrl={product.model3D.url}
                        initialAnnotations={product.model3D.annotations || []}
                        initialCameraState={product.model3D.cameraState || null}
                        readOnly={true}
                        onSave={() => {}}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tier Progress */}
            <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] pointer-events-none" />
              <h3 className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-8">
                Pricing Tiers & Milestones
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className={`p-6 rounded-3xl border transition-all ${
                        isActive 
                        ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]" 
                        : isUnlocked 
                          ? "bg-white/5 border-white/20" 
                          : "bg-white/[0.02] border-white/5 opacity-40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                            isUnlocked ? "bg-emerald-500 text-white" : "bg-white/5 text-white/20 border border-white/10"
                          }`}>
                            {isUnlocked ? <span className="material-symbols-outlined text-sm">check</span> : i + 1}
                          </div>
                          <div>
                            <p className="text-xs font-black text-white uppercase tracking-widest">Tier {i + 1}</p>
                            {isActive && (
                              <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-0.5">CURRENTLY ACTIVE</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-white tracking-tighter">
                            ${tier.discountedPrice}
                          </p>
                          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                            {tier.discountPercent}% OFF
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em]">
                          <span className="text-white/20">Target: {tier.minQuantity} units</span>
                          <span className={isUnlocked ? "text-emerald-400" : "text-white/40"}>{progress}%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${
                              isUnlocked ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-white/10"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {nextTier && (
                <div className="mt-8 p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-center">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                    <span className="text-purple-400">{nextTier.minQuantity - groupBuy.currentQuantity} MORE UNITS</span> UNTIL TIER {groupBuy.currentTierIndex + 2}
                  </p>
                </div>
              )}
            </div>

            {/* Participants Table */}
            <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">
                    Order History
                  </h3>
                  <h4 className="text-xl font-black text-white tracking-tight">
                    All Participants ({groupBuy.currentParticipantCount})
                  </h4>
                </div>
                {groupBuy.participants?.length > 0 && (
                  <button
                    onClick={exportParticipants}
                    className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/70 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                    Export CSV
                  </button>
                )}
              </div>

              {!groupBuy.participants?.length ? (
                <div className="text-center py-16 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                  <span className="material-symbols-outlined text-4xl text-white/10 mb-4">group_off</span>
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                    No active participants yet
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 border-b border-white/5">
                        <th className="text-left py-4 px-4 font-black">#</th>
                        <th className="text-left py-4 px-4 font-black">Participant ID</th>
                        <th className="text-left py-4 px-4 font-black">Joined At</th>
                        <th className="text-center py-4 px-4 font-black">Quantity</th>
                        <th className="text-right py-4 px-4 font-black">Unit Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {groupBuy.participants.map((p, i) => (
                        <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 px-4">
                            <span className="text-[10px] font-black text-white/20">{i + 1}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-xs font-black text-white/70">PRT-{i + 1001}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-xs font-bold text-white/40">{new Date(p.joinedAt).toLocaleDateString()}</span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="px-3 py-1 bg-white/5 rounded-lg text-xs font-black text-white">{p.quantity}</span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="text-xs font-black text-emerald-400">${p.unitPrice || groupBuy.basePrice}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            {/* Countdown Widget */}
            {["active", "paused", "scheduled"].includes(groupBuy.status) && (
              <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[2.5rem] p-8 shadow-2xl shadow-purple-500/20 relative overflow-hidden group">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/20 blur-[60px] rounded-full group-hover:scale-150 transition-transform duration-1000" />
                <div className="relative z-10">
                  <h3 className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    {groupBuy.status === "scheduled" ? "LAUNCH COUNTDOWN" : "TIME REMAINING"}
                  </h3>
                  <div className="text-4xl font-black tracking-tighter text-white drop-shadow-lg">
                    <Countdown
                      endDate={
                        groupBuy.status === "scheduled"
                          ? groupBuy.startDate
                          : groupBuy.endDate
                      }
                    />
                  </div>
                  <div className="mt-8 space-y-3 pt-6 border-t border-white/10">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/40">
                      <span>START DATE</span>
                      <span className="text-white">{new Date(groupBuy.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/40">
                      <span>EXPIRY DATE</span>
                      <span className="text-white">{new Date(groupBuy.endDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Performance Stats */}
            <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden">
              <h3 className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-8 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">insights</span>
                Campaign Performance
              </h3>
              <div className="space-y-6">
                {[
                  {
                    label: "Active Participants",
                    value: groupBuy.currentParticipantCount,
                    icon: "groups",
                    color: "text-blue-400"
                  },
                  { 
                    label: "Total Units Sold", 
                    value: groupBuy.currentQuantity,
                    icon: "inventory",
                    color: "text-purple-400"
                  },
                  {
                    label: "Current Price Point",
                    value: `$${groupBuy.currentDiscountedPrice || groupBuy.basePrice}`,
                    icon: "tag",
                    color: "text-[#eb9728]"
                  },
                  {
                    label: "Estimated Revenue",
                    value: `$${revenuePotential.toLocaleString()}`,
                    icon: "payments",
                    color: "text-emerald-400"
                  },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-4 group/item">
                    <div className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${s.color} group-hover/item:scale-110 transition-transform`}>
                      <span className="material-symbols-outlined text-lg">{s.icon}</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">{s.label}</p>
                      <p className="text-lg font-black text-white tracking-tight">{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing Matrix */}
            <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8">
              <h3 className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-6">
                Pricing Matrix
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">BASE PRICE</span>
                  <span className="text-sm font-black text-white">${groupBuy.basePrice}</span>
                </div>
                {groupBuy.tiers.map((t, i) => (
                  <div key={i} className={`flex justify-between items-center p-3 rounded-2xl border transition-all ${
                    groupBuy.currentTierIndex >= i ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white/[0.02] border-white/5"
                  }`}>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">TIER {i + 1} ({t.minQuantity}+)</span>
                    <span className={`text-sm font-black ${groupBuy.currentTierIndex >= i ? "text-emerald-400" : "text-white/60"}`}>
                      ${t.discountedPrice}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Constraints */}
            <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8">
              <h3 className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-6">
                Campaign Limits
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/40 font-bold uppercase tracking-widest text-[9px]">Min Participants</span>
                  <span className="font-black text-white">{groupBuy.minParticipants}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/40 font-bold uppercase tracking-widest text-[9px]">Max Participants</span>
                  <span className="font-black text-white">{groupBuy.maxParticipants || "UNLIMITED"}</span>
                </div>
              </div>
            </div>

            {/* Terms */}
            {groupBuy.termsAndConditions && (
              <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8">
                <h3 className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-4">
                  Legal Terms
                </h3>
                <p className="text-xs text-white/40 leading-relaxed font-medium">
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
