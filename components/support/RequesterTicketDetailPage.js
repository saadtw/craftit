"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function RequesterTicketDetailPage({ role, listPath }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [actionError, setActionError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length]);

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
      if (session?.user?.role !== role) {
        router.push("/");
        return;
      }
      fetchTicket();
    }
  }, [status, session, role, fetchTicket, router]);

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

  const closeTicket = async () => {
    if (closing) return;
    setActionError("");
    setClosing(true);
    try {
      const res = await fetch(`/api/support-tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      });
      const data = await res.json();
      if (data.success) {
        setTicket(data.ticket);
      } else {
        setActionError(data.error || "Unable to close ticket.");
      }
    } catch (_) {
      setActionError("Unable to close ticket.");
    } finally {
      setClosing(false);
    }
  };

  if (status === "loading" || loading) {
    return <div className="p-8 text-sm text-gray-500">Loading...</div>;
  }

  if (!ticket) {
    return (
      <div className="p-8">
        <p className="text-sm text-gray-500">Ticket not found.</p>
        <Link
          href={listPath}
          className="text-sm text-[#eb9728] inline-block mt-2"
        >
          Back to tickets
        </Link>
      </div>
    );
  }

  const canReply = ticket.status !== "closed";

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-4">
        <Link
          href={listPath}
          className="text-sm text-gray-500 hover:text-[#eb9728]"
        >
          ← Back to tickets
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {ticket.subject}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              {ticket.ticketNumber} · {ticket.category} · {ticket.priority}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {messages.length} message{messages.length === 1 ? "" : "s"}
              {ticket.assignedAdminId?.name
                ? ` · Assigned to ${ticket.assignedAdminId.name}`
                : " · Awaiting assignment"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs capitalize text-gray-600">
              {ticket.status?.replace(/_/g, " ")}
            </p>
            {ticket.status !== "closed" && (
              <button
                type="button"
                onClick={closeTicket}
                disabled={closing}
                className="mt-2 px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {closing ? "Closing..." : "Close Ticket"}
              </button>
            )}
          </div>
        </div>
      </div>

      {actionError && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {actionError}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="max-h-[460px] overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              No replies yet. Send a message and the support team will respond.
            </p>
          ) : (
            messages.map((msg) => {
              const isMine = String(msg.senderId) === String(session?.user?.id);
              return (
                <div
                  key={msg._id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isMine ? "bg-[#eb9728] text-white" : "bg-white border border-gray-200 text-gray-800"}`}
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
          <div ref={bottomRef} />
        </div>

        {canReply ? (
          <div className="p-3 border-t border-gray-100 bg-white flex gap-2">
            <div className="flex-1">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                maxLength={3000}
                placeholder="Type your reply..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400">
                <span>Your message will notify the support team.</span>
                <span>{reply.length}/3000</span>
              </div>
            </div>
            <button
              type="button"
              onClick={sendReply}
              disabled={sending || reply.trim().length < 1}
              className="px-4 py-2 rounded-lg bg-[#eb9728] text-white text-sm font-semibold disabled:opacity-50 self-end"
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        ) : (
          <div className="p-3 border-t border-gray-100 text-sm text-gray-500 text-center bg-gray-50">
            This ticket is closed.
          </div>
        )}
      </div>
    </div>
  );
}
