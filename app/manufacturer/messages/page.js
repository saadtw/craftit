// app/manufacturer/messages/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function ManufacturerMessagesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders?limit=50");
      const data = await res.json();
      if (data.success) {
        const chatOrders = (data.orders || []).filter(
          (o) => !["pending_acceptance", "cancelled"].includes(o.status),
        );
        setOrders(chatOrders);
      }
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

  const filtered = orders.filter(
    (o) =>
      !search ||
      o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      o.customerId?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.productDetails?.name?.toLowerCase().includes(search.toLowerCase()),
  );

  const STATUS_COLORS = {
    accepted: "bg-blue-100 text-blue-700",
    in_production: "bg-purple-100 text-purple-700",
    shipped: "bg-indigo-100 text-indigo-700",
    completed: "bg-green-100 text-green-700",
    disputed: "bg-orange-100 text-orange-700",
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <main className="container mx-auto px-4 sm:px-6 lg:px-10 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-blue-900">Messages</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Chat with customers about their orders
            </p>
          </div>
        </div>

        <div className="relative mb-4">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order, customer, or product..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-orange-400"
          />
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 flex gap-2">
          <span className="material-symbols-outlined text-blue-500 text-base shrink-0 mt-0.5">
            info
          </span>
          <p className="text-xs text-blue-700">
            Each order has its own chat thread. Open an order to message the
            customer directly.
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-20">
            <span className="material-symbols-outlined text-5xl text-gray-200 block mb-3">
              chat_bubble
            </span>
            <p className="text-gray-600 font-semibold mb-1">
              No active conversations
            </p>
            <p className="text-sm text-gray-400">
              Accept orders to start chatting with customers.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {filtered.map((order) => (
                <Link
                  key={order._id}
                  href={`/manufacturer/orders/${order._id}`}
                >
                  <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-600 text-base shrink-0">
                      {(order.customerId?.name || "C").charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {order.customerId?.name || "Customer"}
                        </p>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-500"}`}
                        >
                          {order.status?.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {order.productDetails?.name || "Custom Order"} ·{" "}
                        {order.orderNumber}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400">
                        {new Date(
                          order.updatedAt || order.createdAt,
                        ).toLocaleDateString()}
                      </p>
                      <span className="material-symbols-outlined text-gray-300 text-base mt-1 block">
                        chevron_right
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
