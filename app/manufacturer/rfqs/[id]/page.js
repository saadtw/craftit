// app/manufacturer/rfqs/[id]/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import Editor3DWrapper from "../../../../modules/components/Editor3DWrapper";

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
  const [loading, setLoading] = useState(true);

  const fetchRFQ = useCallback(async () => {
    try {
      const response = await fetch(`/api/rfqs/${params.id}`);
      const data = await response.json();
      if (data.success && data.rfq) {
        setRfq(data.rfq);
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
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-400 to-indigo-400">
                  {rfq.customOrderId?.title || "RFQ INQUIRY"}
                </h1>
                <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-full border ${STATUS_STYLES[rfq.status] || STATUS_STYLES.active}`}>
                  {rfq.status === "active" ? "Live Auction" : "Closed Loop"}
                </span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mt-1">Inquiry ID: {rfq.rfqNumber}</p>
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
                View Transmitted Bid
              </Link>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        
        {/* Core Stats Bento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            { label: "Temporal Limit", value: getTimeRemaining(rfq.endDate), icon: "⏳", color: "from-blue-500/20" },
            { label: "Market Interest", value: `${rfq.bidsCount || 0} Proposals`, icon: "📦", color: "from-purple-500/20" },
            { label: "Reserve Threshold", value: `$${rfq.minBidThreshold || 0}`, icon: "💎", color: "from-emerald-500/20" },
          ].map((stat, i) => (
            <div key={i} className={`bg-gradient-to-br ${stat.color} to-transparent rounded-[2rem] border-2 border-white/5 p-8 backdrop-blur-xl group hover:border-white/10 transition-all`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">{stat.label}</p>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black tracking-tighter text-white">{stat.value}</span>
                <span className="text-2xl opacity-20 group-hover:opacity-100 transition-opacity duration-500">{stat.icon}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Detail Streams */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Project Narrative Card */}
            <div className="bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/20 p-10 shadow-xl">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-6">Technical Scope</h3>
              <p className="text-lg font-medium text-white/70 leading-relaxed whitespace-pre-wrap mb-10">
                {rfq.customOrderId?.description || "No narrative provided."}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 py-10 border-t border-white/5">
                {[
                  { label: "Required Volume", value: `${rfq.customOrderId?.quantity || "N/A"} Units` },
                  { label: "Assigned Budget", value: rfq.customOrderId?.budget ? `$${rfq.customOrderId.budget.toLocaleString()}` : "Confidential" },
                  { label: "Material Constraints", value: rfq.customOrderId?.materialPreferences?.join(", ") || "Open Specification" },
                  { label: "Temporal Deadline", value: rfq.customOrderId?.deadline ? new Date(rfq.customOrderId.deadline).toLocaleDateString() : "Flexible" },
                  { label: "Spectral Data", value: rfq.customOrderId?.colorSpecifications?.join(", ") || "N/A" },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center group">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/20 group-hover:text-white/40 transition-colors">{item.label}</span>
                    <span className="text-[11px] font-black uppercase tracking-widest text-white/80">{item.value}</span>
                  </div>
                ))}
              </div>

              {rfq.customOrderId?.specialRequirements && (
                <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">Extended Protocols</p>
                  <p className="text-sm font-medium text-white/60 leading-relaxed italic">"{rfq.customOrderId.specialRequirements}"</p>
                </div>
              )}
            </div>

            {/* Asset Engine Viewer */}
            {model3D?.url && (
              <div className="bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/20 p-10 shadow-xl overflow-hidden">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-purple-600/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeWidth={2} /></svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Integrated Asset Engine</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">Real-time Inspection Protocol</p>
                  </div>
                </div>
                <div className="rounded-[2rem] overflow-hidden border-2 border-white/5 bg-black/40">
                  <Editor3DWrapper
                    modelUrl={model3D.url}
                    initialAnnotations={model3D.annotations || []}
                    initialCameraState={model3D.cameraState || null}
                    readOnly={true}
                    onSave={() => {}}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Asset Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            {/* Visual Documentation */}
            {rfq.customOrderId?.images && rfq.customOrderId.images.length > 0 && (
              <div className="bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/20 p-8 shadow-xl">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-8">Visual Archives</h3>
                <div className="grid grid-cols-1 gap-6">
                  {rfq.customOrderId.images.map((img, idx) => (
                    <div key={idx} className="relative aspect-video rounded-3xl overflow-hidden border-2 border-white/5 hover:border-purple-500/40 transition-all group">
                      <Image src={img.url} alt="" fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Support Protocols */}
            <div className="bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/20 p-8 shadow-xl">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-6">Operational Support</h3>
              <div className="space-y-4">
                {["Knowledge Base", "Inquiry Support", "Terms of Engagement"].map((item) => (
                  <button key={item} className="w-full text-left p-5 bg-white/5 rounded-2xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all">{item}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-20 border-t border-white/5 bg-white/[0.02] py-12 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/10">© 2024 Craftit Core Services • Advanced Procurement Engine</p>
        </div>
      </footer>
    </div>
  );
}
