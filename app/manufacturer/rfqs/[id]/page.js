// app/manufacturer/rfqs/[id]/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import ModelViewerPreview from "@/modules/components/ModelViewerPreview";
import { formatPKR } from "@/lib/currency";

const STATUS_STYLES = {
  active: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400",
  closed: "bg-red-500/10 border border-red-500/20 text-red-400",
};

export default function ManufacturerRFQDetails() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [rfq, setRfq] = useState(null);
  const [myBid, setMyBid] = useState(null);
  const [acceptedOrder, setAcceptedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mediaView, setMediaView] = useState("images");
  const [activeImage, setActiveImage] = useState(0);

  const mediaInitRef = useRef(false);

  const fetchRFQ = useCallback(async () => {
    try {
      const response = await fetch(`/api/rfqs/${params.id}`);
      const data = await response.json();
      if (data.success && data.rfq) {
        setRfq(data.rfq);
        setAcceptedOrder(data.acceptedOrder || null);
        if (data.bids && data.bids.length > 0) {
          setMyBid(data.bids[0]);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "manufacturer") {
      fetchRFQ();
    }
  }, [status, session, fetchRFQ]);

  useEffect(() => {
    if (!rfq || mediaInitRef.current) return;
    const hasImages = rfq.customOrderId?.images?.length > 0;
    const hasModel = !!rfq.customOrderId?.model3D?.url;
    if (!hasImages && hasModel) setMediaView("3d");
    setActiveImage(0);
    mediaInitRef.current = true;
  }, [rfq]);

  const getTimeRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;
    if (diff <= 0) return "Expired";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h`;
  };

  if (status === "loading" || loading || !rfq) {
    return <GlobalLoader fullScreen text="LOADING INQUIRY..." />;
  }

  const isActive = rfq.status === "active";
  const hasBid = !!myBid;
  const model3D = rfq?.customOrderId?.model3D;
  const images = rfq?.customOrderId?.images || [];
  const artifactFiles = [
    model3D?.url && {
      label: model3D.filename || "3D model",
      url: model3D.url,
      type: "3D Model",
    },
    ...images.map((img, idx) => ({
      label: img.filename || `Reference image ${idx + 1}`,
      url: img.url,
      type: "Image",
    })),
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {/* Header Info */}
      <div className="bg-[#050507]/80 border-b border-white/5 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-400 to-indigo-400">
                  {rfq.customOrderId?.title || "RFQ INQUIRY"}
                </h1>
                <span
                  className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-full border ${STATUS_STYLES[rfq.status] || STATUS_STYLES.active}`}
                >
                  {rfq.status === "active" ? "Live Auction" : "Closed Loop"}
                </span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mt-1">
                Inquiry ID: {rfq.rfqNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isActive && !hasBid && (
              <Link
                href={`/manufacturer/rfqs/${params.id}/bid`}
                className="px-6 py-2.5 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all"
              >
                Submit Proposal
              </Link>
            )}
            {hasBid && (
              <Link
                href={`/bids/${myBid._id}`}
                className="px-6 py-2.5 bg-white text-[#050507] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/90 transition-all shadow-xl"
              >
                View Proposal
              </Link>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Core Stats Bento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            {
              label: "Temporal Limit",
              value: getTimeRemaining(rfq.endDate),
              icon: "⏳",
              color: "from-blue-500/20",
            },
            {
              label: "Market Interest",
              value: `${rfq.bidsCount || 0} Proposals`,
              icon: "📦",
              color: "from-purple-500/20",
            },
            {
              label: "Reserve Threshold",
              value: formatPKR(rfq.minBidThreshold || 0),
              icon: "💎",
              color: "from-emerald-500/20",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className={`bg-gradient-to-br ${stat.color} to-transparent rounded-[2rem] border-2 border-white/5 p-8 backdrop-blur-xl group hover:border-white/10 transition-all`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">
                {stat.label}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black tracking-tighter text-white">
                  {stat.value}
                </span>
                <span className="text-2xl opacity-20 group-hover:opacity-100 transition-opacity duration-500">
                  {stat.icon}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Detail Streams */}
          <div className="lg:col-span-8 space-y-8">
            {/* Project Narrative Card */}
            <div className="bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/20 p-10 shadow-xl">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-6">
                Technical Scope
              </h3>
              <p className="text-lg font-medium text-white/70 leading-relaxed whitespace-pre-wrap mb-10">
                {rfq.customOrderId?.description || "No narrative provided."}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 py-10 border-t border-white/5">
                {[
                  {
                    label: "Required Volume",
                    value: `${rfq.customOrderId?.quantity || "N/A"} Units`,
                  },
                  {
                    label: "Assigned Budget",
                    value: rfq.customOrderId?.budget
                      ? formatPKR(rfq.customOrderId.budget)
                      : "Confidential",
                  },
                  {
                    label: "Material Constraints",
                    value:
                      rfq.customOrderId?.materialPreferences?.join(", ") ||
                      "Open Specification",
                  },
                  {
                    label: "Temporal Deadline",
                    value: rfq.customOrderId?.deadline
                      ? new Date(
                          rfq.customOrderId.deadline,
                        ).toLocaleDateString()
                      : "Flexible",
                  },
                  {
                    label: "Spectral Data",
                    value:
                      rfq.customOrderId?.colorSpecifications?.join(", ") ||
                      "N/A",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center group"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/20 group-hover:text-white/40 transition-colors">
                      {item.label}
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-widest text-white/80">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              {rfq.customOrderId?.specialRequirements && (
                <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">
                    Extended Protocols
                  </p>
                  <p className="text-sm font-medium text-white/60 leading-relaxed italic">
                    &ldquo;{rfq.customOrderId.specialRequirements}&rdquo;
                  </p>
                </div>
              )}
            </div>
            {(images.length > 0 || model3D?.url) && (
              <div className="bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/20 shadow-2xl overflow-hidden">
                {images.length > 0 && model3D?.url && (
                  <div className="flex items-center gap-2 p-4 bg-white/[0.02] border-b border-white/5">
                    <button
                      onClick={() => setMediaView("images")}
                      className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                        mediaView === "images"
                          ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                          : "text-white/40 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      Image Gallery
                    </button>
                    <button
                      onClick={() => setMediaView("3d")}
                      className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${
                        mediaView === "3d"
                          ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                          : "text-white/40 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      Interactive 3D
                      {mediaView !== "3d" && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </button>
                  </div>
                )}

                {mediaView === "images" && (
                  <div>
                    <div className="aspect-[16/10] bg-white/[0.02] flex items-center justify-center relative group">
                      {images.length > 0 ? (
                        <Image
                          src={images[activeImage]?.url}
                          alt="RFQ reference"
                          fill
                          className="object-contain p-4"
                          sizes="(max-width: 1280px) 100vw, 800px"
                        />
                      ) : (
                        <div className="text-center">
                          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4 text-white/10">
                            <svg
                              className="w-10 h-10"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
                            No Visual Assets Available
                          </p>
                        </div>
                      )}
                      {images.length > 0 && (
                        <div className="absolute bottom-6 right-6 px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/60">
                          {activeImage + 1} / {images.length}
                        </div>
                      )}
                    </div>

                    {images.length > 1 && (
                      <div className="p-6 bg-white/[0.02] border-t border-white/5">
                        <div className="flex gap-4 overflow-x-auto py-4 px-6">
                          {images.map((img, idx) => (
                            <button
                              key={idx}
                              onClick={() => setActiveImage(idx)}
                              className={`shrink-0 w-24 h-24 rounded-[2rem] overflow-hidden border-2 transition-all duration-500 relative group ${
                                activeImage === idx
                                  ? "border-purple-500 scale-110 shadow-[0_0_25px_rgba(168,85,247,0.4)] z-10"
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

                {mediaView === "3d" && model3D?.url && (
                  <div className="p-6">
                    <div className="aspect-[16/10] rounded-[2rem] overflow-hidden border-2 border-white/5 bg-black/40">
                      <ModelViewerPreview
                        modelUrl={model3D.url}
                        annotations={model3D.annotations || []}
                        measurements={model3D.measurements || []}
                        height="100%"
                      />
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="truncate text-sm font-bold text-white/60">
                        {model3D.filename || "Attached 3D model"}
                      </p>
                      <a
                        href={model3D.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border border-[#eb9728]/20 bg-[#eb9728]/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#eb9728] hover:bg-[#eb9728]/20"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Asset Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            {/* Base Product Reference */}
            {rfq.isProductCustomization && rfq.sourceProductId && (
              <div className="bg-white/[0.03] rounded-[2.5rem] border-2 border-[#eb9728]/30 p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <span className="material-symbols-outlined text-[#eb9728]/20 text-6xl">
                    inventory_2
                  </span>
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#eb9728] mb-6 relative z-10">
                  Product Customization
                </h3>
                <p className="text-xs text-white/50 mb-4 relative z-10">
                  This RFQ is for customizing one of your existing products.
                </p>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center gap-4 relative z-10">
                  {rfq.sourceProductId.images?.[0]?.url && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 relative">
                      <Image
                        src={rfq.sourceProductId.images[0].url}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-white mb-1 line-clamp-2">
                      {rfq.sourceProductId.name}
                    </p>
                    <Link
                      href={`/manufacturer/products/${rfq.sourceProductId._id}`}
                      className="text-[10px] font-bold uppercase tracking-widest text-[#eb9728] hover:text-amber-400 transition-colors inline-flex items-center gap-1"
                    >
                      View Product{" "}
                      <span className="material-symbols-outlined text-[12px]">
                        open_in_new
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {(acceptedOrder || artifactFiles.length > 0) && (
              <div className="bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/20 p-8 shadow-xl">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-6">
                  Order Artifacts
                </h3>
                {acceptedOrder ? (
                  <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                      Converted to order
                    </p>
                    <Link
                      href={`/manufacturer/orders/${acceptedOrder._id}`}
                      className="mt-2 block text-sm font-black text-white hover:text-[#eb9728]"
                    >
                      {acceptedOrder.orderNumber}
                    </Link>
                  </div>
                ) : (
                  <p className="mb-5 text-xs text-white/35">
                    Downloads will remain available here after this RFQ becomes
                    an order.
                  </p>
                )}
                <div className="space-y-2">
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
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-20 border-t border-white/5 bg-white/[0.02] py-12 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/10">
            © 2024 Craftit Core Services • Advanced Procurement Engine
          </p>
        </div>
      </footer>
    </div>
  );
}
