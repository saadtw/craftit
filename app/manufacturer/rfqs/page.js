// app/manufacturer/rfqs/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const STATUS_STYLES = {
  active: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400",
  closed: "bg-red-500/10 border border-red-500/20 text-red-400",
  bid_accepted: "bg-purple-500/10 border border-purple-500/20 text-purple-400",
  cancelled: "bg-white/5 border border-white/10 text-white/40",
};

export default function ManufacturerRFQsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "active",
    budgetMin: "",
    budgetMax: "",
    deadline: "",
  });
  const [sortBy, setSortBy] = useState("newest");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "manufacturer")
      return;
    let cancelled = false;
    const params = new URLSearchParams();
    params.append("status", filters.status || "active");
    let endpoint = `/api/rfqs?${params}`;
    if (sortBy === "recommended") {
      endpoint = "/api/rfqs/recommended";
    }

    fetch(endpoint)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success && data.rfqs) {
          // recommended endpoint returns { rfqs: [{ rfq, matchScore, matchReasons }] }
          if (sortBy === "recommended") {
            setRfqs(data.rfqs.map(item => ({...item.rfq, matchReasons: item.matchReasons, matchScore: item.matchScore})));
          } else {
            setRfqs(data.rfqs);
          }
        }
      })
      .catch((err) => console.error("Error:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, session, filters, sortBy, refreshKey]);

  const getTimeRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;
    if (diff <= 0) return "Expired";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  if (status === "loading") {
    return <GlobalLoader fullScreen text="SYNCHRONIZING AUCTIONS..." />;
  }

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-400 to-indigo-400">
              Procurement Console
            </h1>
          </div>

          <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5">
            {["recommended", "newest", "ending_soon", "highest_budget"].map((sort) => (
              <button
                key={sort}
                onClick={() => { setLoading(true); setSortBy(sort); }}
                className={`px-5 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${
                  sortBy === sort ? "bg-purple-600 text-white shadow-lg" : "text-white/40 hover:text-white"
                }`}
              >
                {sort.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Advanced Filtering Sidebar */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/20 p-8 sticky top-10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-8">Filter Matrix</h3>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/20">Operational Status</label>
                  <div className="relative group">
                    <select
                      value={filters.status}
                      onChange={(e) => { setLoading(true); setFilters({ ...filters, status: e.target.value }); }}
                      className="w-full appearance-none bg-white/[0.03] border-2 border-purple-500/10 rounded-2xl px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-white focus:outline-none focus:border-purple-500/40 transition-all cursor-pointer"
                    >
                      <option value="active" className="bg-[#0B011D]">Active Portal</option>
                      <option value="closed" className="bg-[#0B011D]">Closed Loop</option>
                      <option value="bid_accepted" className="bg-[#0B011D]">Accepted</option>
                      <option value="cancelled" className="bg-[#0B011D]">Cancelled</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/20">Budget Threshold</label>
                  <div className="px-1">
                    <input type="range" min="0" max="10000" className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-purple-500" />
                    <div className="flex justify-between mt-3 text-[9px] font-black uppercase tracking-widest text-white/10">
                      <span>$0</span>
                      <span>$10k+</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/20">Temporal Limit</label>
                  <input
                    type="date"
                    value={filters.deadline}
                    onChange={(e) => { setLoading(true); setFilters({ ...filters, deadline: e.target.value }); }}
                    className="w-full bg-white/[0.03] border-2 border-purple-500/10 rounded-2xl px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-white focus:outline-none focus:border-purple-500/40 transition-all [color-scheme:dark]"
                  />
                </div>

                <div className="pt-4 space-y-3">
                  <button
                    onClick={() => { setLoading(true); setRefreshKey((k) => k + 1); }}
                    className="w-full py-4 bg-white text-[#050507] text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-white/90 transition-all shadow-xl"
                  >
                    Sync Matrix
                  </button>
                  <button
                    onClick={() => { setLoading(true); setFilters({ status: "active", budgetMin: "", budgetMax: "", deadline: "" }); }}
                    className="w-full py-4 bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-white/10 transition-all"
                  >
                    Reset All
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Inquiry Stream */}
          <div className="lg:col-span-9 space-y-10">
            
            {/* ── Customization Requests (priority section) ── */}
            {rfqs.some((r) => r.isProductCustomization) && (
              <section className="mb-2">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#eb9728] mb-6 flex items-center gap-3">
                  <span className="w-8 h-[2px] bg-[#eb9728]/40" />
                  Customization Requests for Your Products
                  <span className="px-2 py-0.5 rounded bg-[#eb9728]/15 text-[#eb9728] text-[9px] font-black border border-[#eb9728]/30">
                    {rfqs.filter((r) => r.isProductCustomization).length}
                  </span>
                </h2>
                <div className="space-y-4">
                  {rfqs
                    .filter((r) => r.isProductCustomization)
                    .map((rfq) => (
                      <div
                        key={rfq._id + "-customization"}
                        className="group bg-[#eb9728]/5 rounded-[2rem] border-2 border-[#eb9728]/25 p-6 hover:border-[#eb9728]/50 transition-all duration-300 flex flex-col sm:flex-row gap-5 items-start"
                      >
                        {/* Product thumbnail */}
                        {rfq.sourceProductId?.images?.[0]?.url && (
                          <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-[#eb9728]/20 shrink-0">
                            <img
                              src={rfq.sourceProductId.images[0].url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded border border-[#eb9728]/40 bg-[#eb9728]/15 text-[#eb9728]">
                              Product Customization
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#eb9728]/40">
                              #{rfq.rfqNumber}
                            </span>
                          </div>
                          <h3 className="text-base font-black text-white mb-0.5 truncate">
                            {rfq.customOrderId?.title || "Customization Request"}
                          </h3>
                          {rfq.sourceProductId?.name && (
                            <p className="text-[11px] text-[#eb9728]/60 mb-3 font-semibold">
                              Based on: {rfq.sourceProductId.name}
                            </p>
                          )}
                          <div className="flex items-center gap-6 text-xs text-white/40 mb-4">
                            <span>Qty: {rfq.customOrderId?.quantity || "—"}</span>
                            {rfq.customOrderId?.budget && (
                              <span className="text-emerald-400 font-bold">
                                Budget ${rfq.customOrderId.budget.toLocaleString()}
                              </span>
                            )}
                            <span>{rfq.bidsCount || 0} bids</span>
                          </div>
                          <div className="flex gap-3">
                            <a
                              href={`/manufacturer/rfqs/${rfq._id}`}
                              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 text-white transition-all"
                            >
                              Review
                            </a>
                            <a
                              href={`/manufacturer/rfqs/${rfq._id}/bid`}
                              className="px-5 py-2 bg-[#eb9728] text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-400 shadow-lg shadow-amber-500/20 transition-all"
                            >
                              Submit Bid
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            )}

            {/* ── Featured Inquiries ── */}
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-6 flex items-center gap-3">
                <span className="w-8 h-[2px] bg-purple-500/30" />
                Featured Inquiries
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {rfqs.slice(0, 2).map((rfq) => (
                  <div key={rfq._id} className="group bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/20 p-8 hover:border-purple-500/40 transition-all duration-500 shadow-xl">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-2">
                        {rfq.customOrderId?.model3D?.url && (
                          <span className="px-3 py-1 bg-purple-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.4)]">3D</span>
                        )}
                        <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg border ${STATUS_STYLES[rfq.status] || STATUS_STYLES.active}`}>
                          {rfq.status}
                        </span>
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/20 group-hover:text-white/40 transition-colors">#{rfq.rfqNumber}</p>
                    </div>

                    <h3 className="text-xl font-black tracking-tight text-white mb-3 group-hover:text-purple-400 transition-colors line-clamp-1">
                      {rfq.customOrderId?.title || "Project Inquiry"}
                    </h3>
                    <p className="text-sm text-white/40 font-medium line-clamp-2 mb-8 leading-relaxed">
                      {rfq.customOrderId?.description}
                    </p>

                    <div className="grid grid-cols-2 gap-6 mb-8 pt-6 border-t border-white/5">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">Volume</p>
                        <p className="text-sm font-black text-white/80">{rfq.customOrderId?.quantity || "0"} Units</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">Budget</p>
                        <p className="text-sm font-black text-emerald-400">${rfq.customOrderId?.budget?.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Link href={`/manufacturer/rfqs/${rfq._id}`} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 text-center transition-all">Details</Link>
                      <Link href={`/manufacturer/rfqs/${rfq._id}/bid`} className="flex-[2] py-3 bg-purple-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-purple-500 shadow-lg text-center transition-all">Submit Bid</Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Global Inquiry Stream */}
            <section className="space-y-8">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 flex items-center gap-3">
                <span className="w-8 h-[2px] bg-white/10" />
                Inquiry Database
              </h2>

              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-5 bg-white/[0.02] rounded-[3rem] border-2 border-dashed border-white/5">
                  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Fetching live market data...</p>
                </div>
              ) : rfqs.length === 0 ? (
                <div className="py-32 text-center bg-white/[0.02] rounded-[3rem] border-2 border-dashed border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">No matching inquiries in this sector</p>
                </div>
              ) : (
                rfqs.map((rfq) => (
                  <div key={rfq._id} className="group bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/20 p-8 hover:border-purple-500/40 transition-all duration-500 flex flex-col md:flex-row gap-8 items-center">
                    
                    {rfq.customOrderId?.images?.[0]?.url && (
                      <div className="relative w-full md:w-48 aspect-square rounded-[2rem] overflow-hidden border-2 border-white/5 group-hover:border-purple-500/30 transition-all shadow-2xl">
                        <Image src={rfq.customOrderId.images[0].url} alt="" fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      </div>
                    )}

                    <div className="flex-1 w-full">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">#{rfq.rfqNumber}</span>
                            <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-md border ${STATUS_STYLES[rfq.status] || STATUS_STYLES.active}`}>
                              {rfq.status}
                            </span>
                            {rfq.isProductCustomization && (
                              <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-md border border-[#eb9728]/30 bg-[#eb9728]/10 text-[#eb9728]">
                                Customization Request
                              </span>
                            )}
                          </div>
                          <h3 className="text-2xl font-black tracking-tighter text-white group-hover:text-purple-400 transition-colors uppercase">{rfq.customOrderId?.title || "Inquiry"}</h3>
                        </div>
                        <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20 hover:text-purple-400 hover:bg-white/10 transition-all">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                        </button>
                      </div>

                      <p className="text-sm text-white/40 font-medium line-clamp-2 mb-4 leading-relaxed max-w-2xl">
                        {rfq.customOrderId?.description}
                      </p>

                      {rfq.matchReasons && rfq.matchReasons.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-8">
                          {rfq.matchReasons.map((reason, idx) => (
                            <span key={idx} className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[9px] font-black uppercase tracking-widest">
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 pt-6 border-t border-white/5">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">Volume</p>
                          <p className="text-xs font-black text-white/80">{rfq.customOrderId?.quantity || "0"} Units</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">Status</p>
                          <p className="text-xs font-black text-emerald-400">{getTimeRemaining(rfq.endDate)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">Live Bids</p>
                          <p className="text-xs font-black text-white/80">{rfq.bidsCount || 0}</p>
                        </div>
                        <div className="flex justify-end items-end gap-3">
                          <Link href={`/manufacturer/rfqs/${rfq._id}`} className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Review</Link>
                          <Link href={`/manufacturer/rfqs/${rfq._id}/bid`} className="px-6 py-2.5 bg-purple-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-purple-500 shadow-lg transition-all">Bid Now</Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </section>
          </div>
        </div>
      </main>

      <footer className="mt-20 border-t border-white/5 bg-white/[0.02] py-12 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center">
          <div className="flex gap-8 mb-8">
            {["Protocol", "Privacy", "Support", "Status"].map((link) => (
              <a key={link} href="#" className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-purple-400 transition-colors">{link}</a>
            ))}
          </div>
          <p className="text-[9px] font-black uppercase tracking-widest text-white/10">© 2024 Craftit Advanced Manufacturing Core</p>
        </div>
      </footer>
    </div>
  );
}
