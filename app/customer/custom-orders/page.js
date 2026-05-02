// app/customer/custom-orders/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function CustomOrdersListPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        filter === "all"
          ? "/api/custom-orders"
          : `/api/custom-orders?status=${filter}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Error fetching custom orders:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

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

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-[#eb9728] animate-spin" />
          <GlobalLoader text="Loading custom orders..." />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "draft":
        return "bg-white/8 text-white/75 border border-white/10";
      case "pending":
        return "bg-[#eb9728]/10 text-[#eb9728] border border-[#eb9728]/20";
      case "accepted":
        return "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-300 border border-red-500/20";
      default:
        return "bg-white/8 text-white/75 border border-white/10";
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7 space-y-6">
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0c0c11] p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_30%),radial-gradient(circle_at_left,rgba(235,151,40,0.12),transparent_28%)] pointer-events-none" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#eb9728] font-bold">
                Customer Orders
              </p>
              <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">
                My Custom Orders
              </h1>
              <p className="mt-2 text-sm sm:text-base text-white/60 max-w-2xl leading-7">
                Manage your custom manufacturing orders, track their status, and
                continue working on drafts before submission.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/custom-orders/new"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#eb9728] text-sm font-bold text-white hover:bg-amber-500 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  add
                </span>
                Create New Order
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-white/8 bg-[#0c0c11]/75 p-4 sm:p-5">
          <div className="flex flex-wrap gap-2">
            {["all", "draft", "pending", "accepted", "rejected"].map(
              (statusFilter) => (
                <button
                  key={statusFilter}
                  onClick={() => setFilter(statusFilter)}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                    filter === statusFilter
                      ? "bg-[#eb9728] text-white shadow-[0_8px_20px_rgba(235,151,40,0.24)]"
                      : "bg-white/[0.03] border border-white/10 text-white/60 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {statusFilter}
                </button>
              ),
            )}
          </div>
        </section>

        {orders.length === 0 ? (
          <section className="rounded-[28px] border border-white/8 bg-[#0c0c11] p-12 text-center shadow-[0_16px_40px_rgba(0,0,0,0.25)]">
            <div className="mx-auto w-20 h-20 rounded-3xl bg-[#eb9728]/10 border border-[#eb9728]/20 text-[#eb9728] flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl">
                inventory_2
              </span>
            </div>

            <h3 className="mt-6 text-2xl font-bold text-white">
              No custom orders yet
            </h3>
            <p className="mt-2 text-white/55 max-w-md mx-auto">
              Start by creating your first custom manufacturing order and send
              it to the right production partners.
            </p>

            <Link
              href="/custom-orders/new"
              className="mt-6 inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#eb9728] text-white font-bold hover:bg-amber-500 transition-colors"
            >
              Create Custom Order
            </Link>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {orders.map((order) => (
              <div
                key={order._id}
                className="rounded-[24px] border border-white/8 bg-[#0c0c11] p-5 sm:p-6 shadow-[0_12px_34px_rgba(0,0,0,0.22)] hover:border-purple-500/20 transition-all"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <h3 className="text-lg sm:text-xl font-bold text-white line-clamp-1">
                        {order.title}
                      </h3>
                      {order.model3D?.url && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#eb9728]/10 text-[#eb9728] border border-[#eb9728]/20">
                          3D Model
                        </span>
                      )}
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${getStatusColor(
                          order.status,
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <p className="text-sm text-white/55 mb-4 line-clamp-2 max-w-3xl">
                      {order.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm text-white/40">
                      <div className="inline-flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-[#eb9728]">
                          layers
                        </span>
                        <span>Quantity: {order.quantity}</span>
                      </div>

                      {order.deadline && (
                        <div className="inline-flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-purple-400">
                            event
                          </span>
                          <span>
                            Deadline:{" "}
                            {new Date(order.deadline).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      <div className="inline-flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-white/35">
                          schedule
                        </span>
                        <span>
                          Created:{" "}
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row lg:flex-col gap-2 lg:min-w-[160px]">
                    <Link
                      href={`/custom-orders/${order._id}/review`}
                      className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#eb9728] text-white text-sm font-bold hover:bg-amber-500 transition-colors whitespace-nowrap"
                    >
                      View Details
                    </Link>

                    {order.status === "draft" && (
                      <Link
                        href={`/custom-orders/${order._id}/edit`}
                        className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-white/80 text-sm font-semibold hover:bg-white/[0.06] hover:text-white transition-all whitespace-nowrap"
                      >
                        Edit Draft
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
