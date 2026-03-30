// app/customer/payments/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

const STATUS_COLORS = {
  authorized: "bg-yellow-100 text-yellow-700",
  captured: "bg-green-100 text-green-700",
  pending: "bg-gray-100 text-gray-600",
  refunded: "bg-blue-100 text-blue-700",
  partially_refunded: "bg-cyan-100 text-cyan-700",
  failed: "bg-red-100 text-red-700",
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
    return (
      <div className="flex h-screen bg-[#f8f7f6]">
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-[#eb9728] rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8f7f6]">
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-center h-16 px-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <span className="text-lg font-bold text-gray-900">
            Payments & Transactions
          </span>
        </header>

        <div className="p-8 max-w-4xl mx-auto space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">
                Total Spent
              </p>
              <p className="text-2xl font-extrabold text-gray-900">
                ${totalSpent.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {orders.filter((o) => o.paymentStatus === "captured").length}{" "}
                completed payments
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">
                Total Refunded
              </p>
              <p className="text-2xl font-extrabold text-blue-600">
                ${totalRefunded.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {
                  orders.filter((o) =>
                    ["refunded", "partially_refunded"].includes(
                      o.paymentStatus,
                    ),
                  ).length
                }{" "}
                refunds processed
              </p>
            </div>
          </div>

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {["all", "authorized", "captured", "refunded", "pending"].map(
              (f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    filter === f
                      ? "bg-[#eb9728] text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-[#eb9728]"
                  }`}
                >
                  {f}
                </button>
              ),
            )}
          </div>

          {/* Transaction list */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <span className="material-symbols-outlined text-4xl block mb-2">
                  receipt_long
                </span>
                <p className="text-sm">No transactions found.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((order) => (
                  <Link key={order._id} href={`/customer/orders/${order._id}`}>
                    <div className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                      {/* Icon */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          order.paymentStatus === "captured"
                            ? "bg-green-100 text-green-600"
                            : order.paymentStatus === "refunded"
                              ? "bg-blue-100 text-blue-600"
                              : order.paymentStatus === "authorized"
                                ? "bg-yellow-100 text-yellow-600"
                                : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <span className="material-symbols-outlined text-lg">
                          {order.paymentStatus === "refunded"
                            ? "currency_exchange"
                            : order.paymentStatus === "captured"
                              ? "check_circle"
                              : "payments"}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {order.productDetails?.name || "Order"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {order.orderNumber} ·{" "}
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Status + amount */}
                      <div className="text-right shrink-0">
                        <p className="font-bold text-gray-900">
                          ${order.totalPrice?.toLocaleString()}
                        </p>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.paymentStatus] || "bg-gray-100 text-gray-500"}`}
                        >
                          {order.paymentStatus?.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 text-center">
            Payment processing powered by Stripe. All amounts in USD.
          </p>
        </div>
      </main>
    </div>
  );
}
