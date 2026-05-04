// app/manufacturer/products/[id]/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ModelManager from "@/modules/components/ModelManager";
import AnalyticsIcon from "@/assets/analytics.png";
import OrdersIcon from "@/assets/orders.png";
import RatingIcon from "@/assets/rating.png";
import MessageIcon from "@/assets/message.png";

const STATUS_STYLES = {
  active: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  draft: "bg-white/5 text-white/40 border border-white/10",
  out_of_stock: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  archived: "bg-red-500/10 text-red-400 border border-red-500/20",
};

const STATUS_ACTIONS = {
  active: [
    { status: "draft", label: "Unpublish" },
    { status: "out_of_stock", label: "Mark Out of Stock" },
    { status: "archived", label: "Archive Product" },
  ],
  draft: [
    { status: "active", label: "Publish Now" },
    { status: "archived", label: "Archive Product" },
  ],
  out_of_stock: [
    { status: "active", label: "Mark Available" },
    { status: "draft", label: "Move to Draft" },
  ],
  archived: [
    { status: "draft", label: "Restore to Draft" },
  ],
};

export default function ProductDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [qaItems, setQaItems] = useState([]);
  const [qaLoading, setQaLoading] = useState(true);
  const [qaUpdatingId, setQaUpdatingId] = useState("");
  const [answerDrafts, setAnswerDrafts] = useState({});
  const [qaView, setQaView] = useState("all");

  const statusMenuRef = useRef(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && session?.user?.role !== "manufacturer")
      router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target)) {
        setShowStatusMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${id}`);
        const data = await res.json();
        if (data.success) {
          setProduct(data.product);
          const primaryIdx = data.product.images?.findIndex((i) => i.isPrimary);
          if (primaryIdx >= 0) setActiveImage(primaryIdx);
        } else {
          router.push("/manufacturer/products");
        }
      } catch (_) {
        router.push("/manufacturer/products");
      }
      setLoading(false);
    };
    if (status === "authenticated") fetchProduct();
  }, [id, status, router]);

  const fetchQnA = useCallback(async () => {
    setQaLoading(true);
    try {
      const res = await fetch(`/api/products/${id}/qa?status=all&limit=50`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setQaItems(data.questions || []);
      }
    } catch (_) {
      setQaItems([]);
    } finally {
      setQaLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchQnA();
    }
  }, [status, fetchQnA]);

  const handleAnswerQuestion = async (questionId) => {
    const answer = String(answerDrafts[questionId] || "").trim();
    if (answer.length < 2 || qaUpdatingId) return;

    setQaUpdatingId(questionId);
    try {
      const res = await fetch(`/api/products/${id}/qa/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "answer", answer }),
      });
      const data = await res.json();
      if (data.success) {
        setQaItems((prev) =>
          prev.map((item) => (item._id === questionId ? data.question : item)),
        );
        setAnswerDrafts((prev) => ({ ...prev, [questionId]: "" }));
      }
    } catch (_) {}
    setQaUpdatingId("");
  };

  const toggleVisibility = async (questionId, nextVisible) => {
    if (qaUpdatingId) return;
    setQaUpdatingId(questionId);
    try {
      const res = await fetch(`/api/products/${id}/qa/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "visibility", isVisible: nextVisible }),
      });
      const data = await res.json();
      if (data.success) {
        setQaItems((prev) =>
          prev.map((item) => (item._id === questionId ? data.question : item)),
        );
      }
    } catch (_) {}
    setQaUpdatingId("");
  };

  const handleStatusChange = async (newStatus) => {
    setStatusLoading(true);
    setShowStatusMenu(false);
    try {
      const res = await fetch(`/api/products/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setProduct((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (_) {}
    setStatusLoading(false);
  };

  if (loading || status === "loading" || !product) {
    return <GlobalLoader fullScreen text="INITIALIZING CONSOLE..." />;
  }

  const specs = product.specifications || {};
  const dims = specs.dimensions || {};
  const qaCounts = {
    all: qaItems.length,
    pending: qaItems.filter((q) => q.status === "pending").length,
    answered: qaItems.filter((q) => q.status === "answered").length,
    hidden: qaItems.filter((q) => q.isVisible === false).length,
  };
  const visibleQaItems = qaItems.filter((qa) => {
    if (qaView === "pending") return qa.status === "pending";
    if (qaView === "answered") return qa.status === "answered";
    if (qaView === "hidden") return qa.isVisible === false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {/* Header */}
      <div className="bg-[#050507]/80 border-b border-white/5 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Link
              href="/manufacturer/products"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-400 to-indigo-400">
                  {product.name}
                </h1>
                <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${STATUS_STYLES[product.status]}`}>
                  {product.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mt-1">Product Console v2.0</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={statusMenuRef}>
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all flex items-center gap-2"
              >
                {statusLoading ? (
                  <span className="w-3 h-3 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Manage Status
              </button>
              {showStatusMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-[#0B011D] border-2 border-purple-500/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-200 z-[100] backdrop-blur-2xl">
                  {(STATUS_ACTIONS[product.status] || []).map((a) => (
                    <button
                      key={a.status}
                      onClick={() => handleStatusChange(a.status)}
                      className="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white/5 hover:text-white transition-all"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link
              href={`/manufacturer/products/${id}/edit`}
              className="px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] bg-purple-600 text-white rounded-xl hover:bg-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Details
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Image Showcase */}
            <div className="bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/20 shadow-2xl">
              <div className="aspect-[16/10] bg-white/[0.02] flex items-center justify-center relative group">
                {product.images?.length > 0 ? (
                  <Image
                    src={product.images[activeImage]?.url}
                    alt={product.name}
                    fill
                    className="object-contain p-4"
                    sizes="(max-width: 1280px) 100vw, 800px"
                  />
                ) : (
                  <div className="text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4 text-white/10">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20">No Visual Assets Available</p>
                  </div>
                )}
                {/* Image Counter Overlay */}
                <div className="absolute bottom-6 right-6 px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/60">
                  {activeImage + 1} / {product.images?.length || 0}
                </div>
              </div>

              {product.images?.length > 1 && (
                <div className="p-6 bg-white/[0.02] border-t border-white/5">
                  <div className="flex gap-4 overflow-x-auto py-4 px-6 custom-scrollbar">
                    {product.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImage(idx)}
                        className={`shrink-0 w-24 h-24 rounded-[2rem] overflow-hidden border-2 transition-all duration-500 relative group ${
                          activeImage === idx
                            ? "border-purple-500 scale-110 shadow-[0_0_25px_rgba(168,85,247,0.4)] z-10"
                            : "border-white/5 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 hover:border-white/20"
                        }`}
                      >
                        <Image src={img.url} alt="" width={96} height={96} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        {activeImage === idx && (
                          <div className="absolute inset-0 bg-purple-500/10 pointer-events-none" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3D Model Explorer */}
            {product.model3D?.url && (
              <div className="bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/20 p-8 shadow-xl">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-600/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-white">Interactive 3D Preview</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">GLTF Engine Rendering</p>
                    </div>
                  </div>
                  <a
                    href={product.model3D.url}
                    download
                    className="px-5 py-2.5 bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all flex items-center gap-2"
                  >
                    Download Asset
                  </a>
                </div>
                
                <div className="rounded-[2rem] overflow-hidden border-2 border-white/5 bg-black/40">
                  <ModelManager
                    model3D={product.model3D}
                    resourceId={product._id}
                    resourceType="product"
                    canEdit={true}
                  />
                </div>
                
                <div className="mt-6 flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-[1.5rem]">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                      {product.model3D.filename || "engine_asset.glb"}
                    </span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/20">
                    {(product.model3D.fileSize / 1024 / 1024).toFixed(2)} MB • Ver 1.0.4
                  </span>
                </div>
              </div>
            )}

            {/* Description & Technical Specs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/20 p-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-5">Product Narrative</h3>
                <p className="text-sm text-white/60 leading-relaxed font-medium whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>

              <div className="bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/20 p-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-6">Technical Data</h3>
                <div className="space-y-5">
                  {[
                    { label: "Base Material", value: specs.material },
                    { label: "Physical Dimensions", value: dims.length ? `${dims.length} × ${dims.width} × ${dims.height} ${dims.unit}` : null },
                    { label: "Net Weight", value: specs.weight ? `${specs.weight} kg` : null },
                    { label: "Shipping Class", value: product.shippingWeight ? `${product.shippingWeight} kg` : null },
                    { label: "Manufacturing Lead", value: product.leadTime ? `${product.leadTime} Days` : null },
                    { label: "Customization", value: product.customizationOptions ? "Verified Support" : "Fixed Specification" },
                  ].map((spec, i) => spec.value && (
                    <div key={i} className="flex items-center justify-between group">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/20 group-hover:text-white/40 transition-colors">{spec.label}</span>
                      <span className="text-[11px] font-black uppercase tracking-widest text-white/80">{spec.value}</span>
                    </div>
                  ))}
                </div>

                {specs.color?.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4">Spectral Options</p>
                    <div className="flex flex-wrap gap-2">
                      {specs.color.map((c) => (
                        <span key={c} className="px-4 py-2 bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest rounded-xl text-white/60">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Q&A Console */}
            <div className="bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/20 p-10 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Q&A Management</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">Customer Inquiry Protocol</p>
                </div>
                <div className="flex items-center gap-2">
                  {[
                    { id: "all", label: `All (${qaCounts.all})`, color: "bg-white/5 border-white/10 text-white/40" },
                    { id: "pending", label: `Pending (${qaCounts.pending})`, color: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
                    { id: "answered", label: `Answered (${qaCounts.answered})`, color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
                  ].map((view) => (
                    <button
                      key={view.id}
                      onClick={() => setQaView(view.id)}
                      className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                        qaView === view.id ? "bg-purple-600 border-purple-400 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]" : view.color
                      }`}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>
              </div>

              {qaLoading ? (
                <div className="py-10 flex flex-col items-center justify-center gap-4">
                  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Syncing Question Database...</p>
                </div>
              ) : visibleQaItems.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">No Active Inquiries found in this view</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {visibleQaItems.map((qa) => (
                    <article key={qa._id} className={`p-8 rounded-[2rem] border-2 transition-all ${qa.isVisible ? "bg-white/[0.02] border-white/5" : "bg-red-500/5 border-red-500/10 opacity-60"}`}>
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-3">Customer Question</p>
                          <p className="text-lg font-black tracking-tight text-white">{qa.question}</p>
                        </div>
                        <button
                          onClick={() => toggleVisibility(qa._id, !qa.isVisible)}
                          className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                            qa.isVisible ? "bg-white/5 border-white/10 text-white/40 hover:text-white" : "bg-red-600 text-white border-red-400"
                          }`}
                        >
                          {qa.isVisible ? "Archive from Web" : "Restore Visibility"}
                        </button>
                      </div>

                      {qa.answer?.text ? (
                        <div className="mt-8 p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Protocol Response</p>
                          <p className="text-sm font-medium text-emerald-50/80 leading-relaxed">{qa.answer.text}</p>
                        </div>
                      ) : (
                        <div className="mt-8 space-y-4">
                          <textarea
                            rows={3}
                            value={answerDrafts[qa._id] || ""}
                            onChange={(e) => setAnswerDrafts((prev) => ({ ...prev, [qa._id]: e.target.value }))}
                            placeholder="Draft your professional response..."
                            className="w-full bg-white/[0.03] border-2 border-purple-500/20 rounded-2xl px-6 py-4 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-purple-500/50 transition-all resize-none font-medium"
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/10">Chars: {String(answerDrafts[qa._id] || "").length} / 1200</span>
                            <button
                              onClick={() => handleAnswerQuestion(qa._id)}
                              disabled={qaUpdatingId === qa._id || String(answerDrafts[qa._id] || "").trim().length < 2}
                              className="px-6 py-3 bg-white text-[#050507] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/90 disabled:opacity-30 transition-all shadow-xl"
                            >
                              {qaUpdatingId === qa._id ? "Transmitting..." : "Submit Response"}
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Commercial Data */}
            <div className="bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/20 p-8 shadow-xl">
              <div className="mb-8">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-2">Target Unit Price</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black tracking-tighter text-white">${product.price?.toLocaleString()}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/20">USD</span>
                </div>
              </div>
              
              <div className="space-y-4 pt-8 border-t border-white/5">
                {[
                  { label: "Minimum Order", value: `${product.moq} Units`, color: "text-white" },
                  { label: "Live Inventory", value: product.stock === 0 ? "Exhausted" : `${product.stock} Units`, color: product.stock === 0 ? "text-red-400" : "text-emerald-400" },
                  { label: "Asset Category", value: product.category, color: "text-white/60" },
                  { label: "Sub-Category", value: product.subCategory, color: "text-white/60" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/20">{item.label}</span>
                    <span className={`text-[11px] font-black uppercase tracking-widest ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Analytics */}
            <div className="bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/20 p-8 shadow-xl">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-8">Performance Metrics</h3>
              <div className="space-y-6">
                {[
                  { label: "System Views", value: product.views?.toLocaleString() || "0", icon: AnalyticsIcon },
                  { label: "Gross Orders", value: product.totalOrders?.toLocaleString() || "0", icon: OrdersIcon },
                  { label: "Product Rating", value: product.averageRating ? `${product.averageRating} / 5` : "Unrated", icon: RatingIcon },
                  { label: "Feedback Count", value: product.totalReviews?.toLocaleString() || "0", icon: MessageIcon },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-purple-500/40 transition-all overflow-hidden p-2">
                        <Image src={stat.icon} alt={stat.label} className="w-full h-full object-contain" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/30 group-hover:text-white/60 transition-colors">{stat.label}</span>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-white">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SEO Optimization */}
            {(product.seoTitle || product.seoDescription) && (
              <div className="bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/20 p-8 shadow-xl">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-6">Search Metadata</h3>
                <div className="space-y-6">
                  {product.seoTitle && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">Meta Title</p>
                      <p className="text-xs font-bold text-white/80 leading-relaxed">{product.seoTitle}</p>
                    </div>
                  )}
                  {product.seoDescription && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">Meta Description</p>
                      <p className="text-xs font-medium text-white/40 leading-relaxed italic">"{product.seoDescription}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Lifecycle Logs */}
            <div className="bg-white/[0.03] rounded-[2.5rem] border-2 border-purple-500/20 p-8 shadow-xl">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-6">Product Lifecycle</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Initialized</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{new Date(product.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Last Sync</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{new Date(product.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
