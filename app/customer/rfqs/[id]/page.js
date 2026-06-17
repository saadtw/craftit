// app/customer/rfqs/[id]/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import ModelViewerPreview from "@/modules/components/ModelViewerPreview";
import { useToast } from "@/components/ui/ToastProvider";
import { formatPKR } from "@/lib/currency";
import { useDialog } from "@/components/ui/DialogProvider";

export default function CustomerRFQDetails() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const toast = useToast();
  const dialog = useDialog();
  const rfqId = params?.id?.toString();

  const [rfq, setRfq] = useState(null);
  const [bids, setBids] = useState([]);
  const [acceptedOrder, setAcceptedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mediaView, setMediaView] = useState("auto");
  const [activeImage, setActiveImage] = useState(0);
  const [activeModel, setActiveModel] = useState("part"); // 'part' or 'main'

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
        setAcceptedOrder(data.acceptedOrder || null);
        if (data.bids) setBids(data.bids);
      } else {
        toast.error("Error loading RFQ: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error:", error);
      } finally {
      setLoading(false);
    }
  }, [rfqId, router, toast]);

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
    if (!(await dialog.confirm("Cancel RFQ", "Are you sure you want to cancel this RFQ?"))) return;
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
        toast.success("RFQ cancelled successfully");
        fetchRFQ();
      } else toast.error("Error: " + data.error);
    } catch (error) {
      toast.error("Error: " + error.message);
    }
  };

  const handleCompareBids = () => router.push(`/customer/rfqs/${rfqId}/bids`);

  if (status === "loading" || loading) {
    return <GlobalLoader fullScreen text="Loading RFQ details..." />;
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
  
  const isPartRFQ = rfq.isPartRFQ;
  const partData = isPartRFQ && rfq.customOrderId?.parts ? rfq.customOrderId.parts.find(p => p._id === rfq.partId) : null;
  const siblingRfqs = isPartRFQ && rfq.customOrderId?.parts ? rfq.customOrderId.parts.filter(p => p._id !== rfq.partId && p.rfqId) : [];

  const partModel3D = isPartRFQ && partData?.model3D?.url ? partData.model3D : null;
  
  let mainModel3D = rfq.customOrderId?.model3D?.url
    ? rfq.customOrderId.model3D
    : null;

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
  const mainImages = (rfq.customOrderId?.images || []).map(img => ({ ...img, sourceLabel: "Main Order's Media" }));
  const allImages = [...partImages, ...mainImages];

  const partFiles = isPartRFQ && partData?.files?.length ? partData.files : [];
  const mainFiles = rfq.customOrderId?.files || [];

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

  const displayModel = activeModel === "part" && partModel3D ? partModel3D : (mainModel3D || partModel3D);
  const hasImages = allImages.length > 0;
  const hasModel = !!displayModel;
  const currentMediaView = mediaView === "auto" ? (hasImages ? "images" : (hasModel ? "3d" : "images")) : mediaView;

  return (
    <>
      <div className="min-h-screen bg-[#050507] text-white">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#eb9728] mb-1">
                {isPartRFQ ? "Part RFQ Details" : "RFQ Details"}
              </p>
              <h1 className="text-3xl font-black tracking-tight text-white">
                {isPartRFQ && partData ? partData.name : (rfq.customOrderId?.title || "RFQ Details")}
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
                value: formatPKR(rfq.minBidThreshold || 0),
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
            <div className="space-y-6">
              {(allImages.length > 0 || displayModel) && (
                <div className="bg-[#0c0c11] rounded-2xl border border-white/8 shadow-2xl overflow-hidden">
                  {(allImages.length > 0 || hasModel) && (
                    <div className="flex items-center gap-2 p-4 bg-white/[0.02] border-b border-white/5">
                      <button
                        onClick={() => setMediaView("images")}
                        className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                          currentMediaView === "images"
                            ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                            : "text-white/40 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        Image Gallery
                      </button>
                      {hasModel && (
                        <button
                          onClick={() => setMediaView("3d")}
                          className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${
                            currentMediaView === "3d"
                              ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                              : "text-white/40 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          Interactive 3D
                        </button>
                      )}
                    </div>
                  )}

                  {currentMediaView === "images" && (
                    <div>
                      <div className="aspect-[16/10] bg-white/[0.02] flex items-center justify-center relative group">
                        {allImages.length > 0 ? (
                          <>
                            <Image
                              src={allImages[activeImage]?.url}
                              alt="RFQ reference"
                              fill
                              className="object-contain p-4"
                              sizes="(max-width: 1280px) 100vw, 800px"
                            />
                            {/* Image Tag Label */}
                            <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/80 z-20 pointer-events-none">
                              {allImages[activeImage]?.sourceLabel}
                            </div>
                            {/* Navigation Arrows */}
                            {allImages.length > 1 && (
                              <>
                                <button
                                  onClick={() => setActiveImage((prev) => prev - 1)}
                                  disabled={activeImage === 0}
                                  className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-black/80 hover:scale-110 disabled:opacity-30 disabled:hover:scale-100 transition-all z-20"
                                >
                                  <span className="material-symbols-outlined text-sm">
                                    arrow_back_ios_new
                                  </span>
                                </button>
                                <button
                                  onClick={() => setActiveImage((prev) => prev + 1)}
                                  disabled={activeImage === allImages.length - 1}
                                  className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-black/80 hover:scale-110 disabled:opacity-30 disabled:hover:scale-100 transition-all z-20"
                                >
                                  <span className="material-symbols-outlined text-sm">
                                    arrow_forward_ios
                                  </span>
                                </button>
                              </>
                            )}
                          </>
                        ) : (
                          <div className="text-center">
                            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4 text-white/10">
                              <span className="material-symbols-outlined text-4xl">hide_image</span>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
                              No Visual Assets Available
                            </p>
                          </div>
                        )}
                        {allImages.length > 0 && (
                          <div className="absolute bottom-6 right-6 px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/60 z-20 pointer-events-none">
                            {activeImage + 1} / {allImages.length}
                          </div>
                        )}
                      </div>

                      {allImages.length > 1 && (
                        <div className="p-6 bg-white/[0.02] border-t border-white/5">
                          <div className="flex gap-4 overflow-x-auto py-4 px-6">
                            {allImages.map((img, idx) => (
                              <button
                                key={idx}
                                onClick={() => setActiveImage(idx)}
                                className={`shrink-0 w-24 h-24 rounded-[2rem] overflow-hidden border-2 transition-all duration-500 relative group ${
                                  activeImage === idx
                                    ? "border-[#eb9728] scale-110 shadow-[0_0_25px_rgba(235,151,40,0.4)] z-10"
                                    : "border-white/5 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 hover:border-white/20"
                                }`}
                              >
                                <Image
                                  src={img.url}
                                  alt=""
                                  fill
                                  className="object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {currentMediaView === "3d" && displayModel && (
                    <div className="p-6">
                      {partModel3D && mainModel3D && (
                        <div className="flex gap-2 mb-4 bg-white/5 p-1 rounded-xl w-fit">
                          <button
                            onClick={() => setActiveModel("part")}
                            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${
                              activeModel === "part"
                                ? "bg-white/10 text-white"
                                : "text-white/40 hover:text-white"
                            }`}
                          >
                            Part&apos;s 3D Model
                          </button>
                          <button
                            onClick={() => setActiveModel("main")}
                            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${
                              activeModel === "main"
                                ? "bg-white/10 text-white"
                                : "text-white/40 hover:text-white"
                            }`}
                          >
                            Main Order&apos;s 3D Model
                          </button>
                        </div>
                      )}
                      <div className="aspect-[16/10] rounded-[2rem] overflow-hidden border border-white/8 bg-[#050507]">
                        <ModelViewerPreview
                          key={displayModel.url}
                          modelUrl={displayModel.url}
                          annotations={displayModel.annotations || []}
                          measurements={displayModel.measurements || []}
                          height="100%"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                  {isPartRFQ && partData && (
                    <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-4">
                        Part Scope: {partData.name}
                      </h3>
                      <p className="text-sm font-medium text-white/70 leading-relaxed whitespace-pre-wrap mb-6">
                        {partData.description || "No description provided."}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-1">Quantity</p>
                          <p className="text-sm font-bold text-white/80">{partData.quantity || "N/A"}</p>
                        </div>
                        {partData.budget && (
                          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-1">Budget</p>
                            <p className="text-sm font-bold text-white/80">{formatPKR(partData.budget)}</p>
                          </div>
                        )}
                        {partData.deadline && (
                          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-1">Deadline</p>
                            <p className="text-sm font-bold text-white/80">{new Date(partData.deadline).toLocaleDateString()}</p>
                          </div>
                        )}
                        {partData.material && (
                          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-1">Material</p>
                            <p className="text-sm font-bold text-white/80">{partData.material}</p>
                          </div>
                        )}
                      </div>
                      {partData.specialRequirements && (
                        <div className="mt-4 p-4 rounded-xl border border-white/8 bg-white/[0.03]">
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-1">Special Requirements</p>
                          <p className="text-sm text-white/60">{partData.specialRequirements}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-4">
                      Main Custom Order Scope
                    </h3>
                    <p className="text-sm font-medium text-white/70 leading-relaxed whitespace-pre-wrap mb-6">
                      {rfq.customOrderId.description || "No description provided."}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-1">Quantity</p>
                        <p className="text-sm font-bold text-white/80">{rfq.customOrderId.quantity || "N/A"}</p>
                      </div>
                      {rfq.customOrderId.budget && (
                        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-1">Budget</p>
                          <p className="text-sm font-bold text-white/80">{formatPKR(rfq.customOrderId.budget)}</p>
                        </div>
                      )}
                      {rfq.customOrderId.deadline && (
                        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-1">Deadline</p>
                          <p className="text-sm font-bold text-white/80">{new Date(rfq.customOrderId.deadline).toLocaleDateString()}</p>
                        </div>
                      )}
                      {rfq.customOrderId.materialPreferences?.length > 0 && (
                        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-1">Materials</p>
                          <p className="text-sm font-bold text-white/80">{rfq.customOrderId.materialPreferences.join(", ")}</p>
                        </div>
                      )}
                    </div>
                    {rfq.customOrderId.specialRequirements && (
                      <div className="mt-4 p-4 rounded-xl border border-white/8 bg-white/[0.03]">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-1">Special Requirements</p>
                        <p className="text-sm text-white/60">{rfq.customOrderId.specialRequirements}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                  {(acceptedOrder || artifactFiles.length > 0 || siblingRfqs.length > 0) && (
                    <div className="rounded-2xl border border-white/8 bg-[#0c0c11] p-6">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#eb9728] mb-6">
                        Artifacts & Related Orders
                      </h3>
                      {acceptedOrder && (
                        <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                            Converted to Order
                          </p>
                          <Link
                            href={`/customer/orders/${acceptedOrder._id}`}
                            className="mt-1 block text-sm font-black text-white hover:text-[#eb9728]"
                          >
                            {acceptedOrder.orderNumber}
                          </Link>
                        </div>
                      )}
                      
                      {siblingRfqs.length > 0 && (
                        <div className="mb-6">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-3">Other Parts RFQs</p>
                          <div className="space-y-2">
                            {siblingRfqs.map((sib) => (
                              <Link
                                key={sib._id}
                                href={`/customer/rfqs/${sib.rfqId}`}
                                className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 hover:border-[#eb9728]/30"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-xs font-bold text-white/75">
                                    {sib.name}
                                  </span>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-white/25">
                                    Part RFQ
                                  </span>
                                </span>
                                <span className="material-symbols-outlined text-sm text-[#eb9728]">
                                  open_in_new
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {artifactFiles.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-3">Attached Files</p>
                          {artifactFiles.map((file) => (
                            <a
                              key={file.url}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 hover:border-[#eb9728]/30"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-bold text-white/75">
                                  {file.label}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/25">
                                  {file.type}
                                </span>
                              </span>
                              <span className="material-symbols-outlined text-sm text-[#eb9728]">
                                download
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                                {formatPKR(bid.amount)}
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
                                {bid.status === "under_consideration" ? "PENDING" : bid.status.replace("_", " ").toUpperCase()}
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
//         toast.error("Error loading RFQ: " + (data.error || "Unknown error"));
//       }
//     } catch (error) {
//       console.error("Error:", error);
//       //     } finally {
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
//     if (!(await dialog.confirm("Cancel RFQ", "Are you sure you want to cancel this RFQ?"))) return;
// 
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
//         toast.success("RFQ cancelled successfully");
//         fetchRFQ();
//       } else {
//         toast.error("Error: " + data.error);
//       }
//     } catch (error) {
//       toast.error("Error: " + error.message);
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
