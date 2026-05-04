"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function RequesterSupportPage({
  role,
  basePath,
  heading,
  subheading,
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ status: "all" });
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState({
    subject: "",
    message: "",
    category: "other",
    priority: "medium",
  });

  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(searchInput.trim()), 250);
    return () => clearTimeout(id);
  }, [searchInput]);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams({
        limit: "30",
        status: filters.status,
      });
      if (searchQuery) params.set("q", searchQuery);

      const res = await fetch(`/api/support-tickets?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets || []);
      } else {
        setErrorMessage(data.error || "Failed to load tickets.");
      }
    } catch (_) {
      setErrorMessage("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filters.status, searchQuery]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated") {
      if (session?.user?.role !== role) {
        router.push("/");
        return;
      }
      fetchTickets();
    }
  }, [status, session, role, fetchTickets, router]);

  const createTicket = async (e) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setForm({
          subject: "",
          message: "",
          category: "other",
          priority: "medium",
        });
        fetchTickets();
        alert("Ticket created successfully!");
      } else {
        alert(data.error || "Failed to create ticket");
      }
    } catch (_) {
      alert("Failed to create ticket");
    } finally {
      setCreating(false);
    }
  };

  const hasActiveFilters = Boolean(searchQuery) || filters.status !== "all";

  const STATUS_STYLES = {
    open: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    in_progress: "bg-[#eb9728]/10 border-[#eb9728]/20 text-[#eb9728]",
    waiting_for_user: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    resolved: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  };

  const GlassDropdown = ({ value, onChange, options, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(opt => opt.value === value) || options[0];

    return (
      <div className="relative group/field">
        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-2.5 group-focus-within/field:text-purple-400 transition-colors">
          {label}
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white/70 text-left focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.05] transition-all duration-300 flex items-center justify-between"
          >
            <span>{selectedOption.label}</span>
            <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${isOpen ? 'rotate-180 text-purple-400' : 'text-white/20'}`}>
              expand_more
            </span>
          </button>

          {isOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#0a0a0c] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="py-1 max-h-48 overflow-y-auto">
                  {options.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-sm text-left transition-colors flex items-center justify-between hover:bg-white/5 ${
                        value === opt.value ? 'bg-purple-500/10 text-purple-400' : 'text-white/50'
                      }`}
                    >
                      {opt.label}
                      {value === opt.value && (
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const inputClass =
    "w-full bg-white/[0.02] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.05] transition-all duration-300";

  const selectClass =
    "w-full bg-white/[0.02] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white/70 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.05] transition-all duration-300 appearance-none cursor-pointer";

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Page header */}
        <div className="relative">
          <p 
            className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 inline-block"
            style={{ 
              background: 'linear-gradient(to right, #9333ea, #f97316, #fbbf24, #ffffff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            SUPPORT CENTER
          </p>
          <h1 className="text-4xl font-black tracking-tight mb-2 block">
            <span
              style={{ 
                background: 'linear-gradient(to right, #9333ea, #f97316, #fbbf24, #ffffff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                display: 'inline-block'
              }}
            >
              {heading}
            </span>
          </h1>
          <p className="text-sm font-medium text-white/70 max-w-2xl">{subheading}</p>
          {loading && tickets.length > 0 && (
            <div className="absolute top-0 right-0 flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                Syncing...
              </span>
            </div>
          )}
        </div>

        {/* Create ticket */}
        <div className="relative bg-white/[0.03] border-2 border-purple-500/40 rounded-[2.5rem] overflow-hidden backdrop-blur-md transition-all duration-500">
          <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02]">
            <h2 className="text-lg font-black text-white uppercase tracking-wider">New Ticket</h2>
            <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest mt-1">
              Describe your issue and we&apos;ll get back to you shortly
            </p>
          </div>

          <form className="px-8 py-8 space-y-6" onSubmit={createTicket}>
            <div className="group/field">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-2.5 group-focus-within/field:text-purple-400 transition-colors">
                Subject
              </label>
              <input
                value={form.subject}
                onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                placeholder="Brief summary of your issue"
                className={inputClass}
                maxLength={160}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <GlassDropdown
                label="Category"
                value={form.category}
                onChange={(v) => setForm(p => ({ ...p, category: v }))}
                options={[
                  { value: "other", label: "General" },
                  { value: "order", label: "Order" },
                  { value: "payment", label: "Payment" },
                  { value: "product", label: "Product" },
                  { value: "account", label: "Account" },
                  { value: "technical", label: "Technical" },
                ]}
              />

              <GlassDropdown
                label="Priority"
                value={form.priority}
                onChange={(v) => setForm(p => ({ ...p, priority: v }))}
                options={[
                  { value: "low", label: "Low Priority" },
                  { value: "medium", label: "Medium Priority" },
                  { value: "high", label: "High Priority" },
                ]}
              />
            </div>

            <div className="group/field">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-2.5 group-focus-within/field:text-purple-400 transition-colors">
                Message
              </label>
              <textarea
                value={form.message}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                rows={4}
                placeholder="Describe your issue in detail"
                className={`${inputClass} resize-none`}
                maxLength={3000}
                required
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/10 px-1">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">info</span>
                Include relevant details for faster resolution
              </span>
              <span className={form.message.length > 2500 ? "text-purple-400" : ""}>
                {form.message.length}/3000
              </span>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={creating || form.subject.trim().length < 3 || form.message.trim().length < 5}
                className="group/btn relative px-10 py-4 rounded-2xl overflow-hidden bg-purple-600 text-white font-black uppercase tracking-[0.2em] text-[11px] transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
                <div className="relative flex items-center gap-3">
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      SUBMITTING...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      SUBMIT TICKET
                    </>
                  )}
                </div>
              </button>
            </div>
          </form>
        </div>

        {/* Ticket list */}
        <div className="bg-white/[0.03] border-2 border-purple-500/40 rounded-[2.5rem] backdrop-blur-md">
          <div className="px-8 py-6 border-b border-white/5 bg-white/[0.01] grid grid-cols-1 md:grid-cols-4 gap-4 items-end rounded-t-[2.5rem]">
            <div className="md:col-span-2 group/field">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-2.5">
                Search Tickets
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] text-white/20 group-focus-within/field:text-purple-400 transition-colors">
                  search
                </span>
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Ticket number or subject..."
                  className="w-full bg-white/[0.02] border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition-all"
                />
              </div>
            </div>

            <GlassDropdown
              label="Status Filter"
              value={filters.status}
              onChange={(v) => setFilters(p => ({ ...p, status: v }))}
              options={[
                { value: "all", label: "All statuses" },
                { value: "open", label: "Open" },
                { value: "in_progress", label: "In Progress" },
                { value: "waiting_for_user", label: "Waiting for You" },
                { value: "resolved", label: "Resolved" },
                { value: "closed", label: "Closed" },
              ]}
            />

            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setFilters({ status: "all" });
              }}
              disabled={!hasActiveFilters}
              className="h-[46px] inline-flex items-center justify-center gap-2 px-6 rounded-2xl border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
              Clear
            </button>
          </div>

          <div className="px-8 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">
              Found <span className="text-white/60">{tickets.length}</span> tickets
            </span>
            {loading && tickets.length > 0 && (
              <span className="w-4 h-4 border-2 border-purple-500/10 border-t-purple-500 rounded-full animate-spin" />
            )}
          </div>

          {errorMessage && (
            <div className="px-8 py-4 text-xs font-bold text-red-400 bg-red-500/5 border-b border-red-500/10 flex items-center gap-3">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              {errorMessage}
            </div>
          )}

          {loading && tickets.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center gap-4 rounded-b-[2.5rem]">
              <div className="w-12 h-12 border-2 border-purple-500/10 border-t-purple-500 rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Accessing archives...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-24 text-center rounded-b-[2.5rem]">
              <div className="h-20 w-20 rounded-[2rem] bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-4xl text-white/10">support_agent</span>
              </div>
              <p className="text-sm font-bold text-white/20 uppercase tracking-[0.2em]">
                {hasActiveFilters
                  ? "No matches found"
                  : "No active tickets"}
              </p>
              {!hasActiveFilters && (
                <p className="text-[10px] text-white/10 uppercase tracking-widest mt-2">Create a new ticket to get started</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {tickets.map((ticket, index) => (
                <Link
                  key={ticket._id}
                  href={`${basePath}/${ticket._id}`}
                  className={`flex items-center justify-between gap-6 px-8 py-6 group/item relative transition-all duration-300 ${
                    index === tickets.length - 1 ? 'rounded-b-[2.5rem]' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1.5">
                      <p className="text-sm font-black text-white group-hover/item:text-purple-400 transition-colors uppercase tracking-tight">
                        {ticket.subject}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{ticket.ticketNumber}</span>
                      <div className="w-1 h-1 rounded-full bg-white/10" />
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{ticket.category}</span>
                    </div>
                    <p className="text-[11px] font-medium text-white/30 mt-2 line-clamp-1 italic group-hover/item:text-white/50 transition-colors">
                      &quot;{ticket.lastMessagePreview || "Waiting for initial response"}&quot;
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-6">
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border transition-all ${
                          STATUS_STYLES[ticket.status] ||
                          "bg-white/5 border-white/10 text-white/40"
                        }`}
                      >
                        {ticket.status?.replace(/_/g, " ")}
                      </span>
                      {ticket.unreadCount > 0 && (
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-purple-600 text-white text-[8px] font-black tracking-widest animate-bounce">
                          {ticket.unreadCount > 9 ? "NEW" : "NEW REPLY"}
                        </span>
                      )}
                    </div>
                    <span className="material-symbols-outlined text-[20px] text-white/10 group-hover/item:text-purple-500/50 transition-all">
                      arrow_forward_ios
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
