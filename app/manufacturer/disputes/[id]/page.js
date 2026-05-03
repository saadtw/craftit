// app/manufacturer/disputes/[id]/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

const STATUS_COLORS = {
  open: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  manufacturer_responded: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  under_review: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  resolved: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  closed: "bg-white/5 text-white/40 border border-white/10",
};

const RESOLUTION_LABELS = {
  refund_customer: "Refund issued to customer",
  side_with_manufacturer: "Resolved in your favour",
  partial_resolution: "Partial refund issued",
};

export default function ManufacturerDisputeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [responseForm, setResponseForm] = useState({ comment: "" });
  const [error, setError] = useState("");

  const fetchDispute = useCallback(async () => {
    try {
      const res = await fetch(`/api/disputes/${id}`);
      const data = await res.json();
      if (data.dispute) setDispute(data.dispute);
      else router.push("/manufacturer/disputes");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated") {
      if (session.user.role !== "manufacturer") {
        router.push("/auth/login");
        return;
      }
      fetchDispute();
    }
  }, [status, session, router, fetchDispute]);

  const submitResponse = async () => {
    if (
      !responseForm.comment.trim() ||
      responseForm.comment.trim().length < 20
    ) {
      setError("Please provide a detailed response (at least 20 characters).");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/disputes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manufacturer_respond",
          comment: responseForm.comment.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDispute(data.dispute);
      } else {
        setError(data.error || "Failed to submit response.");
      }
    } catch (err) {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || loading) {
    return <GlobalLoader fullScreen text="Loading dispute details..." />;
  }

  if (!dispute) return null;

  const hasResponded = !!dispute.manufacturerResponse?.comment;
  const isResolved = ["resolved", "closed"].includes(dispute.status);

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 pb-12">
        {/* Header / Breadcrumbs */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/manufacturer/disputes"
            className="flex items-center gap-4 group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] group-hover:scale-110 transition-all">
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-white transition-colors pt-0.5">
              Back to Disputes
            </span>
          </Link>
          
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-xs font-black text-white/40 uppercase tracking-tighter">
              CASE: {dispute.disputeNumber}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${STATUS_COLORS[dispute.status] || "bg-white/5 text-white/40"}`}
            >
              {dispute.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Customer complaint */}
          <div className="bg-white/[0.03] rounded-3xl border-2 border-purple-500/30 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
              <h2 className="text-sm font-black uppercase tracking-widest text-[#eb9728]">
                Customer Complaint
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1.5">Issue type</p>
                  <p className="text-base font-bold text-white capitalize">
                    {dispute.issueType?.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1.5">
                    Desired resolution
                  </p>
                  <p className="text-base font-bold text-white capitalize">
                    {dispute.desiredResolution?.replace(/_/g, " ")}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">
                  Customer Description
                </p>
                <div className="bg-white/[0.03] rounded-2xl p-5 border border-white/5 text-sm text-white/70 leading-relaxed italic">
                  &quot;{dispute.description}&quot;
                </div>
              </div>

              {dispute.customerEvidence?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-3">
                    Evidence Files
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    {dispute.customerEvidence.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:bg-blue-500/10 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">attachment</span>
                        File {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order reference */}
          <div className="bg-white/[0.03] rounded-3xl border-2 border-purple-500/30 p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-12 w-12 rounded-2xl bg-[#eb9728]/10 border border-[#eb9728]/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#eb9728]">shopping_cart</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Linked Order</p>
                <p className="text-lg font-black text-white">
                  {dispute.orderId?.orderNumber}
                </p>
                <p className="text-xs text-white/40">
                  Customer: {dispute.customerId?.name}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <p className="text-2xl font-black text-[#eb9728]">
                ${dispute.orderId?.totalPrice?.toLocaleString()}
              </p>
              <Link
                href={`/manufacturer/orders/${dispute.orderId?._id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/70 hover:bg-[#eb9728]/10 hover:border-[#eb9728]/30 hover:text-[#eb9728] hover:shadow-[0_0_15px_rgba(235,151,40,0.15)] transition-all"
              >
                View Full Order Detail
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          </div>

          {/* Your response */}
          {!isResolved && (
            <div className="bg-white/[0.03] rounded-3xl border-2 border-purple-500/30 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                <h2 className="text-sm font-black uppercase tracking-widest text-purple-400">
                  {hasResponded ? "Your Response (Submitted)" : "Manufacturer Response"}
                </h2>
              </div>

              <div className="p-6">
                {hasResponded ? (
                  <div className="space-y-4">
                    <div className="bg-blue-500/5 rounded-2xl p-5 border border-blue-500/20 text-sm text-white/70 leading-relaxed">
                      {dispute.manufacturerResponse.comment}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                        Submitted on {new Date(dispute.manufacturerResponse.respondedAt).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-2 text-blue-400">
                        <span className="material-symbols-outlined text-sm animate-pulse">visibility</span>
                        <p className="text-[10px] font-bold uppercase tracking-widest">
                          Awaiting Admin Review
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
                      <p className="text-sm text-white/60 leading-relaxed">
                        Please provide your detailed perspective on this situation. An admin will review both parties&apos; input within <span className="font-bold text-[#eb9728]">48 hours</span> to make a final decision.
                      </p>
                    </div>
                    
                    <div className="relative group">
                      <textarea
                        value={responseForm.comment}
                        onChange={(e) => setResponseForm({ comment: e.target.value })}
                        rows={6}
                        placeholder="Explain what happened from your perspective. Include any relevant details about production, delivery, and previous communication..."
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.05] transition-all resize-none"
                      />
                      <div className="absolute bottom-4 right-4 text-[9px] font-bold text-white/20 uppercase">
                        {responseForm.comment.length} / 20 min
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 text-red-400 bg-red-400/5 p-3 rounded-xl border border-red-400/10">
                        <span className="material-symbols-outlined text-sm">error</span>
                        <p className="text-xs font-bold">{error}</p>
                      </div>
                    )}

                    <button
                      onClick={submitResponse}
                      disabled={submitting}
                      className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:scale-[1.01] transition-all disabled:opacity-50"
                    >
                      {submitting ? "Processing Submission..." : "Submit Case Response"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resolution */}
          {isResolved && dispute.resolution && (
            <div
              className={`rounded-3xl border-2 p-8 ${
                dispute.resolution === "refund_customer" 
                  ? "bg-red-500/5 border-red-500/20" 
                  : dispute.resolution === "side_with_manufacturer" 
                    ? "bg-emerald-500/5 border-emerald-500/20" 
                    : "bg-blue-500/5 border-blue-500/20"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-2xl">
                  {dispute.resolution === "refund_customer" ? "error" : "verified"}
                </span>
                <h2 className="text-xl font-black uppercase tracking-widest">
                  Final Resolution
                </h2>
              </div>
              
              <p className="text-lg font-bold mb-3">
                {RESOLUTION_LABELS[dispute.resolution]}
              </p>
              
              {dispute.resolutionMessage && (
                <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/5 text-sm text-white/60 leading-relaxed mb-4">
                  {dispute.resolutionMessage}
                </div>
              )}
              
              <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-6 border-t border-white/5">
                <div className="flex items-center gap-8">
                  {dispute.resolutionAmount && (
                    <div>
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Adjustment Amount</p>
                      <p className="text-xl font-black text-white">
                        ${dispute.resolutionAmount.toLocaleString()}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Resolved On</p>
                    <p className="text-xl font-black text-white/70">
                      {new Date(dispute.resolvedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="px-4 py-2 bg-white/5 rounded-full border border-white/10 text-[10px] font-bold uppercase tracking-widest">
                  Case Closed
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
