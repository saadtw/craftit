// app/customer/rfqs/[id]/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Script from "next/script";
import Image from "next/image";
import Editor3DWrapper from "@/modules/components/Editor3DWrapper";

export default function CustomerRFQDetails() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const rfqId = params?.id?.toString();

  const [rfq, setRfq] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRFQ = useCallback(async () => {
    if (!rfqId) {
      setLoading(false);
      return;
    }
    if (rfqId === "new") {
      router.replace("/custom-orders/new");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`/api/rfqs/${rfqId}`);
      const data = await response.json();
      if (data.success && data.rfq) {
        setRfq(data.rfq);
        if (data.bids) setBids(data.bids);
      } else {
        alert("Error loading RFQ: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error loading RFQ");
    } finally {
      setLoading(false);
    }
  }, [rfqId, router]);

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
      fetchRFQ();
    }
  }, [status, session, router, fetchRFQ]);

  const getTimeRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;
    if (diff <= 0) return "Expired";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h remaining`;
  };

  const handleCancelRFQ = async () => {
    if (!confirm("Are you sure you want to cancel this RFQ?")) return;
    try {
      const response = await fetch(`/api/rfqs/${rfqId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          reason: "Cancelled by customer",
        }),
      });
      const data = await response.json();
      if (data.success) {
        alert("RFQ cancelled successfully");
        fetchRFQ();
      } else alert("Error: " + data.error);
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleCompareBids = () => router.push(`/customer/rfqs/${rfqId}/bids`);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-[#eb9728] animate-spin" />
          <GlobalLoader text="Loading RFQ..." />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  if (!rfq) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-white/15 block mb-3">
            gavel
          </span>
          <p className="text-sm text-white/40">RFQ not found.</p>
        </div>
      </div>
    );
  }

  const isActive = rfq.status === "active";

  const statusConfig = {
    active: {
      label: "Active",
      class: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    },
    bid_accepted: {
      label: "Bid Accepted",
      class: "bg-blue-500/10 border-blue-500/20 text-blue-400",
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
  const statusInfo = statusConfig[rfq.status] || {
    label: rfq.status,
    class: "bg-white/5 border-white/10 text-white/40",
  };

  const bidStatusConfig = {
    accepted: {
      class: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    },
    under_consideration: {
      class: "bg-[#eb9728]/10 border-[#eb9728]/20 text-[#eb9728]",
    },
  };

  return (
    <>
      <div className="min-h-screen bg-[#050507] text-white">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728] mb-1">
                RFQ Details
              </p>
              <h1 className="text-3xl font-black tracking-tight text-white">
                {rfq.customOrderId?.title || "RFQ Details"}
              </h1>
              <p className="text-sm text-white/35 mt-1">RFQ #{rfq.rfqNumber}</p>
            </div>
            <span
              className={`px-3 py-1.5 rounded-full border text-[11px] font-bold ${statusInfo.class}`}
            >
              {statusInfo.label}
            </span>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Time Remaining",
                value: getTimeRemaining(rfq.endDate),
                icon: "schedule",
                accent: false,
              },
              {
                label: "Total Bids",
                value: bids.length,
                icon: "gavel",
                accent: true,
              },
              {
                label: "Min Bid Threshold",
                value: `$${rfq.minBidThreshold || 0}`,
                icon: "payments",
                accent: false,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`rounded-2xl border p-5 ${stat.accent ? "bg-gradient-to-br from-[#eb9728]/15 to-[#eb9728]/5 border-[#eb9728]/30" : "bg-[#0c0c11] border-white/8"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 mb-2">
                      {stat.label}
                    </p>
                    <p
                      className={`text-2xl font-black ${stat.accent ? "text-[#eb9728]" : "text-white"}`}
                    >
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${stat.accent ? "bg-[#eb9728]/20 text-[#eb9728]" : "bg-white/[0.05] text-white/40"}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {stat.icon}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Project Details */}
          {rfq.customOrderId && (
            <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
              <div className="px-6 py-5 border-b border-white/8">
                <h2 className="text-base font-bold text-white">
                  Project Details
                </h2>
              </div>
              <div className="px-6 py-5 space-y-5">
                {rfq.customOrderId.description && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-2">
                      Description
                    </p>
                    <p className="text-sm text-white/70 leading-relaxed">
                      {rfq.customOrderId.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Quantity",
                      value: rfq.customOrderId.quantity,
                      icon: "inventory_2",
                    },
                    rfq.customOrderId.budget && {
                      label: "Budget",
                      value: `$${rfq.customOrderId.budget}`,
                      icon: "payments",
                    },
                    rfq.customOrderId.deadline && {
                      label: "Deadline",
                      value: new Date(
                        rfq.customOrderId.deadline,
                      ).toLocaleDateString(),
                      icon: "event",
                    },
                  ]
                    .filter(Boolean)
                    .map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border border-white/8 bg-white/[0.03] p-3.5"
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="material-symbols-outlined text-[13px] text-white/30">
                            {item.icon}
                          </span>
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">
                            {item.label}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-white/80">
                          {item.value}
                        </p>
                      </div>
                    ))}
                </div>

                {rfq.customOrderId.materialPreferences?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-2">
                      Materials
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {rfq.customOrderId.materialPreferences.map((m) => (
                        <span
                          key={m}
                          className="px-3 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-semibold text-white/60"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {rfq.customOrderId.colorSpecifications?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-2">
                      Colors
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {rfq.customOrderId.colorSpecifications.map((c) => (
                        <span
                          key={c}
                          className="px-3 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-semibold text-white/60"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {rfq.customOrderId.specialRequirements && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-2">
                      Special Requirements
                    </p>
                    <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap bg-white/[0.02] border border-white/6 rounded-xl px-4 py-3">
                      {rfq.customOrderId.specialRequirements}
                    </p>
                  </div>
                )}

                {/* 3D Model */}
                {rfq.customOrderId.model3D && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-3">
                      3D Model
                    </p>
                    <div className="rounded-xl overflow-hidden border border-white/8 bg-white/[0.02]">
                      <Editor3DWrapper
                        modelUrl={rfq.customOrderId.model3D.url}
                        initialAnnotations={rfq.customOrderId.model3D.annotations}
                        initialCameraState={rfq.customOrderId.model3D.cameraState}
                        readOnly={true}
                      />
                    </div>
                  </div>
                )}

                {/* Images */}
                {rfq.customOrderId.images?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-3">
                      Images
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {rfq.customOrderId.images.map((img, idx) => (
                        <div
                          key={idx}
                          className="relative h-44 rounded-xl overflow-hidden border border-white/8"
                        >
                          <Image
                            src={img.url}
                            alt={`Image ${idx + 1}`}
                            fill
                            className="object-cover"
                            sizes="33vw"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bids */}
          <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
            <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white">
                  Bids Received
                </h2>
                <p className="text-[11px] text-white/30 mt-0.5">
                  {bids.length} bid{bids.length !== 1 ? "s" : ""} received
                </p>
              </div>
              {bids.length > 1 && (
                <button
                  onClick={handleCompareBids}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#eb9728]/10 border border-[#eb9728]/20 text-[11px] font-bold text-[#eb9728] hover:bg-[#eb9728]/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    compare
                  </span>
                  Compare All Bids
                </button>
              )}
            </div>

            {bids.length === 0 ? (
              <div className="py-16 text-center">
                <div className="h-14 w-14 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-3xl text-white/20">
                    gavel
                  </span>
                </div>
                <p className="text-sm text-white/35">No bids received yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {bids.map((bid) => {
                  const bidStatus = bidStatusConfig[bid.status] || {
                    class: "bg-white/5 border-white/10 text-white/40",
                  };
                  return (
                    <div
                      key={bid._id}
                      className="px-6 py-5 hover:bg-white/[0.02] transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-4">
                            <p className="text-sm font-bold text-white/85">
                              {bid.manufacturerId.businessName ||
                                bid.manufacturerId.name}
                            </p>
                            {bid.manufacturerId.verificationStatus ===
                              "verified" && (
                              <span className="material-symbols-outlined text-[15px] text-emerald-400">
                                verified
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-1">
                                Bid Amount
                              </p>
                              <p className="text-2xl font-black text-[#eb9728]">
                                ${bid.amount}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-1">
                                Timeline
                              </p>
                              <p className="text-lg font-bold text-white/80">
                                {bid.timeline} days
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-1">
                                Status
                              </p>
                              <span
                                className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold ${bidStatus.class}`}
                              >
                                {bid.status.replace("_", " ").toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => router.push(`/bids/${bid._id}`)}
                          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/8 text-[11px] font-bold text-white/60 hover:bg-[#eb9728]/10 hover:border-[#eb9728]/20 hover:text-[#eb9728] transition-all"
                        >
                          View Details
                          <span className="material-symbols-outlined text-[14px]">
                            arrow_forward
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/customer/rfqs")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-white/60 hover:bg-white/[0.07] hover:text-white transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">
                arrow_back
              </span>
              Back to RFQs
            </button>

            {isActive && (
              <button
                onClick={handleCancelRFQ}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">
                  cancel
                </span>
                Cancel RFQ
              </button>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
// // app/customer/rfqs/[id]/page.js
// "use client";

// import { useState, useEffect, useCallback } from "react";
// import { useParams, useRouter } from "next/navigation";
// import { useSession } from "next-auth/react";
// import Script from "next/script";
// import Image from "next/image";

// export default function CustomerRFQDetails() {
//   const params = useParams();
//   const router = useRouter();
//   const { data: session, status } = useSession();
//   const rfqId = params?.id?.toString();

//   const [rfq, setRfq] = useState(null);
//   const [bids, setBids] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const fetchRFQ = useCallback(async () => {
//     if (!rfqId) {
//       setLoading(false);
//       return;
//     }

//     if (rfqId === "new") {
//       router.replace("/custom-orders/new");
//       setLoading(false);
//       return;
//     }
//     try {
//       const response = await fetch(`/api/rfqs/${rfqId}`);
//       const data = await response.json();

//       if (data.success && data.rfq) {
//         setRfq(data.rfq);
//         if (data.bids) {
//           setBids(data.bids);
//         }
//       } else {
//         alert("Error loading RFQ: " + (data.error || "Unknown error"));
//       }
//     } catch (error) {
//       console.error("Error:", error);
//       alert("Error loading RFQ");
//     } finally {
//       setLoading(false);
//     }
//   }, [rfqId, router]);

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
//       fetchRFQ();
//     }
//   }, [status, session, router, fetchRFQ]);

//   const getTimeRemaining = (endDate) => {
//     const now = new Date();
//     const end = new Date(endDate);
//     const diff = end - now;

//     if (diff <= 0) return "Expired";

//     const days = Math.floor(diff / (1000 * 60 * 60 * 24));
//     const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

//     return `${days}d ${hours}h remaining`;
//   };

//   const handleCancelRFQ = async () => {
//     if (!confirm("Are you sure you want to cancel this RFQ?")) return;

//     try {
//       const response = await fetch(`/api/rfqs/${rfqId}`, {
//         method: "PUT",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           action: "cancel",
//           reason: "Cancelled by customer",
//         }),
//       });

//       const data = await response.json();

//       if (data.success) {
//         alert("RFQ cancelled successfully");
//         fetchRFQ();
//       } else {
//         alert("Error: " + data.error);
//       }
//     } catch (error) {
//       alert("Error: " + error.message);
//     }
//   };

//   const handleCompareBids = () => {
//     router.push(`/customer/rfqs/${rfqId}/bids`);
//   };

//   if (status === "loading" || loading)
//     return <GlobalLoader fullScreen text="Loading..." />;

//   if (status === "unauthenticated") {
//     router.push("/auth/login");
//     return null;
//   }

//   if (!rfq) return <div className="p-6">RFQ not found</div>;

//   const isActive = rfq.status === "active";
//   const isClosed = ["closed", "bid_accepted", "cancelled"].includes(rfq.status);

//   return (
//     <>
//       <Script
//         type="module"
//         src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"
//       />

//       <div className="max-w-6xl mx-auto p-6">
//         <div className="flex justify-between items-start mb-6">
//           <div>
//             <h1 className="text-3xl font-bold">
//               {rfq.customOrderId?.title || "RFQ Details"}
//             </h1>
//             <p className="text-gray-600 mt-1">RFQ #{rfq.rfqNumber}</p>
//           </div>

//           <span
//             className={`px-4 py-2 rounded text-sm font-semibold ${
//               rfq.status === "active"
//                 ? "bg-green-100 text-green-800"
//                 : rfq.status === "bid_accepted"
//                   ? "bg-blue-100 text-blue-800"
//                   : "bg-gray-100 text-gray-800"
//             }`}
//           >
//             {rfq.status.toUpperCase().replace("_", " ")}
//           </span>
//         </div>

//         {/* Time & Stats Card */}
//         <div className="grid grid-cols-3 gap-4 mb-6">
//           <div className="bg-blue-50 p-4 rounded">
//             <p className="text-sm text-gray-600">Time Remaining</p>
//             <p className="text-xl font-bold text-blue-800">
//               {getTimeRemaining(rfq.endDate)}
//             </p>
//           </div>
//           <div className="bg-purple-50 p-4 rounded">
//             <p className="text-sm text-gray-600">Total Bids</p>
//             <p className="text-xl font-bold text-purple-800">{bids.length}</p>
//           </div>
//           <div className="bg-green-50 p-4 rounded">
//             <p className="text-sm text-gray-600">Minimum Bid</p>
//             <p className="text-xl font-bold text-green-800">
//               ${rfq.minBidThreshold || 0}
//             </p>
//           </div>
//         </div>

//         {/* Custom Order Details */}
//         {rfq.customOrderId && (
//           <div className="bg-white p-6 rounded shadow mb-6">
//             <h2 className="text-xl font-bold mb-4">Project Details</h2>
//             <div className="space-y-3">
//               <div>
//                 <label className="font-semibold text-gray-700">
//                   Description:
//                 </label>
//                 <p className="text-gray-900 mt-1">
//                   {rfq.customOrderId.description}
//                 </p>
//               </div>

//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label className="font-semibold text-gray-700">
//                     Quantity:
//                   </label>
//                   <p className="text-gray-900">{rfq.customOrderId.quantity}</p>
//                 </div>
//                 {rfq.customOrderId.budget && (
//                   <div>
//                     <label className="font-semibold text-gray-700">
//                       Budget:
//                     </label>
//                     <p className="text-gray-900">${rfq.customOrderId.budget}</p>
//                   </div>
//                 )}
//               </div>

//               {rfq.customOrderId.materialPreferences &&
//                 rfq.customOrderId.materialPreferences.length > 0 && (
//                   <div>
//                     <label className="font-semibold text-gray-700">
//                       Materials:
//                     </label>
//                     <p className="text-gray-900">
//                       {rfq.customOrderId.materialPreferences.join(", ")}
//                     </p>
//                   </div>
//                 )}

//               {rfq.customOrderId.colorSpecifications &&
//                 rfq.customOrderId.colorSpecifications.length > 0 && (
//                   <div>
//                     <label className="font-semibold text-gray-700">
//                       Colors:
//                     </label>
//                     <p className="text-gray-900">
//                       {rfq.customOrderId.colorSpecifications.join(", ")}
//                     </p>
//                   </div>
//                 )}

//               {rfq.customOrderId.deadline && (
//                 <div>
//                   <label className="font-semibold text-gray-700">
//                     Deadline:
//                   </label>
//                   <p className="text-gray-900">
//                     {new Date(rfq.customOrderId.deadline).toLocaleDateString()}
//                   </p>
//                 </div>
//               )}

//               {rfq.customOrderId.specialRequirements && (
//                 <div>
//                   <label className="font-semibold text-gray-700">
//                     Special Requirements:
//                   </label>
//                   <p className="text-gray-900 whitespace-pre-wrap">
//                     {rfq.customOrderId.specialRequirements}
//                   </p>
//                 </div>
//               )}
//             </div>

//             {/* 3D Model Viewer */}
//             {rfq.customOrderId.model3D && (
//               <div className="mt-6">
//                 <h3 className="font-bold mb-2">3D Model</h3>
//                 <model-viewer
//                   src={rfq.customOrderId.model3D.url}
//                   alt="3D Model"
//                   auto-rotate
//                   camera-controls
//                   className="w-full h-96 bg-gray-100 rounded"
//                 />
//               </div>
//             )}

//             {/* Images */}
//             {rfq.customOrderId.images &&
//               rfq.customOrderId.images.length > 0 && (
//                 <div className="mt-6">
//                   <h3 className="font-bold mb-2">Images</h3>
//                   <div className="grid grid-cols-3 gap-4">
//                     {rfq.customOrderId.images.map((img, idx) => (
//                       <div
//                         key={idx}
//                         className="relative h-48 rounded overflow-hidden"
//                       >
//                         <Image
//                           src={img.url}
//                           alt={`Image ${idx + 1}`}
//                           fill
//                           className="object-cover"
//                           sizes="33vw"
//                         />
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
//           </div>
//         )}

//         {/* Bids List */}
//         <div className="bg-white p-6 rounded shadow mb-6">
//           <div className="flex justify-between items-center mb-4">
//             <h2 className="text-xl font-bold">Bids Received ({bids.length})</h2>
//             {bids.length > 1 && (
//               <button
//                 onClick={handleCompareBids}
//                 className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
//               >
//                 Compare All Bids
//               </button>
//             )}
//           </div>

//           {bids.length === 0 ? (
//             <p className="text-gray-500 text-center py-8">
//               No bids received yet
//             </p>
//           ) : (
//             <div className="space-y-4">
//               {bids.map((bid) => (
//                 <div
//                   key={bid._id}
//                   className="border rounded p-4 hover:border-blue-500 transition"
//                 >
//                   <div className="flex justify-between items-start">
//                     <div className="flex-1">
//                       <div className="flex items-center gap-2 mb-2">
//                         <p className="font-bold text-lg">
//                           {bid.manufacturerId.businessName ||
//                             bid.manufacturerId.name}
//                         </p>
//                         {bid.manufacturerId.verificationStatus ===
//                           "verified" && (
//                           <span
//                             className="text-green-600 text-xl"
//                             title="Verified"
//                           >
//                             ✓
//                           </span>
//                         )}
//                       </div>
//                       <div className="grid grid-cols-3 gap-4 text-sm">
//                         <div>
//                           <p className="text-gray-600">Bid Amount</p>
//                           <p className="text-2xl font-bold text-blue-600">
//                             ${bid.amount}
//                           </p>
//                         </div>
//                         <div>
//                           <p className="text-gray-600">Timeline</p>
//                           <p className="text-lg font-semibold">
//                             {bid.timeline} days
//                           </p>
//                         </div>
//                         <div>
//                           <p className="text-gray-600">Status</p>
//                           <span
//                             className={`px-2 py-1 rounded text-xs font-semibold ${
//                               bid.status === "accepted"
//                                 ? "bg-green-100 text-green-800"
//                                 : bid.status === "under_consideration"
//                                   ? "bg-yellow-100 text-yellow-800"
//                                   : "bg-gray-100 text-gray-800"
//                             }`}
//                           >
//                             {bid.status.replace("_", " ").toUpperCase()}
//                           </span>
//                         </div>
//                       </div>
//                     </div>
//                     <button
//                       onClick={() => router.push(`/bids/${bid._id}`)}
//                       className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ml-4"
//                     >
//                       View Details
//                     </button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         {/* Action Buttons */}
//         <div className="flex gap-4">
//           <button
//             onClick={() => router.push("/customer/rfqs")}
//             className="px-6 py-3 bg-gray-500 text-white rounded hover:bg-gray-600"
//           >
//             Back to RFQs
//           </button>

//           {isActive && (
//             <button
//               onClick={handleCancelRFQ}
//               className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700"
//             >
//               Cancel RFQ
//             </button>
//           )}
//         </div>
//       </div>
//     </>
//   );
// }
