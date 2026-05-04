// app/admin/disputes/[id]/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FiShield, FiAlertCircle, FiArrowLeft } from "react-icons/fi";
import buyerIcon from "@/assets/Buyer.png";
import sellerIcon from "@/assets/Seller.png";
import documentIcon from "@/assets/document.png";

export default function AdminDisputeDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);

  // Resolution form state
  const [resolution, setResolution] = useState("refund_customer");
  const [refundAmount, setRefundAmount] = useState("");
  const [resolutionMessage, setResolutionMessage] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const fetchDispute = useCallback(async () => {
    try {
      const res = await fetch(`/api/disputes/${id}`);
      const data = await res.json();
      if (data.dispute) setDispute(data.dispute);
    } catch (err) {
      console.error(err);
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
      fetchDispute();
    }
  }, [status, session, router, fetchDispute]);

  const handleResolve = async () => {
    if (!resolutionMessage.trim()) {
      alert("Resolution message is required.");
      return;
    }
    if (resolution === "refund_customer" && !refundAmount) {
      alert("Please enter the refund amount.");
      return;
    }

    setResolving(true);
    try {
      const body = {
        action: "admin_resolve",
        resolution,
        resolutionMessage,
        adminNotes,
      };
      if (
        resolution === "refund_customer" ||
        resolution === "partial_resolution"
      ) {
        body.resolutionAmount = parseFloat(refundAmount);
      }

      const res = await fetch(`/api/disputes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        await fetchDispute();
        alert("Dispute resolved successfully.");
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setResolving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#020617]">
        <GlobalLoader text="Loading dispute details..." />
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="min-h-screen bg-[#020617] p-8 flex items-center justify-center">
        <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 p-8 rounded-[24px] text-center max-w-md w-full">
          <p className="text-white/50 mb-6">Dispute not found</p>
          <Link
            href="/admin/disputes"
            className="px-6 py-3 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors text-sm font-bold inline-block"
          >
            ← Back to Disputes
          </Link>
        </div>
      </div>
    );
  }

  const isResolved = dispute.status === "resolved";

  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        
        {/* Ambient Glow */}
        <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/10 via-[#020617]/0 to-[#020617]/0" />

        {/* Back Link */}
        <Link
          href="/admin/disputes"
          className="group inline-flex items-center gap-3 text-slate-400 hover:text-white text-[11px] font-black tracking-[0.25em] uppercase transition-colors mb-2"
        >
          <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-400 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.2)] group-hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all">
            <FiArrowLeft className="w-3 h-3 text-[#020617] stroke-[3]" />
          </span>
          Back To Disputes
        </Link>

        {/* Header Banner */}
        <div className="relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-[28px] p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.1),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(235,151,40,0.1),transparent_40%)] pointer-events-none" />
          
          <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <p className="text-purple-500 text-[11px] font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                <FiShield className="w-4 h-4" />
                Dispute Record
              </p>
              <h1 className="text-3xl font-black text-white font-mono tracking-tight">
                {dispute.disputeNumber}
              </h1>
            </div>

            <div className={`px-4 py-2 rounded-xl flex items-center gap-2.5 backdrop-blur-md border ${
              isResolved
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : dispute.status === "under_review" || dispute.status === "manufacturer_responded"
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isResolved ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" :
                dispute.status === "under_review" || dispute.status === "manufacturer_responded" ? "bg-amber-500 shadow-[0_0_8px_#f59e0b]" :
                "bg-red-500 shadow-[0_0_8px_#ef4444]"
              }`} />
              <span className="text-xs font-black uppercase tracking-widest">
                {dispute.status?.replace(/_/g, " ")}
              </span>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer */}
          <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[24px] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center p-2">
                <Image src={buyerIcon} alt="Buyer" className="w-full h-full object-contain opacity-70" />
              </div>
              <div>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Customer (Filed By)</p>
                <p className="text-white font-bold">{dispute.customerId?.name || "—"}</p>
              </div>
            </div>
            <p className="text-white/50 text-sm mb-4 px-1">{dispute.customerId?.email || "—"}</p>
            {dispute.customerId?._id && (
              <Link
                href={`/admin/users/${dispute.customerId._id}`}
                className="inline-flex w-full items-center justify-center py-2.5 rounded-xl bg-white/5 border border-transparent text-white/60 hover:bg-gradient-to-r hover:from-purple-600 hover:to-indigo-600 hover:text-white hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] text-xs font-bold transition-all"
              >
                View Customer Profile →
              </Link>
            )}
          </div>

          {/* Manufacturer */}
          <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[24px] p-6">
             <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center p-2">
                <Image src={sellerIcon} alt="Seller" className="w-full h-full object-contain opacity-70" />
              </div>
              <div>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Manufacturer</p>
                <p className="text-white font-bold">{dispute.manufacturerId?.businessName || dispute.manufacturerId?.name || "—"}</p>
              </div>
            </div>
            <p className="text-white/50 text-sm px-1">{dispute.manufacturerId?.email || "—"}</p>
          </div>
        </div>

        {/* Dispute Details */}
        <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[24px] p-6 sm:p-8">
          <h2 className="text-white text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Dispute Details
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Order</p>
              <Link
                href={`/admin/orders/${dispute.orderId?._id}`}
                className="text-purple-500 font-mono text-sm font-bold hover:text-purple-400"
              >
                {dispute.orderId?.orderNumber || "—"}
              </Link>
            </div>
            <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Issue Type</p>
              <p className="text-white text-sm font-bold capitalize">{dispute.issueType?.replace(/_/g, " ") || "—"}</p>
            </div>
            <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Resolution</p>
              <p className="text-white text-sm font-bold capitalize">{dispute.desiredResolution?.replace(/_/g, " ") || "—"}</p>
            </div>
            <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Filed On</p>
              <p className="text-white text-sm font-bold">
                {new Date(dispute.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>

          <div>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-3">Customer&apos;s Description</p>
            <div className="bg-black/20 rounded-2xl p-5 border border-white/5 text-white/70 text-sm leading-relaxed">
              {dispute.description || "No description provided."}
            </div>
          </div>
        </div>

        {/* Customer Evidence */}
        {dispute.customerEvidence?.length > 0 && (
          <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[24px] p-6 sm:p-8">
            <h2 className="text-white text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Evidence (Customer)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dispute.customerEvidence.map((item, idx) => {
                const evidenceUrl = typeof item === "string" ? item : item?.url;
                const evidenceLabel = typeof item === "string" ? `Evidence Document ${idx + 1}` : item?.filename || `Evidence Document ${idx + 1}`;
                if (!evidenceUrl) return null;
                return (
                  <a
                    key={idx}
                    href={evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all rounded-xl group"
                  >
                    <span className="text-white/70 text-sm font-medium flex items-center gap-2">
                      <Image src={documentIcon} alt="Document" className="w-5 h-5 object-contain opacity-70" /> {evidenceLabel}
                    </span>
                    <span className="text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold">View</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Manufacturer Response */}
        {dispute.manufacturerResponse && (
          <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[24px] p-6 sm:p-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[50px] pointer-events-none" />
             <h2 className="text-white text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Manufacturer Response
            </h2>
            <div className="bg-black/20 rounded-2xl p-5 border border-white/5 text-white/70 text-sm leading-relaxed relative z-10">
              {dispute.manufacturerResponse.comment}
            </div>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-4">
              Responded: {new Date(dispute.manufacturerResponse.respondedAt).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Resolution Record */}
        {isResolved && dispute.resolution && (
          <div className="bg-emerald-900/10 backdrop-blur-md border border-emerald-500/20 rounded-[24px] p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.1),transparent_40%)] pointer-events-none" />
            <h2 className="text-emerald-400 text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6 relative z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              Final Resolution
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 relative z-10">
               <div className="bg-black/20 rounded-2xl p-4 border border-emerald-500/10">
                <p className="text-emerald-500/50 text-[10px] font-black uppercase tracking-widest mb-1">Decision</p>
                <p className="text-emerald-400 text-sm font-bold capitalize">{dispute.resolution?.replace(/_/g, " ")}</p>
              </div>
              {dispute.resolutionAmount > 0 && (
                 <div className="bg-black/20 rounded-2xl p-4 border border-emerald-500/10">
                  <p className="text-emerald-500/50 text-[10px] font-black uppercase tracking-widest mb-1">Refund Amount</p>
                  <p className="text-emerald-400 text-sm font-bold">${dispute.resolutionAmount}</p>
                </div>
              )}
            </div>

            <div className="relative z-10">
               <p className="text-emerald-500/50 text-[10px] font-black uppercase tracking-widest mb-3">Resolution Message</p>
               <div className="bg-black/20 rounded-2xl p-5 border border-emerald-500/10 text-emerald-100/70 text-sm leading-relaxed">
                  {dispute.resolutionMessage}
               </div>
            </div>
          </div>
        )}

        {/* Admin Notes */}
        {dispute.adminNotes && (
          <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[24px] p-6 sm:p-8">
            <h2 className="text-white/60 text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-4">
              Internal Notes
            </h2>
            <p className="text-white/40 text-sm leading-relaxed">{dispute.adminNotes}</p>
          </div>
        )}

        {/* Resolution Form */}
        {!isResolved && (
          <div className="bg-[#0c0c11] border border-white/10 rounded-[32px] p-6 sm:p-10 relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.05),transparent_60%)] pointer-events-none" />
            
            <div className="text-center mb-8 relative z-10">
               <div className="w-16 h-16 mx-auto bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center mb-4">
                  <FiAlertCircle className="w-8 h-8 text-purple-500" />
               </div>
               <h2 className="text-2xl font-black text-white tracking-tight">Resolve Dispute</h2>
               <p className="text-white/40 text-sm mt-2">Take action to finalize this dispute. This action cannot be undone.</p>
            </div>

            <div className="space-y-8 relative z-10">
              <div>
                <label className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-3">
                  Select Decision
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: "refund_customer", label: "Refund Customer", desc: "Rule for customer" },
                    { value: "side_with_manufacturer", label: "Side with Mfr", desc: "No refund issued" },
                    { value: "partial_resolution", label: "Partial Resolve", desc: "Compromise/Partial" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`relative flex flex-col p-4 rounded-2xl border cursor-pointer transition-all ${
                        resolution === opt.value
                          ? "bg-purple-500/10 border-purple-500/30"
                          : "bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="resolution"
                        value={opt.value}
                        checked={resolution === opt.value}
                        onChange={(e) => setResolution(e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between mb-1">
                         <p className={`text-sm font-bold ${resolution === opt.value ? "text-purple-500" : "text-white"}`}>
                            {opt.label}
                         </p>
                         <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            resolution === opt.value ? "border-purple-500" : "border-white/20"
                         }`}>
                            {resolution === opt.value && <div className="w-2 h-2 rounded-full bg-purple-500" />}
                         </div>
                      </div>
                      <p className="text-white/30 text-xs">{opt.desc}</p>
                    </label>
                  ))}
                </div>
              </div>

              {(resolution === "refund_customer" || resolution === "partial_resolution") && (
                <div>
                  <label className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-3">
                    Refund Amount (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 font-bold">$</span>
                    <input
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-black/40 border border-white/10 text-white font-bold rounded-2xl pl-10 pr-5 py-4 text-sm focus:border-purple-500 focus:bg-black/60 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-3">
                  Resolution Message (Visible to both parties)
                </label>
                <textarea
                  value={resolutionMessage}
                  onChange={(e) => setResolutionMessage(e.target.value)}
                  rows={4}
                  placeholder="Explain the final decision and next steps..."
                  className="w-full bg-black/40 border border-white/10 text-white rounded-2xl p-5 text-sm focus:border-purple-500 focus:bg-black/60 focus:outline-none transition-all resize-none placeholder:text-white/20"
                />
              </div>

              <div>
                <label className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-3">
                  Internal Notes (Admin Only, Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  placeholder="Add private notes for audit trail..."
                  className="w-full bg-black/40 border border-white/10 text-white rounded-2xl p-5 text-sm focus:border-purple-500 focus:bg-black/60 focus:outline-none transition-all resize-none placeholder:text-white/20"
                />
              </div>

              <button
                onClick={handleResolve}
                disabled={resolving}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-sm uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]"
              >
                {resolving ? "Processing Resolution..." : "Finalize Resolution"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// // app/admin/disputes/[id]/page.js
// "use client";

// import GlobalLoader from "@/components/ui/GlobalLoader";
// import { useState, useEffect, useCallback } from "react";
// import { useSession } from "next-auth/react";
// import { useRouter, useParams } from "next/navigation";
// import Link from "next/link";

// export default function AdminDisputeDetailPage() {
//   const { data: session, status } = useSession();
//   const router = useRouter();
//   const params = useParams();
//   const id = params?.id;

//   const [dispute, setDispute] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [resolving, setResolving] = useState(false);

//   // Resolution form state
//   const [resolution, setResolution] = useState("refund_customer");
//   const [refundAmount, setRefundAmount] = useState("");
//   const [resolutionMessage, setResolutionMessage] = useState("");
//   const [adminNotes, setAdminNotes] = useState("");

//   const fetchDispute = useCallback(async () => {
//     try {
//       const res = await fetch(`/api/disputes/${id}`);
//       const data = await res.json();
//       if (data.dispute) setDispute(data.dispute);
//     } catch (err) {
//       console.error(err);
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
//       if (session?.user?.role !== "admin") {
//         router.push("/");
//         return;
//       }
//       fetchDispute();
//     }
//   }, [status, session, router, fetchDispute]);

//   const handleResolve = async () => {
//     if (!resolutionMessage.trim()) {
//       alert("Resolution message is required.");
//       return;
//     }
//     if (resolution === "refund_customer" && !refundAmount) {
//       alert("Please enter the refund amount.");
//       return;
//     }

//     setResolving(true);
//     try {
//       const body = {
//         action: "admin_resolve",
//         resolution,
//         resolutionMessage,
//         adminNotes,
//       };
//       if (
//         resolution === "refund_customer" ||
//         resolution === "partial_resolution"
//       ) {
//         body.resolutionAmount = parseFloat(refundAmount);
//       }

//       const res = await fetch(`/api/disputes/${id}`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(body),
//       });
//       const data = await res.json();
//       if (data.success) {
//         await fetchDispute();
//         alert("Dispute resolved successfully.");
//       } else {
//         alert("Error: " + data.error);
//       }
//     } catch (err) {
//       alert("Error: " + err.message);
//     } finally {
//       setResolving(false);
//     }
//   };

//   if (status === "loading" || loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-[#020617]">
//         <GlobalLoader text="Loading dispute details..." />
//       </div>
//     );
//   }

//   if (!dispute) {
//     return (
//       <div className="min-h-screen bg-[#020617] p-8 flex items-center justify-center">
//         <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 p-8 rounded-[24px] text-center max-w-md w-full">
//           <p className="text-white/50 mb-6">Dispute not found or access denied.</p>
//           <Link
//             href="/admin/disputes"
//             className="px-6 py-3 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors text-sm font-bold inline-block"
//           >
//             ← Back to Disputes
//           </Link>
//         </div>
//       </div>
//     );
//   }

//   const isResolved = dispute.status === "resolved";

//   return (
//     <div className="min-h-screen bg-[#020617] p-4 sm:p-8">
//       <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        
//         {/* Ambient Glow */}
//         <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/10 via-[#020617]/0 to-[#020617]/0" />

//         {/* Back Link */}
//         <Link
//           href="/admin/disputes"
//           className="group inline-flex items-center gap-2 text-white/40 hover:text-white text-sm font-bold transition-colors"
//         >
//           <span className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
//             ←
//           </span>
//           Back to Disputes
//         </Link>

//         {/* Header Banner */}
//         <div className="relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-[28px] p-8">
//           <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.1),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(235,151,40,0.1),transparent_40%)] pointer-events-none" />
          
//           <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
//             <div>
//               <p className="text-[#eb9728] text-[11px] font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
//                 <FiShield className="w-4 h-4" />
//                 Dispute Record
//               </p>
//               <h1 className="text-3xl font-black text-white font-mono tracking-tight">
//                 {dispute.disputeNumber}
//               </h1>
//             </div>

//             <div className={`px-4 py-2 rounded-xl flex items-center gap-2.5 backdrop-blur-md border ${
//               isResolved
//                 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
//                 : dispute.status === "under_review" || dispute.status === "manufacturer_responded"
//                   ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
//                   : "bg-red-500/10 border-red-500/20 text-red-400"
//             }`}>
//               <div className={`w-2 h-2 rounded-full ${
//                 isResolved ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" :
//                 dispute.status === "under_review" || dispute.status === "manufacturer_responded" ? "bg-amber-500 shadow-[0_0_8px_#f59e0b]" :
//                 "bg-red-500 shadow-[0_0_8px_#ef4444]"
//               }`} />
//               <span className="text-xs font-black uppercase tracking-widest">
//                 {dispute.status?.replace(/_/g, " ")}
//               </span>
//             </div>
//           </div>
//         </div>

//         {/* Info Grid */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           {/* Customer */}
//           <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[24px] p-6">
//             <div className="flex items-center gap-3 mb-4">
//               <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
//                 <span className="text-white/50 text-lg">👤</span>
//               </div>
//               <div>
//                 <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Customer (Filed By)</p>
//                 <p className="text-white font-bold">{dispute.customerId?.name || "—"}</p>
//               </div>
//             </div>
//             <p className="text-white/50 text-sm mb-4 px-1">{dispute.customerId?.email || "—"}</p>
//             {dispute.customerId?._id && (
//               <Link
//                 href={`/admin/users/${dispute.customerId._id}`}
//                 className="inline-flex w-full items-center justify-center py-2.5 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white text-xs font-bold transition-colors"
//               >
//                 View Customer Profile →
//               </Link>
//             )}
//           </div>

//           {/* Manufacturer */}
//           <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[24px] p-6">
//              <div className="flex items-center gap-3 mb-4">
//               <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
//                 <span className="text-white/50 text-lg">🏭</span>
//               </div>
//               <div>
//                 <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Manufacturer</p>
//                 <p className="text-white font-bold">{dispute.manufacturerId?.businessName || dispute.manufacturerId?.name || "—"}</p>
//               </div>
//             </div>
//             <p className="text-white/50 text-sm px-1">{dispute.manufacturerId?.email || "—"}</p>
//           </div>
//         </div>

//         {/* Dispute Details */}
//         <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[24px] p-6 sm:p-8">
//           <h2 className="text-white text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6">
//             <span className="w-1.5 h-1.5 rounded-full bg-[#eb9728]" />
//             Dispute Details
//           </h2>
          
//           <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
//             <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
//               <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Order</p>
//               <Link
//                 href={`/admin/orders/${dispute.orderId?._id}`}
//                 className="text-[#eb9728] font-mono text-sm font-bold hover:text-amber-400"
//               >
//                 {dispute.orderId?.orderNumber || "—"}
//               </Link>
//             </div>
//             <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
//               <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Issue Type</p>
//               <p className="text-white text-sm font-bold capitalize">{dispute.issueType?.replace(/_/g, " ") || "—"}</p>
//             </div>
//             <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
//               <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Resolution</p>
//               <p className="text-white text-sm font-bold capitalize">{dispute.desiredResolution?.replace(/_/g, " ") || "—"}</p>
//             </div>
//             <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
//               <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Filed On</p>
//               <p className="text-white text-sm font-bold">
//                 {new Date(dispute.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
//               </p>
//             </div>
//           </div>

//           <div>
//             <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-3">Customer's Description</p>
//             <div className="bg-black/20 rounded-2xl p-5 border border-white/5 text-white/70 text-sm leading-relaxed">
//               {dispute.description || "No description provided."}
//             </div>
//           </div>
//         </div>

//         {/* Customer Evidence */}
//         {dispute.customerEvidence?.length > 0 && (
//           <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[24px] p-6 sm:p-8">
//             <h2 className="text-white text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6">
//               <span className="w-1.5 h-1.5 rounded-full bg-[#eb9728]" />
//               Evidence (Customer)
//             </h2>
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//               {dispute.customerEvidence.map((item, idx) => {
//                 const evidenceUrl = typeof item === "string" ? item : item?.url;
//                 const evidenceLabel = typeof item === "string" ? `Evidence Document ${idx + 1}` : item?.filename || `Evidence Document ${idx + 1}`;
//                 if (!evidenceUrl) return null;
//                 return (
//                   <a
//                     key={idx}
//                     href={evidenceUrl}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all rounded-xl group"
//                   >
//                     <span className="text-white/70 text-sm font-medium flex items-center gap-2">
//                       <span className="text-xl">📎</span> {evidenceLabel}
//                     </span>
//                     <span className="text-[#eb9728] opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold">View</span>
//                   </a>
//                 );
//               })}
//             </div>
//           </div>
//         )}

//         {/* Manufacturer Response */}
//         {dispute.manufacturerResponse && (
//           <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[24px] p-6 sm:p-8 relative overflow-hidden">
//              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[50px] pointer-events-none" />
//              <h2 className="text-white text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6">
//               <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
//               Manufacturer Response
//             </h2>
//             <div className="bg-black/20 rounded-2xl p-5 border border-white/5 text-white/70 text-sm leading-relaxed relative z-10">
//               {dispute.manufacturerResponse.comment}
//             </div>
//             <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-4">
//               Responded: {new Date(dispute.manufacturerResponse.respondedAt).toLocaleDateString()}
//             </p>
//           </div>
//         )}

//         {/* Resolution Record */}
//         {isResolved && dispute.resolution && (
//           <div className="bg-emerald-900/10 backdrop-blur-md border border-emerald-500/20 rounded-[24px] p-6 sm:p-8 relative overflow-hidden">
//             <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.1),transparent_40%)] pointer-events-none" />
//             <h2 className="text-emerald-400 text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6 relative z-10">
//               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
//               Final Resolution
//             </h2>
            
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 relative z-10">
//                <div className="bg-black/20 rounded-2xl p-4 border border-emerald-500/10">
//                 <p className="text-emerald-500/50 text-[10px] font-black uppercase tracking-widest mb-1">Decision</p>
//                 <p className="text-emerald-400 text-sm font-bold capitalize">{dispute.resolution?.replace(/_/g, " ")}</p>
//               </div>
//               {dispute.resolutionAmount > 0 && (
//                  <div className="bg-black/20 rounded-2xl p-4 border border-emerald-500/10">
//                   <p className="text-emerald-500/50 text-[10px] font-black uppercase tracking-widest mb-1">Refund Amount</p>
//                   <p className="text-emerald-400 text-sm font-bold">${dispute.resolutionAmount}</p>
//                 </div>
//               )}
//             </div>

//             <div className="relative z-10">
//                <p className="text-emerald-500/50 text-[10px] font-black uppercase tracking-widest mb-3">Resolution Message</p>
//                <div className="bg-black/20 rounded-2xl p-5 border border-emerald-500/10 text-emerald-100/70 text-sm leading-relaxed">
//                   {dispute.resolutionMessage}
//                </div>
//             </div>
//           </div>
//         )}

//         {/* Admin Notes */}
//         {dispute.adminNotes && (
//           <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[24px] p-6 sm:p-8">
//             <h2 className="text-white/60 text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-4">
//               Internal Notes
//             </h2>
//             <p className="text-white/40 text-sm leading-relaxed">{dispute.adminNotes}</p>
//           </div>
//         )}

//         {/* Resolution Form */}
//         {!isResolved && (
//           <div className="bg-[#0c0c11] border border-white/10 rounded-[32px] p-6 sm:p-10 relative overflow-hidden shadow-2xl">
//             <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(235,151,40,0.05),transparent_60%)] pointer-events-none" />
            
//             <div className="text-center mb-8 relative z-10">
//                <div className="w-16 h-16 mx-auto bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mb-4">
//                   <FiAlertCircle className="w-8 h-8 text-amber-500" />
//                </div>
//                <h2 className="text-2xl font-black text-white tracking-tight">Resolve Dispute</h2>
//                <p className="text-white/40 text-sm mt-2">Take action to finalize this dispute. This action cannot be undone.</p>
//             </div>

//             <div className="space-y-8 relative z-10">
//               <div>
//                 <label className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-3">
//                   Select Decision
//                 </label>
//                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
//                   {[
//                     { value: "refund_customer", label: "Refund Customer", desc: "Rule for customer" },
//                     { value: "side_with_manufacturer", label: "Side with Mfr", desc: "No refund issued" },
//                     { value: "partial_resolution", label: "Partial Resolve", desc: "Compromise/Partial" },
//                   ].map((opt) => (
//                     <label
//                       key={opt.value}
//                       className={`relative flex flex-col p-4 rounded-2xl border cursor-pointer transition-all ${
//                         resolution === opt.value
//                           ? "bg-amber-500/10 border-amber-500/30"
//                           : "bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]"
//                       }`}
//                     >
//                       <input
//                         type="radio"
//                         name="resolution"
//                         value={opt.value}
//                         checked={resolution === opt.value}
//                         onChange={(e) => setResolution(e.target.value)}
//                         className="sr-only"
//                       />
//                       <div className="flex items-center justify-between mb-1">
//                          <p className={`text-sm font-bold ${resolution === opt.value ? "text-amber-500" : "text-white"}`}>
//                             {opt.label}
//                          </p>
//                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
//                             resolution === opt.value ? "border-amber-500" : "border-white/20"
//                          }`}>
//                             {resolution === opt.value && <div className="w-2 h-2 rounded-full bg-amber-500" />}
//                          </div>
//                       </div>
//                       <p className="text-white/30 text-xs">{opt.desc}</p>
//                     </label>
//                   ))}
//                 </div>
//               </div>

//               {(resolution === "refund_customer" || resolution === "partial_resolution") && (
//                 <div>
//                   <label className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-3">
//                     Refund Amount (USD)
//                   </label>
//                   <div className="relative">
//                     <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 font-bold">$</span>
//                     <input
//                       type="number"
//                       value={refundAmount}
//                       onChange={(e) => setRefundAmount(e.target.value)}
//                       placeholder="0.00"
//                       className="w-full bg-black/40 border border-white/10 text-white font-bold rounded-2xl pl-10 pr-5 py-4 text-sm focus:border-[#eb9728] focus:bg-black/60 focus:outline-none transition-all"
//                     />
//                   </div>
//                 </div>
//               )}

//               <div>
//                 <label className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-3">
//                   Resolution Message (Visible to both parties)
//                 </label>
//                 <textarea
//                   value={resolutionMessage}
//                   onChange={(e) => setResolutionMessage(e.target.value)}
//                   rows={4}
//                   placeholder="Explain the final decision and next steps..."
//                   className="w-full bg-black/40 border border-white/10 text-white rounded-2xl p-5 text-sm focus:border-[#eb9728] focus:bg-black/60 focus:outline-none transition-all resize-none placeholder:text-white/20"
//                 />
//               </div>

//               <div>
//                 <label className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-3">
//                   Internal Notes (Admin Only, Optional)
//                 </label>
//                 <textarea
//                   value={adminNotes}
//                   onChange={(e) => setAdminNotes(e.target.value)}
//                   rows={2}
//                   placeholder="Add private notes for audit trail..."
//                   className="w-full bg-black/40 border border-white/10 text-white rounded-2xl p-5 text-sm focus:border-[#eb9728] focus:bg-black/60 focus:outline-none transition-all resize-none placeholder:text-white/20"
//                 />
//               </div>

//               <button
//                 onClick={handleResolve}
//                 disabled={resolving}
//                 className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#eb9728] to-amber-500 text-white font-black text-sm uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(235,151,40,0.2)]"
//               >
//                 {resolving ? "Processing Resolution..." : "Finalize Resolution"}
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

