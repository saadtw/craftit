// app/manufacturer/orders/page.js
"use client";

import GlobalNoResults from "@/components/ui/GlobalNoResults";
import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STATUS_COLORS = {
  pending_acceptance: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  accepted: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  in_production: "bg-purple-500/10 border-purple-500/20 text-purple-400",
  completed: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  cancelled: "bg-red-500/10 border-red-500/20 text-red-400",
  disputed: "bg-orange-500/10 border-orange-500/20 text-orange-400",
};

const STATUS_LABELS = {
  pending_acceptance: "Pending",
  accepted: "Accepted",
  in_production: "Production",
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
    return <GlobalLoader fullScreen text="SYNCHRONIZING ORDER LOGS..." />;
  }

  if (status === "unauthenticated" || session?.user?.role !== "manufacturer") {
    return null;
  }


  const GlassDropdown = ({ value, onChange, options, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(opt => opt.value === value) || options[0];

    return (
      <div className="relative group/field min-w-[180px]">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2 text-sm text-white/70 text-left focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.05] transition-all duration-300 flex items-center justify-between"
          >
            <span>{selectedOption.label}</span>
            <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${isOpen ? 'rotate-180 text-purple-400' : 'text-white/20'}`}>
              expand_more
            </span>
          </button>

          {isOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
              <div className="absolute top-full right-0 mt-2 z-50 min-w-[200px] bg-[#0a0a0c] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="py-1 max-h-48 overflow-y-auto">
                  {options.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-sm text-left transition-colors flex items-center justify-between hover:bg-white/5 ${
                        value === opt.value ? 'bg-purple-500/10 text-purple-400' : 'text-white/50'
                      }`}
                    >
                      {opt.label}
                      {value === opt.value && (
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {/* Page header */}
      <div className="max-w-[1400px] mx-auto px-6 pt-4 pb-4 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400/50 mb-2">
            MANAGEMENT
          </p>
          <h1 className="text-4xl font-black tracking-tight block">
            <span
              style={{ 
                background: 'linear-gradient(to right, #9333ea, #f97316, #fbbf24, #ffffff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                display: 'inline-block'
              }}
            >
              ORDERS
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full backdrop-blur-xl">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">
            {stats.total ?? "0"} Total Orders
          </span>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
        {/* Stats row - Thick Gradient Squares */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 py-2">
          {[
            { label: "TOTAL", value: stats.total || 0, color: "text-white" },
            { label: "PENDING", value: stats.pending_acceptance || 0, color: "text-amber-400" },
            { label: "ACCEPTED", value: stats.accepted || 0, color: "text-blue-400" },
            { label: "PRODUCTION", value: stats.in_production || 0, color: "text-purple-400" },
            { label: "COMPLETED", value: stats.completed || 0, color: "text-emerald-400" },
            { label: "CANCELLED", value: stats.cancelled || 0, color: "text-red-400" },
          ].map((s) => (
            <div key={s.label} className="group cursor-default relative h-20">
              {/* Thick Gradient Border Wrapper */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#eb9728] via-purple-600 to-indigo-500 p-[2px] shadow-lg transition-all duration-500 group-hover:shadow-purple-500/20">
                {/* Inner Dark Card */}
                <div className="flex h-full w-full flex-col items-center justify-center rounded-[0.85rem] bg-[#0B011D] px-2 text-center overflow-hidden">
                  {/* Label */}
                  <p className="text-[10px] font-black text-white/70 leading-none tracking-[0.15em] mb-2 uppercase group-hover:text-white transition-colors">
                    {s.label}
                  </p>
                  
                  {/* Value */}
                  <p className={`text-2xl font-black ${s.color} tracking-tighter leading-none`}>
                    {s.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search & Filters Section */}
        <div className="space-y-4">
          {/* Top Row: Search & Sort */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/60 group-focus-within:text-purple-400 transition-colors text-[20px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search by Order ID, Customer, or Product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white/[0.03] border border-purple-500/40 rounded-2xl text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.05] transition-all"
              />
            </div>
            
            <div className="shrink-0 w-full sm:w-auto">
              <GlassDropdown
                value={sortBy}
                onChange={setSortBy}
                options={[
                  { value: "newest", label: "Newest First" },
                  { value: "oldest", label: "Oldest First" },
                  { value: "value_high", label: "Value: High → Low" },
                  { value: "value_low", label: "Value: Low → High" },
                ]}
              />
            </div>
          </div>

          <div className="flex gap-1 p-1 bg-white/[0.02] border border-white/20 rounded-2xl w-full">
            {FILTER_TABS.map((tab) => {
              const count = tab.key === "all" ? stats.total : stats[tab.key];
              const isActive = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`flex-1 px-5 py-2 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all duration-300 ${
                    isActive
                      ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                  {count !== undefined && (
                    <span className={`ml-2 opacity-50 ${isActive ? 'text-white' : ''}`}>({count})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Orders list */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/[0.02] border border-purple-500/30 rounded-[2.5rem] p-6 animate-pulse space-y-4"
              >
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/5 rounded w-1/3" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-2 bg-white/5 rounded w-full" />
              </div>
            ))}
          </div>
        ) : displayOrders.length === 0 ? (
          <div className="bg-white/[0.03] border-2 border-purple-500/40 rounded-[2.5rem] overflow-hidden backdrop-blur-md">
            <div className="h-20 w-20 rounded-[2rem] bg-white/[0.03] border border-purple-500/30 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-white/10">inventory_2</span>
            </div>
            <GlobalNoResults text="No orders found" />
            <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mt-4">
              {activeFilter !== "all"
                ? `Zero "${STATUS_LABELS[activeFilter]}" entries`
                : "No matching records"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="flex items-center justify-center gap-4 pt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center disabled:opacity-20 hover:bg-white/5 hover:border-purple-500/30 transition-all group"
                >
                  <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-0.5 transition-transform">chevron_left</span>
                </button>
                <div className="px-6 py-2 bg-white/[0.03] border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest">
                  Page {page} of {pagination.pages}
                </div>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(pagination.pages, p + 1))
                  }
                  disabled={page === pagination.pages}
                  className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center disabled:opacity-20 hover:bg-white/5 hover:border-purple-500/30 transition-all group"
                >
                  <span className="material-symbols-outlined text-[20px] group-hover:translate-x-0.5 transition-transform">chevron_right</span>
                </button>
              </div>
            )}
          </div>
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
    <div className="bg-white/[0.02] border-2 border-purple-500/40 rounded-[2.5rem] p-6 hover:bg-white/[0.04] transition-all duration-500 group/card relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 blur-[100px] bg-purple-500/5 group-hover/card:bg-purple-500/10 transition-all duration-500" />
      
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Type icon */}
        <div className="w-16 h-16 bg-white/[0.03] border border-white/5 rounded-2xl shrink-0 flex items-center justify-center group-hover/card:border-purple-500/30 transition-colors shadow-inner">
          <svg
            className="w-8 h-8 text-white/20 group-hover/card:text-purple-400 transition-colors"
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
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Link
                  href={`/manufacturer/orders/${order._id}`}
                  className="text-lg font-black text-white hover:text-purple-400 transition-colors line-clamp-1 tracking-tight"
                >
                  {order.productDetails?.name || "Custom Order"}
                </Link>
                <span className={`shrink-0 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${STATUS_COLORS[order.status]}`}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
                {has3DModel && (
                  <span className="shrink-0 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    3D Model
                  </span>
                )}
              </div>
              <p className="text-[10px] font-bold text-white/60 tracking-[0.2em] uppercase font-mono mb-4">
                ID: {order.orderNumber}
              </p>

              {/* Details grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6 text-[10px] font-black uppercase tracking-widest text-white/80">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-white/80">person</span>
                  <span className="truncate">{order.customerId?.name || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-white/80">inventory_2</span>
                  <span>{order.quantity} units</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-white/80">calendar_today</span>
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className="text-2xl font-black text-white tracking-tighter">
                ${order.totalPrice?.toLocaleString() || "—"}
              </span>
              {order.estimatedDeliveryDate && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white/[0.05] border border-purple-500/30 rounded-full">
                  <span className="material-symbols-outlined text-[14px] text-emerald-400">local_shipping</span>
                  <span className="text-[9px] font-black text-white/70 uppercase tracking-widest">
                    Est. {new Date(order.estimatedDeliveryDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Production progress bar */}
          {totalMilestones > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-white/60 mb-2">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  Production Progress
                </span>
                <span>
                  {completedMilestones}/{totalMilestones} Milestones · {progressPercent}%
                </span>
              </div>
              <div className="h-1 bg-white/[0.03] rounded-full overflow-hidden border border-purple-500/20">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-1000"
                  style={{ width: `${progressPercent}%`, background: 'linear-gradient(to right, #9333ea, #8b5cf6)' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-3 mt-8 pt-6 border-t border-white/[0.03]">
        <Link
          href={`/manufacturer/orders/${order._id}`}
          className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-white/[0.05] border border-purple-500/40 rounded-xl hover:bg-white/10 transition-all duration-300"
        >
          View Full Details
        </Link>

        {order.status === "pending_acceptance" && (
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={handleQuickAccept}
              disabled={accepting}
              className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all disabled:opacity-50"
            >
              {accepting ? "Processing…" : "Accept Order"}
            </button>
            <button
              onClick={handleQuickReject}
              disabled={rejecting}
              className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all disabled:opacity-50"
            >
              {rejecting ? "Processing…" : "Reject"}
            </button>
          </div>
        )}

        {order.status === "accepted" && (
          <Link
            href={`/manufacturer/orders/${order._id}/milestones`}
            className="ml-auto px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-xl hover:bg-purple-500/20 transition-all shadow-[0_0_20px_rgba(147,51,234,0.1)]"
          >
            Manage Milestones
          </Link>
        )}
      </div>
    </div>
  );
}
