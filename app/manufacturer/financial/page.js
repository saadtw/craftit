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
    captured: "bg-green-100 text-green-700",
    authorized: "bg-yellow-100 text-yellow-700",
    pending: "bg-gray-100 text-gray-600",
    refunded: "bg-red-100 text-red-700",
    partially_refunded: "bg-orange-100 text-orange-700",
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-linear-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white">
      <main className="container mx-auto px-4 sm:px-6 lg:px-10 py-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-blue-900">
            Financial Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Revenue overview and transaction history
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Total Revenue
            </p>
            <p className="text-2xl font-extrabold text-blue-900">
              ${totalRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {completedOrders.length} completed orders
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Pending Release
            </p>
            <p className="text-2xl font-extrabold text-amber-500">
              ${pendingRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {pendingPaymentOrders.length} orders in progress
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Refunds Issued
            </p>
            <p className="text-2xl font-extrabold text-red-500">
              ${refundedAmount.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {refundedOrders.length} refunded orders
            </p>
          </div>
        </div>

        {/* Payment policy note */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex gap-3">
          <span className="material-symbols-outlined text-blue-500 text-xl shrink-0 mt-0.5">
            info
          </span>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-0.5">How payments work</p>
            <p>
              Customer payments are held by the platform until your order is
              marked completed. Upon completion, funds are released to your
              account minus any platform fees.
            </p>
          </div>
        </div>

        {/* Filter + table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-bold text-blue-900">
              Transactions
            </span>
            <div className="flex gap-2 flex-wrap ml-auto">
              {[
                { key: "all", label: "All" },
                { key: "completed", label: "Released" },
                { key: "pending", label: "Pending" },
                { key: "refunded", label: "Refunded" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    filter === f.key
                      ? "bg-blue-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <span className="material-symbols-outlined text-4xl block mb-2">
                payments
              </span>
              <GlobalNoResults text="No transactions found" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3.5">
                        <Link
                          href={`/manufacturer/orders/${order._id}`}
                          className="font-mono text-xs font-bold text-blue-900 hover:text-orange-500"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-gray-600">
                        {order.customerId?.name || "—"}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PAYMENT_COLORS[order.paymentStatus] || "bg-gray-100 text-gray-500"}`}
                        >
                          {order.paymentStatus?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-blue-900">
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
    </div>
  );
}
