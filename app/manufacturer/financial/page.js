// app/manufacturer/financial/page.js
"use client";

import GlobalNoResults from "@/components/ui/GlobalNoResults";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function ManufacturerFinancialPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders?limit=100");
      const data = await res.json();
      if (data.success) setOrders(data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated") {
      if (session.user.role !== "manufacturer") {
        router.push("/auth/login");
        return;
      }
      fetchOrders();
    }
  }, [status, session, router, fetchOrders]);

  const completedOrders = orders.filter((o) => o.status === "completed");
  const pendingPaymentOrders = orders.filter(
    (o) =>
      ["accepted", "in_production", "shipped"].includes(o.status) &&
      o.paymentStatus === "captured",
  );
  const refundedOrders = orders.filter((o) =>
    ["refunded", "partially_refunded"].includes(o.paymentStatus),
  );

  const totalRevenue = completedOrders.reduce(
    (s, o) => s + (o.totalPrice || 0),
    0,
  );
  const pendingRevenue = pendingPaymentOrders.reduce(
    (s, o) => s + (o.totalPrice || 0),
    0,
  );
  const refundedAmount = refundedOrders.reduce(
    (s, o) => s + (o.refundAmount || 0),
    0,
  );

  const filteredOrders =
    filter === "all"
      ? orders
      : filter === "completed"
        ? completedOrders
        : filter === "pending"
          ? pendingPaymentOrders
          : filter === "refunded"
            ? refundedOrders
            : orders;

  const PAYMENT_COLORS = {
    captured: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    authorized: "bg-[#eb9728]/10 border-[#eb9728]/20 text-[#eb9728]",
    pending: "bg-white/5 border-white/10 text-white/40",
    refunded: "bg-red-500/10 border-red-500/20 text-red-400",
    partially_refunded: "bg-orange-500/10 border-orange-500/20 text-orange-400",
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-[#eb9728] animate-spin" />
      </div>
    );
  }

  const PageContent = (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-12 space-y-6">
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728] mb-1">
          Financial Overview
        </p>
        <h1 className="text-3xl font-black tracking-tight">
          <span className="bg-gradient-to-r from-purple-500 via-orange-500 to-[#eb9728] bg-clip-text text-transparent inline-block">
            Financial Management
          </span>
        </h1>
        <p className="text-sm text-white/35 mt-1">
          Revenue overview and transaction history
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-gradient-to-br from-purple-600 via-orange-500 to-[#eb9728] p-[1px] rounded-[24px]">
          <div className="bg-[#0c0c11] rounded-[23px] p-6 h-full group hover:bg-[#0c0c11]/80 transition-all">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 mb-3">
              Total Revenue
            </p>
            <p className="text-3xl font-black text-white">
              ${totalRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-white/20 mt-1.5 font-medium">
              {completedOrders.length} completed orders
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 via-orange-500 to-[#eb9728] p-[1px] rounded-[24px] shadow-[0_0_30px_rgba(235,151,40,0.1)]">
          <div className="bg-[#0c0c11] rounded-[23px] p-6 h-full group hover:bg-[#0c0c11]/80 transition-all">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#eb9728] mb-3">
              Pending Release
            </p>
            <p className="text-3xl font-black text-[#eb9728]">
              ${pendingRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-[#eb9728]/40 mt-1.5 font-medium">
              {pendingPaymentOrders.length} orders in progress
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 via-orange-500 to-[#eb9728] p-[1px] rounded-[24px]">
          <div className="bg-[#0c0c11] rounded-[23px] p-6 h-full group hover:bg-[#0c0c11]/80 transition-all">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 mb-3">
              Refunds Issued
            </p>
            <p className="text-3xl font-black text-white/80">
              ${refundedAmount.toLocaleString()}
            </p>
            <p className="text-xs text-white/20 mt-1.5 font-medium">
              {refundedOrders.length} refunded orders
            </p>
          </div>
        </div>
      </div>

      {/* Payment policy note */}
      <div className="bg-white/[0.03] border-2 border-purple-500/30 rounded-2xl p-5 flex gap-4">
        <div className="h-10 w-10 rounded-xl bg-[#eb9728]/10 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[#eb9728] text-xl">
            info
          </span>
        </div>
        <div className="text-sm">
          <p className="font-bold text-white mb-1">How payments work</p>
          <p className="text-white/50 leading-relaxed">
            Customer payments are held by the platform until your order is
            marked completed. Upon completion, funds are released to your
            account minus any platform fees.
          </p>
        </div>
      </div>

      {/* Filter + table */}
      <div className="bg-white/[0.03] border-2 border-purple-500/30 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-base font-bold text-white">Transactions</h2>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "all", label: "All" },
              { key: "completed", label: "Released" },
              { key: "pending", label: "Pending" },
              { key: "refunded", label: "Refunded" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${
                  filter === f.key
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                    : "bg-white/[0.03] border-white/10 text-white/40 hover:bg-white/[0.06] hover:text-white/60"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="h-16 w-16 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-4xl text-white/15">
                payments
              </span>
            </div>
            <GlobalNoResults text="No transactions found" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/8">
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                    Order Number
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOrders.map((order) => (
                  <tr
                    key={order._id}
                    className="hover:bg-white/[0.01] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/manufacturer/orders/${order._id}`}
                        className="font-mono text-[11px] font-bold text-white/70 hover:text-[#eb9728] transition-colors"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-white/60 font-medium">
                      {order.customerId?.name || "—"}
                    </td>
                    <td className="px-6 py-4 text-[11px] text-white/30 font-medium">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${PAYMENT_COLORS[order.paymentStatus] || "bg-white/5 border-white/10 text-white/40"}`}
                      >
                        {order.paymentStatus?.replace("_", " ").toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-white">
                      ${order.totalPrice?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );

  return (
    <div className="bg-[#050507] text-white min-h-screen">
      {PageContent}
    </div>
  );
}
