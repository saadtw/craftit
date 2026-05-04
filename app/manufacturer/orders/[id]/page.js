// app/manufacturer/orders/[id]/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  HiOutlineCube, 
  HiOutlineCurrencyDollar, 
  HiOutlineHashtag, 
  HiOutlineClock, 
  HiOutlineCreditCard, 
  HiOutlineTruck,
  HiOutlineChevronLeft,
  HiOutlineArrowUpRight,
  HiOutlineChatBubbleLeftRight,
  HiOutlineMap
} from "react-icons/hi2";
import { useSession } from "next-auth/react";
import Link from "next/link";
import GlobalLoader from "@/components/ui/GlobalLoader";
import ChatBox from "@/components/chat/ChatBox";
import { CARRIER_NAMES } from "@/lib/carriers";
import Editor3DWrapper from "@/modules/components/Editor3DWrapper";

const STATUS_COLORS = {
  pending_acceptance: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  accepted: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  in_production: "bg-purple-500/10 border-purple-500/20 text-purple-400",
  shipped: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
  completed: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  cancelled: "bg-red-500/10 border-red-500/20 text-red-400",
  disputed: "bg-orange-500/10 border-orange-500/20 text-orange-400",
};

const MILESTONE_STATUS_COLORS = {
  pending: "bg-white/5 border-white/10 text-white/40",
  in_progress: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  completed: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
};

