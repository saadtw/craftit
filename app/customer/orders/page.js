// app/customer/orders/page.js
"use client";

import GlobalNoResults from "@/components/ui/GlobalNoResults";
import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STATUS_COLORS = {
  pending_acceptance:
    "bg-[#eb9728]/10 text-[#eb9728] border border-[#eb9728]/20",
  accepted: "bg-blue-500/10 text-blue-300 border border-blue-500/20",
  in_production: "bg-purple-500/10 text-purple-300 border border-purple-500/20",
  completed: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-300 border border-red-500/20",
  disputed: "bg-orange-500/10 text-orange-300 border border-orange-500/20",
};

const STATUS_LABELS = {
  pending_acceptance: "Pending Acceptance",
  accepted: "Accepted",
  in_production: "In Production",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

const TYPE_LABELS = {
  rfq: "RFQ",
  product: "Product",
  group_buy: "Group Buy",
};

export default function CustomerOrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeFilter !== "all") params.set("status", activeFilter);
      if (typeFilter !== "all") params.set("orderType", typeFilter);
      params.set("limit", "50");

      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();

      if (data.success) {
        setOrders(data.orders);
        setStats(data.stats || {});
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, typeFilter]);

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

  const filteredOrders = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.orderNumber?.toLowerCase().includes(q) ||
      o.manufacturerId?.businessName?.toLowerCase().includes(q) ||
      o.productDetails?.name?.toLowerCase().includes(q)
    );
  });

  if (status === "loading" || loading) {
    return <GlobalLoader fullScreen text="Loading orders..." />;
  }

  if (status === "unauthenticated") return null;

  const filterTabs = [
    { key: "all", label: "All", count: stats.total },
    {
      key: "pending_acceptance",
      label: "Pending",
      count: stats.pending_acceptance,
    },
    { key: "accepted", label: "Accepted", count: stats.accepted },
    {
      key: "in_production",
      label: "In Production",
      count: stats.in_production,
    },
    { key: "completed", label: "Completed", count: stats.completed },
    { key: "cancelled", label: "Cancelled", count: stats.cancelled },
  ];

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 space-y-7">
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0c0c11] p-6 sm:p-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.13),transparent_32%),radial-gradient(circle_at_left,rgba(235,151,40,0.12),transparent_28%)] pointer-events-none" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#eb9728]">
                Customer Orders
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">
                My Orders
              </h1>
              <p className="mt-2 text-sm text-white/50">
                Track active orders, production progress, delivery status, and
                completed purchases.
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eb9728] text-sm font-black text-white">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Total", value: stats.total || 0 },
            { label: "Pending", value: stats.pending_acceptance || 0 },
            { label: "Accepted", value: stats.accepted || 0 },
            { label: "In Production", value: stats.in_production || 0 },
            { label: "Completed", value: stats.completed || 0 },
            { label: "Cancelled", value: stats.cancelled || 0 },
          ].map((s, index) => (
            <div
              key={s.label}
              className={`rounded-[22px] border bg-[#0c0c11] p-4 text-center ${
                index === 0 ? "border-[#eb9728]/25" : "border-white/8"
              }`}
            >
              <p
                className={`text-2xl font-black ${
                  index === 0 ? "text-[#eb9728]" : "text-white"
                }`}
              >
                {s.value}
              </p>
              <p className="mt-1 text-xs font-semibold text-white/40">
                {s.label}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-[24px] border border-white/8 bg-[#0c0c11] overflow-hidden">
          <div className="border-b border-white/8 px-4">
            <div className="flex gap-1 overflow-x-auto">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-4 text-sm font-bold transition-colors ${
                    activeFilter === tab.key
                      ? "border-[#eb9728] text-[#eb9728]"
                      : "border-transparent text-white/55 hover:text-white"
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-black ${
                        activeFilter === tab.key
                          ? "bg-[#eb9728]/10 text-[#eb9728]"
                          : "bg-white/[0.05] text-white/45"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 p-4 sm:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4">
              <span className="material-symbols-outlined text-lg text-white/35">
                search
              </span>
              <input
                type="text"
                placeholder="Search by order ID, manufacturer or product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent py-3 text-sm text-white placeholder:text-white/30 focus:outline-none"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-2xl border border-white/10 bg-[#101017] px-4 py-3 text-sm text-white/80 focus:border-[#eb9728] focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="rfq">RFQ Orders</option>
              <option value="product">Product Orders</option>
              <option value="group_buy">Group Buy</option>
            </select>
          </div>
        </section>

        {filteredOrders.length === 0 ? (
          <section className="rounded-[28px] border border-white/8 bg-[#0c0c11] p-12 text-center">
            <GlobalNoResults text="No orders found" />
            <p className="mb-6 text-sm text-white/45">
              {activeFilter === "all"
                ? "You haven't placed any orders yet."
                : "No orders with this status."}
            </p>

            {activeFilter === "all" && (
              <Link
                href="/custom-orders/new"
                className="inline-flex rounded-xl bg-[#eb9728] px-6 py-3 text-sm font-bold text-white hover:bg-amber-500"
              >
                Create Custom Order
              </Link>
            )}
          </section>
        ) : (
          <section className="space-y-4">
            {filteredOrders.map((order) => (
              <CustomerOrderCard
                key={order._id}
                order={order}
                onRefresh={fetchOrders}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

function CustomerOrderCard({ order, onRefresh }) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${order._id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by customer" }),
      });
      const data = await res.json();
      if (data.success) onRefresh();
      else alert(data.error || "Could not cancel order");
    } catch (err) {
      alert("Error cancelling order");
    } finally {
      setCancelling(false);
    }
  };

  const completedMilestones =
    order.milestones?.filter((m) => m.status === "completed").length || 0;
  const totalMilestones = order.milestones?.length || 0;
  const progressPercent =
    totalMilestones > 0
      ? Math.round((completedMilestones / totalMilestones) * 100)
      : 0;

  return (
    <div className="rounded-[24px] border border-white/8 bg-[#0c0c11] p-5 transition-all hover:border-[#eb9728]/30 hover:bg-white/[0.025]">
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="flex-1">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-black text-white">
                  {order.orderNumber}
                </span>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    STATUS_COLORS[order.status]
                  }`}
                >
                  {STATUS_LABELS[order.status] || order.status}
                </span>

                <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-xs font-bold text-white/45">
                  {TYPE_LABELS[order.orderType] || order.orderType}
                </span>
              </div>

              <h3 className="text-base font-black text-white flex items-center gap-2">
                {order.productDetails?.name || "Custom Order"}
                {(order.productDetails?.model3D?.url ||
                  order.productId?.model3D?.url ||
                  order.rfqId?.customOrderId?.model3D?.url) && (
                  <span className="px-1.5 py-0.5 rounded bg-[#eb9728]/10 text-[#eb9728] border border-[#eb9728]/20 text-[10px] font-bold">
                    3D Model
                  </span>
                )}
              </h3>

              <p className="mt-1 text-sm text-white/45">
                {order.manufacturerId?.businessName ||
                  order.manufacturerId?.name ||
                  "Manufacturer"}
              </p>
            </div>

            <span className="shrink-0 text-lg font-black text-[#eb9728]">
              ${order.totalPrice?.toLocaleString() || "—"}
            </span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <InfoBlock label="Quantity" value={`${order.quantity} units`} />
            <InfoBlock
              label="Ordered"
              value={new Date(order.createdAt).toLocaleDateString()}
            />
            <InfoBlock
              label="Est. Delivery"
              value={
                order.estimatedDeliveryDate
                  ? new Date(order.estimatedDeliveryDate).toLocaleDateString()
                  : "Pending"
              }
            />

            {order.trackingNumber && (
              <InfoBlock label="Tracking" value={order.trackingNumber} amber />
            )}
          </div>

          {order.status === "in_production" && totalMilestones > 0 && (
            <div>
              <div className="mb-2 flex justify-between text-xs text-white/45">
                <span>Production Progress</span>
                <span>
                  {completedMilestones}/{totalMilestones} milestones ·{" "}
                  {progressPercent}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-[#eb9728] to-purple-500 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-row gap-2 sm:min-w-[150px] sm:flex-col sm:justify-end">
          <button
            onClick={() => router.push(`/customer/orders/${order._id}`)}
            className="rounded-xl bg-[#eb9728] px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-500"
          >
            View Details
          </button>

          {order.status === "pending_acceptance" && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-300 hover:bg-red-500/15 disabled:opacity-50"
            >
              {cancelling ? "..." : "Cancel"}
            </button>
          )}

          {order.status === "completed" && !order.reviewed && (
            <button
              onClick={() =>
                router.push(`/customer/orders/${order._id}?review=true`)
              }
              className="rounded-xl border border-[#eb9728]/20 bg-[#eb9728]/10 px-4 py-2.5 text-sm font-bold text-[#eb9728] hover:bg-[#eb9728]/15"
            >
              Leave Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value, amber = false }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
      <span className="text-xs font-semibold text-white/35">{label}</span>
      <p
        className={`mt-1 text-sm font-bold ${
          amber ? "text-[#eb9728]" : "text-white/75"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
