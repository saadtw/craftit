// app/admin/activity-log/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  FiCheckCircle, FiXCircle, FiClipboard, FiLock, FiUnlock, 
  FiAlertCircle, FiEye, FiStopCircle, FiTag, FiEdit3 
} from "react-icons/fi";
import dynamic from 'next/dynamic';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });
import ActivityLog from "@/assets/ActivityLog.json";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const getActionIcon = (action) => {
  if (!action) return <FiEdit3 className="text-slate-400 w-5 h-5 group-hover:text-purple-400 transition-colors" />;
  if (action === "manufacturer_approved") return <FiCheckCircle className="text-emerald-400 w-5 h-5 group-hover:scale-110 transition-transform" />;
  if (action === "manufacturer_rejected") return <FiXCircle className="text-red-400 w-5 h-5 group-hover:scale-110 transition-transform" />;
  if (action === "manufacturer_info_requested") return <FiClipboard className="text-sky-400 w-5 h-5 group-hover:scale-110 transition-transform" />;
  if (action === "user_suspended") return <FiLock className="text-amber-400 w-5 h-5 group-hover:scale-110 transition-transform" />;
  if (action === "user_unsuspended") return <FiUnlock className="text-emerald-400 w-5 h-5 group-hover:scale-110 transition-transform" />;
  if (action === "dispute_resolved") return <FiAlertCircle className="text-purple-400 w-5 h-5 group-hover:scale-110 transition-transform" />;
  if (action === "order_viewed") return <FiEye className="text-slate-400 w-5 h-5 group-hover:text-purple-400 transition-colors" />;
  if (action === "order_force_cancelled") return <FiStopCircle className="text-red-500 w-5 h-5 group-hover:scale-110 transition-transform" />;
  if (action === "support_ticket_updated") return <FiTag className="text-indigo-400 w-5 h-5 group-hover:scale-110 transition-transform" />;
  return <FiEdit3 className="text-slate-400 w-5 h-5 group-hover:text-purple-400 transition-colors" />;
};

export default function AdminActivityLogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [actionFilter, setActionFilter] = useState("all");

  const fetchLogs = useCallback(
    async (page = 1) => {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 25 });
      if (actionFilter !== "all") params.set("action", actionFilter);
      try {
        const res = await fetch(`/api/admin/activity-log?${params}`);
        const data = await res.json();
        if (Array.isArray(data.logs)) {
          setLogs(data.logs || []);
          setPagination(data.pagination || { page: 1, total: 0, pages: 1 });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [actionFilter],
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
      fetchLogs();
    }
  }, [status, session, router, fetchLogs]);

  if (status === "loading") {
    return <GlobalLoader fullScreen text="Loading activity logs..." />;
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-12 selection:bg-purple-500/30">
      {/* Background Ambient Glow */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[140px] rounded-full opacity-50" />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto p-6 lg:p-10">
        <div className="mb-12 border-b border-white/5 pb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-500 via-red-500 to-yellow-500 text-transparent bg-clip-text tracking-tighter uppercase leading-none">System Activity Log</h1>
            <p className="text-slate-400 text-lg mt-3 font-medium mb-6">
              Complete, immutable audit trail of all administrative actions.
            </p>
            {/* Filter */}
            <div className="relative inline-block z-50">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[280px] bg-white/[0.02] border-white/10 text-white rounded-2xl px-6 py-6 text-xs font-black tracking-widest uppercase hover:border-purple-400/50 hover:bg-white/[0.04] focus:border-purple-500 focus:bg-white/[0.06] focus:ring-0 transition-all backdrop-blur-md cursor-pointer">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={6} className="bg-[#020617]/95 backdrop-blur-xl border border-white/10 text-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] p-1 z-[100] min-w-[280px]">
                  <SelectItem value="all" className="focus:bg-purple-600 focus:text-white focus:**:text-white text-sm font-medium py-2.5 px-4 cursor-pointer rounded-lg transition-colors focus:outline-none">All Actions</SelectItem>
                  <SelectItem value="manufacturer_approved" className="focus:bg-purple-600 focus:text-white focus:**:text-white text-sm font-medium py-2.5 px-4 cursor-pointer rounded-lg transition-colors focus:outline-none">Manufacturer Approvals</SelectItem>
                  <SelectItem value="manufacturer_rejected" className="focus:bg-purple-600 focus:text-white focus:**:text-white text-sm font-medium py-2.5 px-4 cursor-pointer rounded-lg transition-colors focus:outline-none">Manufacturer Rejections</SelectItem>
                  <SelectItem value="manufacturer_info_requested" className="focus:bg-purple-600 focus:text-white focus:**:text-white text-sm font-medium py-2.5 px-4 cursor-pointer rounded-lg transition-colors focus:outline-none">Manufacturer Info Requested</SelectItem>
                  <SelectItem value="user_suspended" className="focus:bg-purple-600 focus:text-white focus:**:text-white text-sm font-medium py-2.5 px-4 cursor-pointer rounded-lg transition-colors focus:outline-none">User Suspensions</SelectItem>
                  <SelectItem value="user_unsuspended" className="focus:bg-purple-600 focus:text-white focus:**:text-white text-sm font-medium py-2.5 px-4 cursor-pointer rounded-lg transition-colors focus:outline-none">User Unsuspensions</SelectItem>
                  <SelectItem value="dispute_resolved" className="focus:bg-purple-600 focus:text-white focus:**:text-white text-sm font-medium py-2.5 px-4 cursor-pointer rounded-lg transition-colors focus:outline-none">Dispute Resolutions</SelectItem>
                  <SelectItem value="order_viewed" className="focus:bg-purple-600 focus:text-white focus:**:text-white text-sm font-medium py-2.5 px-4 cursor-pointer rounded-lg transition-colors focus:outline-none">Order Views</SelectItem>
                  <SelectItem value="order_force_cancelled" className="focus:bg-purple-600 focus:text-white focus:**:text-white text-sm font-medium py-2.5 px-4 cursor-pointer rounded-lg transition-colors focus:outline-none">Order Force Cancellations</SelectItem>
                  <SelectItem value="support_ticket_updated" className="focus:bg-purple-600 focus:text-white focus:**:text-white text-sm font-medium py-2.5 px-4 cursor-pointer rounded-lg transition-colors focus:outline-none">Support Ticket Updates</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Main Animation */}
          <div className="w-full md:w-80 h-40 md:h-44 flex items-center justify-center relative group shrink-0">
            {/* Subtle glow behind animation */}
            <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full scale-125 group-hover:bg-indigo-600/20 transition-all duration-700" />
            <Lottie 
              animationData={ActivityLog} 
              loop={true} 
              className="w-full h-full object-contain relative z-10 transform scale-110"
            />
          </div>
        </div>

        <section className="bg-white/[0.02] border border-white/5 rounded-[3rem] overflow-hidden backdrop-blur-md">
          <div className="px-8 py-7 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
            <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_#a855f7]" />
                <h2 className="font-bold text-xs text-white uppercase tracking-[0.3em]">Action Registry</h2>
            </div>
            <p className="text-purple-400 text-[10px] font-black uppercase tracking-widest">
              {pagination.total} Total Records
            </p>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-500 text-sm font-medium italic">
              Scanning audit records...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center text-slate-500 text-sm font-medium italic">
              No matching records found.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {logs.map((log, idx) => (
                <div
                  key={log._id || idx}
                  className="px-6 md:px-8 py-5 hover:bg-purple-500/[0.03] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-purple-500/40 group-hover:bg-purple-500/5 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]">
                      {getActionIcon(log.action)}
                    </div>
                    <div>
                      <p className="text-slate-200 text-sm md:text-base font-semibold group-hover:text-white transition-colors tracking-tight">
                        {log.description || log.action?.replace(/_/g, " ")}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest opacity-60">
                          By {log.adminId?.name || "System Root"}
                        </p>
                        {log.targetType && (
                          <>
                            <span className="text-slate-700 text-xs">•</span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-white/5 text-slate-400">
                              {log.targetType.replace(/_/g, " ")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-left md:text-right ml-16 md:ml-0">
                    <p className="text-slate-400 text-xs md:text-sm font-mono font-bold tracking-tighter">
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </p>
                    <p className="text-slate-600 text-[9px] md:text-[10px] font-black uppercase mt-0.5 md:mt-1">
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Unknown Time"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-8 py-6 border-t border-white/5 bg-white/[0.01]">
              <p className="text-slate-500 text-xs font-black tracking-widest uppercase">
                Page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => fetchLogs(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-4 py-2 bg-white/[0.03] border border-white/10 hover:border-purple-400/50 hover:bg-purple-500/10 disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:bg-white/[0.03] text-slate-300 text-[10px] font-black tracking-widest uppercase rounded-xl transition-all"
                >
                  &larr; Prev
                </button>
                <button
                  onClick={() => fetchLogs(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="px-4 py-2 bg-white/[0.03] border border-white/10 hover:border-purple-400/50 hover:bg-purple-500/10 disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:bg-white/[0.03] text-slate-300 text-[10px] font-black tracking-widest uppercase rounded-xl transition-all"
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

