// app/admin/orders/[id]/page.js
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const STATUS_COLORS = {
  pending_acceptance: "bg-yellow-900/40 text-yellow-400 border-yellow-800/40",
  accepted: "bg-sky-900/40 text-sky-400 border-sky-800/40",
  in_production: "bg-violet-900/40 text-violet-400 border-violet-800/40",
  shipped: "bg-blue-900/40 text-blue-400 border-blue-800/40",
  completed: "bg-emerald-900/40 text-emerald-400 border-emerald-800/40",
  cancelled: "bg-slate-800 text-slate-500 border-slate-700",
  disputed: "bg-red-900/40 text-red-400 border-red-800/40",
};

export default function AdminOrderDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

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
  }, [status, session, id]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      const data = await res.json();
      if (data.success) setOrder(data.order);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Order not found.</p>
        <Link
          href="/admin/orders"
          className="text-amber-500 text-sm mt-2 inline-block"
        >
          ← Back to Orders
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
  const statusOrder = [
    "pending_acceptance",
    "accepted",
    "in_production",
    "shipped",
    "completed",
  ];
  const currentIdx = statusOrder.indexOf(order.status);

  return (
    <div className="p-8 max-w-4xl">
      <Link
        href="/admin/orders"
        className="text-slate-500 hover:text-slate-300 text-sm transition-colors mb-6 inline-block"
      >
        ← Back to Orders
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl font-bold text-slate-50 font-mono">
          {order.orderNumber}
        </h1>
        <span
          className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${STATUS_COLORS[order.status] || "bg-slate-800 text-slate-400 border-slate-700"}`}
        >
          {order.status?.replace(/_/g, " ")}
        </span>
        {order.hasDispute && (
          <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-red-900/40 text-red-400 border border-red-800/40">
            Disputed
          </span>
        )}
      </div>

      <div className="space-y-6">
        {/* Status Timeline */}
        {order.status !== "cancelled" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-4">
              Order Timeline
            </h2>
            <div className="flex items-center gap-0">
              {timelineSteps.map((step, idx) => {
                const isDone = currentIdx >= idx;
                const isCurrent = currentIdx === idx;
                return (
                  <div
                    key={step.key}
                    className="flex items-center flex-1 last:flex-none"
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          isDone
                            ? "bg-amber-600 text-white"
                            : "bg-slate-800 text-slate-600 border border-slate-700"
                        } ${isCurrent ? "ring-2 ring-amber-500/30" : ""}`}
                      >
                        {isDone ? "✓" : idx + 1}
                      </div>
                      <p
                        className={`text-xs mt-1.5 text-center w-16 ${isDone ? "text-slate-300" : "text-slate-600"}`}
                      >
                        {step.label}
                      </p>
                    </div>
                    {idx < timelineSteps.length - 1 && (
                      <div
                        className={`flex-1 h-px mx-1 ${isDone && currentIdx > idx ? "bg-amber-600" : "bg-slate-800"}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Parties */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-3">
              Customer
            </h2>
            <p className="text-slate-200 font-medium">
              {order.customerId?.name || "—"}
            </p>
            <p className="text-slate-500 text-sm">
              {order.customerId?.email || "—"}
            </p>
            {order.customerId?._id && (
              <Link
                href={`/admin/users/${order.customerId._id}`}
                className="text-amber-500 text-xs mt-2 inline-block hover:text-amber-400"
              >
                View Profile →
              </Link>
            )}
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-3">
              Manufacturer
            </h2>
            <p className="text-slate-200 font-medium">
              {order.manufacturerId?.businessName ||
                order.manufacturerId?.name ||
                "—"}
            </p>
            <p className="text-slate-500 text-sm">
              {order.manufacturerId?.email || "—"}
            </p>
            {order.manufacturerId?._id && (
              <Link
                href={`/admin/users/${order.manufacturerId._id}`}
                className="text-amber-500 text-xs mt-2 inline-block hover:text-amber-400"
              >
                View Profile →
              </Link>
            )}
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-4">
            Order Details
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {[
              ["Order Number", order.orderNumber],
              ["Order Type", order.orderType?.replace(/_/g, " ") || "—"],
              ["Quantity", order.quantity || "—"],
              [
                "Total Amount",
                order.totalPrice
                  ? `$${order.totalPrice.toLocaleString()}`
                  : "—",
              ],
              ["Payment Status", order.paymentStatus || "—"],
              [
                "Date Placed",
                new Date(order.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-slate-600 text-xs mb-0.5">{label}</p>
                <p className="text-slate-200 capitalize">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Milestones */}
        {order.milestones?.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-4">
              Production Milestones
            </h2>
            <div className="space-y-2">
              {order.milestones.map((ms, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg"
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${ms.completed ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-500"}`}
                  >
                    {ms.completed ? "✓" : idx + 1}
                  </span>
                  <span
                    className={`text-sm flex-1 ${ms.completed ? "text-slate-300" : "text-slate-500"}`}
                  >
                    {ms.title}
                  </span>
                  {ms.completedAt && (
                    <span className="text-slate-600 text-xs">
                      {new Date(ms.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tracking */}
        {order.trackingNumber && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-3">
              Shipping
            </h2>
            <p className="text-slate-400 text-sm">
              <span className="text-slate-600">Carrier:</span>{" "}
              {order.carrier || "—"}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              <span className="text-slate-600">Tracking:</span>{" "}
              {order.trackingNumber}
            </p>
          </div>
        )}

        {/* Linked Dispute */}
        {order.disputeId && (
          <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-red-400 font-semibold text-sm mb-1">
                  Linked Dispute
                </h2>
                <p className="text-slate-400 text-sm">
                  This order has an active or resolved dispute
                </p>
              </div>
              <Link
                href={`/admin/disputes/${order.disputeId}`}
                className="px-4 py-2 bg-red-800/50 hover:bg-red-800 text-red-300 text-sm rounded-lg transition-colors"
              >
                View Dispute →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
