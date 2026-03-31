// app/customer/messages/page.js
"use client";

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
      if (session.user.role !== "customer") {
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
    accepted: "bg-blue-100 text-blue-700",
    in_production: "bg-purple-100 text-purple-700",
    shipped: "bg-indigo-100 text-indigo-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    disputed: "bg-orange-100 text-orange-700",
  };

  const hasActiveFilters =
    Boolean(searchQuery) || statusFilter !== "all" || unreadOnly;

  if (status === "loading" || initialLoading) {
    return (
      <div className="flex h-screen bg-[#f8f7f6]">
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-[#eb9728] rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8f7f6]">
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-center h-16 px-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 gap-4">
          <span className="text-lg font-bold text-gray-900">Messages</span>
          {isFetching && (
            <span className="text-xs text-gray-400">Updating...</span>
          )}
          {unreadThreads > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#eb9728]/10 text-[#eb9728] text-xs font-semibold">
              {unreadThreads} unread
            </span>
          )}
        </header>

        <div className="p-8 max-w-2xl mx-auto">
          {/* Search */}
          <div className="relative mb-3">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
              search
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by order, manufacturer, or product..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#eb9728]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#eb9728]"
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
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#eb9728]"
            >
              <option value="latest">Latest first</option>
              <option value="oldest">Oldest first</option>
              <option value="unread">Unread first</option>
            </select>

            <label className="flex items-center justify-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white cursor-pointer select-none">
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
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white disabled:opacity-50"
            >
              Clear filters
            </button>
          </div>

          <p className="text-xs text-gray-500 mb-4">
            {pagination.total || 0} conversation
            {(pagination.total || 0) === 1 ? "" : "s"} found
          </p>

          {/* Info note */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 flex gap-2">
            <span className="material-symbols-outlined text-blue-500 text-base shrink-0 mt-0.5">
              info
            </span>
            <p className="text-xs text-blue-700">
              Messages are tied to individual orders. Click an order below to
              open the chat with that manufacturer.
            </p>
          </div>

          {threads.length === 0 ? (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-5xl text-gray-300 block mb-3">
                chat_bubble
              </span>
              <p className="text-gray-600 font-semibold mb-1">
                {hasActiveFilters
                  ? "No conversations match these filters"
                  : "No conversations yet"}
              </p>
              <p className="text-sm text-gray-400 mb-6">
                {hasActiveFilters
                  ? "Try clearing filters or adjusting your search terms."
                  : "Once a manufacturer accepts your order, you can chat with them here."}
              </p>
              <Link
                href="/customer/orders"
                className="inline-block px-5 py-2.5 bg-[#eb9728] text-white font-semibold rounded-xl text-sm hover:bg-[#eb9728]/90"
              >
                View Orders
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {threads.map((thread) => (
                  <Link
                    key={thread.conversationId}
                    href={`/customer/orders/${thread.orderId}`}
                  >
                    <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                      {/* Manufacturer avatar */}
                      <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-base shrink-0">
                        {(thread.counterpart?.name || "M").charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {thread.counterpart?.name}
                          </p>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[thread.orderStatus] || "bg-gray-100 text-gray-500"}`}
                          >
                            {thread.orderStatus?.replace(/_/g, " ")}
                          </span>
                          {thread.unreadCount > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#eb9728] text-white shrink-0">
                              {thread.unreadCount > 9
                                ? "9+"
                                : thread.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {thread.productName || "Custom Order"} ·{" "}
                          {thread.orderNumber}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {thread.lastMessage?.text || "No messages yet"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400">
                          {new Date(
                            thread.lastMessage?.sentAt || thread.updatedAt,
                          ).toLocaleDateString()}
                        </p>
                        <span className="material-symbols-outlined text-gray-300 text-base mt-1 block">
                          chevron_right
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
              <span>
                Page {pagination.page} of {pagination.pages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fetchInbox(pagination.page - 1)}
                  disabled={pagination.page <= 1 || isFetching}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => fetchInbox(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages || isFetching}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
