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
          <div className="h-14 w-14 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-3xl text-white/20">
              support_agent
            </span>
          </div>
          <p className="text-sm text-white/35 mb-3">Ticket not found.</p>
          <Link
            href={listPath}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#eb9728] hover:text-[#d4871f] transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">
              arrow_back
            </span>
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        {/* Back link */}
        <Link
          href={listPath}
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-[#eb9728] transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">
            arrow_back
          </span>
          Back to tickets
        </Link>

        {/* Ticket header card */}
        <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
          <div className="px-6 py-5 border-b border-white/8 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728] mb-1">
                Support Ticket
              </p>
              <h1 className="text-xl font-black tracking-tight text-white truncate">
                {ticket.subject}
              </h1>
              <p className="text-[11px] text-white/35 mt-1 capitalize">
                {ticket.ticketNumber} · {ticket.category} · {ticket.priority}
              </p>
              <p className="text-[11px] text-white/25 mt-0.5">
                {messages.length} message{messages.length === 1 ? "" : "s"}
                {ticket.assignedAdminId?.name
                  ? ` · Assigned to ${ticket.assignedAdminId.name}`
                  : " · Awaiting assignment"}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize ${
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-xl border border-white/10 bg-white/[0.04] text-white/50 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {closing ? (
                    <>
                      <span className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin" />
                      Closing…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[13px]">
                        cancel
                      </span>
                      Close Ticket
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
        <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
          {/* Messages area */}
          <div className="max-h-[460px] overflow-y-auto px-5 py-4 space-y-3 bg-[#0a0a0f]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <span className="material-symbols-outlined text-4xl text-white/15">
                  chat_bubble_outline
                </span>
                <p className="text-sm text-white/30 text-center">
                  No replies yet. Send a message and the support team will
                  respond.
                </p>
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
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                        isMine
                          ? "bg-[#eb9728] text-black rounded-br-sm"
                          : "bg-white/[0.07] border border-white/[0.06] text-white/80 rounded-bl-sm"
                      }`}
                    >
                      <p
                        className={`text-[10px] font-bold mb-1 ${isMine ? "opacity-60" : "text-white/35"}`}
                      >
                        {msg.senderName}
                      </p>
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {msg.message}
                      </p>
                      <p
                        className={`text-[10px] mt-1.5 ${isMine ? "opacity-50" : "text-white/25"}`}
                      >
                        {new Date(msg.createdAt).toLocaleString()}
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
// "use client";

// import { useCallback, useEffect, useState, useRef } from "react";
// import Link from "next/link";
// import { useParams, useRouter } from "next/navigation";
// import { useSession } from "next-auth/react";

// export default function RequesterTicketDetailPage({ role, listPath }) {
//   const { data: session, status } = useSession();
//   const router = useRouter();
//   const params = useParams();
//   const id = params?.id;

//   const [ticket, setTicket] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [reply, setReply] = useState("");
//   const [sending, setSending] = useState(false);
//   const [closing, setClosing] = useState(false);
//   const [actionError, setActionError] = useState("");
//   const bottomRef = useRef(null);

//   useEffect(() => {
//     if (bottomRef.current) {
//       bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
//     }
//   }, [messages.length]);

//   const fetchTicket = useCallback(async () => {
//     if (!id) return;
//     setLoading(true);
//     try {
//       const res = await fetch(`/api/support-tickets/${id}`, {
//         cache: "no-store",
//       });
//       const data = await res.json();
//       if (data.success) {
//         setTicket(data.ticket);
//         setMessages(data.messages || []);
//       } else {
//         setTicket(null);
//       }
//     } catch (_) {
//       setTicket(null);
//     } finally {
//       setLoading(false);
//     }
//   }, [id]);

//   useEffect(() => {
//     if (status === "unauthenticated") {
//       router.push("/auth/login");
//       return;
//     }
//     if (status === "authenticated") {
//       if (session?.user?.role !== role) {
//         router.push("/");
//         return;
//       }
//       fetchTicket();
//     }
//   }, [status, session, role, fetchTicket, router]);

//   const sendReply = async () => {
//     const message = reply.trim();
//     if (!message || sending) return;

//     setActionError("");
//     setSending(true);
//     try {
//       const res = await fetch(`/api/support-tickets/${id}/messages`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ message }),
//       });
//       const data = await res.json();
//       if (data.success) {
//         setMessages((prev) => [...prev, data.message]);
//         setReply("");
//         fetchTicket();
//       } else {
//         setActionError(data.error || "Failed to send reply.");
//       }
//     } catch (_) {
//       setActionError("Failed to send reply.");
//     } finally {
//       setSending(false);
//     }
//   };

//   const closeTicket = async () => {
//     if (closing) return;
//     setActionError("");
//     setClosing(true);
//     try {
//       const res = await fetch(`/api/support-tickets/${id}`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ action: "close" }),
//       });
//       const data = await res.json();
//       if (data.success) {
//         setTicket(data.ticket);
//       } else {
//         setActionError(data.error || "Unable to close ticket.");
//       }
//     } catch (_) {
//       setActionError("Unable to close ticket.");
//     } finally {
//       setClosing(false);
//     }
//   };

//   if (status === "loading" || loading) {
//     return <div className="p-8 text-sm text-gray-500">Loading...</div>;
//   }

//   if (!ticket) {
//     return (
//       <div className="p-8">
//         <p className="text-sm text-gray-500">Ticket not found.</p>
//         <Link
//           href={listPath}
//           className="text-sm text-[#eb9728] inline-block mt-2"
//         >
//           Back to tickets
//         </Link>
//       </div>
//     );
//   }

//   const canReply = ticket.status !== "closed";

//   return (
//     <div className="p-6 md:p-8 max-w-4xl mx-auto">
//       <div className="mb-4">
//         <Link
//           href={listPath}
//           className="text-sm text-gray-500 hover:text-[#eb9728]"
//         >
//           ← Back to tickets
//         </Link>
//       </div>

//       <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
//         <div className="flex items-start justify-between gap-4">
//           <div>
//             <h1 className="text-lg font-bold text-gray-900">
//               {ticket.subject}
//             </h1>
//             <p className="text-xs text-gray-500 mt-1">
//               {ticket.ticketNumber} · {ticket.category} · {ticket.priority}
//             </p>
//             <p className="text-xs text-gray-400 mt-1">
//               {messages.length} message{messages.length === 1 ? "" : "s"}
//               {ticket.assignedAdminId?.name
//                 ? ` · Assigned to ${ticket.assignedAdminId.name}`
//                 : " · Awaiting assignment"}
//             </p>
//           </div>
//           <div className="text-right">
//             <p className="text-xs capitalize text-gray-600">
//               {ticket.status?.replace(/_/g, " ")}
//             </p>
//             {ticket.status !== "closed" && (
//               <button
//                 type="button"
//                 onClick={closeTicket}
//                 disabled={closing}
//                 className="mt-2 px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
//               >
//                 {closing ? "Closing..." : "Close Ticket"}
//               </button>
//             )}
//           </div>
//         </div>
//       </div>

//       {actionError && (
//         <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
//           {actionError}
//         </div>
//       )}

//       <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
//         <div className="max-h-[460px] overflow-y-auto p-4 space-y-3 bg-gray-50">
//           {messages.length === 0 ? (
//             <p className="text-sm text-gray-400 text-center py-6">
//               No replies yet. Send a message and the support team will respond.
//             </p>
//           ) : (
//             messages.map((msg) => {
//               const isMine = String(msg.senderId) === String(session?.user?.id);
//               return (
//                 <div
//                   key={msg._id}
//                   className={`flex ${isMine ? "justify-end" : "justify-start"}`}
//                 >
//                   <div
//                     className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isMine ? "bg-[#eb9728] text-white" : "bg-white border border-gray-200 text-gray-800"}`}
//                   >
//                     <p className="text-[11px] font-semibold opacity-70">
//                       {msg.senderName}
//                     </p>
//                     <p className="whitespace-pre-wrap">{msg.message}</p>
//                     <p className="text-[10px] opacity-70 mt-1">
//                       {new Date(msg.createdAt).toLocaleString()}
//                     </p>
//                   </div>
//                 </div>
//               );
//             })
//           )}
//           <div ref={bottomRef} />
//         </div>

//         {canReply ? (
//           <div className="p-3 border-t border-gray-100 bg-white flex gap-2">
//             <div className="flex-1">
//               <textarea
//                 value={reply}
//                 onChange={(e) => setReply(e.target.value)}
//                 rows={2}
//                 maxLength={3000}
//                 placeholder="Type your reply..."
//                 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
//               />
//               <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400">
//                 <span>Your message will notify the support team.</span>
//                 <span>{reply.length}/3000</span>
//               </div>
//             </div>
//             <button
//               type="button"
//               onClick={sendReply}
//               disabled={sending || reply.trim().length < 1}
//               className="px-4 py-2 rounded-lg bg-[#eb9728] text-white text-sm font-semibold disabled:opacity-50 self-end"
//             >
//               {sending ? "Sending..." : "Send"}
//             </button>
//           </div>
//         ) : (
//           <div className="p-3 border-t border-gray-100 text-sm text-gray-500 text-center bg-gray-50">
//             This ticket is closed.
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
