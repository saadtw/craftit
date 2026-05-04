// app/customer/messages/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function CustomerMessagesPage() {
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

      if (abortRef.current) abortRef.current.abort();

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

        if (requestSeq !== requestSeqRef.current) return;

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
          if (!keepInitial) setInitialLoading(false);
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
      if (session.user.role !== "customer") {
        router.push("/auth/login");
        return;
      }
      fetchInbox(1);
    }
  }, [status, session, router, fetchInbox]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const STATUS_COLORS = {
    accepted: "bg-blue-500/10 text-blue-300 border border-blue-500/20",
    in_production:
      "bg-purple-500/10 text-purple-300 border border-purple-500/20",
    shipped: "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20",
    completed:
      "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20",
    cancelled: "bg-red-500/10 text-red-300 border border-red-500/20",
    disputed: "bg-[#eb9728]/10 text-[#eb9728] border border-[#eb9728]/20",
  };

  const hasActiveFilters =
    Boolean(searchQuery) || statusFilter !== "all" || unreadOnly;

  if (status === "loading" || initialLoading) {
    return <GlobalLoader fullScreen text="Loading messages..." />;
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6 space-y-6">
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0c0c11] p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_32%),radial-gradient(circle_at_left,rgba(235,151,40,0.12),transparent_28%)] pointer-events-none" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#eb9728]">
                Customer Inbox
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
                Messages
              </h1>
              <p className="mt-2 text-sm text-white/50">
                Conversations linked with your orders and manufacturers.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {isFetching && (
                <span className="text-xs font-semibold text-white/35">
                  Updating...
                </span>
              )}

              {unreadThreads > 0 && (
                <span className="rounded-full border border-[#eb9728]/20 bg-[#eb9728]/10 px-3 py-1 text-xs font-bold text-[#eb9728]">
                  {unreadThreads} unread
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-white/8 bg-[#0c0c11] p-4 sm:p-5">
          <div className="relative mb-3">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/35 text-lg">
              search
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by order, manufacturer, or product..."
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-white/30 focus:border-[#eb9728] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-[#101017] px-3 py-3 text-sm text-white/80 focus:border-[#eb9728] focus:outline-none"
            >
              <option value="all">All statuses</option>
              <option value="accepted">Accepted</option>
              <option value="in_production">In production</option>
              <option value="shipped">Shipped</option>
              <option value="completed">Completed</option>
              <option value="disputed">Disputed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-white/10 bg-[#101017] px-3 py-3 text-sm text-white/80 focus:border-[#eb9728] focus:outline-none"
            >
              <option value="latest">Latest first</option>
              <option value="oldest">Oldest first</option>
              <option value="unread">Unread first</option>
            </select>

            <label className="flex cursor-pointer select-none items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/70 hover:bg-white/[0.05]">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
                className="accent-[#eb9728]"
              />
              Unread only
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
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm font-semibold text-white/65 hover:border-[#eb9728]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear filters
            </button>
          </div>
        </section>

        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-white/45">
            {pagination.total || 0} conversation
            {(pagination.total || 0) === 1 ? "" : "s"} found
          </p>
        </div>

        <section className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 flex gap-3">
          <span className="material-symbols-outlined text-blue-300 text-lg shrink-0 mt-0.5">
            info
          </span>
          <p className="text-xs leading-5 text-blue-200/80">
            Messages are tied to individual orders. Click an order below to open
            the chat with that manufacturer.
          </p>
        </section>

        {threads.length === 0 ? (
          <section className="rounded-[28px] border border-white/8 bg-[#0c0c11] px-6 py-16 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-[#eb9728]/20 bg-[#eb9728]/10 text-[#eb9728]">
              <span className="material-symbols-outlined text-5xl">
                chat_bubble
              </span>
            </div>

            <p className="mb-1 text-lg font-bold text-white">
              {hasActiveFilters
                ? "No conversations match these filters"
                : "No conversations yet"}
            </p>

            <p className="mb-6 text-sm text-white/45">
              {hasActiveFilters
                ? "Try clearing filters or adjusting your search terms."
                : "Once a manufacturer accepts your order, you can chat with them here."}
            </p>

            <Link
              href="/customer/orders"
              className="inline-flex rounded-xl bg-[#eb9728] px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-500"
            >
              View Orders
            </Link>
          </section>
        ) : (
          <section className="overflow-hidden rounded-[24px] border border-white/8 bg-[#0c0c11]">
            <div className="divide-y divide-white/6">
              {threads.map((thread) => (
                <Link
                  key={thread.conversationId}
                  href={
                    thread.contextType === "bid"
                      ? `/bids/${thread.orderId}#chat`
                      : `/customer/orders/${thread.orderId}`
                  }
                >
                  <div className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.035]">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#eb9728]/20 bg-[#eb9728]/10 text-base font-black text-[#eb9728]">
                      {(thread.counterpart?.name || "M").charAt(0)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-white group-hover:text-[#eb9728] transition-colors">
                          {thread.counterpart?.name}
                        </p>

                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            STATUS_COLORS[thread.orderStatus] ||
                            "bg-white/[0.05] text-white/50 border border-white/8"
                          }`}
                        >
                          {thread.orderStatus?.replace(/_/g, " ")}
                        </span>

                        {thread.unreadCount > 0 && (
                          <span className="shrink-0 rounded-full bg-[#eb9728] px-2 py-0.5 text-[10px] font-bold text-white">
                            {thread.unreadCount > 9 ? "9+" : thread.unreadCount}
                          </span>
                        )}
                      </div>

                      <p className="truncate text-xs text-white/45">
                        {thread.productName || "Custom Order"} ·{" "}
                        {thread.orderNumber}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-white/35">
                        {thread.lastMessage?.text || "No messages yet"}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-xs text-white/35">
                        {new Date(
                          thread.lastMessage?.sentAt || thread.updatedAt,
                        ).toLocaleDateString()}
                      </p>
                      <span className="material-symbols-outlined mt-1 block text-base text-white/25 group-hover:text-[#eb9728]">
                        chevron_right
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between text-sm text-white/45">
            <span>
              Page {pagination.page} of {pagination.pages}
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fetchInbox(pagination.page - 1)}
                disabled={pagination.page <= 1 || isFetching}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-white/70 hover:border-[#eb9728]/40 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Prev
              </button>

              <button
                type="button"
                onClick={() => fetchInbox(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages || isFetching}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-white/70 hover:border-[#eb9728]/40 disabled:cursor-not-allowed disabled:opacity-35"
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
