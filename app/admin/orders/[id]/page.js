// app/admin/orders/[id]/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiPackage, FiTruck, FiCheckCircle, FiClock, FiAlertCircle } from "react-icons/fi";

const STATUS_STYLES = {
  pending_acceptance: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20", dot: "bg-yellow-400" },
  accepted: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/20", dot: "bg-sky-400" },
  in_production: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20", dot: "bg-violet-400" },
  shipped: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", dot: "bg-blue-400" },
  completed: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", dot: "bg-emerald-400" },
  cancelled: { bg: "bg-white/[0.03]", text: "text-white/40", border: "border-white/5", dot: "bg-white/20" },
  disputed: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", dot: "bg-red-400" },
};

export default function AdminOrderDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      const data = await res.json();
      if (data.success) setOrder(data.order);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated") {
      if (session?.user?.role !== "admin") {
        router.push("/");
        return;
      }
      fetchOrder();
    }
  }, [status, session, router, fetchOrder]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#020617]">
        <GlobalLoader text="Loading..." />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#020617]">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <FiAlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-white text-xl font-black mb-4 tracking-tight">Order not found.</p>
        <Link href="/admin/orders" className="text-purple-500 hover:text-purple-400 font-bold text-sm">
          Return to Orders List
        </Link>
      </div>
    );
  }

  const timelineSteps = [
    { key: "pending_acceptance", label: "Order Placed" },
    { key: "accepted", label: "Accepted" },
    { key: "in_production", label: "In Production" },
    { key: "shipped", label: "Shipped" },
    { key: "completed", label: "Completed" },
  ];
  const statusOrder = ["pending_acceptance", "accepted", "in_production", "shipped", "completed"];
  const currentIdx = statusOrder.indexOf(order.status);
  const statusStyle = STATUS_STYLES[order.status] || STATUS_STYLES.cancelled;

  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-8 relative z-10">
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/10 via-[#020617]/0 to-[#020617]/0" />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Link */}
        <Link
          href="/admin/orders"
          className="group inline-flex items-center gap-3 text-slate-400 hover:text-white text-[11px] font-black tracking-[0.25em] uppercase transition-colors mb-2"
        >
          <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-400 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.2)] group-hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all">
            <FiArrowLeft className="w-3 h-3 text-[#020617] stroke-[3]" />
          </span>
          Back To Orders
        </Link>

        {/* Header */}
        <div className="relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-[28px] p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.1),transparent_40%)] pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <p className="text-purple-500 text-[11px] font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                <FiPackage className="w-4 h-4" />
                Order Record
              </p>
              <h1 className="text-3xl font-black text-white font-mono tracking-tight">
                {order.orderNumber}
              </h1>
            </div>
            <div className={`px-4 py-2 rounded-full border flex items-center gap-2 ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}>
              <span className={`w-2 h-2 rounded-full ${statusStyle.dot} animate-pulse`} />
              <span className="text-[11px] font-black uppercase tracking-widest">{order.status?.replace(/_/g, " ")}</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Status Timeline */}
          {order.status !== "cancelled" && (
            <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[24px] p-8">
              <h2 className="text-white text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                Order Timeline
              </h2>
              <div className="flex items-center gap-0">
                {timelineSteps.map((step, idx) => {
                  const isDone = currentIdx >= idx;
                  const isCurrent = currentIdx === idx;
                  return (
                    <div key={step.key} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center relative">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 ${
                            isDone
                              ? "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                              : "bg-white/[0.03] text-white/20 border border-white/5"
                          } ${isCurrent ? "ring-4 ring-purple-500/20" : ""}`}
                        >
                          {isDone ? <FiCheckCircle className="w-5 h-5" /> : idx + 1}
                        </div>
                        <p className={`text-[10px] font-black uppercase tracking-tighter mt-3 absolute -bottom-6 w-20 text-center ${isDone ? "text-white/60" : "text-white/20"}`}>
                          {step.label}
                        </p>
                      </div>
                      {idx < timelineSteps.length - 1 && (
                        <div className={`flex-1 h-[2px] mx-2 rounded-full transition-all duration-700 ${isDone && currentIdx > idx ? "bg-gradient-to-r from-purple-600 to-indigo-600" : "bg-white/5"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="h-6" /> {/* Spacer for absolute labels */}
            </div>
          )}

          {/* Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[24px] p-6">
              <h3 className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-4">Customer</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 font-black text-xl">
                  {order.customerId?.name?.charAt(0) || "C"}
                </div>
                <div>
                  <p className="text-white font-black">{order.customerId?.name || "—"}</p>
                  <p className="text-white/40 text-xs">{order.customerId?.email || "—"}</p>
                </div>
              </div>
              {order.customerId?._id && (
                <Link href={`/admin/users/${order.customerId._id}`} className="text-purple-500 hover:text-purple-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  View Profile <FiArrowLeft className="w-3 h-3 rotate-180" />
                </Link>
              )}
            </div>

            <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[24px] p-6">
              <h3 className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-4">Manufacturer</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 font-black text-xl">
                  {(order.manufacturerId?.businessName || order.manufacturerId?.name)?.charAt(0) || "M"}
                </div>
                <div>
                  <p className="text-white font-black truncate max-w-[200px]">{order.manufacturerId?.businessName || order.manufacturerId?.name || "—"}</p>
                  <p className="text-white/40 text-xs">{order.manufacturerId?.email || "—"}</p>
                </div>
              </div>
              {order.manufacturerId?._id && (
                <Link href={`/admin/users/${order.manufacturerId._id}`} className="text-indigo-500 hover:text-indigo-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  View Profile <FiArrowLeft className="w-3 h-3 rotate-180" />
                </Link>
              )}
            </div>
          </div>

              {/* Order Details */}
              <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[24px] p-6 sm:p-8 shadow-xl">
                <h2 className="text-white text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-8">
                  <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]" />
                  Order Details
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-white">
                  {[
                    ["Order Type", order.orderType?.replace(/_/g, " ")],
                    ["Quantity", order.quantity],
                    ["Total Amount", order.totalPrice ? `$${order.totalPrice.toLocaleString()}` : "—"],
                    ["Date Placed", new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })],
                    ["Payment", order.paymentStatus],
                    ["Carrier", order.carrier || "—"],
                    ["Tracking", order.trackingNumber || "—"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-purple-300/40 text-[10px] font-black uppercase tracking-widest mb-2">{label}</p>
                      <p className="text-white font-bold text-sm capitalize tracking-tight">{value || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

          {/* Milestones */}
          {order.milestones?.length > 0 && (
            <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[24px] p-6 sm:p-8 shadow-2xl">
              <h2 className="text-white text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6">
                <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                Production Milestones
              </h2>
              <div className="space-y-4">
                {order.milestones.map((ms, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-white/[0.01] border border-white/5 rounded-2xl hover:bg-white/[0.03] transition-colors group">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black transition-all ${ms.completed ? "bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]" : "bg-purple-500/10 text-purple-400 border border-purple-500/20"}`}>
                      {ms.completed ? <FiCheckCircle className="w-5 h-5" /> : idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-bold tracking-tight ${ms.completed ? "text-white" : "text-purple-100/60"}`}>
                        {ms.title || `Milestone ${idx + 1}`}
                      </p>
                    </div>
                    {ms.completedAt && (
                      <div className="text-right">
                        <p className="text-[10px] font-black text-purple-400/50 uppercase tracking-widest mb-0.5">Completed On</p>
                        <p className="text-[11px] font-bold text-white/60">
                          {new Date(ms.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked Dispute */}
          {order.disputeId && (
            <div className="relative overflow-hidden bg-red-500/5 backdrop-blur-md border border-red-500/20 rounded-[24px] p-6 sm:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.1),transparent_40%)] pointer-events-none" />
              <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500">
                    <FiAlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-white font-black uppercase tracking-widest text-sm mb-1">Active Dispute</h2>
                    <p className="text-white/40 text-xs">This order has an associated dispute record</p>
                  </div>
                </div>
                <Link
                  href={`/admin/disputes/${order.disputeId}`}
                  className="w-full sm:w-auto px-8 py-4 bg-red-500 hover:bg-red-600 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)] flex items-center justify-center gap-2"
                >
                  View Dispute Record
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
