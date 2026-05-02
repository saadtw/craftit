"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function CustomerRFQsListPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchRFQs = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === "all" ? "/api/rfqs" : `/api/rfqs?status=${filter}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setRfqs(data.rfqs || []);
      }
    } catch (error) {
      console.error("Error fetching RFQs:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

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
      fetchRFQs();
    }
  }, [status, session, router, fetchRFQs]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-[#eb9728] animate-spin" />
          <GlobalLoader text="Loading RFQs..." />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const statusConfig = {
    active: {
      label: "Active",
      class: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    },
    pending: {
      label: "Pending",
      class: "bg-[#eb9728]/10 border-[#eb9728]/20 text-[#eb9728]",
    },
    closed: {
      label: "Closed",
      class: "bg-white/5 border-white/10 text-white/40",
    },
    cancelled: {
      label: "Cancelled",
      class: "bg-red-500/10 border-red-500/20 text-red-400",
    },
  };

  const getStatusInfo = (s) =>
    statusConfig[s] || {
      label: s,
      class: "bg-white/5 border-white/10 text-white/40",
    };

  const getTimeRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;
    if (diff <= 0) return "Expired";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h remaining`;
  };

  const FILTERS = ["all", "active", "pending", "closed", "cancelled"];

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728] mb-1">
              Requests for Quote
            </p>
            <h1 className="text-3xl font-black tracking-tight text-white">
              My RFQs
            </h1>
            <p className="text-sm text-white/35 mt-1">
              Manage your quotes and view manufacturer bids
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/customer/dashboard">
              <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-white/60 hover:bg-white/[0.07] hover:text-white transition-all">
                <span className="material-symbols-outlined text-[16px]">
                  arrow_back
                </span>
                Dashboard
              </button>
            </Link>
            <Link href="/custom-orders/new">
              <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#eb9728] text-sm font-bold text-black hover:bg-[#d4871f] transition-all">
                <span className="material-symbols-outlined text-[16px]">
                  add
                </span>
                Create Custom Order
              </button>
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/8 w-fit">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all ${
                filter === f
                  ? "bg-[#eb9728] text-black"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* RFQ List */}
        {rfqs.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-[#0c0c11] py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-4xl text-white/20">
                request_quote
              </span>
            </div>
            <h3 className="text-base font-bold text-white/70 mb-2">
              No RFQs yet
            </h3>
            <p className="text-sm text-white/35 max-w-sm mx-auto mb-6">
              Create a custom order first, then convert it to an RFQ to receive
              bids from manufacturers
            </p>
            <Link href="/custom-orders/new">
              <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#eb9728] text-sm font-bold text-black hover:bg-[#d4871f] transition-all">
                <span className="material-symbols-outlined text-[16px]">
                  add
                </span>
                Create Custom Order
              </button>
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
            <div className="divide-y divide-white/5">
              {rfqs.map((rfq) => {
                const statusInfo = getStatusInfo(rfq.status);
                return (
                  <div
                    key={rfq._id}
                    className="px-6 py-5 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Title + status */}
                        <div className="flex items-center gap-2.5 mb-3">
                          <h3 className="text-sm font-bold text-white/85 truncate flex items-center gap-2">
                            {rfq.customOrderId?.title || "RFQ"}
                            {rfq.customOrderId?.model3D?.url && (
                              <span className="px-1.5 py-0.5 rounded bg-[#eb9728]/10 text-[#eb9728] border border-[#eb9728]/20 text-[10px] font-bold">
                                3D Model
                              </span>
                            )}
                          </h3>
                          <span
                            className={`shrink-0 px-2.5 py-1 rounded-full border text-[10px] font-bold ${statusInfo.class}`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-[13px] text-white/45 mb-4 line-clamp-2 leading-relaxed">
                          {rfq.customOrderId?.description || "No description"}
                        </p>

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[13px] text-white/25">
                              gavel
                            </span>
                            <span className="text-[11px] text-white/40">
                              {rfq.bidsCount || 0} bid
                              {rfq.bidsCount !== 1 ? "s" : ""}
                            </span>
                          </div>
                          {rfq.endDate && rfq.status === "active" && (
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[13px] text-[#eb9728]/60">
                                schedule
                              </span>
                              <span className="text-[11px] font-semibold text-[#eb9728]">
                                {getTimeRemaining(rfq.endDate)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[13px] text-white/25">
                              calendar_today
                            </span>
                            <span className="text-[11px] text-white/40">
                              {new Date(rfq.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 shrink-0">
                        <Link href={`/customer/rfqs/${rfq._id}`}>
                          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/8 text-[11px] font-bold text-white/60 hover:bg-[#eb9728]/10 hover:border-[#eb9728]/20 hover:text-[#eb9728] transition-all whitespace-nowrap">
                            View Details
                            <span className="material-symbols-outlined text-[14px]">
                              arrow_forward
                            </span>
                          </button>
                        </Link>
                        {rfq.bidsCount > 0 && (
                          <Link href={`/customer/rfqs/${rfq._id}/bids`}>
                            <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#eb9728]/10 border border-[#eb9728]/20 text-[11px] font-bold text-[#eb9728] hover:bg-[#eb9728]/20 transition-colors whitespace-nowrap">
                              <span className="material-symbols-outlined text-[14px]">
                                gavel
                              </span>
                              View Bids ({rfq.bidsCount})
                            </button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
// // app/customer/rfqs/page.js
// "use client";

// import { useState, useEffect, useCallback } from "react";
// import { useRouter } from "next/navigation";
// import { useSession } from "next-auth/react";
// import Link from "next/link";

// export default function CustomerRFQsListPage() {
//   const router = useRouter();
//   const { data: session, status } = useSession();
//   const [rfqs, setRfqs] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [filter, setFilter] = useState("all");

//   const fetchRFQs = useCallback(async () => {
//     setLoading(true);
//     try {
//       const url = filter === "all" ? "/api/rfqs" : `/api/rfqs?status=${filter}`;
//       const response = await fetch(url);
//       const data = await response.json();

//       if (data.success) {
//         setRfqs(data.rfqs || []);
//       }
//     } catch (error) {
//       console.error("Error fetching RFQs:", error);
//     } finally {
//       setLoading(false);
//     }
//   }, [filter]);

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
//       fetchRFQs();
//     }
//   }, [status, session, router, fetchRFQs]);

//   if (status === "loading" || loading) {
//     return <GlobalLoader fullScreen text="Loading..." />;
//   }

//   if (status === "unauthenticated") {
//     return null;
//   }

//   const getStatusColor = (status) => {
//     switch (status) {
//       case "active":
//         return "bg-green-100 text-green-800";
//       case "pending":
//         return "bg-yellow-100 text-yellow-800";
//       case "closed":
//         return "bg-gray-100 text-gray-800";
//       case "cancelled":
//         return "bg-red-100 text-red-800";
//       default:
//         return "bg-gray-100 text-gray-800";
//     }
//   };

//   const getTimeRemaining = (endDate) => {
//     const now = new Date();
//     const end = new Date(endDate);
//     const diff = end - now;

//     if (diff <= 0) return "Expired";

//     const days = Math.floor(diff / (1000 * 60 * 60 * 24));
//     const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

//     return `${days}d ${hours}h remaining`;
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 p-6">
//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <div className="mb-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <h1 className="text-3xl font-bold text-gray-900">
//                 My RFQs (Requests for Quote)
//               </h1>
//               <p className="text-gray-600 mt-1">
//                 Manage your quotes and view manufacturer bids
//               </p>
//             </div>
//             <div className="flex gap-3">
//               <Link href="/customer/dashboard">
//                 <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
//                   Back to Dashboard
//                 </button>
//               </Link>
//               <Link href="/custom-orders/new">
//                 <button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
//                   + Create Custom Order
//                 </button>
//               </Link>
//             </div>
//           </div>
//         </div>

//         {/* Filter Tabs */}
//         <div className="mb-6 border-b border-gray-200">
//           <div className="flex gap-6">
//             {["all", "active", "pending", "closed", "cancelled"].map(
//               (statusFilter) => (
//                 <button
//                   key={statusFilter}
//                   onClick={() => setFilter(statusFilter)}
//                   className={`pb-3 px-2 text-sm font-medium capitalize transition-colors ${
//                     filter === statusFilter
//                       ? "border-b-2 border-amber-600 text-amber-600"
//                       : "text-gray-600 hover:text-gray-900"
//                   }`}
//                 >
//                   {statusFilter}
//                 </button>
//               ),
//             )}
//           </div>
//         </div>

//         {/* RFQs List */}
//         {rfqs.length === 0 ? (
//           <div className="bg-white rounded-lg shadow-sm p-12 text-center">
//             <div className="text-gray-400 mb-4">
//               <span className="material-symbols-outlined text-6xl">
//                 request_quote
//               </span>
//             </div>
//             <h3 className="text-xl font-semibold text-gray-900 mb-2">
//               No RFQs yet
//             </h3>
//             <p className="text-gray-600 mb-6">
//               Create a custom order first, then convert it to an RFQ to receive
//               bids from manufacturers
//             </p>
//             <Link href="/custom-orders/new">
//               <button className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
//                 Create Custom Order
//               </button>
//             </Link>
//           </div>
//         ) : (
//           <div className="grid grid-cols-1 gap-4">
//             {rfqs.map((rfq) => (
//               <div
//                 key={rfq._id}
//                 className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
//               >
//                 <div className="flex justify-between items-start">
//                   <div className="flex-1">
//                     <div className="flex items-center gap-3 mb-2">
//                       <h3 className="text-lg font-semibold text-gray-900">
//                         {rfq.customOrderId?.title || "RFQ"}
//                       </h3>
//                       <span
//                         className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
//                           rfq.status,
//                         )}`}
//                       >
//                         {rfq.status}
//                       </span>
//                     </div>
//                     <p className="text-gray-600 text-sm mb-3 line-clamp-2">
//                       {rfq.customOrderId?.description || "No description"}
//                     </p>
//                     <div className="flex items-center gap-6 text-sm text-gray-500">
//                       <span>Bids: {rfq.bidsCount || 0}</span>
//                       {rfq.endDate && rfq.status === "active" && (
//                         <span className="text-orange-600 font-medium">
//                           {getTimeRemaining(rfq.endDate)}
//                         </span>
//                       )}
//                       <span>
//                         Created: {new Date(rfq.createdAt).toLocaleDateString()}
//                       </span>
//                     </div>
//                   </div>
//                   <div className="flex flex-col gap-2 ml-4">
//                     <Link href={`/customer/rfqs/${rfq._id}`}>
//                       <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 whitespace-nowrap">
//                         View Details
//                       </button>
//                     </Link>
//                     {rfq.bidsCount > 0 && (
//                       <Link href={`/customer/rfqs/${rfq._id}/bids`}>
//                         <button className="px-4 py-2 border border-amber-600 text-amber-600 text-sm rounded-lg hover:bg-amber-50 whitespace-nowrap">
//                           View Bids ({rfq.bidsCount})
//                         </button>
//                       </Link>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
