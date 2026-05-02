// app/customer/orders/[id]/dispute/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

const ISSUE_TYPES = [
  { value: "item_not_received", label: "Item not received" },
  { value: "item_not_as_described", label: "Item not as described" },
  { value: "quality_issue", label: "Quality issue" },
  { value: "wrong_item", label: "Wrong item received" },
  { value: "damaged_item", label: "Item arrived damaged" },
  { value: "late_delivery", label: "Significantly late delivery" },
  { value: "refund_not_received", label: "Refund not received" },
  { value: "other", label: "Other" },
];

const RESOLUTION_TYPES = [
  { value: "full_refund", label: "Full refund" },
  { value: "partial_refund", label: "Partial refund" },
  { value: "replacement", label: "Replacement / redo" },
  { value: "other", label: "Other resolution" },
];

export default function FileDisputePage() {
  const { id: orderId } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [existingDispute, setExistingDispute] = useState(null);

  const [form, setForm] = useState({
    issueType: "",
    description: "",
    desiredResolution: "",
  });

  const fetchOrder = useCallback(async () => {
    try {
      const [orderRes, disputesRes] = await Promise.all([
        fetch(`/api/orders/${orderId}`),
        fetch(`/api/disputes?orderId=${orderId}`),
      ]);

      const orderData = await orderRes.json();
      if (orderData.success) {
        setOrder(orderData.order);
      } else {
        router.push("/customer/orders");
        return;
      }

      const disputeData = await disputesRes.json();
      if (disputeData.disputes?.length > 0) {
        const open = disputeData.disputes.find(
          (d) => d.orderId?._id === orderId || d.orderId === orderId,
        );
        if (open && !["resolved", "closed"].includes(open.status)) {
          setExistingDispute(open);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated") {
      if (session.user.role !== "customer") {
        router.push("/auth/login");
        return;
      }
      fetchOrder();
    }
  }, [status, session, router, fetchOrder]);

  const handleSubmit = async () => {
    setError("");

    if (!form.issueType) {
      setError("Please select an issue type.");
      return;
    }
    if (!form.description || form.description.trim().length < 20) {
      setError("Please describe the issue in at least 20 characters.");
      return;
    }
    if (!form.desiredResolution) {
      setError("Please select your desired resolution.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          issueType: form.issueType,
          description: form.description.trim(),
          desiredResolution: form.desiredResolution,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push(`/customer/orders/${orderId}?dispute=filed`);
      } else {
        setError(data.error || "Failed to file dispute. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050507]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#eb9728]" />
          <GlobalLoader text="Loading dispute form..." />
        </div>
      </div>
    );
  }

  if (existingDispute) {
    return (
      <div className="min-h-screen bg-[#050507] text-white">
        <main className="mx-auto max-w-3xl px-4 py-7 sm:px-6">
          <Link
            href={`/customer/orders/${orderId}`}
            className="mb-5 inline-flex text-sm font-semibold text-white/45 hover:text-[#eb9728]"
          >
            ← Back to Order
          </Link>

          <section className="relative overflow-hidden rounded-[28px] border border-[#eb9728]/20 bg-[#0c0c11] p-8 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(235,151,40,0.14),transparent_35%)] pointer-events-none" />

            <div className="relative">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-[#eb9728]/25 bg-[#eb9728]/10 text-[#eb9728]">
                <span className="material-symbols-outlined text-5xl">
                  gavel
                </span>
              </div>

              <h2 className="text-2xl font-black text-white">
                Dispute Already Filed
              </h2>

              <p className="mt-2 text-sm text-white/55">
                You already have an open dispute for this order.
              </p>

              <p className="mt-2 text-xs text-white/40">
                Case #{existingDispute.disputeNumber} · Status:{" "}
                <span className="font-bold capitalize text-[#eb9728]">
                  {existingDispute.status.replace("_", " ")}
                </span>
              </p>

              <Link
                href={`/customer/orders/${orderId}`}
                className="mt-6 inline-flex rounded-xl bg-[#eb9728] px-6 py-3 text-sm font-bold text-white hover:bg-amber-500"
              >
                Back to Order
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="mx-auto max-w-3xl px-4 py-7 sm:px-6 space-y-6">
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0c0c11] p-6 sm:p-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.13),transparent_32%),radial-gradient(circle_at_left,rgba(235,151,40,0.12),transparent_28%)] pointer-events-none" />

          <div className="relative">
            <Link
              href={`/customer/orders/${orderId}`}
              className="mb-4 inline-flex text-sm font-semibold text-white/45 hover:text-[#eb9728]"
            >
              ← Back to Order
            </Link>

            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#eb9728]">
              Order Dispute
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              File a Complaint
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Submit a dispute for this order. Our team will review your case
              after the manufacturer has an opportunity to respond.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 flex gap-3">
          <span className="material-symbols-outlined text-blue-300 text-xl shrink-0 mt-0.5">
            info
          </span>
          <div className="text-sm text-blue-200/80">
            <p className="mb-1 font-bold text-blue-200">
              Before filing a dispute
            </p>
            <p>
              We recommend chatting with the manufacturer first to resolve
              issues directly. If you cannot reach an agreement, our team will
              review your case within 48 hours.
            </p>
          </div>
        </section>

        {order && (
          <section className="rounded-2xl border border-white/8 bg-[#0c0c11] p-4 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/45">
              <span className="material-symbols-outlined">receipt_long</span>
            </div>

            <div>
              <p className="text-xs text-white/35">Order</p>
              <p className="font-mono text-sm font-bold text-white">
                {order.orderNumber}
              </p>
            </div>

            <div className="ml-auto text-right">
              <p className="text-xs text-white/35">Amount</p>
              <p className="font-black text-[#eb9728]">
                ${order.totalPrice?.toLocaleString()}
              </p>
            </div>
          </section>
        )}

        <section className="rounded-[28px] border border-white/8 bg-[#0c0c11] p-5 sm:p-6 space-y-6">
          <div>
            <label className="mb-3 block text-sm font-bold text-white">
              What is the issue? *
            </label>
            <div className="grid grid-cols-1 gap-2">
              {ISSUE_TYPES.map((issue) => (
                <label
                  key={issue.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                    form.issueType === issue.value
                      ? "border-[#eb9728]/50 bg-[#eb9728]/10"
                      : "border-white/10 bg-white/[0.02] hover:border-[#eb9728]/35 hover:bg-white/[0.04]"
                  }`}
                >
                  <input
                    type="radio"
                    name="issueType"
                    value={issue.value}
                    checked={form.issueType === issue.value}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, issueType: e.target.value }))
                    }
                    className="accent-[#eb9728]"
                  />
                  <span className="text-sm text-white/75">{issue.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-bold text-white">
              Describe the issue *
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={5}
              placeholder="Please provide as much detail as possible — what was ordered, what happened, and any relevant dates or communications..."
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#eb9728] focus:outline-none"
            />
            <p className="mt-2 text-xs text-white/35">
              {form.description.length}/3000 characters
            </p>
          </div>

          <div>
            <label className="mb-3 block text-sm font-bold text-white">
              What resolution are you looking for? *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {RESOLUTION_TYPES.map((r) => (
                <label
                  key={r.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                    form.desiredResolution === r.value
                      ? "border-[#eb9728]/50 bg-[#eb9728]/10"
                      : "border-white/10 bg-white/[0.02] hover:border-[#eb9728]/35 hover:bg-white/[0.04]"
                  }`}
                >
                  <input
                    type="radio"
                    name="desiredResolution"
                    value={r.value}
                    checked={form.desiredResolution === r.value}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        desiredResolution: e.target.value,
                      }))
                    }
                    className="accent-[#eb9728]"
                  />
                  <span className="text-sm text-white/75">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-xl bg-[#eb9728] py-3 text-sm font-bold text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Filing Dispute..." : "Submit Dispute"}
            </button>

            <Link
              href={`/customer/orders/${orderId}`}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-center text-sm font-semibold text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              Cancel
            </Link>
          </div>

          <p className="text-center text-xs leading-5 text-white/35">
            After filing, the manufacturer has 48 hours to respond. Our team
            will review and resolve within 5 business days.
          </p>
        </section>
      </main>
    </div>
  );
}

// // app/customer/orders/[id]/dispute/page.js
// "use client";

// import { useState, useEffect, useCallback } from "react";
// import { useParams, useRouter } from "next/navigation";
// import { useSession } from "next-auth/react";
// import Link from "next/link";

// const ISSUE_TYPES = [
//   { value: "item_not_received", label: "Item not received" },
//   { value: "item_not_as_described", label: "Item not as described" },
//   { value: "quality_issue", label: "Quality issue" },
//   { value: "wrong_item", label: "Wrong item received" },
//   { value: "damaged_item", label: "Item arrived damaged" },
//   { value: "late_delivery", label: "Significantly late delivery" },
//   { value: "refund_not_received", label: "Refund not received" },
//   { value: "other", label: "Other" },
// ];

// const RESOLUTION_TYPES = [
//   { value: "full_refund", label: "Full refund" },
//   { value: "partial_refund", label: "Partial refund" },
//   { value: "replacement", label: "Replacement / redo" },
//   { value: "other", label: "Other resolution" },
// ];

// export default function FileDisputePage() {
//   const { id: orderId } = useParams();
//   const router = useRouter();
//   const { data: session, status } = useSession();

//   const [order, setOrder] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [submitting, setSubmitting] = useState(false);
//   const [error, setError] = useState("");
//   const [existingDispute, setExistingDispute] = useState(null);

//   const [form, setForm] = useState({
//     issueType: "",
//     description: "",
//     desiredResolution: "",
//   });

//   const fetchOrder = useCallback(async () => {
//     try {
//       const [orderRes, disputesRes] = await Promise.all([
//         fetch(`/api/orders/${orderId}`),
//         fetch(`/api/disputes?orderId=${orderId}`),
//       ]);

//       const orderData = await orderRes.json();
//       if (orderData.success) {
//         setOrder(orderData.order);
//       } else {
//         router.push("/customer/orders");
//         return;
//       }

//       // Check for existing open dispute on this order
//       const disputeData = await disputesRes.json();
//       if (disputeData.disputes?.length > 0) {
//         const open = disputeData.disputes.find(
//           (d) => d.orderId?._id === orderId || d.orderId === orderId,
//         );
//         if (open && !["resolved", "closed"].includes(open.status)) {
//           setExistingDispute(open);
//         }
//       }
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   }, [orderId, router]);

