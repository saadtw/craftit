"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

function StatusBadge({ status }) {
  const styles = {
    accepted: "bg-emerald-100 text-emerald-800 border-emerald-200",
    under_consideration: "bg-amber-100 text-amber-800 border-amber-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    withdrawn: "bg-gray-100 text-gray-600 border-gray-200",
    pending: "bg-blue-100 text-blue-800 border-blue-200",
  };
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || "bg-gray-100 text-gray-800"}`}
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
        if (data.success && data.messages.length > 0) {
          if (initial) {
            setMessages(data.messages);
          } else {
            setMessages((prev) => [...prev, ...data.messages]);
          }
          lastTimestampRef.current =
            data.messages[data.messages.length - 1].createdAt;
        }
      } catch (_) {
        // silent fail on poll
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
      } else {
        alert(data.error || "Failed to send");
      }
    } catch (_) {
      alert("Error sending message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-96">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 rounded-lg border border-gray-200">
        {loadingChat ? (
          <p className="text-center text-gray-400 text-sm pt-8">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-400 text-sm pt-8">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === session.user.id;
            return (
              <div
                key={msg._id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    isMine
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
                  }`}
                >
                  {!isMine && (
                    <p className="text-[10px] font-semibold mb-1 opacity-50 capitalize">
                      {msg.senderRole}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap wrap-break-word">
                    {msg.message}
                  </p>
                  <p
                    className={`text-[10px] mt-1 text-right ${isMine ? "text-blue-200" : "text-gray-400"}`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {isClosed ? (
        <p className="text-center text-sm text-gray-400 mt-3 py-2 bg-gray-100 rounded-lg">
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
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="px-4 self-end py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? "…" : "Send"}
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
      } else {
        alert("Error loading bid: " + (data.error || "Unknown error"));
      }
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
        method: "POST",
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

  // Customer ignores a bid — just navigates away (no status change needed,
  // ignored bids simply stay pending and the customer moves on)
  const handleIgnore = () => {
    router.push(`/customer/rfqs/${bid.rfqId._id}`);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-blue-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!bid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold text-gray-400 mb-2">Bid not found</p>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:underline text-sm"
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

  // Access guard — neither the bid's manufacturer nor the RFQ's customer
  if (!isManufacturer && !isCustomer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold text-red-400 mb-2">Access Denied</p>
          <p className="text-gray-500 text-sm mb-4">
            You don&apos;t have permission to view this bid.
          </p>
          <button
            onClick={() =>
              router.push(
                session.user.role === "customer"
                  ? "/customer/dashboard"
                  : "/manufacturer/dashboard",
              )
            }
            className="text-blue-600 hover:underline text-sm"
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

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors"
            >
              ← Back
            </button>
            <div className="w-px h-5 bg-gray-200" />
            <Link
              href={
                isManufacturer
                  ? "/manufacturer/dashboard"
                  : "/customer/dashboard"
              }
              className="flex items-center gap-2"
            >
              <span className="text-2xl">🔧</span>
              <span className="text-lg font-bold text-blue-900">Craftit</span>
            </Link>
          </div>
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
            {isManufacturer ? "Manufacturer" : "Customer"}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bid Details</h1>
            <p className="text-gray-500 text-sm mt-1">
              Project:{" "}
              <span className="font-medium text-gray-700">
                {bid.rfqId?.customOrderId?.title || "Custom Order"}
              </span>
            </p>
            <p className="text-gray-400 text-xs mt-0.5">
              Submitted{" "}
              {new Date(bid.submittedAt || bid.createdAt).toLocaleDateString(
                "en-US",
                { year: "numeric", month: "long", day: "numeric" },
              )}
            </p>
          </div>
          <StatusBadge status={bid.status} />
        </div>

        {/* Manufacturer info — shown to customer only */}
        {isCustomer && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Manufacturer
            </h2>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold text-gray-900">
                    {bid.manufacturerId?.businessName ||
                      bid.manufacturerId?.name}
                  </p>
                  {bid.manufacturerId?.verificationStatus === "verified" && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                      ✓ Verified
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-sm mt-0.5">
                  {bid.manufacturerId?.email}
                </p>
              </div>
              {bid.manufacturerId?.stats && (
                <div className="flex gap-4 text-sm text-right">
                  <div>
                    <p className="text-gray-400 text-xs">Rating</p>
                    <p className="font-bold text-gray-800">
                      ⭐ {bid.manufacturerId.stats.averageRating || 0}/5
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Orders</p>
                    <p className="font-bold text-gray-800">
                      {bid.manufacturerId.stats.completedOrders || 0}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bid details card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">
              Bid Details
            </h2>
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm font-semibold text-blue-600 hover:text-blue-800"
              >
                Edit Bid
              </button>
            )}
          </div>
          <div className="p-6">
            {isEditing ? (
              <form onSubmit={handleUpdateBid} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5 text-gray-700">
                      Bid Amount ($) *
                    </label>
                    <input
                      type="number"
                      value={updateForm.amount}
                      required
                      min="0"
                      step="0.01"
                      onChange={(e) =>
                        setUpdateForm({ ...updateForm, amount: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5 text-gray-700">
                      Timeline (Days) *
                    </label>
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
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-gray-700">
                    Materials Description
                  </label>
                  <textarea
                    value={updateForm.materialsDescription}
                    rows={3}
                    onChange={(e) =>
                      setUpdateForm({
                        ...updateForm,
                        materialsDescription: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-gray-700">
                    Process Description
                  </label>
                  <textarea
                    value={updateForm.processDescription}
                    rows={3}
                    onChange={(e) =>
                      setUpdateForm({
                        ...updateForm,
                        processDescription: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5 text-gray-700">
                      Warranty Info
                    </label>
                    <textarea
                      value={updateForm.warrantyInfo}
                      rows={2}
                      onChange={(e) =>
                        setUpdateForm({
                          ...updateForm,
                          warrantyInfo: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5 text-gray-700">
                      Payment Terms
                    </label>
                    <textarea
                      value={updateForm.paymentTerms}
                      rows={2}
                      onChange={(e) =>
                        setUpdateForm({
                          ...updateForm,
                          paymentTerms: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-5 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 disabled:bg-orange-300 transition-colors"
                  >
                    {updating ? "Saving…" : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-5 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
                      Bid Amount
                    </p>
                    <p className="text-3xl font-bold text-orange-600">
                      ${bid.amount?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
                      Timeline
                    </p>
                    <p className="text-3xl font-bold text-gray-800">
                      {bid.timeline}{" "}
                      <span className="text-lg text-gray-400 font-normal">
                        days
                      </span>
                    </p>
                  </div>
                </div>

                {bid.costBreakdown &&
                  Object.values(bid.costBreakdown).some(Boolean) && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Cost Breakdown
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        {["materials", "labor", "overhead", "profit"].map(
                          (key) =>
                            bid.costBreakdown[key] != null ? (
                              <div key={key}>
                                <p className="text-gray-400 capitalize">
                                  {key}
                                </p>
                                <p className="font-semibold text-gray-800">
                                  ${bid.costBreakdown[key].toLocaleString()}
                                </p>
                              </div>
                            ) : null,
                        )}
                      </div>
                    </div>
                  )}

                {bid.materialsDescription && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Materials
                    </p>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">
                      {bid.materialsDescription}
                    </p>
                  </div>
                )}
                {bid.processDescription && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Manufacturing Process
                    </p>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">
                      {bid.processDescription}
                    </p>
                  </div>
                )}
                {bid.warrantyInfo && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Warranty
                    </p>
                    <p className="text-gray-700 text-sm">{bid.warrantyInfo}</p>
                  </div>
                )}
                {bid.paymentTerms && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Payment Terms
                    </p>
                    <p className="text-gray-700 text-sm">{bid.paymentTerms}</p>
                  </div>
                )}
                {bid.proposedMilestones?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Proposed Milestones
                    </p>
                    <div className="space-y-2">
                      {bid.proposedMilestones.map((m, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 text-sm bg-blue-50 border border-blue-100 rounded-lg px-3 py-2"
                        >
                          <span className="font-bold text-blue-600 min-w-5">
                            {i + 1}.
                          </span>
                          <div>
                            <p className="font-semibold text-gray-800">
                              {m.name}
                            </p>
                            {m.description && (
                              <p className="text-gray-500">{m.description}</p>
                            )}
                            {m.duration && (
                              <p className="text-gray-400 text-xs mt-0.5">
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
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
                      Questions from Manufacturer
                    </p>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">
                      {bid.questions}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-base font-semibold text-gray-800">
              Chat with {isManufacturer ? "Customer" : "Manufacturer"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Use this chat to negotiate details before the manufacturer updates
              the bid
            </p>
          </div>
          <div className="p-6">
            <ChatPanel
              bidId={params.id}
              session={session}
              bidStatus={bid.status}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 pb-8">
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors"
          >
            ← Back
          </button>

          {/* Customer: Accept */}
          {canAccept && (
            <button
              onClick={handleAcceptBid}
              disabled={accepting}
              className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:bg-emerald-300 transition-colors shadow-sm"
            >
              {accepting ? "Accepting…" : "✓ Accept Bid"}
            </button>
          )}

          {/* Customer: Ignore — just go back to the bids list, no status change */}
          {isCustomer && bidOpen && (
            <button
              onClick={handleIgnore}
              className="px-5 py-2.5 bg-gray-100 text-gray-500 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors"
            >
              Ignore for Now
            </button>
          )}

          {/* Manufacturer: Withdraw */}
          {canWithdraw && (
            <button
              onClick={handleWithdraw}
              disabled={withdrawing}
              className="px-5 py-2.5 border border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {withdrawing ? "Withdrawing…" : "Withdraw Bid"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
