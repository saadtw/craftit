// app/manufacturer/orders/page.js
"use client";

import GlobalNoResults from "@/components/ui/GlobalNoResults";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STATUS_COLORS = {
  pending_acceptance: "bg-yellow-100 text-yellow-700",
  accepted: "bg-blue-100 text-blue-700",
  in_production: "bg-purple-100 text-purple-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
  disputed: "bg-orange-100 text-orange-700",
};

const STATUS_LABELS = {
  pending_acceptance: "Pending",
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

const FILTER_TABS = [
  { key: "all", label: "All Orders" },
  { key: "pending_acceptance", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "in_production", label: "In Production" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

export default function ManufacturerOrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);

  // Auth guard
  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && session?.user?.role !== "manufacturer")
      router.push("/auth/login");
  }, [status, session, router]);

  // Debounce search (client-side only — no extra API call)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [activeFilter]);

  // ── Stats: always fetched WITHOUT a status filter so every tab shows
  // its true global count regardless of which filter is active.
  const fetchStats = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const res = await fetch("/api/orders?page=1&limit=1");
      const data = await res.json();
      if (data.success) setStats(data.stats || {});
    } catch (_) {}
  }, [status]);

  // Run once on mount (and explicitly after mutations via handleRefresh)
  useEffect(() => {
    if (status === "authenticated") fetchStats();
  }, [status, fetchStats]);

  // ── Orders: filtered by activeFilter & page — does NOT touch stats
  const fetchOrders = useCallback(async () => {
    if (status !== "authenticated") return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (activeFilter !== "all") params.set("status", activeFilter);
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
        // Do NOT overwrite stats here — filtered responses only contain
        // counts for the current filter, which would zero-out other tabs.
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Orders fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [status, page, activeFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Called by OrderCard after accept/reject — refreshes both list and counts
  const handleRefresh = useCallback(() => {
    fetchOrders();
    fetchStats();
  }, [fetchOrders, fetchStats]);

  // Client-side search + sort (fast — no network)
  const filteredOrders = orders.filter((o) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      o.orderNumber?.toLowerCase().includes(q) ||
      o.customerId?.name?.toLowerCase().includes(q) ||
      o.productDetails?.name?.toLowerCase().includes(q)
    );
  });

  const displayOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === "oldest")
      return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === "value_high")
      return (b.totalPrice || 0) - (a.totalPrice || 0);
    if (sortBy === "value_low")
      return (a.totalPrice || 0) - (b.totalPrice || 0);
    return new Date(b.createdAt) - new Date(a.createdAt); // newest (default)
  });

  // Only block during session loading — NOT during data loading
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated" || session?.user?.role !== "manufacturer") {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Orders
          </h1>
          <span className="text-sm text-slate-400">
            {stats.total ?? "—"} total order{stats.total !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              label: "Total",
              value: stats.total || 0,
              color: "text-slate-900",
            },
            {
              label: "Pending",
              value: stats.pending_acceptance || 0,
              color: "text-yellow-600",
            },
            {
              label: "Accepted",
              value: stats.accepted || 0,
              color: "text-blue-600",
            },
            {
              label: "In Production",
              value: stats.in_production || 0,
              color: "text-purple-600",
            },
            {
              label: "Completed",
              value: stats.completed || 0,
              color: "text-emerald-600",
            },
            {
              label: "Cancelled",
              value: stats.cancelled || 0,
              color: "text-red-500",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl border border-slate-200 p-4"
            >
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          {/* Tab pills — clicking these does NOT reload the page */}
          <div className="flex gap-1 flex-wrap">
            {FILTER_TABS.map((tab) => {
              const count = tab.key === "all" ? stats.total : stats[tab.key];
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                    activeFilter === tab.key
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                  {count !== undefined && (
                    <span className="ml-1.5 text-xs opacity-70">{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search + Sort */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search by order ID, customer, or product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="value_high">Value: High → Low</option>
              <option value="value_low">Value: Low → High</option>
            </select>
          </div>
        </div>

        {/* Orders list — only this section shows loading skeleton */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse"
              >
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                    <div className="h-3 bg-slate-100 rounded w-1/4" />
                  </div>
                  <div className="w-16 h-5 bg-slate-100 rounded" />
                </div>
                <div className="h-px bg-slate-100 mt-4 mb-3" />
                <div className="flex gap-2">
                  <div className="h-7 w-24 bg-slate-100 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : displayOrders.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-20 text-center">
            <svg
              className="w-12 h-12 text-slate-300 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <GlobalNoResults text="No orders found" />
            <p className="text-slate-400 text-sm mt-1">
              {activeFilter !== "all"
                ? `No orders with status "${STATUS_LABELS[activeFilter]}"`
                : search
                  ? "Try a different search term."
                  : "You'll see orders here once customers place them."}
            </p>
            {activeFilter !== "all" && (
              <button
                onClick={() => setActiveFilter("all")}
                className="mt-4 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                View all orders
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {displayOrders.map((order) => (
                <OrderCard
                  key={order._id}
                  order={order}
                  onRefresh={handleRefresh}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-500">
                  Page {page} of {pagination.pages}
                </span>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(pagination.pages, p + 1))
                  }
                  disabled={page === pagination.pages}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Order Card ────────────────────────────────────────────────────────────────

function OrderCard({ order, onRefresh }) {
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const has3DModel = Boolean(
    order?.productDetails?.model3D?.url ||
    order?.productId?.model3D?.url ||
    order?.rfqId?.customOrderId?.model3D?.url ||
    order?.groupBuyId?.productId?.model3D?.url,
  );

  const handleQuickAccept = async () => {
    setAccepting(true);
    try {
      const res = await fetch(`/api/orders/${order._id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      });
      const data = await res.json();
      if (data.success) onRefresh();
      else alert(data.error || "Failed to accept order");
    } catch {
      alert("Error accepting order");
    } finally {
      setAccepting(false);
    }
  };

  const handleQuickReject = async () => {
    const reason = prompt("Reason for rejection (optional):");
    if (reason === null) return;
    setRejecting(true);
    try {
      const res = await fetch(`/api/orders/${order._id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelled",
          rejectionReason: reason || "Rejected by manufacturer",
        }),
      });
      const data = await res.json();
      if (data.success) onRefresh();
      else alert(data.error || "Failed to reject order");
    } catch {
      alert("Error rejecting order");
    } finally {
      setRejecting(false);
    }
  };

  const completedMilestones =
    order.milestones?.filter((m) => m.status === "completed").length || 0;
  const totalMilestones = order.milestones?.length || 0;
  const progressPercent =
    totalMilestones > 0
      ? Math.round((completedMilestones / totalMilestones) * 100)
      : 0;

  // SVG icon per order type
  const iconPath =
    order.orderType === "rfq"
      ? "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      : order.orderType === "group_buy"
        ? "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        : "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition-all">
      <div className="flex gap-4">
        {/* Type icon */}
        <div className="w-12 h-12 bg-slate-100 rounded-lg shrink-0 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d={iconPath}
            />
          </svg>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/manufacturer/orders/${order._id}`}
                  className="font-semibold text-slate-900 hover:text-slate-600 transition-colors line-clamp-1"
                >
                  {order.productDetails?.name || "Custom Order"}
                </Link>
                <span
                  className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[order.status]}`}
                >
                  {STATUS_LABELS[order.status] || order.status}
                </span>
                <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-500">
                  {TYPE_LABELS[order.orderType] || order.orderType}
                </span>
                {has3DModel && (
                  <span className="shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    3D Model
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                {order.orderNumber}
              </p>
            </div>
            <span className="shrink-0 text-base font-bold text-slate-900">
              ${order.totalPrice?.toLocaleString() || "—"}
            </span>
          </div>

          {/* Details row */}
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
            <span>👤 {order.customerId?.name || "—"}</span>
            <span>📦 {order.quantity} units</span>
            <span>🗓 {new Date(order.createdAt).toLocaleDateString()}</span>
            {order.estimatedDeliveryDate && (
              <span>
                🚚 Est.{" "}
                {new Date(order.estimatedDeliveryDate).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Production progress bar */}
          {totalMilestones > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Production Progress</span>
                <span>
                  {completedMilestones}/{totalMilestones} · {progressPercent}%
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
        <Link
          href={`/manufacturer/orders/${order._id}`}
          className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          View Details
        </Link>

        {order.status === "pending_acceptance" && (
          <>
            <button
              onClick={handleQuickAccept}
              disabled={accepting}
              className="px-3 py-1.5 text-xs text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50"
            >
              {accepting ? "Accepting…" : "✓ Accept"}
            </button>
            <button
              onClick={handleQuickReject}
              disabled={rejecting}
              className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {rejecting ? "Rejecting…" : "✗ Reject"}
            </button>
          </>
        )}

        {order.status === "accepted" && (
          <Link
            href={`/manufacturer/orders/${order._id}/milestones`}
            className="px-3 py-1.5 text-xs text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
          >
            Manage Milestones
          </Link>
        )}
      </div>
    </div>
  );
}