//   useEffect(() => {
//     if (status === "unauthenticated") {
//       router.push("/auth/login");
//       return;
//     }
//     if (status === "authenticated") {
//       if (session.user.role !== "customer") {
//         router.push("/auth/login");
//         return;
//       }
//       fetchOrder();
//     }
//   }, [status, session, router, fetchOrder]);

//   const handleSubmit = async () => {
//     setError("");

//     if (!form.issueType) {
//       setError("Please select an issue type.");
//       return;
//     }
//     if (!form.description || form.description.trim().length < 20) {
//       setError("Please describe the issue in at least 20 characters.");
//       return;
//     }
//     if (!form.desiredResolution) {
//       setError("Please select your desired resolution.");
//       return;
//     }

//     setSubmitting(true);
//     try {
//       const res = await fetch("/api/disputes", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           orderId,
//           issueType: form.issueType,
//           description: form.description.trim(),
//           desiredResolution: form.desiredResolution,
//         }),
//       });

//       const data = await res.json();

//       if (res.ok) {
//         router.push(`/customer/orders/${orderId}?dispute=filed`);
//       } else {
//         setError(data.error || "Failed to file dispute. Please try again.");
//       }
//     } catch (err) {
//       setError("Something went wrong. Please try again.");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   if (status === "loading" || loading) {
//     return (
//       <div className="flex h-screen bg-[#f8f7f6]">
//         <main className="flex-1 flex items-center justify-center">
//           <div className="w-8 h-8 border-2 border-gray-300 border-t-[#eb9728] rounded-full animate-spin" />
//         </main>
//       </div>
//     );
//   }

