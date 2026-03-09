"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "scheduled", label: "Scheduled" },
  { key: "paused", label: "Paused" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_STYLES = {
  active: "bg-emerald-100 text-emerald-700",
  scheduled: "bg-blue-100 text-blue-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-600",
};

function TimeRemaining({ endDate }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endDate) - new Date();
      if (diff <= 0) {
        setRemaining("Ended");
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, [endDate]);

  return <span>{remaining}</span>;
}

export default function ManufacturerGroupBuysPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [groupBuys, setGroupBuys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && session?.user?.role !== "manufacturer")
      router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    const params = new URLSearchParams({
      page,
      limit: 12,
      sort,
      ...(activeTab !== "all" && { status: activeTab }),
      ...(debouncedSearch && { search: debouncedSearch }),
    });
    fetch(`/api/group-buys?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success) {
          setGroupBuys(data.groupBuys);
          setPagination(data.pagination);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, page, sort, activeTab, debouncedSearch, refreshKey]);

  const handleAction = async (id, action) => {
    setActionLoading(id + action);
    try {
      const res = await fetch(`/api/group-buys/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        setLoading(true);
        setRefreshKey((k) => k + 1);
      } else alert(data.error);
    } catch (_) {}
    setActionLoading(null);
  };

  const handleCancel = async (id) => {
    const reason = prompt("Reason for cancellation (optional):");
    if (reason === null) return; // user pressed cancel on prompt
    try {
      const res = await fetch(`/api/group-buys/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.success) {
        setLoading(true);
        setRefreshKey((k) => k + 1);
      } else alert(data.error);
    } catch (_) {}
  };

  // Stats derived from current list
  const stats = {
    active: groupBuys.filter((g) => g.status === "active").length,
    totalParticipants: groupBuys.reduce(
      (s, g) => s + (g.currentParticipantCount || 0),
      0,
    ),
    totalRevenuePotential: groupBuys
      .filter((g) => ["active", "completed"].includes(g.status))
      .reduce(
        (s, g) =>
          s +
          (g.currentQuantity || 0) * (g.currentDiscountedPrice || g.basePrice),
        0,
      ),
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/manufacturer/dashboard"
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-slate-900">Group Buys</h1>
          </div>
          <Link
            href="/manufacturer/group-buys/new"
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1.5"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Campaign
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Active Campaigns",
              value: stats.active,
              color: "text-emerald-600",
            },
            {
              label: "Total Participants",
              value: stats.totalParticipants,
              color: "text-slate-900",
            },
            {
              label: "Revenue Potential",
              value: `$${stats.totalRevenuePotential.toLocaleString()}`,
              color: "text-slate-900",
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
          <div className="flex gap-1 flex-wrap">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                  setLoading(true);
                }}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
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
                placeholder="Search campaigns..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setLoading(true);
                }}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
                setLoading(true);
              }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="newest">Newest First</option>
              <option value="ending_soon">Ending Soon</option>
              <option value="participants">Most Participants</option>
            </select>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse"
              >
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-slate-100 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : groupBuys.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-20 text-center">
            <p className="text-slate-500 font-medium">
              No group buy campaigns found
            </p>
            <Link
              href="/manufacturer/group-buys/new"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
            >
              Create Your First Campaign
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {groupBuys.map((gb) => (
              <GroupBuyCard
                key={gb._id}
                gb={gb}
                onAction={handleAction}
                onCancel={handleCancel}
                actionLoading={actionLoading}
              />
            ))}

            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
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
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function GroupBuyCard({ gb, onAction, onCancel, actionLoading }) {
  const product = gb.productId;
  const primaryImage =
    product?.images?.find((i) => i.isPrimary)?.url || product?.images?.[0]?.url;
  const highestTier = gb.tiers?.[gb.tiers.length - 1];
  const tier1 = gb.tiers?.[0];

  // Progress toward first tier
  const progress = tier1
    ? Math.min(100, Math.round((gb.currentQuantity / tier1.minQuantity) * 100))
    : 0;

  const revenuePotential =
    (gb.currentQuantity || 0) * (gb.currentDiscountedPrice || gb.basePrice);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition-all">
      <div className="flex gap-4">
        {/* Product Image */}
        <div className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden shrink-0">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={product?.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link
                href={`/manufacturer/group-buys/${gb._id}`}
                className="font-semibold text-slate-900 hover:text-slate-600 transition-colors line-clamp-1"
              >
                {gb.title}
              </Link>
              <p className="text-xs text-slate-500 mt-0.5">
                {product?.name} · {product?.category}
              </p>
            </div>
            <span
              className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[gb.status]}`}
            >
              {gb.status}
            </span>
          </div>

          {/* Tier Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>
                {gb.currentQuantity} / {tier1?.minQuantity || "—"} units for
                Tier 1
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-900 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
            <span>👥 {gb.currentParticipantCount} participants</span>
            <span>📦 {gb.currentQuantity} units</span>
            <span className="text-emerald-600 font-medium">
              💰 ${revenuePotential.toLocaleString()} potential
            </span>
            {highestTier && (
              <span>🏷 Up to {highestTier.discountPercent}% off</span>
            )}
            {["active", "paused"].includes(gb.status) && (
              <span className="text-amber-600">
                ⏱ <TimeRemaining endDate={gb.endDate} /> left
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
        <Link
          href={`/manufacturer/group-buys/${gb._id}`}
          className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          View Details
        </Link>
        {["scheduled", "active", "paused"].includes(gb.status) && (
          <Link
            href={`/manufacturer/group-buys/${gb._id}/edit`}
            className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Edit
          </Link>
        )}
        {gb.status === "active" && (
          <button
            onClick={() => onAction(gb._id, "pause")}
            disabled={actionLoading === gb._id + "pause"}
            className="px-3 py-1.5 text-xs text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
          >
            Pause
          </button>
        )}
        {gb.status === "paused" && (
          <>
            <button
              onClick={() => onAction(gb._id, "resume")}
              disabled={actionLoading === gb._id + "resume"}
              className="px-3 py-1.5 text-xs text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50"
            >
              Resume
            </button>
            <button
              onClick={() => onAction(gb._id, "end_early")}
              disabled={actionLoading === gb._id + "end_early"}
              className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              End Early
            </button>
          </>
        )}
        {gb.status === "active" && (
          <button
            onClick={() => onAction(gb._id, "end_early")}
            disabled={actionLoading === gb._id + "end_early"}
            className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            End Early
          </button>
        )}
        {["active", "scheduled", "paused"].includes(gb.status) && (
          <button
            onClick={() => onCancel(gb._id)}
            className="ml-auto px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
