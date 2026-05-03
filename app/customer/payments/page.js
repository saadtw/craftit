// app/customer/payments/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

const STATUS_COLORS = {
  authorized: "bg-[#eb9728]/10 text-[#eb9728] border border-[#eb9728]/20",
  captured: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20",
  pending: "bg-white/[0.04] text-white/50 border border-white/10",
  refunded: "bg-blue-500/10 text-blue-300 border border-blue-500/20",
  partially_refunded: "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20",
  failed: "bg-red-500/10 text-red-300 border border-red-500/20",
};

export default function CustomerPaymentsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders?limit=50");
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
      if (session.user.role !== "customer") {
        router.push("/auth/login");
        return;
      }
      fetchOrders();
    }
  }, [status, session, router, fetchOrders]);

  const filtered =
    filter === "all"
      ? orders
      : orders.filter((o) => o.paymentStatus === filter);

  const totalSpent = orders
    .filter((o) => o.paymentStatus === "captured")
    .reduce((s, o) => s + (o.totalPrice || 0), 0);

  const totalRefunded = orders
    .filter((o) => ["refunded", "partially_refunded"].includes(o.paymentStatus))
    .reduce((s, o) => s + (o.refundAmount || o.totalPrice || 0), 0);

  if (status === "loading" || loading) {
    return <GlobalLoader fullScreen text="Loading payments..." />;
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6 space-y-7">
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0c0c11] p-6 sm:p-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.13),transparent_32%),radial-gradient(circle_at_left,rgba(235,151,40,0.12),transparent_28%)] pointer-events-none" />

          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#eb9728]">
              Customer Billing
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Payments & Transactions
            </h1>
            <p className="mt-2 text-sm text-white/50">
              Review completed payments, authorizations, refunds, and
              order-linked transaction records.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SummaryCard
            label="Total Spent"
            value={`$${totalSpent.toLocaleString()}`}
            sub={`${orders.filter((o) => o.paymentStatus === "captured").length} completed payments`}
            icon="payments"
            accent
          />

          <SummaryCard
            label="Total Refunded"
            value={`$${totalRefunded.toLocaleString()}`}
            sub={`${
              orders.filter((o) =>
                ["refunded", "partially_refunded"].includes(o.paymentStatus),
              ).length
            } refunds processed`}
            icon="currency_exchange"
          />
        </section>

        <section className="rounded-[24px] border border-white/8 bg-[#0c0c11] p-4">
          <div className="flex flex-wrap gap-2">
            {["all", "authorized", "captured", "refunded", "pending"].map(
              (f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-xl border px-4 py-2 text-xs font-bold capitalize transition-all ${
                    filter === f
                      ? "border-[#eb9728] bg-[#eb9728] text-white"
                      : "border-white/10 bg-white/[0.03] text-white/60 hover:border-[#eb9728]/45 hover:text-white"
                  }`}
                >
                  {f.replace("_", " ")}
                </button>
              ),
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-white/8 bg-[#0c0c11]">
          {filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-[#eb9728]/20 bg-[#eb9728]/10 text-[#eb9728]">
                <span className="material-symbols-outlined text-5xl">
                  receipt_long
                </span>
              </div>
              <p className="text-lg font-black text-white">
                No transactions found
              </p>
              <p className="mt-2 text-sm text-white/45">
                Try changing the payment filter or check again later.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/6">
              {filtered.map((order) => (
                <Link key={order._id} href={`/customer/orders/${order._id}`}>
                  <div className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.035]">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                        order.paymentStatus === "captured"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                          : order.paymentStatus === "refunded" ||
                              order.paymentStatus === "partially_refunded"
                            ? "border-blue-500/20 bg-blue-500/10 text-blue-300"
                            : order.paymentStatus === "authorized"
                              ? "border-[#eb9728]/20 bg-[#eb9728]/10 text-[#eb9728]"
                              : order.paymentStatus === "failed"
                                ? "border-red-500/20 bg-red-500/10 text-red-300"
                                : "border-white/10 bg-white/[0.04] text-white/45"
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {order.paymentStatus === "refunded" ||
                        order.paymentStatus === "partially_refunded"
                          ? "currency_exchange"
                          : order.paymentStatus === "captured"
                            ? "check_circle"
                            : order.paymentStatus === "failed"
                              ? "error"
                              : "payments"}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white group-hover:text-[#eb9728]">
                        {order.productDetails?.name || "Order"}
                      </p>
                      <p className="mt-0.5 text-xs text-white/40">
                        {order.orderNumber} ·{" "}
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="font-black text-white">
                        ${order.totalPrice?.toLocaleString()}
                      </p>
                      <span
                        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          STATUS_COLORS[order.paymentStatus] ||
                          "bg-white/[0.04] text-white/50 border border-white/10"
                        }`}
                      >
                        {order.paymentStatus?.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <p className="text-center text-xs text-white/35">
          Payment processing powered by Stripe. All amounts in USD.
        </p>
      </main>
    </div>
  );
}

function SummaryCard({ label, value, sub, icon, accent = false }) {
  return (
    <div
      className={`rounded-[24px] border bg-[#0c0c11] p-5 ${
        accent ? "border-[#eb9728]/25" : "border-white/8"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/35">
            {label}
          </p>
          <p
            className={`mt-2 text-3xl font-black ${
              accent ? "text-[#eb9728]" : "text-white"
            }`}
          >
            {value}
          </p>
          <p className="mt-1 text-xs text-white/35">{sub}</p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
            accent
              ? "border-[#eb9728]/20 bg-[#eb9728]/10 text-[#eb9728]"
              : "border-blue-500/20 bg-blue-500/10 text-blue-300"
          }`}
        >
          <span className="material-symbols-outlined text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}
