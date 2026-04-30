"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * ChatBox — reusable per-order chat component.
 *
 * Props:
 *   orderId     : string   — the order _id
 *   currentUser : { id, name, role }
 *   orderNumber : string   — shown in header
 *   otherParty  : { name } — the other participant's display name
 *   onUnreadChange? : (count: number) => void
 */
export default function ChatBox({
  orderId,
  currentUser,
  orderNumber,
  otherParty,
  onUnreadChange,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const pendingReadIdsRef = useRef(new Set());
  const readFlushTimerRef = useRef(null);

  const applyReadReceipt = useCallback((messageIds, readerId, readAt) => {
    if (!Array.isArray(messageIds) || !messageIds.length || !readerId) return;

    const ids = new Set(messageIds.map((id) => String(id)));

    setMessages((prev) =>
      prev.map((m) => {
        if (!ids.has(String(m._id))) return m;

        const alreadyRead = Array.isArray(m.readBy)
          ? m.readBy.some(
              (entry) =>
                String(entry?.userId) === String(readerId) ||
                entry?.userId === readerId,
            )
          : false;

        if (alreadyRead) return m;

        return {
          ...m,
          readBy: [
            ...(Array.isArray(m.readBy) ? m.readBy : []),
            { userId: readerId, readAt: readAt || new Date().toISOString() },
          ],
        };
      }),
    );
  }, []);

  const markMessagesAsRead = useCallback(
    async (messageIds) => {
      if (!Array.isArray(messageIds) || !messageIds.length) return;

      try {
        await fetch(`/api/chat/${orderId}/read`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageIds }),
        });
      } catch (_) {
        // Silent failure; receipts are eventually consistent via later refreshes.
      }
    },
    [orderId],
  );

  const flushReadQueue = useCallback(() => {
    if (readFlushTimerRef.current) {
      clearTimeout(readFlushTimerRef.current);
      readFlushTimerRef.current = null;
    }

    const ids = Array.from(pendingReadIdsRef.current);
    pendingReadIdsRef.current.clear();

    if (ids.length) {
      markMessagesAsRead(ids);
    }
  }, [markMessagesAsRead]);

  const queueReadReceipt = useCallback(
    (messageId) => {
      if (!messageId || document.visibilityState !== "visible") return;

      pendingReadIdsRef.current.add(String(messageId));

      if (readFlushTimerRef.current) return;

      readFlushTimerRef.current = setTimeout(() => {
        flushReadQueue();
      }, 250);
    },
    [flushReadQueue],
  );

  // ── Fetch messages (initial load + manual refresh) ────────────────────────
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/chat/${orderId}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
        setError("");
      } else {
        setError(data.error || "Failed to load messages");
      }
    } catch (err) {
      setError("Connection error.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // ── SSE real-time updates ────────────────────────────────────────────────
  useEffect(() => {
    fetchMessages();

    const es = new EventSource(`/api/chat/${orderId}/stream`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message") {
          setMessages((prev) => {
            if (prev.some((m) => m._id === data.message._id)) return prev;
            return [...prev, data.message];
          });

          const isIncoming =
            String(data.message.senderId) !== String(currentUser.id);
          if (isIncoming) {
            queueReadReceipt(data.message._id);
          }
        }

        if (data.type === "read_receipt") {
          applyReadReceipt(data.messageIds, data.readerId, data.readAt);
        }
      } catch (_) {
        /* malformed event — ignore */
      }
    };

    es.onerror = () => {};

    return () => {
      es.close();
      flushReadQueue();
    };
  }, [
    orderId,
    currentUser.id,
    fetchMessages,
    queueReadReceipt,
    applyReadReceipt,
    flushReadQueue,
  ]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;

      const unreadIncomingIds = messages
        .filter((m) => {
          const isMine =
            String(m.senderId?.toString?.() || m.senderId) ===
            String(currentUser.id);
          if (isMine) return false;

          const isReadByMe = Array.isArray(m.readBy)
            ? m.readBy.some(
                (entry) =>
                  String(entry?.userId?.toString?.() || entry?.userId) ===
                  String(currentUser.id),
              )
            : false;

          return !isReadByMe;
        })
        .map((m) => String(m._id));

      if (unreadIncomingIds.length) {
        markMessagesAsRead(unreadIncomingIds);
      }
    };

    if (document.visibilityState === "visible") {
      const unreadIncomingIds = messages
        .filter((m) => {
          const isMine =
            String(m.senderId?.toString?.() || m.senderId) ===
            String(currentUser.id);
          if (isMine) return false;

          const isReadByMe = Array.isArray(m.readBy)
            ? m.readBy.some(
                (entry) =>
                  String(entry?.userId?.toString?.() || entry?.userId) ===
                  String(currentUser.id),
              )
            : false;

          return !isReadByMe;
        })
        .map((m) => String(m._id));

      if (unreadIncomingIds.length) {
        markMessagesAsRead(unreadIncomingIds);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [messages, currentUser.id, markMessagesAsRead]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    const lastMsg = messages[messages.length - 1];
    if (isNearBottom || lastMsg?._optimistic) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput("");

    const optimisticMsg = {
      _id: `temp-${Date.now()}`,
      senderId: currentUser.id,
      senderRole: currentUser.role,
      senderName: currentUser.name,
      message: text,
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`/api/chat/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => {
          const replaced = prev.map((m) =>
            m._id === optimisticMsg._id ? data.message : m,
          );
          const seen = new Set();
          return replaced.filter((m) => {
            const key = String(m._id);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        });
      } else {
        setMessages((prev) => prev.filter((m) => m._id !== optimisticMsg._id));
        setError(data.error || "Failed to send message");
        setInput(text);
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== optimisticMsg._id));
      setError("Failed to send. Please try again.");
      setInput(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Filtered messages for search ─────────────────────────────────────────
  const displayedMessages = searchQuery
    ? messages.filter((m) =>
        m.message.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : messages;

  const groupedMessages = groupByDate(displayedMessages);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-[#111116] rounded-xl">
        <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-[#eb9728] animate-spin mb-3" />
        <p className="text-sm text-white/35">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#111116] rounded-xl border border-white/8 overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 bg-[#16161c]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#eb9728]/20 border border-[#eb9728]/20 flex items-center justify-center font-bold text-[#eb9728] text-sm shrink-0">
            {(otherParty?.name || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-white/85 text-sm">
              {otherParty?.name || "—"}
            </p>
            <p className="text-[10px] text-white/30">Order {orderNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setShowSearch((s) => !s);
              setSearchQuery("");
            }}
            className={`p-2 rounded-lg transition-colors ${showSearch ? "bg-[#eb9728]/15 text-[#eb9728]" : "text-white/30 hover:text-white/60 hover:bg-white/[0.05]"}`}
            title="Search messages"
          >
            <span className="material-symbols-outlined text-[18px]">
              search
            </span>
          </button>
          <button
            onClick={() => fetchMessages()}
            className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
            title="Refresh"
          >
            <span className="material-symbols-outlined text-[18px]">
              refresh
            </span>
          </button>
        </div>
      </div>

      {/* ── Search bar ── */}
      {showSearch && (
        <div className="px-4 py-2.5 border-b border-white/8 bg-[#16161c]">
          <div className="flex items-center gap-2 bg-white/[0.05] rounded-lg border border-white/8 px-3">
            <span className="material-symbols-outlined text-white/25 text-[15px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in conversation..."
              className="flex-1 py-2 text-sm text-white/70 placeholder-white/20 focus:outline-none bg-transparent"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-white/25 hover:text-white/50 text-xs"
              >
                ✕
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-[10px] text-white/25 mt-1.5 px-1">
              {displayedMessages.length} result
              {displayedMessages.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      {/* ── Error banner ── */}
      {error && (
        <div className="px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 text-sm text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="text-red-400/60 hover:text-red-400 ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Messages area ── */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-1"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/20 py-12">
            <span className="material-symbols-outlined text-4xl mb-3">
              chat_bubble_outline
            </span>
            <p className="text-sm font-semibold text-white/30">
              No messages yet
            </p>
            <p className="text-xs mt-1 text-white/20">
              Start the conversation about this order.
            </p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([dateLabel, msgs]) => (
            <div key={dateLabel}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[10px] text-white/25 font-semibold px-2 whitespace-nowrap uppercase tracking-[0.12em]">
                  {dateLabel}
                </span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              {msgs.map((msg, i) => {
                const isMe =
                  msg.senderId?.toString() === currentUser.id ||
                  msg.senderId === currentUser.id;
                const prevMsg = msgs[i - 1];
                const isSameGroup =
                  prevMsg &&
                  (prevMsg.senderId?.toString() === msg.senderId?.toString() ||
                    prevMsg.senderId === msg.senderId);

                return (
                  <MessageBubble
                    key={msg._id}
                    msg={msg}
                    isMe={isMe}
                    showAvatar={!isSameGroup}
                    isOptimistic={msg._optimistic}
                    readStatus={
                      isMe
                        ? Array.isArray(msg.readBy) &&
                          msg.readBy.some(
                            (entry) =>
                              String(
                                entry?.userId?.toString?.() || entry?.userId,
                              ) !== String(currentUser.id),
                          )
                          ? "Read"
                          : "Sent"
                        : ""
                    }
                    highlight={
                      searchQuery &&
                      msg.message
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                    }
                  />
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* ── Input area ── */}
      <div className="px-4 py-3 border-t border-white/8 bg-[#16161c]">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-white/[0.05] border border-white/8 rounded-xl px-4 py-2.5 focus-within:border-[#eb9728]/40 focus-within:bg-white/[0.07] transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="w-full text-sm text-white/80 placeholder-white/20 focus:outline-none resize-none bg-transparent leading-relaxed"
              style={{ maxHeight: "120px", overflowY: "auto" }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height =
                  Math.min(e.target.scrollHeight, 120) + "px";
              }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="shrink-0 w-10 h-10 rounded-xl bg-[#eb9728] text-black flex items-center justify-center hover:bg-[#d4871f] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Send message"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[18px]">
                send
              </span>
            )}
          </button>
        </div>
        <p className="text-[10px] text-white/20 mt-1.5 px-1">
          {input.length}/2000 · Enter to send
        </p>
      </div>
    </div>
  );
}

// ── MessageBubble sub-component ──────────────────────────────────────────────

function MessageBubble({
  msg,
  isMe,
  showAvatar,
  isOptimistic,
  readStatus,
  highlight,
}) {
  const time = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`flex items-end gap-2 mb-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar placeholder */}
      <div className="w-7 shrink-0">
        {showAvatar && !isMe && (
          <div className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center text-xs font-bold text-white/50">
            {(msg.senderName || "?").charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div
        className={`group flex flex-col max-w-[70%] ${isMe ? "items-end" : "items-start"}`}
      >
        {/* Sender name */}
        {showAvatar && !isMe && (
          <p className="text-[10px] text-white/30 mb-0.5 px-1 font-semibold">
            {msg.senderName}
          </p>
        )}

        {/* Bubble */}
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition-all ${
            highlight ? "ring-2 ring-[#eb9728]/60" : ""
          } ${
            isMe
              ? `bg-[#eb9728] text-black rounded-br-sm ${isOptimistic ? "opacity-60" : ""}`
              : `bg-white/[0.08] text-white/80 rounded-bl-sm border border-white/[0.06] ${isOptimistic ? "opacity-60" : ""}`
          }`}
        >
          {msg.message}
        </div>

        {/* Timestamp */}
        <p className="text-[10px] mt-0.5 px-1 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
          {time}
          {isOptimistic ? " · Sending..." : isMe ? ` · ${readStatus}` : ""}
        </p>
      </div>
    </div>
  );
}

// ── Utility: group messages by calendar date ─────────────────────────────────

function groupByDate(messages) {
  const groups = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  messages.forEach((msg) => {
    const d = new Date(msg.createdAt);
    let label;

    if (isSameDay(d, today)) {
      label = "Today";
    } else if (isSameDay(d, yesterday)) {
      label = "Yesterday";
    } else {
      label = d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }

    if (!groups[label]) groups[label] = [];
    groups[label].push(msg);
  });

  return groups;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
// "use client";

// import { useState, useEffect, useRef, useCallback } from "react";

// /**
//  * ChatBox — reusable per-order chat component.
//  *
//  * Props:
//  *   orderId     : string   — the order _id
//  *   currentUser : { id, name, role }
//  *   orderNumber : string   — shown in header
//  *   otherParty  : { name } — the other participant's display name
//  *   onUnreadChange? : (count: number) => void
//  */
// export default function ChatBox({
//   orderId,
//   currentUser,
//   orderNumber,
//   otherParty,
//   onUnreadChange,
// }) {
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [sending, setSending] = useState(false);
//   const [error, setError] = useState("");
//   const [searchQuery, setSearchQuery] = useState("");
//   const [showSearch, setShowSearch] = useState(false);

//   const messagesContainerRef = useRef(null);
//   const inputRef = useRef(null);
//   const pendingReadIdsRef = useRef(new Set());
//   const readFlushTimerRef = useRef(null);

//   const applyReadReceipt = useCallback((messageIds, readerId, readAt) => {
//     if (!Array.isArray(messageIds) || !messageIds.length || !readerId) return;

//     const ids = new Set(messageIds.map((id) => String(id)));

//     setMessages((prev) =>
//       prev.map((m) => {
//         if (!ids.has(String(m._id))) return m;

//         const alreadyRead = Array.isArray(m.readBy)
//           ? m.readBy.some(
//               (entry) =>
//                 String(entry?.userId) === String(readerId) ||
//                 entry?.userId === readerId,
//             )
//           : false;

//         if (alreadyRead) return m;

//         return {
//           ...m,
//           readBy: [
//             ...(Array.isArray(m.readBy) ? m.readBy : []),
//             { userId: readerId, readAt: readAt || new Date().toISOString() },
//           ],
//         };
//       }),
//     );
//   }, []);

//   const markMessagesAsRead = useCallback(
//     async (messageIds) => {
//       if (!Array.isArray(messageIds) || !messageIds.length) return;

//       try {
//         await fetch(`/api/chat/${orderId}/read`, {
//           method: "PATCH",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ messageIds }),
//         });
//       } catch (_) {
//         // Silent failure; receipts are eventually consistent via later refreshes.
//       }
//     },
//     [orderId],
//   );

//   const flushReadQueue = useCallback(() => {
//     if (readFlushTimerRef.current) {
//       clearTimeout(readFlushTimerRef.current);
//       readFlushTimerRef.current = null;
//     }

//     const ids = Array.from(pendingReadIdsRef.current);
//     pendingReadIdsRef.current.clear();

//     if (ids.length) {
//       markMessagesAsRead(ids);
//     }
//   }, [markMessagesAsRead]);

//   const queueReadReceipt = useCallback(
//     (messageId) => {
//       if (!messageId || document.visibilityState !== "visible") return;

//       pendingReadIdsRef.current.add(String(messageId));

//       if (readFlushTimerRef.current) return;

//       readFlushTimerRef.current = setTimeout(() => {
//         flushReadQueue();
//       }, 250);
//     },
//     [flushReadQueue],
//   );

//   // ── Fetch messages (initial load + manual refresh) ────────────────────────
//   const fetchMessages = useCallback(async () => {
//     setLoading(true);
//     try {
//       const res = await fetch(`/api/chat/${orderId}`);
//       const data = await res.json();
//       if (data.success) {
//         setMessages(data.messages || []);
//         setError("");
//       } else {
//         setError(data.error || "Failed to load messages");
//       }
//     } catch (err) {
//       setError("Connection error.");
//     } finally {
//       setLoading(false);
//     }
//   }, [orderId]);

//   // ── SSE real-time updates ────────────────────────────────────────────────
//   // Initial load then open a persistent SSE connection. The server pushes
//   // new messages as they arrive — no polling, no wasted requests.
//   // EventSource reconnects automatically on network interruptions.
//   useEffect(() => {
//     fetchMessages();

//     const es = new EventSource(`/api/chat/${orderId}/stream`);

//     es.onmessage = (event) => {
//       try {
//         const data = JSON.parse(event.data);
//         if (data.type === "message") {
//           setMessages((prev) => {
//             // Guard: skip if we already have this message (e.g. via optimistic
//             // update that was already confirmed by the POST response).
//             if (prev.some((m) => m._id === data.message._id)) return prev;
//             return [...prev, data.message];
//           });

//           const isIncoming =
//             String(data.message.senderId) !== String(currentUser.id);
//           if (isIncoming) {
//             queueReadReceipt(data.message._id);
//           }
//         }

//         if (data.type === "read_receipt") {
//           applyReadReceipt(data.messageIds, data.readerId, data.readAt);
//         }
//       } catch (_) {
//         /* malformed event — ignore */
//       }
//     };

//     es.onerror = () => {
//       // EventSource handles reconnection automatically.
//       // Suppress console noise for expected disconnect/reconnect cycles.
//     };

//     return () => {
//       es.close();
//       flushReadQueue();
//     };
//   }, [
//     orderId,
//     currentUser.id,
//     fetchMessages,
//     queueReadReceipt,
//     applyReadReceipt,
//     flushReadQueue,
//   ]);

//   useEffect(() => {
//     const handleVisibilityChange = () => {
//       if (document.visibilityState !== "visible") return;

//       const unreadIncomingIds = messages
//         .filter((m) => {
//           const isMine =
//             String(m.senderId?.toString?.() || m.senderId) ===
//             String(currentUser.id);
//           if (isMine) return false;

//           const isReadByMe = Array.isArray(m.readBy)
//             ? m.readBy.some(
//                 (entry) =>
//                   String(entry?.userId?.toString?.() || entry?.userId) ===
//                   String(currentUser.id),
//               )
//             : false;

//           return !isReadByMe;
//         })
//         .map((m) => String(m._id));

//       if (unreadIncomingIds.length) {
//         markMessagesAsRead(unreadIncomingIds);
//       }
//     };

//     if (document.visibilityState === "visible") {
//       const unreadIncomingIds = messages
//         .filter((m) => {
//           const isMine =
//             String(m.senderId?.toString?.() || m.senderId) ===
//             String(currentUser.id);
//           if (isMine) return false;

//           const isReadByMe = Array.isArray(m.readBy)
//             ? m.readBy.some(
//                 (entry) =>
//                   String(entry?.userId?.toString?.() || entry?.userId) ===
//                   String(currentUser.id),
//               )
//             : false;

//           return !isReadByMe;
//         })
//         .map((m) => String(m._id));

//       if (unreadIncomingIds.length) {
//         markMessagesAsRead(unreadIncomingIds);
//       }
//     }

//     document.addEventListener("visibilitychange", handleVisibilityChange);
//     return () => {
//       document.removeEventListener("visibilitychange", handleVisibilityChange);
//     };
//   }, [messages, currentUser.id, markMessagesAsRead]);

//   // ── Scroll within the chat container (not the whole page) ───────────────
//   // Only auto-scroll when the user is near the bottom, or when they just
//   // sent a message (optimistic). This avoids hijacking scroll when the user
//   // is reading older messages.
//   useEffect(() => {
//     const container = messagesContainerRef.current;
//     if (!container) return;
//     const { scrollTop, scrollHeight, clientHeight } = container;
//     const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
//     const lastMsg = messages[messages.length - 1];
//     if (isNearBottom || lastMsg?._optimistic) {
//       container.scrollTop = container.scrollHeight;
//     }
//   }, [messages]);

//   // ── Send message ────────────────────────────────────────────────────────────
//   const handleSend = async () => {
//     const text = input.trim();
//     if (!text || sending) return;

//     setSending(true);
//     setInput("");

//     // Optimistic update
//     const optimisticMsg = {
//       _id: `temp-${Date.now()}`,
//       senderId: currentUser.id,
//       senderRole: currentUser.role,
//       senderName: currentUser.name,
//       message: text,
//       createdAt: new Date().toISOString(),
//       _optimistic: true,
//     };
//     setMessages((prev) => [...prev, optimisticMsg]);

//     try {
//       const res = await fetch(`/api/chat/${orderId}`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ message: text }),
//       });
//       const data = await res.json();
//       if (data.success) {
//         // Replace the optimistic message with the confirmed one, then
//         // deduplicate in case the SSE event already inserted it before
//         // this POST response arrived (race condition).
//         setMessages((prev) => {
//           const replaced = prev.map((m) =>
//             m._id === optimisticMsg._id ? data.message : m,
//           );
//           const seen = new Set();
//           return replaced.filter((m) => {
//             const key = String(m._id);
//             if (seen.has(key)) return false;
//             seen.add(key);
//             return true;
//           });
//         });
//       } else {
//         // Remove optimistic, show error
//         setMessages((prev) => prev.filter((m) => m._id !== optimisticMsg._id));
//         setError(data.error || "Failed to send message");
//         setInput(text); // restore input
//       }
//     } catch (err) {
//       setMessages((prev) => prev.filter((m) => m._id !== optimisticMsg._id));
//       setError("Failed to send. Please try again.");
//       setInput(text);
//     } finally {
//       setSending(false);
//       inputRef.current?.focus();
//     }
//   };

//   const handleKeyDown = (e) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       handleSend();
//     }
//   };

//   // ── Filtered messages for search ────────────────────────────────────────────
//   const displayedMessages = searchQuery
//     ? messages.filter((m) =>
//         m.message.toLowerCase().includes(searchQuery.toLowerCase()),
//       )
//     : messages;

//   // ── Grouping by date ────────────────────────────────────────────────────────
//   const groupedMessages = groupByDate(displayedMessages);

//   // ── Render ──────────────────────────────────────────────────────────────────
//   if (loading) {
//     return (
//       <div className="flex flex-col h-full items-center justify-center text-gray-400">
//         <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full mb-2" />
//         <p className="text-sm">Loading messages...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
//       {/* ── Header ── */}
//       <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
//         <div className="flex items-center gap-3">
//           <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm">
//             {(otherParty?.name || "?").charAt(0).toUpperCase()}
//           </div>
//           <div>
//             <p className="font-semibold text-gray-900 text-sm">
//               {otherParty?.name || "—"}
//             </p>
//             <p className="text-xs text-gray-400">Order {orderNumber}</p>
//           </div>
//         </div>
//         <div className="flex items-center gap-2">
//           <button
//             onClick={() => {
//               setShowSearch((s) => !s);
//               setSearchQuery("");
//             }}
//             className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
//             title="Search messages"
//           >
//             <span className="material-symbols-outlined text-lg">search</span>
//           </button>
//           <button
//             onClick={() => fetchMessages()}
//             className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
//             title="Refresh"
//           >
//             <span className="material-symbols-outlined text-lg">refresh</span>
//           </button>
//         </div>
//       </div>

//       {/* ── Search bar ── */}
//       {showSearch && (
//         <div className="px-4 py-2 border-b border-gray-100 bg-yellow-50">
//           <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3">
//             <span className="material-symbols-outlined text-gray-400 text-sm">
//               search
//             </span>
//             <input
//               type="text"
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               placeholder="Search in conversation..."
//               className="flex-1 py-2 text-sm focus:outline-none bg-transparent"
//               autoFocus
//             />
//             {searchQuery && (
//               <button
//                 onClick={() => setSearchQuery("")}
//                 className="text-gray-400 hover:text-gray-600 text-xs"
//               >
//                 ✕
//               </button>
//             )}
//           </div>
//           {searchQuery && (
//             <p className="text-xs text-gray-400 mt-1 px-1">
//               {displayedMessages.length} result
//               {displayedMessages.length !== 1 ? "s" : ""}
//             </p>
//           )}
//         </div>
//       )}

//       {/* ── Error banner ── */}
//       {error && (
//         <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-sm text-red-600 flex items-center justify-between">
//           <span>{error}</span>
//           <button
//             onClick={() => setError("")}
//             className="text-red-400 hover:text-red-600"
//           >
//             ✕
//           </button>
//         </div>
//       )}

//       {/* ── Messages area ── */}
//       <div
//         ref={messagesContainerRef}
//         className="flex-1 overflow-y-auto px-5 py-4 space-y-1"
//       >
//         {messages.length === 0 ? (
//           <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
//             <span className="material-symbols-outlined text-4xl mb-2">
//               chat_bubble_outline
//             </span>
//             <p className="text-sm font-medium">No messages yet</p>
//             <p className="text-xs mt-1">
//               Start the conversation about this order.
//             </p>
//           </div>
//         ) : (
//           Object.entries(groupedMessages).map(([dateLabel, msgs]) => (
//             <div key={dateLabel}>
//               {/* Date separator */}
//               <div className="flex items-center gap-3 my-4">
//                 <div className="flex-1 h-px bg-gray-100" />
//                 <span className="text-xs text-gray-400 font-medium px-2 whitespace-nowrap">
//                   {dateLabel}
//                 </span>
//                 <div className="flex-1 h-px bg-gray-100" />
//               </div>

//               {msgs.map((msg, i) => {
//                 const isMe =
//                   msg.senderId?.toString() === currentUser.id ||
//                   msg.senderId === currentUser.id;
//                 const prevMsg = msgs[i - 1];
//                 const isSameGroup =
//                   prevMsg &&
//                   (prevMsg.senderId?.toString() === msg.senderId?.toString() ||
//                     prevMsg.senderId === msg.senderId);

//                 return (
//                   <MessageBubble
//                     key={msg._id}
//                     msg={msg}
//                     isMe={isMe}
//                     showAvatar={!isSameGroup}
//                     isOptimistic={msg._optimistic}
//                     readStatus={
//                       isMe
//                         ? Array.isArray(msg.readBy) &&
//                           msg.readBy.some(
//                             (entry) =>
//                               String(
//                                 entry?.userId?.toString?.() || entry?.userId,
//                               ) !== String(currentUser.id),
//                           )
//                           ? "Read"
//                           : "Sent"
//                         : ""
//                     }
//                     highlight={
//                       searchQuery &&
//                       msg.message
//                         .toLowerCase()
//                         .includes(searchQuery.toLowerCase())
//                     }
//                   />
//                 );
//               })}
//             </div>
//           ))
//         )}
//       </div>

//       {/* ── Input area ── */}
//       <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
//         <div className="flex items-end gap-3">
//           <div className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-blue-400 transition-colors">
//             <textarea
//               ref={inputRef}
//               value={input}
//               onChange={(e) => setInput(e.target.value)}
//               onKeyDown={handleKeyDown}
//               placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
//               rows={1}
//               className="w-full text-sm text-gray-900 focus:outline-none resize-none bg-transparent leading-relaxed"
//               style={{ maxHeight: "120px", overflowY: "auto" }}
//               onInput={(e) => {
//                 e.target.style.height = "auto";
//                 e.target.style.height =
//                   Math.min(e.target.scrollHeight, 120) + "px";
//               }}
//             />
//           </div>
//           <button
//             onClick={handleSend}
//             disabled={!input.trim() || sending}
//             className="shrink-0 w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
//             title="Send message"
//           >
//             {sending ? (
//               <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
//             ) : (
//               <span className="material-symbols-outlined text-lg">send</span>
//             )}
//           </button>
//         </div>
//         <p className="text-xs text-gray-400 mt-1.5 px-1">
//           {input.length}/2000 · Enter to send
//         </p>
//       </div>
//     </div>
//   );
// }

// // ── MessageBubble sub-component ─────────────────────────────────────────────

// function MessageBubble({
//   msg,
//   isMe,
//   showAvatar,
//   isOptimistic,
//   readStatus,
//   highlight,
// }) {
//   const time = new Date(msg.createdAt).toLocaleTimeString([], {
//     hour: "2-digit",
//     minute: "2-digit",
//   });

//   return (
//     <div
//       className={`flex items-end gap-2 mb-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}
//     >
//       {/* Avatar placeholder to maintain alignment */}
//       <div className="w-7 shrink-0">
//         {showAvatar && !isMe && (
//           <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
//             {(msg.senderName || "?").charAt(0).toUpperCase()}
//           </div>
//         )}
//       </div>

//       <div
//         className={`group flex flex-col max-w-[70%] ${isMe ? "items-end" : "items-start"}`}
//       >
//         {/* Sender name (shown once per group, for other party only) */}
//         {showAvatar && !isMe && (
//           <p className="text-xs text-gray-400 mb-0.5 px-1">{msg.senderName}</p>
//         )}

//         {/* Bubble */}
//         <div
//           className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition-all ${
//             highlight ? "ring-2 ring-yellow-400" : ""
//           } ${
//             isMe
//               ? "bg-blue-600 text-white rounded-br-sm"
//               : "bg-gray-100 text-gray-900 rounded-bl-sm"
//           } ${isOptimistic ? "opacity-70" : ""}`}
//         >
//           {msg.message}
//         </div>

//         {/* Timestamp */}
//         <p
//           className={`text-xs mt-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${
//             isMe ? "text-gray-400" : "text-gray-400"
//           }`}
//         >
//           {time}
//           {isOptimistic ? " · Sending..." : isMe ? ` · ${readStatus}` : ""}
//         </p>
//       </div>
//     </div>
//   );
// }

// // ── Utility: group messages by calendar date ─────────────────────────────────

// function groupByDate(messages) {
//   const groups = {};
//   const today = new Date();
//   const yesterday = new Date(today);
//   yesterday.setDate(yesterday.getDate() - 1);

//   messages.forEach((msg) => {
//     const d = new Date(msg.createdAt);
//     let label;

//     if (isSameDay(d, today)) {
//       label = "Today";
//     } else if (isSameDay(d, yesterday)) {
//       label = "Yesterday";
//     } else {
//       label = d.toLocaleDateString(undefined, {
//         weekday: "short",
//         month: "short",
//         day: "numeric",
//       });
//     }

//     if (!groups[label]) groups[label] = [];
//     groups[label].push(msg);
//   });

//   return groups;
// }

// function isSameDay(a, b) {
//   return (
//     a.getFullYear() === b.getFullYear() &&
//     a.getMonth() === b.getMonth() &&
//     a.getDate() === b.getDate()
//   );
// }
