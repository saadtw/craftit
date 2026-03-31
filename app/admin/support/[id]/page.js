"use client";

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
    return <div className="p-8 text-slate-400">Loading...</div>;
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