//   // Already has open dispute
//   if (existingDispute) {
//     return (
//       <div className="flex h-screen bg-[#f8f7f6]">
//         <main className="flex-1 overflow-y-auto">
//           <header className="sticky top-0 z-10 flex items-center h-16 px-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 gap-3">
//             <Link
//               href={`/customer/orders/${orderId}`}
//               className="text-sm text-gray-500 hover:text-[#eb9728]"
//             >
//               ← Back to Order
//             </Link>
//           </header>
//           <div className="p-8 max-w-2xl mx-auto">
//             <div className="bg-orange-50 border border-orange-200 rounded-xl p-8 text-center">
//               <span className="material-symbols-outlined text-5xl text-orange-500 block mb-4">
//                 gavel
//               </span>
//               <h2 className="text-xl font-bold text-gray-900 mb-2">
//                 Dispute Already Filed
//               </h2>
//               <p className="text-gray-600 text-sm mb-2">
//                 You already have an open dispute for this order.
//               </p>
//               <p className="text-xs text-gray-500 mb-6">
//                 Case #{existingDispute.disputeNumber} · Status:{" "}
//                 <span className="font-semibold capitalize">
//                   {existingDispute.status.replace("_", " ")}
//                 </span>
//               </p>
//               <Link
//                 href={`/customer/orders/${orderId}`}
//                 className="inline-block px-6 py-2.5 bg-[#eb9728] text-white font-semibold rounded-lg hover:bg-[#eb9728]/90 text-sm"
//               >
//                 Back to Order
//               </Link>
//             </div>
//           </div>
//         </main>
//       </div>
//     );
//   }

//   return (
//     <div className="flex h-screen bg-[#f8f7f6]">
//       <main className="flex-1 overflow-y-auto">
//         {/* Header */}
//         <header className="sticky top-0 z-10 flex items-center h-16 px-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 gap-3">
//           <Link
//             href={`/customer/orders/${orderId}`}
//             className="text-sm text-gray-500 hover:text-[#eb9728]"
//           >
//             ← Back to Order
//           </Link>
//           <span className="text-gray-300">|</span>
//           <span className="text-sm font-semibold text-gray-900">
//             File a Complaint
//           </span>
//         </header>

