"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import GlobalNoResults from "@/components/ui/GlobalNoResults";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { FiSearch, FiFilter, FiUser, FiCheckCircle, FiClock, FiAlertCircle } from "react-icons/fi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SupportAnimationData from "@/assets/CustomerSupport.json";

// Dynamically import Lottie to avoid SSR hydration issues
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export default function AdminSupportTicketsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ status: "open", assigned: "all" });

  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(searchInput.trim()), 250);
    return () => clearTimeout(id);
  }, [searchInput]);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: "50",
        status: filters.status,
      });
      if (searchQuery) params.set("q", searchQuery);
      if (filters.assigned !== "all") params.set("assigned", filters.assigned);

      const res = await fetch(`/api/support-tickets?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets || []);
      }
    } catch (_) {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters.status, filters.assigned]);

  const hasActiveFilters =
    Boolean(searchQuery) ||
    filters.status !== "open" ||
    filters.assigned !== "all";

  const STATUS_STYLES = {
    open: {
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      border: "border-blue-500/20",
      dot: "bg-blue-500",
      icon: <FiClock className="w-3 h-3" />
    },
    in_progress: {
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/20",
      dot: "bg-amber-500",
      icon: <FiAlertCircle className="w-3 h-3" />
    },
    waiting_for_user: {
      bg: "bg-purple-500/10",
      text: "text-purple-400",
      border: "border-purple-500/20",
      dot: "bg-purple-500",
      icon: <FiUser className="w-3 h-3" />
    },
    resolved: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/20",
      dot: "bg-emerald-500",
      icon: <FiCheckCircle className="w-3 h-3" />
    },
    closed: {
      bg: "bg-white/5",
      text: "text-white/40",
      border: "border-white/10",
      dot: "bg-white/20",
      icon: <FiCheckCircle className="w-3 h-3" />
    },
  };

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
      fetchTickets();
    }
  }, [status, session, router, fetchTickets]);

  return (
    <div className="min-h-screen bg-[#020617] relative overflow-hidden">
      {/* Background Orbs */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 p-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 drop-shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              <Lottie animationData={SupportAnimationData} loop={true} />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white mb-2">
                Support <span className="bg-gradient-to-r from-purple-500 via-red-500 to-yellow-500 bg-clip-text text-transparent">Centre</span>
              </h1>
              <p className="text-white/40 text-sm font-medium uppercase tracking-[0.2em]">
                Customer & Manufacturer Assistance Hub
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Live Updates</div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              <span className="text-white/60 text-sm font-bold">{tickets.length} Active Tickets</span>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8">
          <div className="lg:col-span-6 relative group">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-purple-500 transition-colors w-5 h-5" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by ticket number or subject..."
              className="w-full bg-white/[0.03] border border-white/10 text-white rounded-2xl pl-12 pr-4 py-4 focus:border-purple-500/50 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all placeholder:text-white/20 text-sm font-medium"
            />
          </div>
          <div className="lg:col-span-3 relative">
            <Select value={filters.status} onValueChange={(val) => setFilters(p => ({ ...p, status: val }))}>
              <SelectTrigger className="w-full bg-white/[0.03] border-white/10 text-white rounded-2xl pl-4 pr-4 py-7 focus:border-purple-500/50 focus:ring-0 transition-all appearance-none text-sm font-medium">
                <div className="flex items-center gap-3">
                  <FiFilter className="text-white/20 w-4 h-4" />
                  <SelectValue placeholder="All Statuses" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-[#020617]/95 backdrop-blur-xl border border-white/10 text-white rounded-xl shadow-2xl p-1">
                <SelectItem value="all" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors">All Statuses</SelectItem>
                <SelectItem value="open" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors">Open</SelectItem>
                <SelectItem value="in_progress" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors">In Progress</SelectItem>
                <SelectItem value="waiting_for_user" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors">Waiting for User</SelectItem>
                <SelectItem value="resolved" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors">Resolved</SelectItem>
                <SelectItem value="closed" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-3 relative">
            <Select value={filters.assigned} onValueChange={(val) => setFilters(p => ({ ...p, assigned: val }))}>
              <SelectTrigger className="w-full bg-white/[0.03] border-white/10 text-white rounded-2xl pl-4 pr-4 py-7 focus:border-purple-500/50 focus:ring-0 transition-all appearance-none text-sm font-medium">
                <div className="flex items-center gap-3">
                  <FiUser className="text-white/20 w-4 h-4" />
                  <SelectValue placeholder="All Assignments" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-[#020617]/95 backdrop-blur-xl border border-white/10 text-white rounded-xl shadow-2xl p-1">
                <SelectItem value="all" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors">All Assignments</SelectItem>
                <SelectItem value="me" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors">Assigned to me</SelectItem>
                <SelectItem value="unassigned" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-sm transition-colors">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearchInput("");
              setFilters({ status: "open", assigned: "all" });
            }}
            className="mb-8 text-[10px] font-black text-purple-400 uppercase tracking-widest hover:text-purple-300 flex items-center gap-2 transition-colors"
          >
            Clear Active Filters ×
          </button>
        )}

        {/* Results Section */}
        {loading && tickets.length === 0 ? (
          <div className="py-20">
            <GlobalLoader text="Syncing support hub..." />
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/5 rounded-[40px] p-20 flex flex-col items-center text-center">
            <GlobalNoResults text={hasActiveFilters ? "No tickets match your criteria" : "Your support queue is empty"} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {tickets.map((ticket) => {
              const s = STATUS_STYLES[ticket.status] || STATUS_STYLES.closed;
              return (
                <Link
                  key={ticket._id}
                  href={`/admin/support/${ticket._id}`}
                  className="group block bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-[32px] p-6 transition-all backdrop-blur-xl"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black text-white/30 font-mono tracking-tighter uppercase">{ticket.ticketNumber}</span>
                        <span className="text-white/10 text-xs font-black">/</span>
                        <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">{ticket.category}</span>
                      </div>
                      <h3 className="text-lg font-black text-white mb-2 group-hover:text-purple-400 transition-colors truncate">
                        {ticket.subject}
                      </h3>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white/40 font-bold uppercase">
                            {(ticket.requesterId?.businessName || ticket.requesterId?.name)?.charAt(0)}
                          </div>
                          <span className="text-xs font-bold text-white/60">{ticket.requesterId?.businessName || ticket.requesterId?.name}</span>
                        </div>
                        <span className="w-1 h-1 rounded-full bg-white/10" />
                        <p className="text-xs text-white/30 font-medium truncate italic max-w-sm">
                          "{ticket.lastMessagePreview || "No messages yet"}"
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 shrink-0">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${s.bg} ${s.text} ${s.border}`}>
                        {s.icon}
                        {ticket.status?.replace(/_/g, " ")}
                      </div>
                      {ticket.unreadCount > 0 && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center text-[10px] font-black text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                          {ticket.unreadCount > 9 ? "9+" : ticket.unreadCount}
                        </div>
                      )}
                      <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20 group-hover:bg-purple-500 group-hover:text-white group-hover:border-transparent transition-all">
                        <FiArrowLeft className="w-4 h-4 rotate-180" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const FiArrowLeft = ({ className }) => (
  <svg className={className} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);
