// app/manufacturer/messages/page.js
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function ManufacturerMessagesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [threads, setThreads] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [unreadThreads, setUnreadThreads] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const requestSeqRef = useRef(0);
  const abortRef = useRef(null);

  const fetchInbox = useCallback(
    async (page = 1, { keepInitial = false } = {}) => {
      const requestSeq = ++requestSeqRef.current;

      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      setIsFetching(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
          sort: sortBy,
          status: statusFilter,
        });

        if (searchQuery) params.set("q", searchQuery);
        if (unreadOnly) params.set("unread", "true");

        const res = await fetch(`/api/chat/inbox?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await res.json();

        if (requestSeq !== requestSeqRef.current) {
          return;
        }

        if (data.success) {
          setThreads(data.threads || []);
          setUnreadThreads(data.unreadThreads || 0);
          setPagination(data.pagination || { page: 1, total: 0, pages: 1 });
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error(err);
      } finally {
        if (requestSeq === requestSeqRef.current) {
          setIsFetching(false);
          if (!keepInitial) {
            setInitialLoading(false);
          }
        }
      }
    },
    [searchQuery, statusFilter, sortBy, unreadOnly],
  );

  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(searchInput.trim()), 250);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated") {
      if (session.user.role !== "manufacturer") {
        router.push("/auth/login");
        return;
      }
      fetchInbox(1);
    }
  }, [status, session, router, fetchInbox]);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  const STATUS_COLORS = {
    accepted: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    in_production: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    shipped: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
    completed: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    disputed: "bg-orange-500/10 border-orange-500/20 text-orange-400",
  };

  const hasActiveFilters =
    Boolean(searchQuery) || statusFilter !== "all" || unreadOnly;

  // ─── Custom Dropdown Component ───────────────────────────────────────────
  function CustomSelect({ value, onChange, options, label }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (e) => {
        if (containerRef.current && !containerRef.current.contains(e.target)) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find((o) => o.value === value) || options[0];

    return (
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white/70 flex items-center justify-between hover:bg-white/[0.06] transition-all"
        >
          <span className="truncate">{selectedOption.label}</span>
          <span className={`material-symbols-outlined text-white/20 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
            expand_more
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-2 w-full bg-[#0c0c11] border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="max-h-60 overflow-y-auto py-2">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                    value === opt.value
                      ? "bg-gradient-to-r from-purple-600/20 to-[#eb9728]/20 text-[#eb9728] font-bold"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (status === "loading" || initialLoading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-[#eb9728] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728] mb-1">
              Communication Hub
            </p>
            <h1 className="text-3xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-purple-500 via-orange-500 to-[#eb9728] bg-clip-text text-transparent inline-block">
                Messages
              </span>
            </h1>
            <p className="text-sm text-white/35 mt-1">
              Chat with customers about their orders
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {isFetching && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/20 animate-pulse">
                Syncing...
              </span>
            )}
            {unreadThreads > 0 && (
              <span className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-bold uppercase tracking-wider">
                {unreadThreads} unread
              </span>
            )}
          </div>
        </div>

        <div className="bg-white/[0.03] border-2 border-purple-500/30 rounded-2xl p-4 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search - Main Column */}
            <div className="flex-1 relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#eb9728] transition-colors text-xl">
                search
              </span>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search orders, customers, or messages..."
                className="w-full pl-12 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#eb9728]/40 focus:bg-white/[0.05] transition-all"
              />
            </div>

            {/* Filters - Action Row */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
              <div className="w-full sm:w-48">
                <CustomSelect
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: "all", label: "All Statuses" },
                    { value: "accepted", label: "Accepted" },
                    { value: "in_production", label: "In Production" },
                    { value: "shipped", label: "Shipped" },
                    { value: "completed", label: "Completed" },
                    { value: "disputed", label: "Disputed" },
                  ]}
                />
              </div>

              <div className="w-full sm:w-44">
                <CustomSelect
                  value={sortBy}
                  onChange={setSortBy}
                  options={[
                    { value: "latest", label: "Latest" },
                    { value: "oldest", label: "Oldest" },
                    { value: "unread", label: "Unread First" },
                  ]}
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white/50 cursor-pointer hover:bg-white/[0.06] transition-all select-none group h-[46px]">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={unreadOnly}
                      onChange={(e) => setUnreadOnly(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-4 h-4 border border-white/20 rounded bg-white/5 peer-checked:bg-[#eb9728] peer-checked:border-[#eb9728] transition-all flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-[10px] font-black scale-0 peer-checked:scale-100 transition-transform">
                        check
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-[10px] uppercase tracking-wider group-hover:text-white/80 transition-colors whitespace-nowrap">Unread</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setStatusFilter("all");
                    setSortBy("latest");
                    setUnreadOnly(false);
                  }}
                  disabled={!hasActiveFilters && sortBy === "latest"}
                  className="w-12 h-[46px] flex items-center justify-center bg-white/[0.03] border border-white/10 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 disabled:opacity-0 transition-all"
                  title="Clear Filters"
                >
                  <span className="material-symbols-outlined text-xl">filter_alt_off</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/[0.03] border-2 border-purple-500/30 rounded-2xl p-4 mb-8 flex gap-4">
          <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-purple-400 text-lg">
              info
            </span>
          </div>
          <div className="text-xs text-white/50 leading-relaxed py-0.5">
            <p className="font-bold text-white/80 mb-0.5">Streamlined Support</p>
            <p>
              Each order has its own chat thread. Open an order to message the
              customer directly and manage all related discussions in one place.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/20">
            {pagination.total || 0} conversation
            {(pagination.total || 0) === 1 ? "" : "s"} found
          </p>
        </div>

        {threads.length === 0 ? (
          <div className="bg-white/[0.02] rounded-3xl border border-white/8 text-center py-24 px-8">
            <div className="h-20 w-20 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-5xl text-white/10">
                chat_bubble
              </span>
            </div>
            <p className="text-white font-bold mb-2 text-lg">
              {hasActiveFilters
                ? "No matching conversations"
                : "No conversations yet"}
            </p>
            <p className="text-sm text-white/30 max-w-xs mx-auto leading-relaxed">
              {hasActiveFilters
                ? "Try clearing your filters or using different search terms."
                : "Accepted orders will appear here as soon as customers start a discussion."}
            </p>
          </div>
        ) : (
          <div className="bg-white/[0.03] border-2 border-purple-500/30 rounded-3xl overflow-hidden">
            <div className="divide-y divide-white/5">
              {threads.map((thread) => (
                <Link
                  key={thread.conversationId}
                  href={`/manufacturer/orders/${thread.orderId}#chat`}
                >
                  <div className="flex items-center gap-5 px-6 py-6 hover:bg-white/[0.07] transition-all group relative border-l-4 border-l-transparent hover:border-l-purple-500/50">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-[#eb9728]/20 border border-white/10 flex items-center justify-center font-black text-[#eb9728] text-lg shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                      {(thread.counterpart?.name || "C").charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-bold text-white text-base truncate group-hover:text-[#eb9728] transition-colors">
                          {thread.counterpart?.name || "Customer"}
                        </p>
                        <span
                          className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${STATUS_COLORS[thread.orderStatus] || "bg-white/5 border-white/10 text-white/40"}`}
                        >
                          {thread.orderStatus?.replace(/_/g, " ")}
                        </span>
                        {thread.unreadCount > 0 && (
                          <span className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-orange-600 text-white text-[10px] font-black shadow-[0_0_10px_rgba(234,88,12,0.4)]">
                            {thread.unreadCount > 9 ? "9+" : thread.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium mb-1.5">
                        <span className="text-white/40 truncate">
                          {thread.productName || "Custom Order"}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-white/10" />
                        <span className="text-white/20 font-mono">
                          {thread.orderNumber}
                        </span>
                      </div>
                      <p className="text-sm text-white/50 truncate leading-relaxed">
                        {thread.lastMessage?.text || "No messages yet"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-tighter">
                        {new Date(
                          thread.lastMessage?.sentAt || thread.updatedAt,
                        ).toLocaleDateString()}
                      </p>
                      <div className="mt-3 text-white/10 group-hover:text-[#eb9728] group-hover:translate-x-1 transition-all">
                        <span className="material-symbols-outlined">
                          chevron_right
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-8 px-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/20">
              Page {pagination.page} / {pagination.pages}
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => fetchInbox(pagination.page - 1)}
                disabled={pagination.page <= 1 || isFetching}
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.03] text-[11px] font-bold uppercase tracking-widest text-white/60 hover:text-white disabled:opacity-20 transition-all"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => fetchInbox(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages || isFetching}
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.03] text-[11px] font-bold uppercase tracking-widest text-white/60 hover:text-white disabled:opacity-20 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
