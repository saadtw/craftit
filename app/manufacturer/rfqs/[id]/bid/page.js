// app/manufacturer/rfqs/[id]/bid/page.js
"use client";

// app/manufacturer/rfqs/[id]/bid/page.js

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/components/ui/ToastProvider";
import { formatPKR } from "@/lib/currency";
import { uploadFileDirect } from "@/lib/uploadDirect";

export default function PlaceBidPage({ params }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [rfq, setRfq] = useState(null);
  const [formData, setFormData] = useState({
    rfqId: unwrappedParams.id,
    amount: "",
    timeline: "",
    costBreakdown: {
      materials: "",
      labor: "",
      overhead: "",
      profit: "",
    },
    processDescription: "",
    materialsDescription: "",
    paymentTerms: "",
    warrantyInfo: "",
    attachments: [],
  });
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const fetchRFQ = useCallback(async () => {
    try {
      const res = await fetch(`/api/rfqs/${unwrappedParams.id}`);
      const data = await res.json();
      if (res.ok && data.rfq) setRfq(data.rfq);
    } catch (error) {
      console.error("Error:", error);
    }
  }, [unwrappedParams.id]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "manufacturer") {
      fetchRFQ();
    }
  }, [status, session, fetchRFQ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submitData = {
        rfqId: formData.rfqId,
        amount: Number(formData.amount),
        timeline: Number(formData.timeline),
        costBreakdown: {
          materials: Number(formData.costBreakdown.materials) || 0,
          labor: Number(formData.costBreakdown.labor) || 0,
          overhead: Number(formData.costBreakdown.overhead) || 0,
          profit: Number(formData.costBreakdown.profit) || 0,
        },
        processDescription: formData.processDescription,
        materialsDescription: formData.materialsDescription,
        paymentTerms: formData.paymentTerms,
        warrantyInfo: formData.warrantyInfo,
        attachments: formData.attachments,
      };

      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      router.push(`/manufacturer/rfqs/${unwrappedParams.id}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || !rfq) {
    return <GlobalLoader fullScreen text="Preparing proposal..." />;
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white font-sans">
      {/* Bid Header */}
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
                  Proposal
                </h1>
                <span className="px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-full border border-purple-500/20 bg-purple-500/10 text-purple-400">
                  RFQ Response
                </span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mt-1">RFQ Ref: {rfq.rfqNumber}</p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left: RFQ Summary */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Project Quick View */}
            <div className="bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/20 p-8 shadow-xl flex gap-8 items-center">
              {rfq.customOrderId?.images?.[0]?.url && (
                <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-white/10 shadow-2xl shrink-0">
                  <Image src={rfq.customOrderId.images[0].url} alt="" fill className="object-cover" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">Target Project</p>
                <h2 className="text-2xl font-black tracking-tighter text-white uppercase mb-2">{rfq.customOrderId?.title || "Custom Order"}</h2>
                <div className="flex gap-4 items-center pt-4 border-t border-white/5">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-0.5">Budget</p>
                    <p className="text-xs font-black text-emerald-400">{rfq.customOrderId?.budget ? formatPKR(rfq.customOrderId.budget) : "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-0.5">Quantity</p>
                    <p className="text-xs font-black text-white/80">{rfq.customOrderId?.quantity || 0} Units</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right: Proposal Form */}
          <div className="lg:col-span-5">
            <div className="bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/20 p-10 shadow-xl sticky top-10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-8">Proposal Details</h3>
              
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/20">Proposal Amount (PKR)</label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      required
                      min="0"
                      step="0.01"
                      className="w-full bg-white/[0.03] border-2 border-purple-500/10 rounded-2xl px-6 py-4 text-sm font-black text-white placeholder:text-white/10 focus:outline-none focus:border-purple-500/40 transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/20">Delivery Timeline (Days)</label>
                    <input
                      type="number"
                      value={formData.timeline}
                      onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                      placeholder="0"
                      required
                      min="1"
                      className="w-full bg-white/[0.03] border-2 border-purple-500/10 rounded-2xl px-6 py-4 text-sm font-black text-white placeholder:text-white/10 focus:outline-none focus:border-purple-500/40 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/20">Warranty Specification</label>
                  <input
                    type="text"
                    value={formData.warrantyInfo}
                    onChange={(e) => setFormData({ ...formData, warrantyInfo: e.target.value })}
                    placeholder="e.g. 24-Month Full Coverage"
                    className="w-full bg-white/[0.03] border-2 border-purple-500/10 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest text-white placeholder:text-white/10 focus:outline-none focus:border-purple-500/40 transition-all"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/20">Operational Notes</label>
                  <textarea
                    value={formData.processDescription}
                    onChange={(e) => setFormData({ ...formData, processDescription: e.target.value })}
                    rows="4"
                    placeholder="Describe your manufacturing optimization strategies..."
                    className="w-full bg-white/[0.03] border-2 border-purple-500/10 rounded-[2rem] px-6 py-5 text-sm font-medium text-white placeholder:text-white/10 focus:outline-none focus:border-purple-500/40 transition-all resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/20">Attachments</label>
                  <div className="flex flex-col gap-4">
                    {formData.attachments.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-purple-400">description</span>
                          <span className="text-sm font-medium text-white">{file.filename}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            import("@/lib/fileCleanupClient").then(({ cleanupFiles }) => cleanupFiles([file.url]));
                            setFormData(prev => ({ ...prev, attachments: prev.attachments.filter((_, idx) => idx !== i) }));
                          }}
                          className="text-white/40 hover:text-red-400 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      disabled={uploadingFiles}
                      onClick={() => document.getElementById('bid-file-upload').click()}
                      className="w-full py-4 border-2 border-dashed border-purple-500/20 bg-white/[0.02] rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/[0.05] hover:border-purple-500/40 transition-all disabled:opacity-50"
                    >
                      {uploadingFiles ? (
                        <span className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-purple-400">upload_file</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Upload Files</span>
                        </>
                      )}
                    </button>
                    <input
                      id="bid-file-upload"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files);
                        if (!files.length) return;
                        setUploadingFiles(true);
                        try {
                          const uploaded = await Promise.all(
                            files.map(f => uploadFileDirect(f, "document"))
                          );
                          const newAttachments = uploaded.map((u, i) => ({
                            url: u.file ? u.file.url : u.url,
                            filename: files[i].name,
                            fileType: files[i].type || "document"
                          }));
                          setFormData(prev => ({
                            ...prev,
                            attachments: [...prev.attachments, ...newAttachments]
                          }));
                        } catch (err) {
                          toast.error("File upload failed");
                        } finally {
                          setUploadingFiles(false);
                          e.target.value = "";
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-[11px] font-bold leading-relaxed text-amber-200">
                    By submitting this bid, you are making a binding commitment.
                    If accepted, an order is automatically created and you are
                    expected to fulfil it. You have a 48-hour cancellation window
                    for exceptional circumstances.
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-5 bg-purple-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-[2rem] hover:bg-purple-500 shadow-[0_0_30px_rgba(147,51,234,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
                  >
                    {loading ? "Submitting..." : "Submit Proposal"}
                  </button>
                  <p className="text-center text-[9px] font-black uppercase tracking-widest text-white/10 mt-6 leading-relaxed">
                    By submitting, you agree to the procurement terms for this RFQ.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