//         <div className="p-8 max-w-2xl mx-auto">
//           {/* Info banner */}
//           <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex gap-3">
//             <span className="material-symbols-outlined text-blue-500 text-xl shrink-0 mt-0.5">
//               info
//             </span>
//             <div className="text-sm text-blue-800">
//               <p className="font-semibold mb-1">Before filing a dispute</p>
//               <p>
//                 We recommend chatting with the manufacturer first to resolve
//                 issues directly. If you cannot reach an agreement, our team will
//                 review your case within 48 hours.
//               </p>
//             </div>
//           </div>

//           {/* Order reference */}
//           {order && (
//             <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex items-center gap-4">
//               <span className="material-symbols-outlined text-gray-400">
//                 receipt_long
//               </span>
//               <div>
//                 <p className="text-xs text-gray-500">Order</p>
//                 <p className="font-mono font-semibold text-gray-900 text-sm">
//                   {order.orderNumber}
//                 </p>
//               </div>
//               <div className="ml-auto text-right">
//                 <p className="text-xs text-gray-500">Amount</p>
//                 <p className="font-bold text-[#eb9728]">
//                   ${order.totalPrice?.toLocaleString()}
//                 </p>
//               </div>
//             </div>
//           )}

//           {/* Form */}
//           <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
//             {/* Issue type */}
//             <div>
//               <label className="block text-sm font-semibold text-gray-900 mb-2">
//                 What is the issue? *
//               </label>
//               <div className="grid grid-cols-1 gap-2">
//                 {ISSUE_TYPES.map((issue) => (
//                   <label
//                     key={issue.value}
//                     className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
//                       form.issueType === issue.value
//                         ? "border-[#eb9728] bg-amber-50"
//                         : "border-gray-200 hover:border-gray-300"
//                     }`}
//                   >
//                     <input
//                       type="radio"
//                       name="issueType"
//                       value={issue.value}
//                       checked={form.issueType === issue.value}
//                       onChange={(e) =>
//                         setForm((f) => ({ ...f, issueType: e.target.value }))
//                       }
//                       className="accent-[#eb9728]"
//                     />
//                     <span className="text-sm text-gray-700">{issue.label}</span>
//                   </label>
//                 ))}
//               </div>
//             </div>

//             {/* Description */}
//             <div>
//               <label className="block text-sm font-semibold text-gray-900 mb-2">
//                 Describe the issue *
//               </label>
//               <textarea
//                 value={form.description}
//                 onChange={(e) =>
//                   setForm((f) => ({ ...f, description: e.target.value }))
//                 }
//                 rows={5}
//                 placeholder="Please provide as much detail as possible — what was ordered, what happened, and any relevant dates or communications..."
//                 className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#eb9728]"
//               />
//               <p className="text-xs text-gray-400 mt-1">
//                 {form.description.length}/3000 characters
//               </p>
//             </div>

//             {/* Desired resolution */}
//             <div>
//               <label className="block text-sm font-semibold text-gray-900 mb-2">
//                 What resolution are you looking for? *
//               </label>
//               <div className="grid grid-cols-2 gap-2">
//                 {RESOLUTION_TYPES.map((r) => (
//                   <label
//                     key={r.value}
//                     className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
//                       form.desiredResolution === r.value
//                         ? "border-[#eb9728] bg-amber-50"
//                         : "border-gray-200 hover:border-gray-300"
//                     }`}
//                   >
//                     <input
//                       type="radio"
//                       name="desiredResolution"
//                       value={r.value}
//                       checked={form.desiredResolution === r.value}
//                       onChange={(e) =>
//                         setForm((f) => ({
//                           ...f,
//                           desiredResolution: e.target.value,
//                         }))
//                       }
//                       className="accent-[#eb9728]"
//                     />
//                     <span className="text-sm text-gray-700">{r.label}</span>
//                   </label>
//                 ))}
//               </div>
//             </div>

//             {/* Error */}
//             {error && (
//               <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
//                 {error}
//               </div>
//             )}

//             {/* Submit */}
//             <div className="flex gap-3 pt-2">
//               <button
//                 onClick={handleSubmit}
//                 disabled={submitting}
//                 className="flex-1 py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
//               >
//                 {submitting ? "Filing Dispute..." : "Submit Dispute"}
//               </button>
//               <Link
//                 href={`/customer/orders/${orderId}`}
//                 className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 text-sm text-center"
//               >
//                 Cancel
//               </Link>
//             </div>

//             <p className="text-xs text-gray-400 text-center">
//               After filing, the manufacturer has 48 hours to respond. Our team
//               will review and resolve within 5 business days.
//             </p>
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }
