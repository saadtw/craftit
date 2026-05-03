"use client";

import { useCallback, useEffect, useLayoutEffect, useState, useRef } from "react";
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
  
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);


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
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-[#eb9728] animate-spin" />
          <p className="text-sm text-white/40">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center">
          <div className="h-20 w-20 rounded-[2rem] bg-white/[0.03] border-2 border-purple-500/30 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-white/10">support_agent</span>
          </div>
          <p className="text-sm font-bold text-white/20 uppercase tracking-widest mb-6">Ticket not found</p>
          <Link
            href={listPath}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to tickets
          </Link>
        </div>
      </div>
    );
  }

  const canReply = ticket.status !== "closed";

  const STATUS_STYLES = {
    open: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    in_progress: "bg-[#eb9728]/10 border-[#eb9728]/20 text-[#eb9728]",
    waiting_for_user: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    resolved: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    closed: "bg-white/5 border-white/10 text-white/40",
  };

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 pb-12 space-y-6">
        {/* Back link */}
        <Link
          href={listPath}
          className="group inline-flex items-center gap-4 transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.3)] group-hover:shadow-[0_0_25px_rgba(147,51,234,0.5)] group-hover:scale-105 transition-all duration-300">
            <span className="material-symbols-outlined text-white text-[16px] font-bold group-hover:-translate-x-0.5 transition-transform">
              arrow_back
            </span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white transition-colors">
            Back to Archives
          </span>
        </Link>

        {/* Ticket header card */}
        <div className="bg-white/[0.03] border-2 border-purple-500/30 rounded-[2.5rem] overflow-hidden backdrop-blur-md">
          <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02] flex items-start justify-between gap-6">
            <div className="min-w-0">
              <p 
                className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 inline-block"
                style={{ 
                  background: 'linear-gradient(to right, #9333ea, #f97316, #fbbf24, #ffffff)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                SUPPORT ENQUIRY
              </p>
              <h1 className="text-2xl font-black tracking-tight mb-2 truncate block">
                <span
                  style={{ 
                    background: 'linear-gradient(to right, #9333ea, #f97316, #fbbf24, #ffffff)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    display: 'inline-block'
                  }}
                >
                  {ticket.subject}
                </span>
              </h1>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{ticket.ticketNumber}</span>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{ticket.category}</span>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <span className={`text-[10px] font-black uppercase tracking-widest ${ticket.priority === 'high' ? 'text-red-400' : 'text-purple-400/50'}`}>
                  {ticket.priority} PRIORITY
                </span>
              </div>
              <p className="text-[11px] font-medium text-white/20 mt-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">person</span>
                {ticket.assignedAdminId?.name
                  ? `Assigned to ${ticket.assignedAdminId.name}`
                  : "Awaiting assignment from Support HQ"}
              </p>
            </div>

            <div className="flex flex-col items-end gap-3 shrink-0">
              <span
                className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full border ${
                  STATUS_STYLES[ticket.status] ||
                  "bg-white/5 border-white/10 text-white/40"
                }`}
              >
                {ticket.status?.replace(/_/g, " ")}
              </span>
              {ticket.status !== "closed" && (
                <button
                  type="button"
                  onClick={closeTicket}
                  disabled={closing}
                  className="inline-flex items-center gap-2 px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl border border-red-500/10 bg-red-500/5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-20"
                >
                  {closing ? (
                    <>
                      <span className="w-3 h-3 border-2 border-red-400/20 border-t-red-400 rounded-full animate-spin" />
                      TERMINATING...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[15px]">cancel</span>
                      CLOSE TICKET
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {actionError && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/20 text-red-400">
            <span className="material-symbols-outlined text-base shrink-0">
              error
            </span>
            {actionError}
          </div>
        )}

        {/* Messages + reply */}
        <div className="bg-white/[0.03] border-2 border-purple-500/40 rounded-[2.5rem] overflow-hidden backdrop-blur-md">
          {/* Messages area */}
          <div className="max-h-[520px] overflow-y-auto px-8 py-8 space-y-6 bg-white/[0.01]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="h-16 w-16 rounded-[1.5rem] bg-white/[0.03] border border-purple-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-white/5">forum</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/10">Initiating communication protocols...</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine =
                  String(msg.senderId) === String(session?.user?.id);
                return (
                  <div
                    key={msg._id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-[1.8rem] px-6 py-4 relative group/msg ${
                        isMine
                          ? "bg-purple-600 text-white rounded-br-none shadow-[0_4px_20px_rgba(147,51,234,0.2)]"
                          : "bg-white/[0.05] border border-white/10 text-white/80 rounded-bl-none"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-6 mb-2">
                        <p className={`text-[9px] font-black uppercase tracking-widest ${isMine ? "text-white/60" : "text-purple-400"}`}>
                          {isMine ? "YOUR RESPONSE" : "SUPPORT AGENT"}
                        </p>
                        <p className={`text-[8px] font-bold uppercase tracking-widest ${isMine ? "text-white/60" : "text-white/40"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                        {msg.message}
                      </p>
                      <p className={`text-[8px] font-bold uppercase tracking-widest mt-3 ${isMine ? "text-white/50" : "text-white/30"}`}>
                        {new Date(msg.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply input */}
          {canReply ? (
            <div className="px-4 py-3 border-t border-white/8 bg-[#111116] flex gap-3 items-end">
              <div className="flex-1">
                <div className="bg-white/[0.05] border border-white/8 rounded-xl px-4 py-2.5 focus-within:border-[#eb9728]/40 focus-within:bg-white/[0.07] transition-all">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={2}
                    maxLength={3000}
                    placeholder="Type your reply…"
                    className="w-full text-sm text-white/80 placeholder-white/20 focus:outline-none resize-none bg-transparent leading-relaxed"
                    style={{ maxHeight: "120px", overflowY: "auto" }}
                    onInput={(e) => {
                      e.target.style.height = "auto";
                      e.target.style.height =
                        Math.min(e.target.scrollHeight, 120) + "px";
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/20 px-1">
                  <span>Your message will notify the support team.</span>
                  <span>{reply.length}/3000</span>
                </div>
              </div>
              <button
                type="button"
                onClick={sendReply}
                disabled={sending || reply.trim().length < 1}
                className="shrink-0 w-10 h-10 rounded-xl bg-[#eb9728] text-black flex items-center justify-center hover:bg-[#d4871f] disabled:opacity-30 disabled:cursor-not-allowed transition-all self-start mt-0.5"
              >
                {sending ? (
                  <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[18px]">
                    send
                  </span>
                )}
              </button>
            </div>
          ) : (
            <div className="px-6 py-4 border-t border-white/8 bg-[#111116] flex items-center justify-center gap-2 text-sm text-white/25">
              <span className="material-symbols-outlined text-[16px]">
                lock
              </span>
              This ticket is closed.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
