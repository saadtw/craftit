// app/custom-orders/[id]/review/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Script from "next/script";
import Image from "next/image";
import CustomerMainNavbar from "@/components/CustomerMainNavbar";
import { CUSTOMIZATION_TYPE_OPTIONS } from "@/lib/customization";
import Editor3DWrapper from "@/modules/components/Editor3DWrapper";

const customizationTypeLabelMap = CUSTOMIZATION_TYPE_OPTIONS.reduce(
  (acc, item) => {
    acc[item.id] = item.label;
    return acc;
  },
  {},
);

export default function CustomOrderReview() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [customOrder, setCustomOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCustomOrder = useCallback(async () => {
    try {
      const response = await fetch(`/api/custom-orders/${params.id}`);
      const data = await response.json();
      if (data.success && data.order) setCustomOrder(data.order);
      else alert("Error loading order: " + (data.error || "Unknown error"));
    } catch (error) {
      alert("Error loading order: " + error.message);
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
      if (session.user.role !== "customer") {
        router.push("/auth/login");
        return;
      }
      fetchCustomOrder();
    }
  }, [status, session, router, fetchCustomOrder]);

  const handleEdit = () => router.push(`/custom-orders/${params.id}/edit`);
  const handleCreateRFQ = () =>
    router.push(`/custom-orders/${params.id}/create-rfq`);
  const handleViewRFQ = () => {
    if (customOrder.rfqId)
      router.push(
        `/customer/rfqs/${customOrder.rfqId._id || customOrder.rfqId}`,
      );
  };

  const handleSaveAsDraft = async () => {
    try {
      const response = await fetch(`/api/custom-orders/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });
      const data = await response.json();
      if (data.success) {
        alert("Saved as draft!");
        router.push("/customer/custom-orders");
      } else alert("Error: " + data.error);
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-[#eb9728] animate-spin" />
          <GlobalLoader text="Loading order..." />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  if (!customOrder) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-white/15 block mb-3">
            inventory_2
          </span>
          <p className="text-sm text-white/40">Order not found.</p>
        </div>
      </div>
    );
  }

  const labelClass =
    "text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-1.5 block";

  const DetailRow = ({ label, value, icon }) =>
    value ? (
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          {icon && (
            <span className="material-symbols-outlined text-[13px] text-white/25">
              {icon}
            </span>
          )}
          <span className={labelClass}>{label}</span>
        </div>
        <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap bg-white/[0.02] border border-white/6 rounded-xl px-4 py-3">
          {value}
        </p>
      </div>
    ) : null;

  return (
    <>
      <Script
        type="module"
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"
      />

      <div className="min-h-screen bg-[#050507] text-white">
        <CustomerMainNavbar />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Header */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728] mb-1">
              Custom Order
            </p>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Review Order
            </h1>
          </div>

          {/* Warning Banner */}
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-[#eb9728]/20 bg-[#eb9728]/8">
            <span className="material-symbols-outlined text-[18px] text-[#eb9728] shrink-0 mt-0.5">
              info
            </span>
            <p className="text-sm text-[#eb9728]/80 leading-relaxed">
              Please review your custom order details carefully before
              proceeding. These details cannot be edited after creating an RFQ.
            </p>
          </div>

          {/* Order Details */}
          <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
            <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Order Details</h2>
              <button
                onClick={handleEdit}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#eb9728] hover:text-amber-400 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">
                  edit
                </span>
                Edit Order
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Title */}
              <div>
                <span className={labelClass}>Title</span>
                <p className="text-base font-bold text-white/85">
                  {customOrder.title}
                </p>
              </div>

              {/* Description */}
              <DetailRow
                label="Description"
                value={customOrder.description}
                icon="description"
              />

              {/* Grid Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/6 bg-white/[0.03] p-3.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="material-symbols-outlined text-[13px] text-white/25">
                      numbers
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">
                      Quantity
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white/80">
                    {customOrder.quantity}
                  </p>
                </div>

                {customOrder.budget && (
                  <div className="rounded-xl border border-white/6 bg-white/[0.03] p-3.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="material-symbols-outlined text-[13px] text-white/25">
                        payments
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">
                        Budget
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white/80">
                      ${customOrder.budget}
                    </p>
                  </div>
                )}

                {customOrder.deadline && (
                  <div className="rounded-xl border border-white/6 bg-white/[0.03] p-3.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="material-symbols-outlined text-[13px] text-white/25">
                        event
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">
                        Deadline
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white/80">
                      {new Date(customOrder.deadline).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Materials */}
              {customOrder.materialPreferences?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="material-symbols-outlined text-[13px] text-white/25">
                      category
                    </span>
                    <span className={labelClass}>Material Preferences</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {customOrder.materialPreferences.map((m) => (
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

              {/* Colors */}
              {customOrder.colorSpecifications?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="material-symbols-outlined text-[13px] text-white/25">
                      palette
                    </span>
                    <span className={labelClass}>Color Specifications</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {customOrder.colorSpecifications.map((c) => (
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

              <DetailRow
                label="Special Requirements"
                value={customOrder.specialRequirements}
                icon="rule"
              />

              {/* Source */}
              {(customOrder.sourceProductId ||
                customOrder.sourceManufacturerId) && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="material-symbols-outlined text-[13px] text-white/25">
                      link
                    </span>
                    <span className={labelClass}>Request Source</span>
                  </div>
                  <div className="space-y-1.5">
                    {customOrder.sourceProductId && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/8 bg-white/[0.03]">
                        <span className="material-symbols-outlined text-[14px] text-white/30">
                          inventory_2
                        </span>
                        <p className="text-[11px] text-white/60">
                          Product:{" "}
                          <span className="font-bold">
                            {customOrder.sourceContext?.productName ||
                              "Linked Product"}
                          </span>
                        </p>
                      </div>
                    )}
                    {customOrder.sourceManufacturerId && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/8 bg-white/[0.03]">
                        <span className="material-symbols-outlined text-[14px] text-white/30">
                          factory
                        </span>
                        <p className="text-[11px] text-white/60">
                          Manufacturer:{" "}
                          <span className="font-bold">
                            {customOrder.sourceContext?.manufacturerName ||
                              "Linked Manufacturer"}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Customization Types */}
              {Array.isArray(customOrder.requestedCustomizationTypes) &&
                customOrder.requestedCustomizationTypes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="material-symbols-outlined text-[13px] text-white/25">
                        tune
                      </span>
                      <span className={labelClass}>
                        Requested Customizations
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {customOrder.requestedCustomizationTypes.map((type) => (
                        <span
                          key={type}
                          className="px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/10 text-[11px] font-semibold text-violet-300"
                        >
                          {customizationTypeLabelMap[type] || type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              <DetailRow
                label="Customization Details"
                value={customOrder.customizationDetails}
                icon="edit_note"
              />
            </div>
          </div>

          {/* 3D Model */}
          {customOrder.model3D && (
            <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
              <div className="px-6 py-5 border-b border-white/8">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#eb9728]">
                    view_in_ar
                  </span>
                  3D Model
                </h2>
              </div>
              <div className="p-5">
                <div className="rounded-xl overflow-hidden border border-white/8 bg-white/[0.02]">
                  <Editor3DWrapper
                    modelUrl={customOrder.model3D.url}
                    initialAnnotations={customOrder.model3D.annotations}
                    initialCameraState={customOrder.model3D.cameraState}
                    readOnly={true}
                  />
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="material-symbols-outlined text-[14px] text-white/25">
                    attach_file
                  </span>
                  <p className="text-[11px] text-white/35">
                    {customOrder.model3D.filename}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Images */}
          {customOrder.images?.length > 0 && (
            <div className="rounded-2xl border border-white/8 bg-[#0c0c11] overflow-hidden">
              <div className="px-6 py-5 border-b border-white/8">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#eb9728]">
                    image
                  </span>
                  Reference Images
                </h2>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-3 gap-3">
                  {customOrder.images.map((img, idx) => (
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
            </div>
          )}

          {/* Linked Manufacturer Note */}
          {!customOrder.rfqId && customOrder.sourceManufacturerId && (
            <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-white/8 bg-white/[0.03]">
              <span className="material-symbols-outlined text-[16px] text-white/30 shrink-0 mt-0.5">
                info
              </span>
              <p className="text-[11px] text-white/45 leading-relaxed">
                This request is linked to a manufacturer and will default to a
                direct RFQ when you proceed.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pb-8">
            {/* Primary Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleEdit}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-white/60 hover:bg-white/[0.07] hover:text-white transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">
                  edit
                </span>
                Edit Order
              </button>

              {customOrder.rfqId ? (
                <button
                  onClick={handleViewRFQ}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    gavel
                  </span>
                  View RFQ Details
                </button>
              ) : (
                <button
                  onClick={handleCreateRFQ}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#eb9728] text-white text-sm font-bold hover:bg-amber-500 transition-colors shadow-[0_8px_24px_rgba(235,151,40,0.2)]"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    gavel
                  </span>
                  Create RFQ Auction
                </button>
              )}
            </div>

            {/* Secondary Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/customer/dashboard")}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/8 bg-white/[0.03] text-sm font-semibold text-white/50 hover:bg-white/[0.06] hover:text-white/80 transition-all"
              >
                <span className="material-symbols-outlined text-[15px]">
                  dashboard
                </span>
                Dashboard
              </button>
              <button
                onClick={() => router.push("/customer/custom-orders")}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/8 bg-white/[0.03] text-sm font-semibold text-white/50 hover:bg-white/[0.06] hover:text-white/80 transition-all"
              >
                <span className="material-symbols-outlined text-[15px]">
                  list
                </span>
                All Custom Orders
              </button>
              {customOrder.status === "submitted" && (
                <button
                  onClick={handleSaveAsDraft}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/8 bg-white/[0.03] text-sm font-semibold text-white/50 hover:bg-white/[0.06] hover:text-white/80 transition-all"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    draft
                  </span>
                  Revert to Draft
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
// app/custom-orders/[id]/review/page.js
// "use client";

// import { useState, useEffect, useCallback } from "react";
// import { useRouter, useParams } from "next/navigation";
// import { useSession } from "next-auth/react";
// import Script from "next/script";
// import Image from "next/image";
// import CustomerMainNavbar from "@/components/CustomerMainNavbar";
// import { CUSTOMIZATION_TYPE_OPTIONS } from "@/lib/customization";

// const customizationTypeLabelMap = CUSTOMIZATION_TYPE_OPTIONS.reduce(
//   (acc, item) => {
//     acc[item.id] = item.label;
//     return acc;
//   },
//   {},
// );

// export default function CustomOrderReview() {
//   const router = useRouter();
//   const params = useParams();
//   const { data: session, status } = useSession();
//   const [customOrder, setCustomOrder] = useState(null);
//   const [loading, setLoading] = useState(true);

//   const fetchCustomOrder = useCallback(async () => {
//     try {
//       const response = await fetch(`/api/custom-orders/${params.id}`);
//       const data = await response.json();

//       if (data.success && data.order) {
//         setCustomOrder(data.order);
//       } else {
//         alert("Error loading order: " + (data.error || "Unknown error"));
//       }
//     } catch (error) {
//       alert("Error loading order: " + error.message);
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
//       if (session.user.role !== "customer") {
//         router.push("/auth/login");
//         return;
//       }
//       fetchCustomOrder();
//     }
//   }, [status, session, router, fetchCustomOrder]);

//   const handleEdit = () => {
//     router.push(`/custom-orders/${params.id}/edit`);
//   };

//   const handleCreateRFQ = () => {
//     router.push(`/custom-orders/${params.id}/create-rfq`);
//   };

//   const handleViewRFQ = () => {
//     if (customOrder.rfqId) {
//       router.push(
//         `/customer/rfqs/${customOrder.rfqId._id || customOrder.rfqId}`,
//       );
//     }
//   };

//   const handleSaveAsDraft = async () => {
//     try {
//       const response = await fetch(`/api/custom-orders/${params.id}`, {
//         method: "PUT",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ status: "draft" }),
//       });

//       const data = await response.json();
//       if (data.success) {
//         alert("Saved as draft!");
//         router.push("/customer/custom-orders");
//       } else {
//         alert("Error: " + data.error);
//       }
//     } catch (error) {
//       alert("Error: " + error.message);
//     }
//   };

//   const handleBackToDashboard = () => {
//     router.push("/customer/dashboard");
//   };

//   const handleBackToList = () => {
//     router.push("/customer/custom-orders");
//   };

//   if (status === "loading" || loading)
//     return <GlobalLoader fullScreen text="Loading..." />;

//   if (status === "unauthenticated") {
//     router.push("/auth/login");
//     return null;
//   }

//   if (!customOrder) return <div className="p-6">Order not found</div>;

//   return (
//     <>
//       <Script
//         type="module"
//         src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"
//       />

//       <div className="min-h-screen bg-[#f8f7f6]">
//         <CustomerMainNavbar />
//         <div className="max-w-4xl mx-auto p-6">
//           <h1 className="text-3xl font-bold mb-6">Review Custom Order</h1>

//           <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-6">
//             <p className="text-sm text-yellow-800">
//               Please review your custom order details carefully before
//               proceeding. These details cannot be edited after creating an RFQ.
//             </p>
//           </div>

//           {/* Order Details - Read Only */}
//           <div className="bg-white p-6 rounded shadow mb-6">
//             <h2 className="text-xl font-bold mb-4">Order Details</h2>

//             <div className="space-y-4">
//               <div>
//                 <label className="block font-semibold text-gray-700 mb-1">
//                   Title
//                 </label>
//                 <p className="text-gray-900">{customOrder.title}</p>
//               </div>

//               <div>
//                 <label className="block font-semibold text-gray-700 mb-1">
//                   Description
//                 </label>
//                 <p className="text-gray-900 whitespace-pre-wrap">
//                   {customOrder.description}
//                 </p>
//               </div>

//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label className="block font-semibold text-gray-700 mb-1">
//                     Quantity
//                   </label>
//                   <p className="text-gray-900">{customOrder.quantity}</p>
//                 </div>

//                 {customOrder.budget && (
//                   <div>
//                     <label className="block font-semibold text-gray-700 mb-1">
//                       Budget
//                     </label>
//                     <p className="text-gray-900">${customOrder.budget}</p>
//                   </div>
//                 )}
//               </div>

//               {customOrder.materialPreferences &&
//                 customOrder.materialPreferences.length > 0 && (
//                   <div>
//                     <label className="block font-semibold text-gray-700 mb-1">
//                       Material Preferences
//                     </label>
//                     <p className="text-gray-900">
//                       {customOrder.materialPreferences.join(", ")}
//                     </p>
//                   </div>
//                 )}

//               {customOrder.colorSpecifications &&
//                 customOrder.colorSpecifications.length > 0 && (
//                   <div>
//                     <label className="block font-semibold text-gray-700 mb-1">
//                       Color Specifications
//                     </label>
//                     <p className="text-gray-900">
//                       {customOrder.colorSpecifications.join(", ")}
//                     </p>
//                   </div>
//                 )}

//               {customOrder.deadline && (
//                 <div>
//                   <label className="block font-semibold text-gray-700 mb-1">
//                     Deadline
//                   </label>
//                   <p className="text-gray-900">
//                     {new Date(customOrder.deadline).toLocaleDateString()}
//                   </p>
//                 </div>
//               )}

//               {customOrder.specialRequirements && (
//                 <div>
//                   <label className="block font-semibold text-gray-700 mb-1">
//                     Special Requirements
//                   </label>
//                   <p className="text-gray-900 whitespace-pre-wrap">
//                     {customOrder.specialRequirements}
//                   </p>
//                 </div>
//               )}

//               {(customOrder.sourceProductId ||
//                 customOrder.sourceManufacturerId) && (
//                 <div>
//                   <label className="block font-semibold text-gray-700 mb-1">
//                     Request Source
//                   </label>
//                   {customOrder.sourceProductId && (
//                     <p className="text-gray-900">
//                       Product:{" "}
//                       {customOrder.sourceContext?.productName ||
//                         "Linked Product"}
//                     </p>
//                   )}
//                   {customOrder.sourceManufacturerId && (
//                     <p className="text-gray-900">
//                       Manufacturer:{" "}
//                       {customOrder.sourceContext?.manufacturerName ||
//                         "Linked Manufacturer"}
//                     </p>
//                   )}
//                 </div>
//               )}

//               {Array.isArray(customOrder.requestedCustomizationTypes) &&
//                 customOrder.requestedCustomizationTypes.length > 0 && (
//                   <div>
//                     <label className="block font-semibold text-gray-700 mb-1">
//                       Requested Customizations
//                     </label>
//                     <p className="text-gray-900">
//                       {customOrder.requestedCustomizationTypes
//                         .map((type) => customizationTypeLabelMap[type] || type)
//                         .join(", ")}
//                     </p>
//                   </div>
//                 )}

//               {customOrder.customizationDetails && (
//                 <div>
//                   <label className="block font-semibold text-gray-700 mb-1">
//                     Customization Details
//                   </label>
//                   <p className="text-gray-900 whitespace-pre-wrap">
//                     {customOrder.customizationDetails}
//                   </p>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* 3D Model */}
//           {customOrder.model3D && (
//             <div className="bg-white p-6 rounded shadow mb-6">
//               <h2 className="text-xl font-bold mb-4">3D Model</h2>
//               <model-viewer
//                 src={customOrder.model3D.url}
//                 alt="3D Model"
//                 auto-rotate
//                 camera-controls
//                 className="w-full h-96 bg-gray-100 rounded"
//               />
//               <p className="text-sm text-gray-600 mt-2">
//                 File: {customOrder.model3D.filename}
//               </p>
//             </div>
//           )}

//           {/* Images */}
//           {customOrder.images && customOrder.images.length > 0 && (
//             <div className="bg-white p-6 rounded shadow mb-6">
//               <h2 className="text-xl font-bold mb-4">Images</h2>
//               <div className="grid grid-cols-3 gap-4">
//                 {customOrder.images.map((img, idx) => (
//                   <div
//                     key={idx}
//                     className="relative h-48 rounded overflow-hidden"
//                   >
//                     <Image
//                       src={img.url}
//                       alt={`Image ${idx + 1}`}
//                       fill
//                       className="object-cover"
//                       sizes="33vw"
//                     />
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Action Buttons */}
//           <div className="space-y-4">
//             {/* Primary Actions */}
//             <div className="flex gap-4">
//               <button
//                 onClick={handleEdit}
//                 className="px-6 py-3 bg-gray-500 text-white rounded hover:bg-gray-600"
//               >
//                 Edit Order
//               </button>

//               {customOrder.rfqId ? (
//                 <button
//                   onClick={handleViewRFQ}
//                   className="flex-1 px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700"
//                 >
//                   View RFQ Details
//                 </button>
//               ) : (
//                 <button
//                   onClick={handleCreateRFQ}
//                   className="flex-1 px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
//                 >
//                   Create RFQ (Auction)
//                 </button>
//               )}
//             </div>

//             {/* Secondary Actions */}
//             <div className="flex gap-4">
//               <button
//                 onClick={handleBackToDashboard}
//                 className="flex-1 px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
//               >
//                 Back to Dashboard
//               </button>
//               <button
//                 onClick={handleBackToList}
//                 className="flex-1 px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
//               >
//                 View All Custom Orders
//               </button>
//               {customOrder.status === "submitted" && (
//                 <button
//                   onClick={handleSaveAsDraft}
//                   className="flex-1 px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
//                 >
//                   Revert to Draft
//                 </button>
//               )}
//             </div>
//           </div>

//           {!customOrder.rfqId && customOrder.sourceManufacturerId && (
//             <p className="text-sm text-gray-600 mt-4">
//               This request is linked to a manufacturer and will default to a
//               direct RFQ when you proceed.
//             </p>
//           )}
//         </div>
//       </div>
//     </>
//   );
// }
