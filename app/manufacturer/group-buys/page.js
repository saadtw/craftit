// app/manufacturer/group-buys/page.js
"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import GlobalLoader from "@/components/ui/GlobalLoader";

import Lottie from "lottie-react";
import NotFoundAnimation from "@/assets/NotFound.json";

import TimerIcon from "@/assets/timer.png";

import ActiveCampaignIcon from "@/assets/ActiveCampaign.png";
import TotalUsersIcon from "@/assets/TotalUsers.png";
import RevenueIcon from "@/assets/revenue.png";
import OrdersIcon from "@/assets/orders.png";
import PaymentsIcon from "@/assets/payments.png";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "scheduled", label: "Scheduled" },
  { key: "paused", label: "Paused" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_STYLES = {
  active: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  scheduled: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  paused: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  completed: "bg-white/5 text-white/40 border border-white/10",
  cancelled: "bg-red-500/10 text-red-400 border border-red-500/20",
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
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);
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
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    return <GlobalLoader fullScreen text="SYNCING CAMPAIGN HUB..." />;
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-20 space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728]">
              Campaign Management
            </p>
            <h1 className="text-4xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-purple-500 via-orange-500 to-[#eb9728] bg-clip-text text-transparent">
                Group Buy Hub
              </span>
            </h1>
            <p className="text-sm text-white/35 font-medium">
              Oversee high-volume bulk campaigns and participant milestones.
            </p>
          </div>
          <Link
            href="/manufacturer/group-buys/new"
            className="px-6 py-3 bg-gradient-to-r from-purple-600/70 to-indigo-600/70 border border-purple-500/20 text-white/80 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:from-purple-600/90 hover:to-indigo-600/90 hover:text-white hover:border-purple-500/40 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">rocket_launch</span>
            Launch New Campaign
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-purple-600 via-orange-500 to-[#eb9728] p-[1px] rounded-[20px]">
            <div className="bg-[#0c0c11] rounded-[19px] p-5 h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Image src={ActiveCampaignIcon} alt="" width={26} height={26} />
                </div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">
                  Active Campaigns
                </p>
              </div>
              <p className="text-2xl font-black text-white tracking-tighter">
                {stats.active}
              </p>
              <p className="text-[10px] text-white/20 mt-1.5 font-medium uppercase tracking-wider">
                Currently Live
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600 via-orange-500 to-[#eb9728] p-[1px] rounded-[20px]">
            <div className="bg-[#0c0c11] rounded-[19px] p-5 h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Image src={TotalUsersIcon} alt="" width={26} height={26} />
                </div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#eb9728]">
                  Total Participants
                </p>
              </div>
              <p className="text-2xl font-black text-[#eb9728] tracking-tighter">
                {stats.totalParticipants.toLocaleString()}
              </p>
              <p className="text-[10px] text-[#eb9728]/40 mt-1.5 font-medium uppercase tracking-wider">
                Across all campaigns
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600 via-orange-500 to-[#eb9728] p-[1px] rounded-[20px]">
            <div className="bg-[#0c0c11] rounded-[19px] p-5 h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Image src={RevenueIcon} alt="" width={26} height={26} />
                </div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">
                  Revenue Potential
                </p>
              </div>
              <p className="text-2xl font-black text-white tracking-tighter">
                ${stats.totalRevenuePotential.toLocaleString()}
              </p>
              <p className="text-[10px] text-white/20 mt-1.5 font-medium uppercase tracking-wider">
                Targeted yield
              </p>
            </div>
          </div>
        </div>


        {/* Filters */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3 flex items-center gap-4 flex-wrap relative z-20">
          {/* Status Tabs */}
          <div className="flex gap-1 flex-wrap shrink-0">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                  setLoading(true);
                }}
                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  activeTab === tab.key
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(124,58,237,0.25)]"
                    : "text-white/30 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-white/10 hidden sm:block" />

          {/* Search */}
          <div className="relative flex-1 min-w-[180px] group">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-white/20 text-lg group-focus-within:text-purple-500 transition-colors">
              search
            </span>
            <input
              type="text"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setLoading(true);
              }}
              className="w-full bg-transparent text-white placeholder:text-white/15 pl-9 pr-3 py-1.5 text-sm focus:outline-none transition-all"
            />
          </div>

          {/* Sort — custom dropdown */}
          <div className="relative shrink-0" ref={sortRef}>
            <button
              onClick={() => setSortOpen((o) => !o)}
              className="flex items-center gap-2 bg-white/5 border border-purple-500/20 text-white/70 rounded-xl pl-4 pr-3 py-1.5 text-[9px] font-black uppercase tracking-widest hover:border-purple-500/40 hover:text-white transition-all"
            >
              <span>{{ newest: "Newest", ending_soon: "Ending Soon", participants: "Most Participants" }[sort]}</span>
              <span className={`material-symbols-outlined text-sm transition-transform duration-200 ${sortOpen ? "rotate-180" : ""}`}>expand_more</span>
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-[#0f0f14] border border-purple-500/20 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] min-w-[160px]">
                {[
                  { value: "newest", label: "Newest" },
                  { value: "ending_soon", label: "Ending Soon" },
                  { value: "participants", label: "Most Participants" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSort(opt.value);
                      setPage(1);
                      setLoading(true);
                      setSortOpen(false);
                    }}
                    className={`w-full text-left px-5 py-3 text-[9px] font-black uppercase tracking-widest transition-all ${
                      sort === opt.value
                        ? "bg-purple-600/20 text-purple-300"
                        : "text-white/40 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-6 animate-pulse h-40"
              />
            ))}
          </div>
        ) : groupBuys.length === 0 ? (
          <div className="py-20 text-center px-8 flex flex-col items-center">
            <div className="w-48 h-48">
              <Lottie animationData={NotFoundAnimation} loop={true} autoplay={true} />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 -mt-4">No campaigns found</h3>
            <p className="text-white/20 text-sm max-w-xs mx-auto mb-8 uppercase font-bold tracking-widest">
              Create your first group buy campaign to start accepting bulk orders.
            </p>
            <Link
              href="/manufacturer/group-buys/new"
              className="px-6 py-3 bg-gradient-to-r from-purple-600/70 to-indigo-600/70 border border-purple-500/20 text-white/80 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:from-purple-600/90 hover:to-indigo-600/90 hover:text-white hover:border-purple-500/40 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">rocket_launch</span>
              Launch New Campaign
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
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
              <div className="flex items-center justify-center gap-4 pt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 disabled:opacity-20 hover:bg-white/10 hover:text-white transition-all"
                >
                  Previous
                </button>
                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                  Page {page} of {pagination.pages}
                </span>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(pagination.pages, p + 1))
                  }
                  disabled={page === pagination.pages}
                  className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 disabled:opacity-20 hover:bg-white/10 hover:text-white transition-all"
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
  const has3DModel = Boolean(product?.model3D?.url);
  const highestTier = gb.tiers?.[gb.tiers.length - 1];
  const tier1 = gb.tiers?.[0];

  const progress = tier1
    ? Math.min(100, Math.round((gb.currentQuantity / tier1.minQuantity) * 100))
    : 0;

  const revenuePotential =
    (gb.currentQuantity || 0) * (gb.currentDiscountedPrice || gb.basePrice);

  return (
    <div className="bg-white/[0.03] border border-purple-500/20 rounded-[2rem] p-4 hover:border-purple-500/40 transition-all group relative overflow-hidden">
      <div className="flex flex-col md:flex-row gap-4 relative z-10">
        {/* Product Image */}
        <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-2xl overflow-hidden shrink-0 relative">
          {primaryImage ? (
            <Image
              src={primaryImage}
              alt={product?.name}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <span className="material-symbols-outlined text-3xl">inventory_2</span>
            </div>
          )}
          {has3DModel && (
            <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-purple-600 text-white text-[7px] font-black tracking-widest shadow-lg">
              3D
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link
                href={`/manufacturer/group-buys/${gb._id}`}
                className="text-lg font-black text-white hover:text-purple-400 transition-colors tracking-tight line-clamp-1"
              >
                {gb.title}
              </Link>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-black text-[#eb9728] uppercase tracking-widest">
                  {product?.name}
                </span>
                <div className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                  {product?.category}
                </span>
              </div>
            </div>
            <span
              className={`shrink-0 px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full ${STATUS_STYLES[gb.status]}`}
            >
              {gb.status.replace(/_/g, " ")}
            </span>
          </div>

          {/* Progress Section */}
          <div className="mt-4 bg-white/5 border border-white/5 rounded-xl p-3">
            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest mb-2">
              <span className="text-white/40">
                Tier 1: <span className="text-white">{gb.currentQuantity}</span> / <span className="text-white/20">{tier1?.minQuantity || "—"}</span> units
              </span>
              <span className="text-purple-400">{progress}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(147,51,234,0.3)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Image src={TotalUsersIcon} alt="" width={30} height={30} className="shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Participants</span>
                <span className="text-xs font-black text-white">{gb.currentParticipantCount}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Image src={OrdersIcon} alt="" width={30} height={30} className="shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Units Sold</span>
                <span className="text-xs font-black text-white">{gb.currentQuantity}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Image src={RevenueIcon} alt="" width={30} height={30} className="shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Potential Revenue</span>
                <span className="text-xs font-black text-emerald-400">${revenuePotential.toLocaleString()}</span>
              </div>
            </div>
            {["active", "paused"].includes(gb.status) && (
              <div className="flex items-center gap-3">
                <Image src={TimerIcon} alt="" width={30} height={30} className="shrink-0 animate-pulse" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Time Left</span>
                  <span className="text-xs font-black text-orange-400">
                    <TimeRemaining endDate={gb.endDate} />
                  </span>
                </div>
              </div>
            )}
            {/* View Full Report — right corner */}
            <Link
              href={`/manufacturer/group-buys/${gb._id}`}
              className="ml-auto px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/50 hover:bg-white/10 hover:text-white transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              View Report
            </Link>
          </div>
        </div>
      </div>

      {/* Actions */}
      {(["scheduled", "active", "paused"].includes(gb.status)) && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5 relative z-10">
          {["scheduled", "active", "paused"].includes(gb.status) && (
            <Link
              href={`/manufacturer/group-buys/${gb._id}/edit`}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/60 hover:bg-white/10 hover:text-white transition-all"
            >
              Edit
            </Link>
          )}
          {gb.status === "active" && (
            <button
              onClick={() => onAction(gb._id, "pause")}
              disabled={actionLoading === gb._id + "pause"}
              className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-50"
            >
              Pause
            </button>
          )}
          {gb.status === "paused" && (
            <>
              <button
                onClick={() => onAction(gb._id, "resume")}
                disabled={actionLoading === gb._id + "resume"}
                className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
              >
                Resume
              </button>
              <button
                onClick={() => onAction(gb._id, "end_early")}
                disabled={actionLoading === gb._id + "end_early"}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/40 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
              >
                End Early
              </button>
            </>
          )}
          {gb.status === "active" && (
            <button
              onClick={() => onAction(gb._id, "end_early")}
              disabled={actionLoading === gb._id + "end_early"}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/40 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
            >
              End Early
            </button>
          )}
          <button
            onClick={() => onCancel(gb._id)}
            className="ml-auto px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/20 transition-all"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
