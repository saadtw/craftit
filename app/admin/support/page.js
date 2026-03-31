"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

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
    open: "bg-blue-900/30 text-blue-200",
    in_progress: "bg-amber-900/30 text-amber-200",
    waiting_for_user: "bg-purple-900/30 text-purple-200",
    resolved: "bg-emerald-900/30 text-emerald-200",
    closed: "bg-slate-800 text-slate-300",
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
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-50">Support Tickets</h1>
        <p className="text-slate-500 text-sm mt-1">
          Handle customer and manufacturer help requests
        </p>
        {loading && tickets.length > 0 && (
          <p className="text-xs text-slate-500 mt-2">Updating ticket list...</p>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by ticket or subject"
            className="md:col-span-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
          />
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((p) => ({ ...p, status: e.target.value }))
            }
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_for_user">Waiting for User</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={filters.assigned}
            onChange={(e) =>
              setFilters((p) => ({ ...p, assigned: e.target.value }))
            }
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
          >
            <option value="all">All assignments</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              setFilters({ status: "open", assigned: "all" });
            }}
            disabled={!hasActiveFilters}
            className="md:col-span-4 justify-self-start px-3 py-1.5 text-xs rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            Clear filters
          </button>
        </div>

        <div className="px-4 py-2 text-xs text-slate-500 border-b border-slate-800">
          {tickets.length} ticket{tickets.length === 1 ? "" : "s"}
        </div>

        {loading && tickets.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Loading tickets...
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            {hasActiveFilters
              ? "No tickets match your filters."
              : "No support tickets found."}
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {tickets.map((ticket) => (
              <Link
                key={ticket._id}
                href={`/admin/support/${ticket._id}`}
                className="block px-5 py-4 hover:bg-slate-800/40"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate">
                      {ticket.subject}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {ticket.ticketNumber} ·{" "}
                      {ticket.requesterId?.businessName ||
                        ticket.requesterId?.name}{" "}
                      · {ticket.category}
                    </p>
                    <p className="text-xs text-slate-600 mt-1 truncate">
                      {ticket.lastMessagePreview || "No messages"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[ticket.status] || "bg-slate-800 text-slate-300"}`}
                    >
                      {ticket.status?.replace(/_/g, " ")}
                    </p>
                    {ticket.unreadCount > 0 && (
                      <span className="inline-flex mt-1 px-2 py-0.5 rounded-full bg-amber-600 text-white text-[11px] font-semibold">
                        {ticket.unreadCount > 9 ? "9+" : ticket.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
