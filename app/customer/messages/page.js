"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import CustomerSidebar from "@/components/CustomerSidebar";

export default function CustomerMessagesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchOrders = useCallback(async () => {
    try {
      // Messages are per-order — we show all active/recent orders as conversation threads
      const res = await fetch("/api/orders?limit=50");
      const data = await res.json();
      if (data.success) {
        // Only show orders that aren't pending (chat starts after acceptance)
        const chatOrders = (data.orders || []).filter(
          (o) => !["pending_acceptance"].includes(o.status),
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
      if (session.user.role !== "customer") {
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
      o.manufacturerId?.businessName
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      o.productDetails?.name?.toLowerCase().includes(search.toLowerCase()),
  );

  const STATUS_COLORS = {
    accepted: "bg-blue-100 text-blue-700",
    in_production: "bg-purple-100 text-purple-700",
    shipped: "bg-indigo-100 text-indigo-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    disputed: "bg-orange-100 text-orange-700",
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen bg-[#f8f7f6]">
        <CustomerSidebar active="messages" />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-[#eb9728] rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8f7f6]">
      <CustomerSidebar active="messages" session={session} />
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-center h-16 px-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 gap-4">
          <span className="text-lg font-bold text-gray-900">Messages</span>
        </header>

        <div className="p-8 max-w-2xl mx-auto">
          {/* Search */}
          <div className="relative mb-4">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order, manufacturer, or product..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#eb9728]"
            />
          </div>

          {/* Info note */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 flex gap-2">
            <span className="material-symbols-outlined text-blue-500 text-base shrink-0 mt-0.5">
              info
            </span>
            <p className="text-xs text-blue-700">
              Messages are tied to individual orders. Click an order below to
              open the chat with that manufacturer.
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-5xl text-gray-300 block mb-3">
                chat_bubble
              </span>
              <p className="text-gray-600 font-semibold mb-1">
                No conversations yet
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Once a manufacturer accepts your order, you can chat with them
                here.
              </p>
              <Link
                href="/customer/orders"
                className="inline-block px-5 py-2.5 bg-[#eb9728] text-white font-semibold rounded-xl text-sm hover:bg-[#eb9728]/90"
              >
                View Orders
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {filtered.map((order) => (
                  <Link key={order._id} href={`/customer/orders/${order._id}`}>
                    <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                      {/* Manufacturer avatar */}
                      <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-base shrink-0">
                        {(order.manufacturerId?.businessName || "M").charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {order.manufacturerId?.businessName ||
                              order.manufacturerId?.name}
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
        </div>
      </main>
    </div>
  );
}
