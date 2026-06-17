// app/bids/[id]/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import CustomerMainNavbar from "@/components/CustomerMainNavbar";
import ManufacturerNavbar from "@/components/ManufacturerNavbar";
import ManufacturerSidebar from "@/components/ManufacturerSidebar";
import CustomerSidebar from "@/components/CustomerSidebar";
import ModelViewerPreview from "@/modules/components/ModelViewerPreview";
import { useToast } from "@/components/ui/ToastProvider";
import { formatPKR } from "@/lib/currency";
import { useDialog } from "@/components/ui/DialogProvider";

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
      {status === "under_consideration"
        ? "PENDING"
        : status?.toUpperCase()?.replace(/_/g, " ")}
    </span>
  );
}

function ChatPanel({ bidId, session, bidStatus, toast }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingChat, setLoadingChat] = useState(true);
  const scrollRef = useRef(null);
  const lastTimestampRef = useRef(null);
  const isClosed = bidStatus === "withdrawn" || bidStatus === "rejected";

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

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
    const refreshVisible = () => {
      if (document.visibilityState === "visible") fetchMessages(false);
    };

    fetchMessages(true);
    if (!isClosed) {
      const stream = new EventSource(`/api/bids/${bidId}/chat/stream`);
      stream.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type !== "message" || !data.message) return;

          setMessages((prev) => {
            if (prev.some((m) => String(m._id) === String(data.message._id))) {
              return prev;
            }
            return [...prev, data.message];
          });
          lastTimestampRef.current = data.message.createdAt;

          if (document.visibilityState === "visible") {
            fetchMessages(false);
          }
        } catch (_) {}
      };

      window.addEventListener("focus", refreshVisible);
      document.addEventListener("visibilitychange", refreshVisible);
      return () => {
        stream.close();
        window.removeEventListener("focus", refreshVisible);
        document.removeEventListener("visibilitychange", refreshVisible);
      };
    }

    return () => {
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [bidId, fetchMessages, isClosed]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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
        setMessages((prev) => {
          if (prev.some((m) => String(m._id) === String(data.message._id))) {
            return prev;
          }
          return [...prev, data.message];
        });
        lastTimestampRef.current = data.message.createdAt;
        setInput("");
      } else toast.error(data.error || "Failed to send");
    } catch (_) {
      toast.error("Error sending message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-96">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#050507] rounded-xl border border-white/8"
      >
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
            const isMine = msg.senderId === session?.user?.id;
            const isReadByOther =
              isMine &&
              Array.isArray(msg.readBy) &&
              msg.readBy.some(
                (entry) => String(entry?.userId) !== String(session?.user?.id),
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
  const toast = useToast();
  const dialog = useDialog();

  const [bid, setBid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Scroll to chat if hash is present
  useEffect(() => {
    if (window.location.hash === "#chat") {
      setTimeout(() => {
        const element = document.getElementById("chat-section");
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 500);
    }
  }, []);
  const [accepting, setAccepting] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
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
      } else
        toast.error("Error loading bid: " + (data.error || "Unknown error"));
    } catch (_) {
      toast.error("Error loading bid");
    } finally {
      setLoading(false);
    }
  }, [params.id, toast]);

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
      } else toast.error("Error: " + data.error);
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleWithdraw = async () => {
    if (!(await dialog.confirm("Withdraw Bid", "Withdraw this bid? This cannot be undone."))) return;
    setWithdrawing(true);
    try {
      const res = await fetch(`/api/bids/${params.id}/withdraw`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) fetchBid();
      else toast.error("Error: " + data.error);
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setWithdrawing(false);
    }
  };

  const handleAcceptBid = async () => {
    setShowAcceptConfirm(false);
    setAccepting(true);
    try {
      const res = await fetch(`/api/rfqs/${bid.rfqId._id}/accept-bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidId: params.id }),
      });
      const data = await res.json();
      if (data.success) router.push(`/customer/rfqs/${bid.rfqId._id}`);
      else toast.error("Error: " + data.error);
    } catch (err) {
      toast.error("Error: " + err.message);
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
        <GlobalLoader text="Loading bid..." />
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
    session?.user?.role === "manufacturer" &&
    session?.user?.id === bid?.manufacturerId?._id;
  const isCustomer =
    session?.user?.role === "customer" &&
    session?.user?.id === bid?.rfqId?.customerId;

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
    bid.status !== "withdrawn";
  const rfqActive = bid.rfqId?.status === "active";
  const canEdit = isManufacturer && bid.status === "pending";
  const canWithdraw =
    isManufacturer && bid.status !== "accepted" && bid.status !== "withdrawn";
  const canAccept = isCustomer && bidOpen && rfqActive;
  
  const rfq = bid.rfqId;
  const isPartRFQ = rfq?.isPartRFQ;
  const partData = isPartRFQ && rfq?.customOrderId?.parts ? rfq.customOrderId.parts.find(p => p._id === rfq.partId) : null;
  
  const partModel3D = isPartRFQ && partData?.model3D?.url ? partData.model3D : null;
  let mainModel3D = rfq?.customOrderId?.model3D?.url ? rfq.customOrderId.model3D : null;

  if (isPartRFQ && partData && mainModel3D) {
    mainModel3D = {
      ...mainModel3D,
      annotations: (mainModel3D.annotations || []).filter((a) =>
        (partData.annotationIds || []).includes(a.id)
      ),
      measurements: (mainModel3D.measurements || []).filter((m) =>
        (partData.measurementIds || []).includes(m.id)
      ),
    };
  }

  const partImages = isPartRFQ && partData?.images?.length ? partData.images.map(img => ({ ...img, sourceLabel: "Part's Media" })) : [];
  const mainImages = (rfq?.customOrderId?.images || []).map(img => ({ ...img, sourceLabel: "Main Order's Media" }));
  const partFiles = isPartRFQ && partData?.files?.length ? partData.files : [];
  const mainFiles = rfq?.customOrderId?.files || [];

  const artifactFiles = [
    partModel3D && {
      label: partModel3D.filename || "Part's 3D model",
      url: partModel3D.url,
      type: "Part 3D Model",
    },
    mainModel3D && {
      label: mainModel3D.filename || "Main Order's 3D model",
      url: mainModel3D.url,
      type: "Main 3D Model",
    },
    ...partImages.map((img, idx) => ({
      label: img.filename || img.caption || `Part Image ${idx + 1}`,
      url: img.url,
      type: "Part Image",
    })),
    ...mainImages.map((img, idx) => ({
      label: img.filename || img.caption || `Main Order Image ${idx + 1}`,
      url: img.url,
      type: "Main Image",
    })),
    ...partFiles.map((file, idx) => ({
      label: file.filename || `Part File ${idx + 1}`,
      url: file.url,
      type: "Part Document",
    })),
    ...mainFiles.map((file, idx) => ({
      label: file.filename || `Main File ${idx + 1}`,
      url: file.url,
      type: "Main Document",
    })),
  ].filter(Boolean);

  const PageContent = (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 pb-12 space-y-5">
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

      {isManufacturer && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-bold text-amber-200">
          {bid.status === "accepted"
            ? "This bid was accepted and converted into an order."
            : "This bid is a binding commitment if accepted by the customer."}
        </div>
      )}

      {/* Manufacturer Info — customer only */}
      {isCustomer && (
        <div className="rounded-2xl border border-white/8 bg-[#0c0c11] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-4">
            Manufacturer
          </p>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href={`/manufacturers/${bid.manufacturerId?._id}`}
                  className="text-base font-bold text-white/85 hover:text-[#eb9728] transition-colors"
                >
                  {bid.manufacturerId?.businessName || bid.manufacturerId?.name}
                </Link>
                {bid.manufacturerId?.verificationStatus === "verified" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                    <span className="material-symbols-outlined text-[11px]">
                      verified
                    </span>
                    Verified
                  </span>
                )}
              </div>
              <p className="text-sm text-white/35">Manufacturer profile</p>
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
                  <label className={labelClass}>Bid Amount (PKR) *</label>
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
                    {formatPKR(bid.amount)}
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
                                {formatPKR(bid.costBreakdown[key])}
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

              {bid.attachments?.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="material-symbols-outlined text-[13px] text-purple-400">
                      attachment
                    </span>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-purple-400">
                      Bid Attachments
                    </p>
                  </div>
                  {bid.attachments.map((file, i) => (
                    <a
                      key={i}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 hover:border-purple-500/30 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-purple-400 text-[18px]">
                          description
                        </span>
                        <span className="min-w-0 block truncate text-xs font-bold text-white/75 group-hover:text-purple-300">
                          {file.filename || "Attachment " + (i + 1)}
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-sm text-purple-400">
                        download
                      </span>
                    </a>
                  ))}
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

      {artifactFiles.length > 0 && (
        <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#eb9728]">
                folder_open
              </span>
              RFQ Associated Files
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {artifactFiles.map((file) => (
                <a
                  key={file.url}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 hover:border-[#eb9728]/30 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-white/75">
                      {file.label}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/25">
                      {file.type}
                    </span>
                  </span>
                  <span className="material-symbols-outlined text-[#eb9728]">
                    download
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat */}
      <div
        id="chat-section"
        className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden"
      >
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
            toast={toast}
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
            onClick={() => setShowAcceptConfirm(true)}
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

      {showAcceptConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c0c11] p-6 shadow-2xl">
            <h2 className="text-lg font-black text-white">Accept Proposal?</h2>
            <p className="mt-2 text-sm leading-6 text-white/50">
              This will close the RFQ and convert the accepted proposal into an
              order.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowAcceptConfirm(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm font-bold text-white/60 hover:bg-white/[0.07]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAcceptBid}
                disabled={accepting}
                className="flex-1 rounded-xl border border-emerald-500/20 bg-emerald-500/15 py-2.5 text-sm font-bold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
              >
                {accepting ? "Accepting..." : "Accept Proposal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );

  if (isManufacturer) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-[#050507] text-white">
        <ManufacturerNavbar />
        <div className="flex flex-1 overflow-hidden">
          <ManufacturerSidebar />
          <div className="flex-1 min-w-0 overflow-y-auto bg-[#050507]">
            {PageContent}
          </div>
        </div>
      </div>
    );
  }

  if (isCustomer) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-[#050507] text-white">
        <CustomerMainNavbar />
        <div className="flex flex-1 overflow-hidden">
          <CustomerSidebar />
          <div className="flex-1 min-w-0 overflow-y-auto bg-[#050507]">
            {PageContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">{PageContent}</div>
  );
}