export default function ManufacturerOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [showCancelRejectModal, setShowCancelRejectModal] = useState(false);

  const [acceptForm, setAcceptForm] = useState({ estimatedDeliveryDate: "" });
  const [rejectForm, setRejectForm] = useState({ reason: "" });
  const [shipForm, setShipForm] = useState({
    trackingNumber: "",
    shippingMethod: "",
    estimatedDeliveryDate: "",
  });
  const [trackingForm, setTrackingForm] = useState({
    trackingNumber: "",
    shippingMethod: "",
  });
  const [cancelRejectReason, setCancelRejectReason] = useState("");

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      if (data.success) setOrder(data.order);
      else alert(data.error || "Failed to load order");
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
      if (session.user.role !== "manufacturer") {
        router.push("/auth/login");
        return;
      }
      fetchOrder();
    }
  }, [status, session, router, fetchOrder]);

  // Scroll to chat if hash exists
  useEffect(() => {
    if (!loading && order && typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash === "#chat") {
        setTimeout(() => {
          const element = document.getElementById("chat");
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
      }
    }
  }, [loading, order]);

  const updateStatus = async (newStatus, extra = {}) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...extra }),
      });
      const data = await res.json();
      if (data.success) {
        setOrder(data.order);
        setShowAcceptModal(false);
        setShowRejectModal(false);
        setShowCompleteModal(false);
        setShowShipModal(false);
        setShowTrackingModal(false);
      } else {
        alert(data.error || "Action failed");
      }
    } catch (err) {
      alert("Error updating order status");
    } finally {
      setActionLoading(false);
    }
  };

  const saveTrackingInfo = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trackingForm),
      });
      const data = await res.json();
      if (data.success) {
        setOrder(data.order);
        setShowTrackingModal(false);
      } else alert(data.error || "Failed to save tracking info");
    } catch (err) {
      alert("Error saving tracking info");
    } finally {
      setActionLoading(false);
    }
  };

  const markAsShipped = async () => {
    if (!shipForm.trackingNumber || !shipForm.shippingMethod) {
      alert("Please enter both tracking number and carrier.");
      return;
    }
    await updateStatus("shipped", {
      trackingNumber: shipForm.trackingNumber,
      shippingMethod: shipForm.shippingMethod,
      estimatedDeliveryDate: shipForm.estimatedDeliveryDate || undefined,
    });
  };

  const updateMilestone = async (milestoneId, newStatus, notes = "") => {
    try {
      const res = await fetch(`/api/orders/${id}/milestones`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId, status: newStatus, notes }),
      });
      const data = await res.json();
      if (data.success) {
        setOrder((prev) => ({
          ...prev,
          milestones: data.milestones,
          status: data.orderStatus || prev.status,
        }));
      } else alert(data.error || "Failed to update milestone");
    } catch (err) {
      alert("Error updating milestone");
    }
  };

  const handleConfirmCancellation = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}/cancel?action=confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        await fetchOrder();
        setShowCancelConfirmModal(false);
        alert("Cancellation approved. The order has been cancelled.");
      } else {
        alert(data.error || "Failed to confirm cancellation");
      }
    } catch (err) {
      console.error(err);
      alert("Error confirming cancellation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectCancellation = async () => {
    if (!cancelRejectReason.trim()) {
      alert("Please provide a reason for rejecting the cancellation request.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}/cancel?action=reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelRejectReason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchOrder();
        setShowCancelRejectModal(false);
        setCancelRejectReason("");
        alert("Cancellation request declined.");
      } else {
        alert(data.error || "Failed to reject cancellation");
      }
    } catch (err) {
      console.error(err);
      alert("Error rejecting cancellation");
    } finally {
      setActionLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return <GlobalLoader fullScreen text="Loading order details..." />;
  }

  if (!order)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Order not found.</p>
      </div>
    );

  const completedMilestones =
    order.milestones?.filter((m) => m.status === "completed").length || 0;
  const totalMilestones = order.milestones?.length || 0;
  const progressPercent =
    totalMilestones > 0
      ? Math.round((completedMilestones / totalMilestones) * 100)
      : 0;
  const hasPendingCancellationRequest =
    order.cancellationStatus === "requested";
  const orderModel3D = order.productDetails?.model3D?.url
    ? order.productDetails.model3D
    : order.productId?.model3D?.url
      ? order.productId.model3D
      : order.rfqId?.customOrderId?.model3D?.url
        ? order.rfqId.customOrderId.model3D
        : null;

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {/* Header section with back button */}
      <div className="max-w-[1400px] mx-auto px-6 pt-4 pb-4 flex items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <Link
            href="/manufacturer/orders"
            className="group flex items-center gap-4 transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.3)] group-hover:shadow-[0_0_25px_rgba(147,51,234,0.5)] group-hover:scale-105 transition-all duration-300">
              <span className="material-symbols-outlined text-white text-[16px] font-bold group-hover:-translate-x-0.5 transition-transform">
                arrow_back
              </span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white transition-colors">
              BACK TO ORDERS
            </span>
          </Link>
          <div className="h-6 w-px bg-white/10" />
          <h1 className="text-xl font-black tracking-tighter uppercase font-mono">
            <span
              style={{ 
                background: 'linear-gradient(to right, #9333ea, #f97316, #fbbf24, #ffffff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                display: 'inline-block'
              }}
            >
              {order.orderNumber}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${STATUS_COLORS[order.status]}`}>
            {order.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary */}
            <div className="bg-white/[0.03] border-2 border-purple-500/40 rounded-[2.5rem] p-8 backdrop-blur-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 blur-[120px] bg-purple-500/5 group-hover:bg-purple-500/10 transition-all duration-700" />
              
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80 mb-6 flex items-center gap-3">
                <span className="w-8 h-[2px] bg-purple-500/40" />
                Order Summary
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-10 text-[11px] font-black tracking-widest uppercase relative z-10">
                <div className="group/item">
                  <div className="flex items-center gap-3 mb-2 text-white/60 group-hover/item:text-purple-400 transition-colors">
                    <HiOutlineCube className="w-4 h-4" />
                    <p className="tracking-[0.2em]">Product / Project</p>
                  </div>
                  <p className="text-white text-lg font-black tracking-tight normal-case pl-7">
                    {order.productDetails?.name || "—"}
                  </p>
                </div>
                <div className="group/item">
                  <div className="flex items-center gap-3 mb-2 text-white/60 group-hover/item:text-purple-400 transition-colors">
                    <HiOutlineCurrencyDollar className="w-4 h-4" />
                    <p className="tracking-[0.2em]">Agreed Price</p>
                  </div>
                  <p className="text-3xl font-black text-white tracking-tighter pl-7">
                    ${(order.agreedPrice || order.totalPrice)?.toLocaleString()}
                  </p>
                </div>
                <div className="group/item">
                  <div className="flex items-center gap-3 mb-2 text-white/60 group-hover/item:text-purple-400 transition-colors">
                    <HiOutlineHashtag className="w-4 h-4" />
                    <p className="tracking-[0.2em]">Quantity</p>
                  </div>
                  <p className="text-white text-base pl-7">{order.quantity} units</p>
                </div>
                <div className="group/item">
                  <div className="flex items-center gap-3 mb-2 text-white/60 group-hover/item:text-purple-400 transition-colors">
                    <HiOutlineClock className="w-4 h-4" />
                    <p className="tracking-[0.2em]">Timeline</p>
                  </div>
                  <p className="text-white text-base pl-7">{order.timeline ? `${order.timeline} days` : "—"}</p>
                </div>
                <div className="group/item">
                  <div className="flex items-center gap-3 mb-2 text-white/60 group-hover/item:text-purple-400 transition-colors">
                    <HiOutlineCreditCard className="w-4 h-4" />
                    <p className="tracking-[0.2em]">Payment Status</p>
                  </div>
                  <div className="pl-7">
                    <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-400 text-[10px]">
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>
                {order.estimatedDeliveryDate && (
                  <div className="group/item">
                    <div className="flex items-center gap-3 mb-2 text-white/60 group-hover/item:text-purple-400 transition-colors">
                      <HiOutlineTruck className="w-4 h-4" />
                      <p className="tracking-[0.2em]">Est. Delivery</p>
                    </div>
                    <p className="text-white text-base pl-7">
                      {new Date(order.estimatedDeliveryDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {order.trackingNumber && (
                <div className="mt-8 pt-8 border-t border-white/5 relative z-10 group/shipping">
                  <div className="flex items-center gap-3 mb-3 text-white/60 group-hover/shipping:text-purple-400 transition-colors text-[10px] font-black uppercase tracking-[0.2em]">
                    <HiOutlineMap className="w-4 h-4" />
                    <p>Shipping Details</p>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
                    <p className="text-white font-medium text-sm">
                      {order.shippingMethod}
                    </p>
                    <span className="text-purple-400 font-mono text-sm font-black tracking-wider">
                      {order.trackingNumber}
                    </span>
                  </div>
                </div>
              )}

              {order.productDetails?.description && (
                <div className="mt-8 pt-8 border-t border-white/5">
                  <p className="text-white/20 mb-3">Project Description</p>
                  <p className="text-white/60 text-sm leading-relaxed normal-case font-medium">
                    {order.productDetails.description}
                  </p>
                </div>
              )}
            </div>

            {/* 3D Specification */}
            {orderModel3D?.url && (
              <div className="bg-white/[0.03] border-2 border-purple-500/40 rounded-[2.5rem] p-8 backdrop-blur-md">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 flex items-center gap-3">
                    <span className="w-8 h-[2px] bg-blue-500/30" />
                    3D Specification
                  </h2>
                  <a
                    href={orderModel3D.url}
                    download
                    className="flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/10 hover:text-white transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    Download
                  </a>
                </div>
                
                <div className="rounded-3xl overflow-hidden border border-white/10 bg-black/40">
                  <Editor3DWrapper
                    modelUrl={orderModel3D.url}
                    initialAnnotations={orderModel3D.annotations}
                    initialCameraState={orderModel3D.cameraState}
                    readOnly={true}
                  />
                </div>
                
                <div className="mt-4 flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <span className="material-symbols-outlined text-white/20">deployed_code</span>
                  <p className="text-[11px] font-black uppercase tracking-widest text-white/40 truncate">
                    {orderModel3D.filename || "order_model_specification.glb"}
                  </p>
                </div>
              </div>
            )}

            {/* Delivery Address */}
            {order.deliveryAddress?.street && (
              <div className="bg-white/[0.03] border-2 border-purple-500/40 rounded-[2.5rem] p-8 backdrop-blur-md">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-6 flex items-center gap-3">
                  <span className="w-8 h-[2px] bg-emerald-500/30" />
                  Delivery Destination
                </h2>
                <div className="text-sm text-white/60 space-y-2 leading-relaxed">
                  <p className="font-black text-white text-lg tracking-tight mb-2">
                    {order.deliveryAddress.recipientName || order.deliveryAddress.name}
                  </p>
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[18px] text-white/20 mt-1">location_on</span>
                    <div>
                      <p>{order.deliveryAddress.street}</p>
                      <p>{order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.postalCode}</p>
                      <p className="font-black text-[10px] uppercase tracking-widest text-white/30 mt-1">{order.deliveryAddress.country}</p>
                    </div>
                  </div>
                  {(order.deliveryAddress.recipientPhone || order.deliveryAddress.phone) && (
                    <div className="flex items-center gap-3 pt-2 text-white/40">
                      <span className="material-symbols-outlined text-[18px]">phone</span>
                      <p className="font-mono">{order.deliveryAddress.recipientPhone || order.deliveryAddress.phone}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Production Milestones */}
            <div className="bg-white/[0.03] border-2 border-purple-500/30 rounded-[2.5rem] p-8 backdrop-blur-md">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 flex items-center gap-3">
                  <span className="w-8 h-[2px] bg-purple-500/30" />
                  Production Roadmap
                </h2>
                {["accepted", "in_production"].includes(order.status) && !hasPendingCancellationRequest && (
                  <Link
                    href={`/manufacturer/orders/${id}/milestones`}
                    className="px-4 py-1.5 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:scale-105 transition-all"
                  >
                    MANAGE ROADMAP
                  </Link>
                )}
              </div>

              {totalMilestones > 0 && (
                <div className="mb-10">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/20 mb-3">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                      ROADMAP PROGRESS
                    </span>
                    <span>{completedMilestones}/{totalMilestones} COMPLETED · {progressPercent}%</span>
                  </div>
                  <div className="w-full bg-white/5 border border-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-1000"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {order.milestones?.length === 0 ? (
                <div className="text-center py-12 bg-white/[0.02] border border-white/5 border-dashed rounded-[2rem]">
                  <span className="material-symbols-outlined text-4xl text-white/5 mb-3">route</span>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20">No roadmap defined yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {order.milestones.map((m, i) => (
                    <div
                      key={m._id || i}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 group/milestone hover:bg-white/[0.04] transition-all"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 transition-all ${
                          m.status === "completed" 
                            ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                            : m.status === "in_progress" 
                              ? "bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
                              : "bg-white/5 text-white/20 border border-purple-500/20"
                        }`}
                      >
                        {m.status === "completed" ? (
                          <span className="material-symbols-outlined text-[20px]">check</span>
                        ) : (
                          <span>{i + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-widest text-white tracking-tight">
                          {m.name}
                        </p>
                        {m.description && (
                          <p className="text-[10px] font-medium text-white/30 truncate normal-case mt-0.5">
                            {m.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${MILESTONE_STATUS_COLORS[m.status]}`}>
                          {m.status.replace("_", " ")}
                        </span>
                        {["accepted", "in_production"].includes(order.status) && !hasPendingCancellationRequest && m.status !== "completed" && (
                          <select
                            defaultValue=""
                            onChange={(e) => { if (e.target.value) updateMilestone(m._id, e.target.value); }}
                            className="bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/60 rounded-lg px-2 py-1 focus:outline-none focus:border-purple-500/50 transition-all"
                          >
                            <option value="" disabled className="bg-[#0a0a0c]">ACTION</option>
                            {m.status === "pending" && <option value="in_progress" className="bg-[#0a0a0c]">START</option>}
                            {m.status === "in_progress" && <option value="completed" className="bg-[#0a0a0c]">COMPLETE</option>}
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bid Details */}
            {order.bidId && (
              <div className="bg-white/[0.03] border-2 border-purple-500/40 rounded-[2.5rem] p-8 backdrop-blur-md relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 blur-[80px] bg-amber-500/5 group-hover:bg-amber-500/10 transition-all duration-700" />
                
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80 mb-8 flex items-center gap-3">
                  <span className="w-8 h-[2px] bg-amber-500/40" />
                  Your Bid Details
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-[11px] font-black tracking-widest uppercase relative z-10">
                  <div className="group/item">
                    <p className="text-white/40 mb-2 tracking-[0.2em]">Bid Amount</p>
                    <p className="text-3xl font-black text-white tracking-tighter">
                      ${order.bidId?.amount?.toLocaleString()}
                    </p>
                  </div>
                  <div className="group/item">
                    <p className="text-white/40 mb-2 tracking-[0.2em]">Proposed Timeline</p>
                    <p className="text-white text-base">
                      {order.bidId?.timeline} days
                    </p>
                  </div>
                </div>

                {order.bidId?.materialsDescription && (
                  <div className="mt-8 pt-8 border-t border-white/5 relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-3">Materials Specification</p>
                    <p className="text-white/60 text-sm leading-relaxed normal-case font-medium">
                      {order.bidId.materialsDescription}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            {/* Actions */}
            <div className="bg-white/[0.03] border-2 border-purple-500/30 rounded-[2.5rem] p-8 backdrop-blur-md relative overflow-hidden group">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-6 flex items-center gap-3">
                <span className="w-8 h-[2px] bg-purple-500/30" />
                Management Actions
              </h2>
              
              <div className="space-y-4">
                {order.status === "pending_acceptance" && (
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => setShowAcceptModal(true)}
                      className="w-full py-3.5 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:bg-emerald-500 hover:scale-[1.02] transition-all"
                    >
                      Accept Order
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="w-full py-3.5 bg-white/5 text-white/40 text-[11px] font-black uppercase tracking-widest rounded-2xl border border-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
                    >
                      Reject Order
                    </button>
                  </div>
                )}
                {order.status === "accepted" && (
                  <>
                    {hasPendingCancellationRequest && (
                      <div className="bg-red-500/10 border-2 border-red-500/30 rounded-3xl p-6 mb-4 animate-pulse-subtle">
                        <div className="flex items-start gap-4 mb-6">
                          <div className="w-10 h-10 bg-red-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                            <span className="material-symbols-outlined">warning</span>
                          </div>
                          <div>
                            <p className="text-sm font-black text-red-400 uppercase tracking-widest">
                              Cancellation Requested
                            </p>
                            <p className="text-xs text-white/40 mt-1 leading-relaxed">
                              The customer has requested to cancel this order. Please review and respond.
                            </p>
                            {order.cancellationReason && (
                              <div className="mt-4 p-3 bg-black/20 rounded-xl border border-white/5 italic text-xs text-white/60">
                                &quot;{order.cancellationReason}&quot;
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={() => setShowCancelConfirmModal(true)}
                            className="flex-1 py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 transition-all"
                          >
                            Approve Cancellation
                          </button>
                          <button
                            onClick={() => setShowCancelRejectModal(true)}
                            className="flex-1 py-3 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/10 hover:bg-white/10 transition-all"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    )}

                    {!hasPendingCancellationRequest && (
                      <div className="grid grid-cols-1 gap-3">
                        <Link
                          href={`/manufacturer/orders/${id}/milestones`}
                          className="flex items-center justify-center gap-2 w-full py-3.5 bg-purple-600 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:scale-[1.02] transition-all"
                        >
                          <span className="material-symbols-outlined text-[18px]">route</span>
                          Update Milestones
                        </Link>
                        <button
                          onClick={() => setShowTrackingModal(true)}
                          className="w-full py-3.5 bg-white/5 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
                        >
                          Update Shipping Details
                        </button>
                      </div>
                    )}
                  </>
                )}
                {order.status === "in_production" && (
                  <>
                    {!hasPendingCancellationRequest && (
                      <div className="grid grid-cols-1 gap-3">
                        <Link
                          href={`/manufacturer/orders/${id}/milestones`}
                          className="flex items-center justify-center gap-2 w-full py-3.5 bg-purple-600 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:scale-[1.02] transition-all"
                        >
                          <span className="material-symbols-outlined text-[18px]">checklist</span>
                          Milestone Status
                        </Link>
                        <button
                          onClick={() => setShowShipModal(true)}
                          className="w-full py-3.5 bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:bg-indigo-500 transition-all"
                        >
                          Mark as Shipped
                        </button>
                      </div>
                    )}
                  </>
                )}
                {order.status === "shipped" && (
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => setShowCompleteModal(true)}
                      className="w-full py-3.5 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-500 transition-all"
                    >
                      Complete Order
                    </button>
                  </div>
                )}
                {["completed", "cancelled", "disputed"].includes(order.status) && (
                  <div className="text-center py-8 bg-white/[0.02] border border-white/5 rounded-[2rem]">
                    <span className="material-symbols-outlined text-white/5 text-4xl mb-2">lock</span>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Archived Record</p>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white/[0.03] border-2 border-purple-500/40 rounded-[2.5rem] p-8 backdrop-blur-md">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-6 flex items-center gap-3">
                <span className="w-8 h-[2px] bg-amber-500/30" />
                Customer Record
              </h2>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-black text-amber-500 text-xl shadow-inner">
                  {order.customerId?.name?.charAt(0) || "C"}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-white text-base tracking-tight truncate">
                    {order.customerId?.name}
                  </p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-1">
                    {order.customerId?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Timeline */}
            <div className="bg-white/[0.03] border-2 border-purple-500/40 rounded-[2.5rem] p-8 backdrop-blur-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 blur-[80px] bg-blue-500/5 group-hover:bg-blue-500/10 transition-all duration-700" />
              
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80 mb-10 flex items-center gap-3">
                <span className="w-8 h-[2px] bg-blue-500/40" />
                Activity Timeline
              </h2>
              
              <div className="space-y-10 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
                <TimelineItem 
                  label="Order Placed" 
                  date={order.createdAt} 
                  icon="shopping_bag"
                />
                {order.manufacturerAcceptedAt && (
                  <TimelineItem
                    label="Accepted by You"
                    date={order.manufacturerAcceptedAt}
                    icon="check_circle"
                  />
                )}
                {order.trackingNumber && order.status === "shipped" && (
                  <TimelineItem 
                    label="Shipped" 
                    date={order.updatedAt} 
                    icon="local_shipping"
                  />
                )}
                {order.completedAt && (
                  <TimelineItem 
                    label="Completed" 
                    date={order.completedAt} 
                    icon="verified"
                  />
                )}
                {order.cancelledAt && (
                  <TimelineItem
                    label="Cancelled"
                    date={order.cancelledAt}
                    icon="cancel"
                    error
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chat */}
        {order.status !== "cancelled" && (
          <div className="mt-8 bg-white/[0.03] border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-md" id="chat">
            <div className="px-8 py-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 flex items-center gap-3">
                <span className="w-8 h-[2px] bg-purple-500/30" />
                Customer Collaboration
              </h2>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Live Messenger</span>
              </div>
            </div>
            <div className="h-[600px] p-2 bg-[#0a0a0c]/40">
              <ChatBox
                orderId={id}
                currentUser={{
                  id: session.user.id,
                  name: session.user.businessName || session.user.name,
                  role: "manufacturer",
                }}
                orderNumber={order.orderNumber}
                otherParty={{ name: order.customerId?.name || "Customer" }}
              />
            </div>
          </div>
        )}
      </main>

      {/* Accept Modal */}
      {showAcceptModal && (
        <Modal title="Accept Order" onClose={() => setShowAcceptModal(false)}>
          <p className="text-sm text-gray-600 mb-4">
            Set an estimated delivery date for{" "}
            <strong>{order.orderNumber}</strong>.
          </p>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estimated Delivery Date
          </label>
          <input
            type="date"
            value={acceptForm.estimatedDeliveryDate}
            onChange={(e) =>
              setAcceptForm({ estimatedDeliveryDate: e.target.value })
            }
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-orange-400"
          />
          <div className="flex gap-3">
            <button
              onClick={() =>
                updateStatus("accepted", {
                  estimatedDeliveryDate: acceptForm.estimatedDeliveryDate,
                })
              }
              disabled={actionLoading}
              className="flex-1 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading ? "Accepting..." : "Confirm Accept"}
            </button>
            <button
              onClick={() => setShowAcceptModal(false)}
              className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <Modal title="Reject Order" onClose={() => setShowRejectModal(false)}>
          <p className="text-sm text-gray-600 mb-4">
            The customer will be notified. A full refund will be issued
            automatically.
          </p>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason (optional)
          </label>
          <textarea
            value={rejectForm.reason}
            onChange={(e) => setRejectForm({ reason: e.target.value })}
            rows={3}
            placeholder="e.g. Unable to meet required timeline..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-red-400"
          />
          <div className="flex gap-3">
            <button
              onClick={() =>
                updateStatus("cancelled", {
                  rejectionReason: rejectForm.reason,
                })
              }
              disabled={actionLoading}
              className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {actionLoading ? "Rejecting..." : "Confirm Reject"}
            </button>
            <button
              onClick={() => setShowRejectModal(false)}
              className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Ship Modal */}
      {showShipModal && (
        <Modal title="Mark as Shipped" onClose={() => setShowShipModal(false)}>
          <p className="text-sm text-gray-600 mb-4">
            Enter the shipping details. The customer will be notified and given
            a tracking link.
          </p>
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Carrier *
              </label>
              <select
                value={shipForm.shippingMethod}
                onChange={(e) =>
                  setShipForm((p) => ({ ...p, shippingMethod: e.target.value }))
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              >
                <option value="">Select carrier...</option>
                {CARRIER_NAMES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tracking Number *
              </label>
              <input
                type="text"
                value={shipForm.trackingNumber}
                onChange={(e) =>
                  setShipForm((p) => ({ ...p, trackingNumber: e.target.value }))
                }
                placeholder="e.g. 1Z999AA10123456784"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Delivery Date (optional)
              </label>
              <input
                type="date"
                value={shipForm.estimatedDeliveryDate}
                onChange={(e) =>
                  setShipForm((p) => ({
                    ...p,
                    estimatedDeliveryDate: e.target.value,
                  }))
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={markAsShipped}
              disabled={actionLoading}
              className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {actionLoading ? "Marking..." : "Confirm Shipped"}
            </button>
            <button
              onClick={() => setShowShipModal(false)}
              className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Complete Modal */}
      {showCompleteModal && (
        <Modal
          title="Mark as Completed"
          onClose={() => setShowCompleteModal(false)}
        >
          <p className="text-sm text-gray-600 mb-4">
            Confirm that order <strong>{order.orderNumber}</strong> has been
            fully delivered. Payment will be released.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => updateStatus("completed")}
              disabled={actionLoading}
              className="flex-1 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading ? "Completing..." : "Yes, Mark Completed"}
            </button>
            <button
              onClick={() => setShowCompleteModal(false)}
              className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Tracking update modal */}
      {showTrackingModal && (
        <Modal
          title="Update Shipping Info"
          onClose={() => setShowTrackingModal(false)}
        >
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Carrier
              </label>
              <select
                value={trackingForm.shippingMethod}
                onChange={(e) =>
                  setTrackingForm((p) => ({
                    ...p,
                    shippingMethod: e.target.value,
                  }))
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              >
                <option value="">Select carrier...</option>
                {CARRIER_NAMES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tracking Number
              </label>
              <input
                type="text"
                value={trackingForm.trackingNumber}
                onChange={(e) =>
                  setTrackingForm((p) => ({
                    ...p,
                    trackingNumber: e.target.value,
                  }))
                }
                placeholder="e.g. 1Z999AA10123456784"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={saveTrackingInfo}
              disabled={actionLoading}
              className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setShowTrackingModal(false)}
              className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {showCancelConfirmModal && (
        <Modal
          title="Approve Cancellation Request"
          onClose={() => setShowCancelConfirmModal(false)}
        >
          <p className="text-sm text-gray-600 mb-2">
            Approving this request will cancel the order and issue a full
            refund.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 my-4">
            <p className="text-sm text-yellow-800 font-medium">Important</p>
            <ul className="text-xs text-yellow-700 mt-2 space-y-1 list-disc list-inside">
              <li>The customer receives a full refund</li>
              <li>The order will be permanently cancelled</li>
              <li>Payment for this order will not be released</li>
            </ul>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleConfirmCancellation}
              disabled={actionLoading}
              className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {actionLoading ? "Processing..." : "Approve Cancellation"}
            </button>
            <button
              onClick={() => setShowCancelConfirmModal(false)}
              className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200"
            >
              Go Back
            </button>
          </div>
        </Modal>
      )}

      {showCancelRejectModal && (
        <Modal
          title="Decline Cancellation Request"
          onClose={() => setShowCancelRejectModal(false)}
        >
          <p className="text-sm text-gray-600 mb-4">
            Provide a reason. This will be shared with the customer.
          </p>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason *
          </label>
          <textarea
            value={cancelRejectReason}
            onChange={(e) => setCancelRejectReason(e.target.value)}
            rows={4}
            placeholder="E.g. production already started and materials are consumed"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 resize-none focus:outline-none focus:border-orange-400"
          />
          <div className="flex flex-col gap-3">
            <button
              onClick={handleRejectCancellation}
              disabled={actionLoading || !cancelRejectReason.trim()}
              className="w-full py-3 bg-white/5 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl border border-white/10 hover:bg-white/10 disabled:opacity-50"
            >
              {actionLoading ? "Processing..." : "Confirm Decline"}
            </button>
            <button
              onClick={() => {
                setShowCancelRejectModal(false);
                setCancelRejectReason("");
              }}
              className="w-full py-3 bg-white/5 text-white/20 text-[11px] font-black uppercase tracking-widest rounded-2xl hover:text-white transition-all"
            >
              Back
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="bg-[#0a0a0c] border-2 border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-50 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-600 via-orange-500 to-gold-400" />
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 flex items-center gap-3">
              <span className="w-8 h-[2px] bg-purple-500/30" />
              {title}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/20 hover:text-white hover:bg-white/10 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="text-white">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ label, date, icon, error = false }) {
  return (
    <div className="flex items-start gap-8 relative group/item">
      {/* Marker Wrapper */}
      <div className="relative z-10 flex-shrink-0">
        {/* Outer Glow Ring */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
            error 
              ? "bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.3)] border border-red-500/40" 
              : "bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-500/40"
          } group-hover/item:scale-110`}
        >
          {/* Inner Solid Point */}
          <div
            className={`w-4 h-4 rounded-full flex items-center justify-center ${
              error ? "bg-red-500" : "bg-emerald-500"
            }`}
          >
            <span className="material-symbols-outlined text-white text-[10px] font-black">
              {icon}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-1">
        <p className={`text-[10px] font-black uppercase tracking-[0.1em] ${error ? "text-red-400" : "text-white"} group-hover/item:translate-x-1 transition-transform duration-300`}>
          {label}
        </p>
        <div className="flex items-center gap-2 mt-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
          <span className="material-symbols-outlined text-[10px] text-blue-400">schedule</span>
          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest font-mono">
            {new Date(date).toLocaleString('en-GB', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
