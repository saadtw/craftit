// app/manufacturer/bids/page.js
"use client";

import GlobalNoResults from "@/components/ui/GlobalNoResults";
import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import messageIcon from "@/assets/message.png";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ManufacturerBidsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    pending: false,
    accepted: false,
    rejected: false,
    withdrawn: false,
    dateFrom: "",
    dateTo: "",
  });
  const [localFilters, setLocalFilters] = useState({ ...filters });
  const [sortBy, setSortBy] = useState("newest");
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchBids = () => {
    setLoading(true);
    setFilters({ ...localFilters }); // Apply the local filters
    setRefreshKey((k) => k + 1);
  };

  const hasChanges = JSON.stringify(filters) !== JSON.stringify(localFilters);
  const [stats, setStats] = useState({
    totalBids: 0,
    acceptanceRate: 0,
    avgResponseTime: 0,
  });

  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "manufacturer")
      return;
    let cancelled = false;
    fetch("/api/bids?manufacturerId=" + session.user.id)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.success || !data.bids) return;

        // Compute stats from raw data before filtering
        const total = data.bids.length;
        const accepted = data.bids.filter(
          (b) => b.status === "accepted",
        ).length;
        setStats({
          totalBids: total,
          acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
          avgResponseTime: 2.5,
        });

        // Apply status filters
        let filteredBids = data.bids;
        const activeStatuses = [];
        if (filters.pending)
          activeStatuses.push("pending", "under_consideration");
        if (filters.accepted) activeStatuses.push("accepted");
        if (filters.rejected) activeStatuses.push("rejected");
        if (filters.withdrawn) activeStatuses.push("withdrawn");
        if (activeStatuses.length > 0) {
          filteredBids = filteredBids.filter((bid) =>
            activeStatuses.includes(bid.status),
          );
        }

        // Apply date filters
        if (filters.dateFrom) {
          filteredBids = filteredBids.filter(
            (bid) => new Date(bid.createdAt) >= new Date(filters.dateFrom),
          );
        }
        if (filters.dateTo) {
          filteredBids = filteredBids.filter(
            (bid) => new Date(bid.createdAt) <= new Date(filters.dateTo),
          );
        }

        // Sort
        filteredBids.sort((a, b) => {
          switch (sortBy) {
            case "newest":
              return new Date(b.createdAt) - new Date(a.createdAt);
            case "oldest":
              return new Date(a.createdAt) - new Date(b.createdAt);
            case "highest_bid":
              return b.amount - a.amount;
            case "lowest_bid":
              return a.amount - b.amount;
            default:
              return 0;
          }
        });

        setBids(filteredBids);
      })
      .catch((error) => console.error("Error:", error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, session, filters, sortBy, refreshKey]);

  const getStatusColor = (status) => {
    switch (status) {
      case "accepted":
        return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
      case "pending":
      case "under_consideration":
        return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-500 border border-red-500/20";
      case "withdrawn":
        return "bg-white/5 text-white/40 border border-white/10";
      default:
        return "bg-white/5 text-white/40 border border-white/10";
    }
  };

  if (status === "loading" || loading) {
    return <GlobalLoader text="LOADING BIDS..." fullScreen={true} />;
  }

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  if (session?.user?.role !== "manufacturer") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050507]">
        <div className="text-xl text-red-500 font-bold">
          Access Denied. Manufacturers only.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="container mx-auto px-4 sm:px-6 lg:px-10 pt-0 pb-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Filters Sidebar - Now with independent scroll if content exceeds screen height */}
          <aside className="lg:w-72 shrink-0 sticky top-2 lg:top-4 h-fit max-h-[calc(100vh-60px)] overflow-y-auto no-scrollbar pb-10 space-y-5">
            {/* Page Title - Now part of sticky sidebar */}
            <h1 className="text-4xl font-black bg-gradient-to-r from-[#eb9728] via-purple-500 via-indigo-500 to-emerald-400 bg-clip-text text-transparent mb-1">
              My Bids
            </h1>

            {/* Sort Dropdown - Moved here to declutter main layout */}
            <div className="mb-6">
              <Select value={sortBy} onValueChange={(val) => { setLoading(true); setSortBy(val); }}>
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white rounded-xl px-4 h-12 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all shadow-sm">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-[#0B011D] border-purple-500/30 text-white">
                  <SelectItem value="newest" className="focus:bg-purple-500 focus:text-white transition-colors cursor-pointer">Sort by: Newest</SelectItem>
                  <SelectItem value="oldest" className="focus:bg-purple-500 focus:text-white transition-colors cursor-pointer">Sort by: Oldest</SelectItem>
                  <SelectItem value="highest_bid" className="focus:bg-purple-500 focus:text-white transition-colors cursor-pointer">Sort by: Highest Bid</SelectItem>
                  <SelectItem value="lowest_bid" className="focus:bg-purple-500 focus:text-white transition-colors cursor-pointer">Sort by: Lowest Bid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-white/[0.03] rounded-xl border-2 border-purple-500/30 p-5 shadow-sm">
              <h3 className="text-lg font-bold text-white mb-5">
                Filter Bids
              </h3>

              <div className="space-y-5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-white/40 mb-3">
                    Status
                  </label>
                  <div className="space-y-3">
                    {["pending", "accepted", "rejected", "withdrawn"].map((s) => (
                      <label key={s} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={localFilters[s]}
                          onChange={(e) => {
                            setLocalFilters({
                              ...localFilters,
                              [s]: e.target.checked,
                            });
                          }}
                          className="w-4 h-4 rounded bg-white/5 border-white/10 text-[#eb9728] focus:ring-[#eb9728]"
                        />
                        <span className="text-sm text-white/60 group-hover:text-purple-400 transition-colors capitalize">
                          {s === "pending" ? "Pending / Consideration" : s}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-white/40 mb-3">
                    Date Range
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={localFilters.dateFrom}
                      onChange={(e) => {
                        setLocalFilters({ ...localFilters, dateFrom: e.target.value });
                      }}
                      className="w-full bg-white/5 border-white/10 rounded-lg text-sm text-white focus:border-[#eb9728] focus:ring-[#eb9728] [color-scheme:dark]"
                    />
                    <input
                      type="date"
                      value={localFilters.dateTo}
                      onChange={(e) => {
                        setLocalFilters({ ...localFilters, dateTo: e.target.value });
                      }}
                      className="w-full bg-white/5 border-white/10 rounded-lg text-sm text-white focus:border-[#eb9728] focus:ring-[#eb9728] [color-scheme:dark]"
                    />
                  </div>
                </div>

                <button
                  onClick={fetchBids}
                  disabled={!hasChanges}
                  className={`w-full px-4 py-2.5 font-black uppercase text-[11px] tracking-widest rounded-lg transition-all ${
                    hasChanges 
                      ? "bg-gradient-to-r from-[#eb9728] to-orange-600 text-white hover:shadow-[0_0_15px_rgba(235,151,40,0.4)] hover:scale-[1.01]" 
                      : "bg-white/5 text-white/20 cursor-not-allowed border border-white/10"
                  }`}
                >
                  Apply Filters
                </button>
              </div>
            </div>

            <div className="bg-white/[0.03] rounded-xl border-2 border-purple-500/30 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Saved RFQs</h3>
                <span className="text-[10px] font-black text-[#eb9728] uppercase tracking-widest">2 items</span>
              </div>
              <div className="space-y-3">
                {[
                  { name: "High-Tolerance Gear Assembly", id: "RFQ-9921" },
                  { name: "Aerospace Bracket Prototypes", id: "RFQ-4402" }
                ].map((rfq, idx) => (
                  <a 
                    key={idx}
                    href="#" 
                    className="flex flex-col p-3 rounded-lg bg-white/5 border border-white/5 hover:border-purple-500/30 hover:bg-purple-500/10 transition-all group"
                  >
                    <span className="text-sm text-white/80 group-hover:text-[#eb9728] font-bold transition-colors line-clamp-1">
                      {rfq.name}
                    </span>
                    <span className="text-[10px] text-white/20 font-black uppercase tracking-tighter mt-1 group-hover:text-white/40">
                      ID: {rfq.id}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 pt-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
              <div className="bg-white/[0.03] rounded-xl border-2 border-purple-500/30 p-6 shadow-sm">
                <p className="text-white/40 text-sm font-bold uppercase tracking-widest mb-1">Total Bids Placed</p>
                <p className="text-3xl font-black text-white">{stats.totalBids}</p>
              </div>
              <div className="bg-white/[0.03] rounded-xl border-2 border-purple-500/30 p-6 shadow-sm">
                <p className="text-white/40 text-sm font-bold uppercase tracking-widest mb-1">Acceptance Rate</p>
                <p className="text-3xl font-black text-white">{stats.acceptanceRate}%</p>
              </div>
              <div className="bg-white/[0.03] rounded-xl border-2 border-purple-500/30 p-6 shadow-sm">
                <p className="text-white/40 text-sm font-bold uppercase tracking-widest mb-1">Avg Response Time</p>
                <p className="text-3xl font-black text-white">{stats.avgResponseTime} days</p>
              </div>
            </div>


            <div className="space-y-5">
              {bids.length === 0 ? (
                <div className="bg-white/[0.03] border-2 border-purple-500/30 rounded-xl shadow-sm p-12 text-center">
                  <GlobalNoResults text="No bids found" />
                </div>
              ) : (
                bids.map((bid) => (
                  <div key={bid?._id} className="bg-white/[0.03] rounded-xl border-2 border-purple-500/30 shadow-sm hover:bg-purple-500/10 hover:border-purple-500/50 transition-all p-5 group">
                    {bid?.rfqId?.customOrderId?.model3D?.url && (
                      <div className="mb-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.15)]">
                          3D Model Available
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col md:flex-row gap-6">
                      {bid?.rfqId?.customOrderId?.images?.[0]?.url && (
                        <div className="w-full md:w-36 h-36 relative overflow-hidden rounded-xl border border-white/10 shadow-lg shrink-0 bg-gray-900">
                          <Image
                            src={bid.rfqId.customOrderId.images[0].url}
                            alt="Bid Part"
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-3 gap-4">
                          <div className="min-w-0">
                            <h4 className="text-xl font-bold text-white truncate group-hover:text-[#eb9728] transition-colors">
                              {bid?.rfqId?.customOrderId?.title || "RFQ"}
                            </h4>
                            <p className="text-xs text-white/30 font-bold uppercase tracking-tighter mt-1">
                              RFQ ID: {bid?.rfqId?.rfqNumber}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-sm ${getStatusColor(bid?.status)}`}>
                            {bid?.status === "under_consideration" ? "PENDING" : (bid?.status?.replace("_", " ").toUpperCase() || "PENDING")}
                          </span>
                        </div>

                        <p className="text-sm text-white/50 mb-5 line-clamp-2 leading-relaxed">
                          {bid?.rfqId?.customOrderId?.description || "No description"}
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-1">
                          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/5 border border-white/5 group-hover:border-purple-500/20 transition-all">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Quantity</span>
                            <strong className="text-white font-black text-base">{bid?.rfqId?.customOrderId?.quantity || "N/A"} <span className="text-[10px] font-medium text-white/40">pcs</span></strong>
                          </div>
                          {bid?.rfqId?.customOrderId?.materialPreferences?.[0] && (
                            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/5 border border-white/5 group-hover:border-purple-500/20 transition-all">
                              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Material</span>
                              <strong className="text-white font-black text-base truncate">{bid.rfqId.customOrderId.materialPreferences[0]}</strong>
                            </div>
                          )}
                          {bid?.rfqId?.customOrderId?.deadline && (
                            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/5 border border-white/5 group-hover:border-purple-500/20 transition-all">
                              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Deadline</span>
                              <strong className="text-white font-black text-base">{new Date(bid.rfqId.customOrderId.deadline).toLocaleDateString()}</strong>
                            </div>
                          )}
                          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#eb9728]/10 border border-[#eb9728]/20 group-hover:border-[#eb9728]/40 transition-all shadow-[0_0_20px_rgba(235,151,40,0.05)]">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#eb9728]">Your Bid</span>
                            <strong className="text-white font-black text-lg">${bid?.amount?.toLocaleString()}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-4 flex flex-wrap items-center justify-between gap-4 mt-5">
                      <div className="text-xs text-white/30 font-medium">
                        Bid Placed: <span className="text-white/60 font-bold">{new Date(bid?.submittedAt || bid?.createdAt).toLocaleDateString()}</span>
                        {bid?.status === "under_consideration" && (
                          <><span className="mx-3 text-white/10">|</span><strong className="text-amber-500 uppercase tracking-widest text-[10px] font-black animate-pulse">Counter Offer Received</strong></>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <Link href={`/bids/${bid?._id}`} className="px-4 py-2 bg-white/10 text-white/80 font-black uppercase text-[10px] tracking-widest rounded-lg hover:bg-white/20 hover:text-white transition-all border border-white/20">
                          View Details
                        </Link>
                        {bid?.status === "under_consideration" && (
                          <Link
                            href={`/bids/${bid?._id}`}
                            className="px-4 py-2 bg-gradient-to-r from-[#eb9728] to-orange-600 text-white font-black uppercase text-[10px] tracking-widest rounded-lg hover:shadow-[0_0_15px_rgba(235,151,40,0.4)] hover:scale-[1.02] transition-all"
                          >
                            Respond to Counter
                          </Link>
                        )}
                        {bid?.status === "pending" && (
                          <Link
                            href={`/bids/${bid?._id}#chat`}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black uppercase text-[10px] tracking-widest rounded-lg hover:shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:scale-[1.02] transition-all flex items-center gap-2"
                          >
                            <Image src={messageIcon} alt="Chat" width={14} height={14} className="brightness-200" />
                            Chat
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-16 border-t border-white/5 bg-black/20 backdrop-blur-sm py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center gap-8 mb-6">
            <a href="#" className="text-white/40 hover:text-[#eb9728] text-xs font-bold uppercase tracking-widest transition-colors">Help</a>
            <a href="#" className="text-white/40 hover:text-[#eb9728] text-xs font-bold uppercase tracking-widest transition-colors">Terms & Conditions</a>
            <a href="#" className="text-white/40 hover:text-[#eb9728] text-xs font-bold uppercase tracking-widest transition-colors">Contact Support</a>
          </div>
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.4em]">© {new Date().getFullYear()} CRAFTIT GLOBAL · ALL RIGHTS RESERVED</p>
        </div>
      </footer>
    </div>
  );
}
