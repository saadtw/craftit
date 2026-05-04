// app/admin/disputes/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import GlobalNoResults from "@/components/ui/GlobalNoResults";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FiShield, FiAlertCircle } from "react-icons/fi";
import buyerIcon from "@/assets/Buyer.png";
import sellerIcon from "@/assets/Seller.png";

const STATUS_STYLES = {
  open: {
    bg: "bg-red-500/10 border border-red-500/20 text-red-400",
    dot: "bg-red-500 shadow-[0_0_8px_#ef4444]",
  },
  under_review: {
    bg: "bg-amber-500/10 border border-amber-500/20 text-amber-400",
    dot: "bg-amber-500 shadow-[0_0_8px_#f59e0b]",
  },
  resolved: {
    bg: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400",
    dot: "bg-emerald-500 shadow-[0_0_8px_#10b981]",
  },
};

export default function AdminDisputesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("open");
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  const fetchDisputes = useCallback(
    async (page = 1) => {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter !== "all") params.set("status", statusFilter);
      try {
        const res = await fetch(`/api/admin/disputes?${params}`);
        const data = await res.json();
        if (data.success) {
          setDisputes(data.disputes || []);
          setPagination(data.pagination || { page: 1, total: 0, pages: 1 });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated") {
      if (session?.user?.role !== "admin") {
        router.push("/");
        return;
      }
      fetchDisputes();
    }
  }, [status, session, router, fetchDisputes]);

  if (status === "loading") {
    return <GlobalLoader fullScreen text="Loading disputes..." />;
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-12 selection:bg-purple-500/30">
      {/* Background Ambient Glow */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[140px] rounded-full opacity-50" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 border-b border-white/5 pb-6">
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-500 via-red-500 to-yellow-500 text-transparent bg-clip-text tracking-tighter uppercase leading-none">
            Dispute Resolution
          </h1>
          <p className="text-slate-400 text-base mt-2 font-medium">
            Review and resolve active customer-manufacturer disputes.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white/[0.02] border border-white/5 rounded-2xl p-2 w-fit backdrop-blur-md">
          {[
            { key: "open", label: "Open" },
            { key: "under_review", label: "Under Review" },
            { key: "resolved", label: "Resolved" },
            { key: "all", label: "All" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                statusFilter === tab.key
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                  : "bg-transparent text-slate-400 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md">
          {/* Table Header / Meta */}
          <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiShield className="text-purple-500 w-4 h-4" />
              <h2 className="font-bold text-[10px] text-white uppercase tracking-[0.2em]">
                {statusFilter === "all" ? "All Disputes" : `${statusFilter.replace("_", " ")} Disputes`}
              </h2>
            </div>
            <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase">
              {pagination.total} Records
            </p>
          </div>

          {/* List Content */}
          {loading ? (
            <div className="py-12">
              <GlobalLoader text="Fetching records..." />
            </div>
          ) : disputes.length === 0 ? (
            <GlobalNoResults text="No disputes found" />
          ) : (
            <div className="divide-y divide-white/5">
              {disputes.map((dispute) => {
                const style = STATUS_STYLES[dispute.status] || {
                  bg: "bg-slate-500/10 border border-slate-500/20 text-slate-400",
                  dot: "bg-slate-500",
                };

                return (
                  <div
                    key={dispute._id}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between px-6 py-5 hover:bg-white/[0.02] transition-colors gap-4"
                  >
                    {/* Dispute Info */}
                    <div className="flex items-start gap-5 min-w-0">
                      <div className="w-14 h-14 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-center shrink-0">
                        <span className="text-slate-400 text-xs font-black uppercase tracking-wider">
                          #{dispute.disputeNumber?.slice(-4) || "000"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <p className="text-white text-sm font-bold truncate">
                            {dispute.issueType?.replace(/_/g, " ") || "General Dispute"}
                          </p>
                          <span className={`px-2.5 py-1 rounded-md text-[9px] font-black tracking-widest uppercase flex items-center gap-2 ${style.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            {dispute.status?.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs mt-1.5 font-medium flex items-center gap-2">
                          <span>Order: <span className="font-mono text-purple-400">{dispute.orderId?.orderNumber || "—"}</span></span>
                          <span className="text-slate-600">•</span>
                          <span>
                            {new Date(dispute.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </span>
                        </p>
                        <div className="flex items-center flex-wrap gap-1.5 text-slate-500 text-[11px] mt-1.5 font-medium">
                          <Image src={buyerIcon} alt="Buyer" className="w-3.5 h-3.5 object-contain opacity-60" />
                          <span>{dispute.customerId?.name || "Customer"}</span>
                          <span className="text-slate-600 mx-1 text-[9px] font-black uppercase">vs</span>
                          <Image src={sellerIcon} alt="Seller" className="w-3.5 h-3.5 object-contain opacity-60" />
                          <span>{dispute.manufacturerId?.businessName || dispute.manufacturerId?.name || "Manufacturer"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0 sm:ml-4">
                      <Link
                        href={`/admin/disputes/${dispute._id}`}
                        className="inline-flex items-center justify-center px-5 py-2.5 bg-white/[0.02] border border-white/5 hover:border-transparent hover:bg-gradient-to-r hover:from-purple-600 hover:to-indigo-600 text-slate-300 hover:text-white hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                      >
                        Review Case
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                Page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchDisputes(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-4 py-2 bg-white/[0.02] hover:bg-white/[0.05] disabled:opacity-30 disabled:hover:bg-white/[0.02] border border-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors"
                >
                  Prev
                </button>
                <button
                  onClick={() => fetchDisputes(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="px-4 py-2 bg-white/[0.02] hover:bg-white/[0.05] disabled:opacity-30 disabled:hover:bg-white/[0.02] border border-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

