"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { FiArrowLeft, FiSend, FiUser, FiShield, FiClock, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminSupportTicketDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [reply, setReply] = useState("");
  const [form, setForm] = useState({ status: "open", priority: "medium" });
  const [actionError, setActionError] = useState("");

  const fetchTicket = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/support-tickets/${id}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setTicket(data.ticket);
        setMessages(data.messages || []);
        setForm({
          status: data.ticket.status,
          priority: data.ticket.priority,
        });
      } else {
        setTicket(null);
      }
    } catch (_) {
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

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
      fetchTicket();
    }
  }, [status, session, router, fetchTicket]);

  const saveUpdates = async (assignToMe = false) => {
    if (saving) return;
    setActionError("");
    setSaving(true);
    try {
      const payload = {
        action: "update",
        status: form.status,
        priority: form.priority,
      };
      if (assignToMe) payload.assignedAdminId = session.user.id;

      const res = await fetch(`/api/support-tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setTicket(data.ticket);
      } else {
        setActionError(data.error || "Unable to save ticket updates.");
      }
    } catch (_) {
      setActionError("Unable to save ticket updates.");
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async () => {
    const message = reply.trim();
    if (!message || sending) return;

    setActionError("");
    setSending(true);
    try {
      const res = await fetch(`/api/support-tickets/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.message]);
        setReply("");
        fetchTicket();
      } else {
        setActionError(data.error || "Failed to send reply.");
      }
    } catch (_) {
      setActionError("Failed to send reply.");
    } finally {
      setSending(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <GlobalLoader fullScreen text="Opening support channel..." />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-[#020617] p-8 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
          <FiAlertCircle className="w-8 h-8 text-white/20" />
        </div>
        <p className="text-white font-black text-xl mb-2">Ticket Not Found</p>
        <p className="text-white/40 text-sm mb-8 max-w-xs">The support ticket you are looking for does not exist or has been removed.</p>
        <Link
          href="/admin/support"
          className="px-8 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all"
        >
          Back to Support Hub
        </Link>
      </div>
    );
  }

  const STATUS_STYLES = {
    open: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", icon: <FiClock className="w-3 h-3" /> },
    in_progress: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", icon: <FiAlertCircle className="w-3 h-3" /> },
    waiting_for_user: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", icon: <FiUser className="w-3 h-3" /> },
    resolved: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", icon: <FiCheckCircle className="w-3 h-3" /> },
    closed: { bg: "bg-white/5", text: "text-white/40", border: "border-white/10", icon: <FiCheckCircle className="w-3 h-3" /> },
  };

  const PRIORITY_STYLES = {
    low: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20" },
    medium: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
    high: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
  };

  const currentStatus = STATUS_STYLES[ticket.status] || STATUS_STYLES.closed;
  const currentPriority = PRIORITY_STYLES[ticket.priority] || PRIORITY_STYLES.medium;

  return (
    <div className="min-h-screen bg-[#020617] relative overflow-hidden flex flex-col">
      {/* Background Orbs */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <div className="relative z-10 p-8 max-w-5xl mx-auto w-full">
        <Link
          href="/admin/support"
          className="inline-flex items-center gap-2 text-[10px] font-black text-white/30 uppercase tracking-widest hover:text-white transition-colors mb-8"
        >
          <FiArrowLeft className="w-3 h-3" /> Back to Support Hub
        </Link>

        <div className="bg-white/[0.02] border border-white/5 rounded-[40px] p-8 backdrop-blur-2xl mb-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="text-[10px] font-black text-white/20 font-mono tracking-tighter uppercase">{ticket.ticketNumber}</span>
                <span className="text-white/10 text-xs font-black">/</span>
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${currentStatus.bg} ${currentStatus.text} ${currentStatus.border} flex items-center gap-1.5`}>
                  {currentStatus.icon}
                  {ticket.status?.replace(/_/g, " ")}
                </div>
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${currentPriority.bg} ${currentPriority.text} ${currentPriority.border}`}>
                  {ticket.priority} Priority
                </div>
              </div>
              <h1 className="text-3xl font-black text-white mb-6 leading-tight">
                {ticket.subject}
              </h1>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 font-black">
                    {(ticket.requesterId?.businessName || ticket.requesterId?.name)?.charAt(0)}
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">Requester</div>
                    <div className="text-white font-bold text-sm">
                      {ticket.requesterId?.businessName || ticket.requesterId?.name}
                      <span className="ml-2 text-[10px] text-white/40 opacity-50 font-medium">({ticket.requesterRole})</span>
                    </div>
                  </div>
                </div>
                <div className="w-px h-8 bg-white/5" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                    <FiShield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">Assigned Admin</div>
                    <div className="text-white font-bold text-sm">
                      {ticket.assignedAdminId?.name || "Unassigned"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => saveUpdates(true)}
                disabled={saving || ticket.assignedAdminId?.id === session.user.id}
                className="w-full px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 flex items-center justify-center gap-2"
              >
                <FiUser className="w-3 h-3" /> Assign to Me
              </button>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-2">Status</span>
                  <Select value={form.status} onValueChange={(val) => setForm(p => ({ ...p, status: val }))}>
                    <SelectTrigger className="w-full bg-white/[0.05] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:ring-0 focus:border-purple-500/50 transition-all cursor-pointer h-10">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#020617]/95 backdrop-blur-xl border border-white/10 text-white rounded-xl shadow-2xl p-1">
                      <SelectItem value="open" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-xs transition-colors">Open</SelectItem>
                      <SelectItem value="in_progress" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-xs transition-colors">In Progress</SelectItem>
                      <SelectItem value="waiting_for_user" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-xs transition-colors">Waiting for User</SelectItem>
                      <SelectItem value="resolved" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-xs transition-colors">Resolved</SelectItem>
                      <SelectItem value="closed" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-xs transition-colors">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-2">Priority</span>
                  <Select value={form.priority} onValueChange={(val) => setForm(p => ({ ...p, priority: val }))}>
                    <SelectTrigger className="w-full bg-white/[0.05] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:ring-0 focus:border-purple-500/50 transition-all cursor-pointer h-10">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#020617]/95 backdrop-blur-xl border border-white/10 text-white rounded-xl shadow-2xl p-1">
                      <SelectItem value="low" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-xs transition-colors">Low</SelectItem>
                      <SelectItem value="medium" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-xs transition-colors">Medium</SelectItem>
                      <SelectItem value="high" className="focus:bg-purple-600 focus:text-white cursor-pointer rounded-lg text-xs transition-colors">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <button
                type="button"
                onClick={() => saveUpdates(false)}
                disabled={saving}
                className="w-full px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all disabled:opacity-50"
              >
                {saving ? "Updating..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>

        {actionError && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-3 text-[11px] font-bold text-red-400 flex items-center gap-3">
            <FiAlertCircle className="w-4 h-4 shrink-0" />
            {actionError}
          </div>
        )}

        {/* Chat Interface */}
        <div className="bg-white/[0.02] border border-white/5 rounded-[40px] overflow-hidden backdrop-blur-2xl flex flex-col shadow-2xl">
          <div className="flex-1 max-h-[600px] overflow-y-auto p-8 space-y-6">
            {messages.length === 0 ? (
              <div className="py-20 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <FiSend className="w-6 h-6 text-white/20" />
                </div>
                <p className="text-white/40 text-sm font-medium italic">No messages yet. Start the conversation below.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isAdmin = msg.senderRole === "admin";
                return (
                  <div key={msg._id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] flex flex-col ${isAdmin ? "items-end" : "items-start"}`}>
                      <div className="flex items-center gap-2 mb-2 px-1">
                        {!isAdmin && <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">{msg.senderName}</span>}
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isAdmin && <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Support Team</span>}
                      </div>
                      <div className={`rounded-3xl px-6 py-4 text-sm font-medium leading-relaxed ${isAdmin ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none shadow-[0_4px_15px_rgba(168,85,247,0.2)]" : "bg-white/5 border border-white/10 text-white rounded-tl-none"}`}>
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {ticket.status !== "closed" && (
            <div className="p-6 border-t border-white/5 bg-white/[0.01]">
              <div className="relative group">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  maxLength={3000}
                  placeholder="Type your response here..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-[28px] pl-6 pr-32 py-5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/5 transition-all resize-none font-medium leading-relaxed"
                />
                <div className="absolute right-3 bottom-3 flex items-center gap-3">
                   <div className="text-[10px] font-black text-white/20 uppercase tracking-widest px-2">
                    {reply.length}/3000
                  </div>
                  <button
                    type="button"
                    onClick={sendReply}
                    disabled={sending || reply.trim().length < 1}
                    className="w-12 h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:opacity-90 transition-all disabled:opacity-30"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <FiSend className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              <p className="mt-3 px-4 text-[10px] font-black text-white/20 uppercase tracking-[0.1em]">
                The requester will receive an immediate notification.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// LEGACY CODE PRESERVATION
// ---------------------------------------------------------

/*
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function AdminSupportTicketDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [reply, setReply] = useState("");
  const [form, setForm] = useState({ status: "open", priority: "medium" });
  const [actionError, setActionError] = useState("");

  const fetchTicket = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/support-tickets/${id}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setTicket(data.ticket);
        setMessages(data.messages || []);
        setForm({
          status: data.ticket.status,
          priority: data.ticket.priority,
        });
      } else {
        setTicket(null);
      }
    } catch (_) {
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

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
      fetchTicket();
    }
  }, [status, session, router, fetchTicket]);

  const saveUpdates = async (assignToMe = false) => {
    if (saving) return;
    setActionError("");
    setSaving(true);
    try {
      const payload = {
        action: "update",
        status: form.status,
        priority: form.priority,
      };
      if (assignToMe) payload.assignedAdminId = session.user.id;

      const res = await fetch(`/api/support-tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setTicket(data.ticket);
      } else {
        setActionError(data.error || "Unable to save ticket updates.");
      }
    } catch (_) {
      setActionError("Unable to save ticket updates.");
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async () => {
    const message = reply.trim();
    if (!message || sending) return;

    setActionError("");
    setSending(true);
    try {
      const res = await fetch(`/api/support-tickets/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.message]);
        setReply("");
        fetchTicket();
      } else {
        setActionError(data.error || "Failed to send reply.");
      }
    } catch (_) {
      setActionError("Failed to send reply.");
    } finally {
      setSending(false);
    }
  };

  if (status === "loading" || loading) {
    return <GlobalLoader fullScreen text="Loading..." />;
  }

  if (!ticket) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Ticket not found.</p>
        <Link
          href="/admin/support"
          className="text-amber-500 text-sm mt-2 inline-block"
        >
          Back to support tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-4">
        <Link
          href="/admin/support"
          className="text-slate-400 text-sm hover:text-amber-500"
        >
          ← Back to tickets
        </Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-50">
              {ticket.subject}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {ticket.ticketNumber} ·{" "}
              {ticket.requesterId?.businessName || ticket.requesterId?.name} (
              {ticket.requesterRole})
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {messages.length} message{messages.length === 1 ? "" : "s"}
              {ticket.assignedAdminId?.name
                ? ` · Assigned to ${ticket.assignedAdminId.name}`
                : " · Unassigned"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => saveUpdates(true)}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs border border-slate-700"
          >
            Assign to me
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
          <select
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_for_user">Waiting for User</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={form.priority}
            onChange={(e) =>
              setForm((p) => ({ ...p, priority: e.target.value }))
            }
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
          >
            <option value="low">Low priority</option>
            <option value="medium">Medium priority</option>
            <option value="high">High priority</option>
          </select>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => saveUpdates(false)}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {actionError && (
        <div className="mb-3 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-xs text-red-200">
          {actionError}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto p-4 space-y-3 bg-slate-950/40">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">
              No replies yet. Send a message to start helping this requester.
            </p>
          ) : (
            messages.map((msg) => {
              const isAdmin = msg.senderRole === "admin";
              return (
                <div
                  key={msg._id}
                  className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isAdmin ? "bg-amber-600 text-white" : "bg-slate-800 border border-slate-700 text-slate-100"}`}
                  >
                    <p className="text-[11px] font-semibold opacity-70">
                      {msg.senderName}
                    </p>
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                    <p className="text-[10px] opacity-70 mt-1">
                      {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {ticket.status !== "closed" && (
          <div className="p-3 border-t border-slate-800 bg-slate-900 flex gap-2">
            <div className="flex-1">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                maxLength={3000}
                placeholder="Type a reply..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 resize-none"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                <span>Requester will be notified immediately.</span>
                <span>{reply.length}/3000</span>
              </div>
            </div>
            <button
              type="button"
              onClick={sendReply}
              disabled={sending || reply.trim().length < 1}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold disabled:opacity-50 self-end"
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
*/
