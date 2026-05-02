// app/bids/[id]/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import CustomerMainNavbar from "@/components/CustomerMainNavbar";
import Editor3DWrapper from "@/modules/components/Editor3DWrapper";

function StatusBadge({ status }) {
  const styles = {
    accepted: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    under_consideration: "bg-[#eb9728]/10 border-[#eb9728]/20 text-[#eb9728]",
    rejected: "bg-red-500/10 border-red-500/20 text-red-400",
    withdrawn: "bg-white/5 border-white/10 text-white/40",
    pending: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  };
  return (
    <span
      className={`px-3 py-1.5 rounded-full text-[11px] font-bold border ${styles[status] || "bg-white/5 border-white/10 text-white/40"}`}
    >
      {status.toUpperCase().replace(/_/g, " ")}
    </span>
  );
}

function ChatPanel({ bidId, session, bidStatus }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingChat, setLoadingChat] = useState(true);
  const bottomRef = useRef(null);
  const lastTimestampRef = useRef(null);
  const pollingRef = useRef(null);
  const isClosed = bidStatus === "withdrawn" || bidStatus === "rejected";

  const fetchMessages = useCallback(
    async (initial = false) => {
      try {
        const since =
          !initial && lastTimestampRef.current
            ? `?since=${encodeURIComponent(lastTimestampRef.current)}`
            : "";
        const res = await fetch(`/api/bids/${bidId}/chat${since}`);
        const data = await res.json();
        if (data.success) {
          const newMessages = Array.isArray(data.messages) ? data.messages : [];
          if (initial) {
            setMessages(newMessages);
          } else if (newMessages.length > 0) {
            setMessages((prev) => {
              const seen = new Set(prev.map((m) => String(m._id)));
              const deduped = newMessages.filter(
                (m) => !seen.has(String(m._id)),
              );
              return deduped.length ? [...prev, ...deduped] : prev;
            });
          }
          if (
            !initial &&
            Array.isArray(data.readUpdates) &&
            data.readUpdates.length
          ) {
            const byId = new Map(
              data.readUpdates.map((entry) => [String(entry._id), entry]),
            );
            setMessages((prev) =>
              prev.map((msg) => {
                const update = byId.get(String(msg._id));
                if (!update) return msg;
                return {
                  ...msg,
                  readBy: update.readBy,
                  updatedAt: update.updatedAt,
                };
              }),
            );
          }
          if (newMessages.length > 0) {
            lastTimestampRef.current =
              newMessages[newMessages.length - 1].createdAt;
          }
        }
      } catch (_) {
      } finally {
        if (initial) setLoadingChat(false);
      }
    },
    [bidId],
  );

  useEffect(() => {
    fetchMessages(true);
    pollingRef.current = setInterval(() => fetchMessages(false), 5000);
    return () => clearInterval(pollingRef.current);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending || isClosed) return;
    setSending(true);
    try {
      const res = await fetch(`/api/bids/${bidId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.message]);
        lastTimestampRef.current = data.message.createdAt;
        setInput("");
      } else alert(data.error || "Failed to send");
    } catch (_) {
      alert("Error sending message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-96">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#050507] rounded-xl border border-white/8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loadingChat ? (
          <div className="flex items-center justify-center h-full">
            <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-[#eb9728] animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span className="material-symbols-outlined text-3xl text-white/15">
              chat
            </span>
            <p className="text-sm text-white/30">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === session.user.id;
            const isReadByOther =
              isMine &&
              Array.isArray(msg.readBy) &&
              msg.readBy.some(
                (entry) => String(entry?.userId) !== String(session.user.id),
              );
            return (
              <div
                key={msg._id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMine
                      ? "bg-[#eb9728] text-white rounded-br-sm"
                      : "bg-white/[0.06] border border-white/8 text-white/80 rounded-bl-sm"
                  }`}
                >
                  {!isMine && (
                    <p className="text-[10px] font-bold mb-1 opacity-50 capitalize tracking-wide">
                      {msg.senderRole}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap wrap-break-word">
                    {msg.message}
                  </p>
                  <p
                    className={`text-[10px] mt-1 text-right ${isMine ? "text-white/60" : "text-white/30"}`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {isMine ? ` · ${isReadByOther ? "Read" : "Sent"}` : ""}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {isClosed ? (
        <p className="text-center text-[11px] text-white/30 mt-3 py-2.5 bg-white/[0.03] border border-white/8 rounded-xl">
          Chat closed — bid is {bidStatus}.
        </p>
      ) : (
        <div className="flex gap-2 mt-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
            rows={2}
            className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 resize-none focus:outline-none focus:border-[#eb9728]/40 focus:bg-white/[0.06] transition-all"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="px-4 self-end py-2.5 bg-[#eb9728] text-white text-sm font-bold rounded-xl hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <span className="material-symbols-outlined text-[18px] animate-spin">
                progress_activity
              </span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">
                send
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default function BidDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [bid, setBid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const [updateForm, setUpdateForm] = useState({
    amount: "",
    timeline: "",
    materialsDescription: "",
    processDescription: "",
    warrantyInfo: "",
    paymentTerms: "",
  });

  const fetchBid = useCallback(async () => {
    try {
      const res = await fetch(`/api/bids/${params.id}`);
      const data = await res.json();
      if (data.success && data.bid) {
        setBid(data.bid);
        setUpdateForm({
          amount: data.bid.amount,
          timeline: data.bid.timeline,
          materialsDescription: data.bid.materialsDescription || "",
          processDescription: data.bid.processDescription || "",
          warrantyInfo: data.bid.warrantyInfo || "",
          paymentTerms: data.bid.paymentTerms || "",
        });
      } else alert("Error loading bid: " + (data.error || "Unknown error"));
    } catch (_) {
      alert("Error loading bid");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated") {
      const role = session.user.role;
      if (role !== "customer" && role !== "manufacturer") {
        router.push("/auth/login");
        return;
      }
      fetchBid();
    }
  }, [status, router, session, fetchBid]);

  const handleUpdateBid = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await fetch(`/api/bids/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(updateForm.amount),
          timeline: Number(updateForm.timeline),
          materialsDescription: updateForm.materialsDescription,
          processDescription: updateForm.processDescription,
          warrantyInfo: updateForm.warrantyInfo,
          paymentTerms: updateForm.paymentTerms,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsEditing(false);
        fetchBid();
      } else alert("Error: " + data.error);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleWithdraw = async () => {
    if (!confirm("Withdraw this bid? This cannot be undone.")) return;
    setWithdrawing(true);
    try {
      const res = await fetch(`/api/bids/${params.id}/withdraw`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) fetchBid();
      else alert("Error: " + data.error);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setWithdrawing(false);
    }
  };

  const handleAcceptBid = async () => {
    if (!confirm("Accept this bid? This will close the RFQ.")) return;
    setAccepting(true);
    try {
      const res = await fetch(`/api/rfqs/${bid.rfqId._id}/accept-bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidId: params.id }),
      });
      const data = await res.json();
      if (data.success) router.push(`/customer/rfqs/${bid.rfqId._id}`);
      else alert("Error: " + data.error);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setAccepting(false);
    }
  };

  const handleIgnore = () => router.push(`/customer/rfqs/${bid.rfqId._id}`);

  const inputClass =
    "w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#eb9728]/40 focus:bg-white/[0.06] transition-all";
  const labelClass =
    "block text-[10px] font-bold uppercase tracking-[0.15em] text-white/35 mb-2";

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-[#eb9728] animate-spin" />
          <GlobalLoader text="Loading bid..." />
        </div>
      </div>
    );
  }

  if (!bid) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-white/15 block mb-3">
            gavel
          </span>
          <p className="text-sm text-white/40 mb-3">Bid not found.</p>
          <button
            onClick={() => router.back()}
            className="text-xs font-bold text-[#eb9728] hover:text-amber-400"
          >
            ← Go back
          </button>
        </div>
      </div>
    );
  }

  const isManufacturer =
    session.user.role === "manufacturer" &&
    session.user.id === bid.manufacturerId._id;
  const isCustomer =
    session.user.role === "customer" &&
    session.user.id === bid.rfqId?.customerId;

  if (!isManufacturer && !isCustomer) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-red-400/50 block mb-3">
            lock
          </span>
          <p className="text-base font-bold text-white/70 mb-1">
            Access Denied
          </p>
          <p className="text-sm text-white/35 mb-4">
            You don&apos;t have permission to view this bid.
          </p>
          <button
            onClick={() =>
              router.push(
                session.user.role === "customer"
                  ? "/customer"
                  : "/manufacturer/dashboard",
              )
            }
            className="text-xs font-bold text-[#eb9728] hover:text-amber-400"
          >
            ← Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const bidOpen =
    bid.status !== "accepted" &&
    bid.status !== "withdrawn" &&
    bid.status !== "rejected";
  const rfqActive = bid.rfqId?.status === "active";
  const canEdit = isManufacturer && bid.status === "pending";
  const canWithdraw =
    isManufacturer && bid.status !== "accepted" && bid.status !== "withdrawn";
  const canAccept = isCustomer && bidOpen && rfqActive;
  const bidModel3D = bid.rfqId?.customOrderId?.model3D || null;

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {isCustomer ? (
        <CustomerMainNavbar />
      ) : (
        <header className="sticky top-0 z-50 bg-[#050507]/80 backdrop-blur-md border-b border-white/8">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm font-semibold transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">
                  arrow_back
                </span>
                Back
              </button>
              <div className="w-px h-4 bg-white/10" />
              <Link
                href="/manufacturer/dashboard"
                className="text-sm font-black text-white tracking-tight"
              >
                Craftit
              </Link>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
              Manufacturer
            </span>
          </div>
        </header>
      )}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728] mb-1">
              Bid Details
            </p>
            <h1 className="text-3xl font-black tracking-tight text-white">
              {bid.rfqId?.customOrderId?.title || "Custom Order"}
            </h1>
            <p className="text-sm text-white/35 mt-1">
              Submitted{" "}
              {new Date(bid.submittedAt || bid.createdAt).toLocaleDateString(
                "en-US",
                { year: "numeric", month: "long", day: "numeric" },
              )}
            </p>
          </div>
          <StatusBadge status={bid.status} />
        </div>

        {/* Manufacturer Info — customer only */}
        {isCustomer && (
          <div className="rounded-2xl border border-white/8 bg-[#0c0c11] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-4">
              Manufacturer
            </p>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-base font-bold text-white/85">
                    {bid.manufacturerId?.businessName ||
                      bid.manufacturerId?.name}
                  </p>
                  {bid.manufacturerId?.verificationStatus === "verified" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                      <span className="material-symbols-outlined text-[11px]">
                        verified
                      </span>
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/35">
                  {bid.manufacturerId?.email}
                </p>
              </div>
              {bid.manufacturerId?.stats && (
                <div className="flex gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-1">
                      Rating
                    </p>
                    <p className="text-sm font-black text-[#eb9728]">
                      ⭐ {bid.manufacturerId.stats.averageRating || 0}/5
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-1">
                      Orders
                    </p>
                    <p className="text-sm font-black text-white/80">
                      {bid.manufacturerId.stats.completedOrders || 0}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bid Details Card */}
        <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Bid Details</h2>
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#eb9728] hover:text-amber-400 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">
                  edit
                </span>
                Edit Bid
              </button>
            )}
          </div>

          <div className="p-6">
            {isEditing ? (
              <form onSubmit={handleUpdateBid} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Bid Amount ($) *</label>
                    <input
                      type="number"
                      value={updateForm.amount}
                      required
                      min="0"
                      step="0.01"
                      onChange={(e) =>
                        setUpdateForm({ ...updateForm, amount: e.target.value })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Timeline (Days) *</label>
                    <input
                      type="number"
                      value={updateForm.timeline}
                      required
                      min="1"
                      onChange={(e) =>
                        setUpdateForm({
                          ...updateForm,
                          timeline: e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Materials Description</label>
                  <textarea
                    value={updateForm.materialsDescription}
                    rows={3}
                    onChange={(e) =>
                      setUpdateForm({
                        ...updateForm,
                        materialsDescription: e.target.value,
                      })
                    }
                    className={`${inputClass} resize-none`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Process Description</label>
                  <textarea
                    value={updateForm.processDescription}
                    rows={3}
                    onChange={(e) =>
                      setUpdateForm({
                        ...updateForm,
                        processDescription: e.target.value,
                      })
                    }
                    className={`${inputClass} resize-none`}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Warranty Info</label>
                    <textarea
                      value={updateForm.warrantyInfo}
                      rows={2}
                      onChange={(e) =>
                        setUpdateForm({
                          ...updateForm,
                          warrantyInfo: e.target.value,
                        })
                      }
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Payment Terms</label>
                    <textarea
                      value={updateForm.paymentTerms}
                      rows={2}
                      onChange={(e) =>
                        setUpdateForm({
                          ...updateForm,
                          paymentTerms: e.target.value,
                        })
                      }
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-5 py-2.5 bg-[#eb9728] text-white text-sm font-bold rounded-xl hover:bg-amber-500 disabled:opacity-50 transition-colors"
                  >
                    {updating ? "Saving…" : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-5 py-2.5 bg-white/[0.04] border border-white/10 text-sm font-bold text-white/60 rounded-xl hover:bg-white/[0.07] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-[#eb9728]/20 bg-[#eb9728]/5 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-2">
                      Bid Amount
                    </p>
                    <p className="text-3xl font-black text-[#eb9728]">
                      ${bid.amount?.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-2">
                      Timeline
                    </p>
                    <p className="text-3xl font-black text-white">
                      {bid.timeline}{" "}
                      <span className="text-lg text-white/30 font-normal">
                        days
                      </span>
                    </p>
                  </div>
                </div>

                {bid.costBreakdown &&
                  Object.values(bid.costBreakdown).some(Boolean) && (
                    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-3">
                        Cost Breakdown
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {["materials", "labor", "overhead", "profit"].map(
                          (key) =>
                            bid.costBreakdown[key] != null ? (
                              <div key={key}>
                                <p className="text-[10px] text-white/30 capitalize mb-1">
                                  {key}
                                </p>
                                <p className="text-sm font-bold text-white/70">
                                  ${bid.costBreakdown[key].toLocaleString()}
                                </p>
                              </div>
                            ) : null,
                        )}
                      </div>
                    </div>
                  )}

                {[
                  {
                    key: "materialsDescription",
                    label: "Materials",
                    icon: "category",
                  },
                  {
                    key: "processDescription",
                    label: "Manufacturing Process",
                    icon: "precision_manufacturing",
                  },
                  {
                    key: "warrantyInfo",
                    label: "Warranty",
                    icon: "verified_user",
                  },
                  {
                    key: "paymentTerms",
                    label: "Payment Terms",
                    icon: "payments",
                  },
                ].map(({ key, label, icon }) =>
                  bid[key] ? (
                    <div key={key}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="material-symbols-outlined text-[13px] text-white/30">
                          {icon}
                        </span>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">
                          {label}
                        </p>
                      </div>
                      <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap bg-white/[0.02] border border-white/6 rounded-xl px-4 py-3">
                        {bid[key]}
                      </p>
                    </div>
                  ) : null,
                )}

                {bid.proposedMilestones?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-3">
                      <span className="material-symbols-outlined text-[13px] text-white/30">
                        flag
                      </span>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">
                        Proposed Milestones
                      </p>
                    </div>
                    <div className="space-y-2">
                      {bid.proposedMilestones.map((m, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3"
                        >
                          <span className="h-6 w-6 rounded-full bg-[#eb9728]/15 border border-[#eb9728]/20 flex items-center justify-center text-[11px] font-black text-[#eb9728] shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-white/80">
                              {m.name}
                            </p>
                            {m.description && (
                              <p className="text-[11px] text-white/40 mt-0.5">
                                {m.description}
                              </p>
                            )}
                            {m.duration && (
                              <p className="text-[10px] text-white/25 mt-1">
                                {m.duration} days
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {bid.questions && (
                  <div className="rounded-xl border border-[#eb9728]/20 bg-[#eb9728]/5 px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="material-symbols-outlined text-[13px] text-[#eb9728]">
                        help
                      </span>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#eb9728]">
                        Questions from Manufacturer
                      </p>
                    </div>
                    <p className="text-sm text-white/60 whitespace-pre-wrap">
                      {bid.questions}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {bidModel3D?.url && (
          <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/8">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="px-1.5 py-0.5 bg-[#eb9728] text-white text-xs rounded font-medium">
                  3D
                </span>
                Custom Order 3D Model
              </h2>
            </div>
            <div className="p-6">
              <Editor3DWrapper
                modelUrl={bidModel3D.url}
                initialAnnotations={bidModel3D.annotations}
                initialCameraState={bidModel3D.cameraState}
                readOnly={true}
              />
              <div className="mt-3 flex items-center justify-between gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/8">
                <p className="text-sm text-white/60 truncate">
                  {bidModel3D.filename || "Attached 3D model"}
                </p>
                <a
                  href={bidModel3D.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#eb9728]/10 text-[#eb9728] rounded-lg text-xs font-medium hover:bg-[#eb9728]/20"
                >
                  Download
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Chat */}
        <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8">
            <h2 className="text-base font-bold text-white">
              Chat with {isManufacturer ? "Customer" : "Manufacturer"}
            </h2>
            <p className="text-[11px] text-white/30 mt-0.5">
              Use this chat to negotiate details before the manufacturer updates
              the bid
            </p>
          </div>
          <div className="p-5">
            <ChatPanel
              bidId={params.id}
              session={session}
              bidStatus={bid.status}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-white/60 hover:bg-white/[0.07] hover:text-white transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">
              arrow_back
            </span>
            Back
          </button>

          {canAccept && (
            <button
              onClick={handleAcceptBid}
              disabled={accepting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm font-bold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">
                check_circle
              </span>
              {accepting ? "Accepting…" : "Accept Bid"}
            </button>
          )}

          {isCustomer && bidOpen && (
            <button
              onClick={handleIgnore}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-white/50 hover:bg-white/[0.07] transition-all"
            >
              Ignore for Now
            </button>
          )}

          {canWithdraw && (
            <button
              onClick={handleWithdraw}
              disabled={withdrawing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-sm font-bold text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">
                cancel
              </span>
              {withdrawing ? "Withdrawing…" : "Withdraw Bid"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
// // app/bids/[id]/page.js
// "use client";

// import { useState, useEffect, useRef, useCallback } from "react";
// import { useParams, useRouter } from "next/navigation";
// import { useSession } from "next-auth/react";
// import Link from "next/link";
// import CustomerMainNavbar from "@/components/CustomerMainNavbar";

// function StatusBadge({ status }) {
//   const styles = {
//     accepted: "bg-emerald-100 text-emerald-800 border-emerald-200",
//     under_consideration: "bg-amber-100 text-amber-800 border-amber-200",
//     rejected: "bg-red-100 text-red-800 border-red-200",
//     withdrawn: "bg-gray-100 text-gray-600 border-gray-200",
//     pending: "bg-blue-100 text-blue-800 border-blue-200",
//   };
//   return (
//     <span
//       className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || "bg-gray-100 text-gray-800"}`}
//     >
//       {status.toUpperCase().replace(/_/g, " ")}
//     </span>
//   );
// }

// function ChatPanel({ bidId, session, bidStatus }) {
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState("");
//   const [sending, setSending] = useState(false);
//   const [loadingChat, setLoadingChat] = useState(true);
//   const bottomRef = useRef(null);
//   const lastTimestampRef = useRef(null);
//   const pollingRef = useRef(null);
//   const isClosed = bidStatus === "withdrawn" || bidStatus === "rejected";

//   const fetchMessages = useCallback(
//     async (initial = false) => {
//       try {
//         const since =
//           !initial && lastTimestampRef.current
//             ? `?since=${encodeURIComponent(lastTimestampRef.current)}`
//             : "";
//         const res = await fetch(`/api/bids/${bidId}/chat${since}`);
//         const data = await res.json();
//         if (data.success) {
//           const newMessages = Array.isArray(data.messages) ? data.messages : [];

//           if (initial) {
//             setMessages(newMessages);
//           } else if (newMessages.length > 0) {
//             setMessages((prev) => {
//               const seen = new Set(prev.map((m) => String(m._id)));
//               const deduped = newMessages.filter(
//                 (m) => !seen.has(String(m._id)),
//               );
//               return deduped.length ? [...prev, ...deduped] : prev;
//             });
//           }

//           if (
//             !initial &&
//             Array.isArray(data.readUpdates) &&
//             data.readUpdates.length
//           ) {
//             const byId = new Map(
//               data.readUpdates.map((entry) => [String(entry._id), entry]),
//             );
//             setMessages((prev) =>
//               prev.map((msg) => {
//                 const update = byId.get(String(msg._id));
//                 if (!update) return msg;
//                 return {
//                   ...msg,
//                   readBy: update.readBy,
//                   updatedAt: update.updatedAt,
//                 };
//               }),
//             );
//           }

//           if (newMessages.length > 0) {
//             lastTimestampRef.current =
//               newMessages[newMessages.length - 1].createdAt;
//           }
//         }
//       } catch (_) {
//         // silent fail on poll
//       } finally {
//         if (initial) setLoadingChat(false);
//       }
//     },
//     [bidId],
//   );

//   useEffect(() => {
//     fetchMessages(true);
//     pollingRef.current = setInterval(() => fetchMessages(false), 5000);
//     return () => clearInterval(pollingRef.current);
//   }, [fetchMessages]);

//   useEffect(() => {
//     bottomRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   const handleSend = async () => {
//     const trimmed = input.trim();
//     if (!trimmed || sending || isClosed) return;
//     setSending(true);
//     try {
//       const res = await fetch(`/api/bids/${bidId}/chat`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ message: trimmed }),
//       });
//       const data = await res.json();
//       if (data.success) {
//         setMessages((prev) => [...prev, data.message]);
//         lastTimestampRef.current = data.message.createdAt;
//         setInput("");
//       } else {
//         alert(data.error || "Failed to send");
//       }
//     } catch (_) {
//       alert("Error sending message");
//     } finally {
//       setSending(false);
//     }
//   };

//   return (
//     <div className="flex flex-col h-96">
//       <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 rounded-lg border border-gray-200">
//         {loadingChat ? (
//           <p className="text-center text-gray-400 text-sm pt-8">Loading…</p>
//         ) : messages.length === 0 ? (
//           <p className="text-center text-gray-400 text-sm pt-8">
//             No messages yet. Start the conversation!
//           </p>
//         ) : (
//           messages.map((msg) => {
//             const isMine = msg.senderId === session.user.id;
//             const isReadByOther =
//               isMine &&
//               Array.isArray(msg.readBy) &&
//               msg.readBy.some(
//                 (entry) => String(entry?.userId) !== String(session.user.id),
//               );
//             return (
//               <div
//                 key={msg._id}
//                 className={`flex ${isMine ? "justify-end" : "justify-start"}`}
//               >
//                 <div
//                   className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
//                     isMine
//                       ? "bg-blue-600 text-white rounded-br-sm"
//                       : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
//                   }`}
//                 >
//                   {!isMine && (
//                     <p className="text-[10px] font-semibold mb-1 opacity-50 capitalize">
//                       {msg.senderRole}
//                     </p>
//                   )}
//                   <p className="whitespace-pre-wrap wrap-break-word">
//                     {msg.message}
//                   </p>
//                   <p
//                     className={`text-[10px] mt-1 text-right ${isMine ? "text-blue-200" : "text-gray-400"}`}
//                   >
//                     {new Date(msg.createdAt).toLocaleTimeString("en-US", {
//                       hour: "2-digit",
//                       minute: "2-digit",
//                     })}
//                     {isMine ? ` · ${isReadByOther ? "Read" : "Sent"}` : ""}
//                   </p>
//                 </div>
//               </div>
//             );
//           })
//         )}
//         <div ref={bottomRef} />
//       </div>

//       {isClosed ? (
//         <p className="text-center text-sm text-gray-400 mt-3 py-2 bg-gray-100 rounded-lg">
//           Chat closed — bid is {bidStatus}.
//         </p>
//       ) : (
//         <div className="flex gap-2 mt-3">
//           <textarea
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             onKeyDown={(e) => {
//               if (e.key === "Enter" && !e.shiftKey) {
//                 e.preventDefault();
//                 handleSend();
//               }
//             }}
//             placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
//             rows={2}
//             className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//           />
//           <button
//             onClick={handleSend}
//             disabled={sending || !input.trim()}
//             className="px-4 self-end py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
//           >
//             {sending ? "…" : "Send"}
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }

// export default function BidDetailsPage() {
//   const params = useParams();
//   const router = useRouter();
//   const { data: session, status } = useSession();

//   const [bid, setBid] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [isEditing, setIsEditing] = useState(false);
//   const [updating, setUpdating] = useState(false);
//   const [accepting, setAccepting] = useState(false);
//   const [withdrawing, setWithdrawing] = useState(false);

//   const [updateForm, setUpdateForm] = useState({
//     amount: "",
//     timeline: "",
//     materialsDescription: "",
//     processDescription: "",
//     warrantyInfo: "",
//     paymentTerms: "",
//   });

//   const fetchBid = useCallback(async () => {
//     try {
//       const res = await fetch(`/api/bids/${params.id}`);
//       const data = await res.json();
//       if (data.success && data.bid) {
//         setBid(data.bid);
//         setUpdateForm({
//           amount: data.bid.amount,
//           timeline: data.bid.timeline,
//           materialsDescription: data.bid.materialsDescription || "",
//           processDescription: data.bid.processDescription || "",
//           warrantyInfo: data.bid.warrantyInfo || "",
//           paymentTerms: data.bid.paymentTerms || "",
//         });
//       } else {
//         alert("Error loading bid: " + (data.error || "Unknown error"));
//       }
//     } catch (_) {
//       alert("Error loading bid");
//     } finally {
//       setLoading(false);
//     }
//   }, [params.id]);

//   useEffect(() => {
//     if (status === "unauthenticated") {
//       router.push("/auth/login");
//       return;
//     }
//     if (status === "authenticated") {
//       const role = session.user.role;
//       if (role !== "customer" && role !== "manufacturer") {
//         router.push("/auth/login");
//         return;
//       }
//       fetchBid();
//     }
//   }, [status, router, session, fetchBid]);

//   const handleUpdateBid = async (e) => {
//     e.preventDefault();
//     setUpdating(true);
//     try {
//       const res = await fetch(`/api/bids/${params.id}`, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           amount: Number(updateForm.amount),
//           timeline: Number(updateForm.timeline),
//           materialsDescription: updateForm.materialsDescription,
//           processDescription: updateForm.processDescription,
//           warrantyInfo: updateForm.warrantyInfo,
//           paymentTerms: updateForm.paymentTerms,
//         }),
//       });
//       const data = await res.json();
//       if (data.success) {
//         setIsEditing(false);
//         fetchBid();
//       } else alert("Error: " + data.error);
//     } catch (err) {
//       alert("Error: " + err.message);
//     } finally {
//       setUpdating(false);
//     }
//   };

//   const handleWithdraw = async () => {
//     if (!confirm("Withdraw this bid? This cannot be undone.")) return;
//     setWithdrawing(true);
//     try {
//       const res = await fetch(`/api/bids/${params.id}/withdraw`, {
//         method: "DELETE",
//       });
//       const data = await res.json();
//       if (data.success) fetchBid();
//       else alert("Error: " + data.error);
//     } catch (err) {
//       alert("Error: " + err.message);
//     } finally {
//       setWithdrawing(false);
//     }
//   };

//   const handleAcceptBid = async () => {
//     if (!confirm("Accept this bid? This will close the RFQ.")) return;
//     setAccepting(true);
//     try {
//       const res = await fetch(`/api/rfqs/${bid.rfqId._id}/accept-bid`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ bidId: params.id }),
//       });
//       const data = await res.json();
//       if (data.success) router.push(`/customer/rfqs/${bid.rfqId._id}`);
//       else alert("Error: " + data.error);
//     } catch (err) {
//       alert("Error: " + err.message);
//     } finally {
//       setAccepting(false);
//     }
//   };

//   // Customer ignores a bid — just navigates away (no status change needed,
//   // ignored bids simply stay pending and the customer moves on)
//   const handleIgnore = () => {
//     router.push(`/customer/rfqs/${bid.rfqId._id}`);
//   };

//   if (status === "loading" || loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-blue-50">
//         <div className="flex flex-col items-center gap-3">
//           <div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
//           <p className="text-gray-500 text-sm">Loading…</p>
//         </div>
//       </div>
//     );
//   }

//   if (!bid) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="text-center">
//           <p className="text-xl font-bold text-gray-400 mb-2">Bid not found</p>
//           <button
//             onClick={() => router.back()}
//             className="text-blue-600 hover:underline text-sm"
//           >
//             ← Go back
//           </button>
//         </div>
//       </div>
//     );
//   }

//   const isManufacturer =
//     session.user.role === "manufacturer" &&
//     session.user.id === bid.manufacturerId._id;
//   const isCustomer =
//     session.user.role === "customer" &&
//     session.user.id === bid.rfqId?.customerId;

//   // Access guard — neither the bid's manufacturer nor the RFQ's customer
//   if (!isManufacturer && !isCustomer) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="text-center">
//           <p className="text-xl font-bold text-red-400 mb-2">Access Denied</p>
//           <p className="text-gray-500 text-sm mb-4">
//             You don&apos;t have permission to view this bid.
//           </p>
//           <button
//             onClick={() =>
//               router.push(
//                 session.user.role === "customer"
//                   ? "/customer"
//                   : "/manufacturer/dashboard",
//               )
//             }
//             className="text-blue-600 hover:underline text-sm"
//           >
//             ← Go to Dashboard
//           </button>
//         </div>
//       </div>
//     );
//   }

//   const bidOpen =
//     bid.status !== "accepted" &&
//     bid.status !== "withdrawn" &&
//     bid.status !== "rejected";
//   const rfqActive = bid.rfqId?.status === "active";
//   const canEdit = isManufacturer && bid.status === "pending";
//   const canWithdraw =
//     isManufacturer && bid.status !== "accepted" && bid.status !== "withdrawn";
//   const canAccept = isCustomer && bidOpen && rfqActive;

//   return (
//     <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50/30">
//       {isCustomer ? (
//         <CustomerMainNavbar />
//       ) : (
//         <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
//           <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
//             <div className="flex items-center gap-4">
//               <button
//                 onClick={() => router.back()}
//                 className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors"
//               >
//                 ← Back
//               </button>
//               <div className="w-px h-5 bg-gray-200" />
//               <Link
//                 href="/manufacturer/dashboard"
//                 className="flex items-center gap-2"
//               >
//                 <span className="text-2xl">🔧</span>
//                 <span className="text-lg font-bold text-blue-900">Craftit</span>
//               </Link>
//             </div>
//             <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
//               Manufacturer
//             </span>
//           </div>
//         </header>
//       )}

//       <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
//         {/* Title row */}
//         <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
//           <div>
//             <h1 className="text-2xl font-bold text-gray-900">Bid Details</h1>
//             <p className="text-gray-500 text-sm mt-1">
//               Project:{" "}
//               <span className="font-medium text-gray-700">
//                 {bid.rfqId?.customOrderId?.title || "Custom Order"}
//               </span>
//             </p>
//             <p className="text-gray-400 text-xs mt-0.5">
//               Submitted{" "}
//               {new Date(bid.submittedAt || bid.createdAt).toLocaleDateString(
//                 "en-US",
//                 { year: "numeric", month: "long", day: "numeric" },
//               )}
//             </p>
//           </div>
//           <StatusBadge status={bid.status} />
//         </div>

//         {/* Manufacturer info — shown to customer only */}
//         {isCustomer && (
//           <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
//             <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
//               Manufacturer
//             </h2>
//             <div className="flex items-start justify-between">
//               <div>
//                 <div className="flex items-center gap-2">
//                   <p className="text-lg font-semibold text-gray-900">
//                     {bid.manufacturerId?.businessName ||
//                       bid.manufacturerId?.name}
//                   </p>
//                   {bid.manufacturerId?.verificationStatus === "verified" && (
//                     <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
//                       ✓ Verified
//                     </span>
//                   )}
//                 </div>
//                 <p className="text-gray-500 text-sm mt-0.5">
//                   {bid.manufacturerId?.email}
//                 </p>
//               </div>
//               {bid.manufacturerId?.stats && (
//                 <div className="flex gap-4 text-sm text-right">
//                   <div>
//                     <p className="text-gray-400 text-xs">Rating</p>
//                     <p className="font-bold text-gray-800">
//                       ⭐ {bid.manufacturerId.stats.averageRating || 0}/5
//                     </p>
//                   </div>
//                   <div>
//                     <p className="text-gray-400 text-xs">Orders</p>
//                     <p className="font-bold text-gray-800">
//                       {bid.manufacturerId.stats.completedOrders || 0}
//                     </p>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         )}

//         {/* Bid details card */}
//         <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
//           <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
//             <h2 className="text-base font-semibold text-gray-800">
//               Bid Details
//             </h2>
//             {canEdit && !isEditing && (
//               <button
//                 onClick={() => setIsEditing(true)}
//                 className="text-sm font-semibold text-blue-600 hover:text-blue-800"
//               >
//                 Edit Bid
//               </button>
//             )}
//           </div>
//           <div className="p-6">
//             {isEditing ? (
//               <form onSubmit={handleUpdateBid} className="space-y-4">
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-sm font-semibold mb-1.5 text-gray-700">
//                       Bid Amount ($) *
//                     </label>
//                     <input
//                       type="number"
//                       value={updateForm.amount}
//                       required
//                       min="0"
//                       step="0.01"
//                       onChange={(e) =>
//                         setUpdateForm({ ...updateForm, amount: e.target.value })
//                       }
//                       className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-semibold mb-1.5 text-gray-700">
//                       Timeline (Days) *
//                     </label>
//                     <input
//                       type="number"
//                       value={updateForm.timeline}
//                       required
//                       min="1"
//                       onChange={(e) =>
//                         setUpdateForm({
//                           ...updateForm,
//                           timeline: e.target.value,
//                         })
//                       }
//                       className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//                     />
//                   </div>
//                 </div>
//                 <div>
//                   <label className="block text-sm font-semibold mb-1.5 text-gray-700">
//                     Materials Description
//                   </label>
//                   <textarea
//                     value={updateForm.materialsDescription}
//                     rows={3}
//                     onChange={(e) =>
//                       setUpdateForm({
//                         ...updateForm,
//                         materialsDescription: e.target.value,
//                       })
//                     }
//                     className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-semibold mb-1.5 text-gray-700">
//                     Process Description
//                   </label>
//                   <textarea
//                     value={updateForm.processDescription}
//                     rows={3}
//                     onChange={(e) =>
//                       setUpdateForm({
//                         ...updateForm,
//                         processDescription: e.target.value,
//                       })
//                     }
//                     className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
//                   />
//                 </div>
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-sm font-semibold mb-1.5 text-gray-700">
//                       Warranty Info
//                     </label>
//                     <textarea
//                       value={updateForm.warrantyInfo}
//                       rows={2}
//                       onChange={(e) =>
//                         setUpdateForm({
//                           ...updateForm,
//                           warrantyInfo: e.target.value,
//                         })
//                       }
//                       className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-semibold mb-1.5 text-gray-700">
//                       Payment Terms
//                     </label>
//                     <textarea
//                       value={updateForm.paymentTerms}
//                       rows={2}
//                       onChange={(e) =>
//                         setUpdateForm({
//                           ...updateForm,
//                           paymentTerms: e.target.value,
//                         })
//                       }
//                       className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
//                     />
//                   </div>
//                 </div>
//                 <div className="flex gap-3 pt-1">
//                   <button
//                     type="submit"
//                     disabled={updating}
//                     className="px-5 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 disabled:bg-orange-300 transition-colors"
//                   >
//                     {updating ? "Saving…" : "Save Changes"}
//                   </button>
//                   <button
//                     type="button"
//                     onClick={() => setIsEditing(false)}
//                     className="px-5 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
//                   >
//                     Cancel
//                   </button>
//                 </div>
//               </form>
//             ) : (
//               <div className="space-y-5">
//                 <div className="grid grid-cols-2 gap-6">
//                   <div>
//                     <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
//                       Bid Amount
//                     </p>
//                     <p className="text-3xl font-bold text-orange-600">
//                       ${bid.amount?.toLocaleString()}
//                     </p>
//                   </div>
//                   <div>
//                     <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
//                       Timeline
//                     </p>
//                     <p className="text-3xl font-bold text-gray-800">
//                       {bid.timeline}{" "}
//                       <span className="text-lg text-gray-400 font-normal">
//                         days
//                       </span>
//                     </p>
//                   </div>
//                 </div>

//                 {bid.costBreakdown &&
//                   Object.values(bid.costBreakdown).some(Boolean) && (
//                     <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
//                       <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
//                         Cost Breakdown
//                       </p>
//                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
//                         {["materials", "labor", "overhead", "profit"].map(
//                           (key) =>
//                             bid.costBreakdown[key] != null ? (
//                               <div key={key}>
//                                 <p className="text-gray-400 capitalize">
//                                   {key}
//                                 </p>
//                                 <p className="font-semibold text-gray-800">
//                                   ${bid.costBreakdown[key].toLocaleString()}
//                                 </p>
//                               </div>
//                             ) : null,
//                         )}
//                       </div>
//                     </div>
//                   )}

//                 {bid.materialsDescription && (
//                   <div>
//                     <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
//                       Materials
//                     </p>
//                     <p className="text-gray-700 text-sm whitespace-pre-wrap">
//                       {bid.materialsDescription}
//                     </p>
//                   </div>
//                 )}
//                 {bid.processDescription && (
//                   <div>
//                     <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
//                       Manufacturing Process
//                     </p>
//                     <p className="text-gray-700 text-sm whitespace-pre-wrap">
//                       {bid.processDescription}
//                     </p>
//                   </div>
//                 )}
//                 {bid.warrantyInfo && (
//                   <div>
//                     <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
//                       Warranty
//                     </p>
//                     <p className="text-gray-700 text-sm">{bid.warrantyInfo}</p>
//                   </div>
//                 )}
//                 {bid.paymentTerms && (
//                   <div>
//                     <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
//                       Payment Terms
//                     </p>
//                     <p className="text-gray-700 text-sm">{bid.paymentTerms}</p>
//                   </div>
//                 )}
//                 {bid.proposedMilestones?.length > 0 && (
//                   <div>
//                     <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
//                       Proposed Milestones
//                     </p>
//                     <div className="space-y-2">
//                       {bid.proposedMilestones.map((m, i) => (
//                         <div
//                           key={i}
//                           className="flex items-start gap-3 text-sm bg-blue-50 border border-blue-100 rounded-lg px-3 py-2"
//                         >
//                           <span className="font-bold text-blue-600 min-w-5">
//                             {i + 1}.
//                           </span>
//                           <div>
//                             <p className="font-semibold text-gray-800">
//                               {m.name}
//                             </p>
//                             {m.description && (
//                               <p className="text-gray-500">{m.description}</p>
//                             )}
//                             {m.duration && (
//                               <p className="text-gray-400 text-xs mt-0.5">
//                                 {m.duration} days
//                               </p>
//                             )}
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 )}
//                 {bid.questions && (
//                   <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
//                     <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
//                       Questions from Manufacturer
//                     </p>
//                     <p className="text-gray-700 text-sm whitespace-pre-wrap">
//                       {bid.questions}
//                     </p>
//                   </div>
//                 )}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Chat */}
//         <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
//           <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
//             <h2 className="text-base font-semibold text-gray-800">
//               Chat with {isManufacturer ? "Customer" : "Manufacturer"}
//             </h2>
//             <p className="text-xs text-gray-400 mt-0.5">
//               Use this chat to negotiate details before the manufacturer updates
//               the bid
//             </p>
//           </div>
//           <div className="p-6">
//             <ChatPanel
//               bidId={params.id}
//               session={session}
//               bidStatus={bid.status}
//             />
//           </div>
//         </div>

//         {/* Action buttons */}
//         <div className="flex flex-wrap gap-3 pb-8">
//           <button
//             onClick={() => router.back()}
//             className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors"
//           >
//             ← Back
//           </button>

//           {/* Customer: Accept */}
//           {canAccept && (
//             <button
//               onClick={handleAcceptBid}
//               disabled={accepting}
//               className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:bg-emerald-300 transition-colors shadow-sm"
//             >
//               {accepting ? "Accepting…" : "✓ Accept Bid"}
//             </button>
//           )}

//           {/* Customer: Ignore — just go back to the bids list, no status change */}
//           {isCustomer && bidOpen && (
//             <button
//               onClick={handleIgnore}
//               className="px-5 py-2.5 bg-gray-100 text-gray-500 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors"
//             >
//               Ignore for Now
//             </button>
//           )}

//           {/* Manufacturer: Withdraw */}
//           {canWithdraw && (
//             <button
//               onClick={handleWithdraw}
//               disabled={withdrawing}
//               className="px-5 py-2.5 border border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 disabled:opacity-50 transition-colors"
//             >
//               {withdrawing ? "Withdrawing…" : "Withdraw Bid"}
//             </button>
//           )}
//         </div>
//       </main>
//     </div>
//   );
// }
