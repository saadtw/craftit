// app/customer/orders/[id]/page.js
"use client";

import GlobalLoader from "@/components/ui/GlobalLoader";
import { Suspense, useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import ChatBox from "@/components/chat/ChatBox";
import { getTrackingUrl } from "@/lib/carriers";
import Editor3DWrapper from "@/modules/components/Editor3DWrapper";

const STATUS_COLORS = {
  pending_acceptance:
    "bg-[#eb9728]/10 text-[#eb9728] border border-[#eb9728]/20",
  accepted: "bg-blue-500/10 text-blue-300 border border-blue-500/20",
  in_production: "bg-purple-500/10 text-purple-300 border border-purple-500/20",
  shipped: "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20",
  completed: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-300 border border-red-500/20",
  disputed: "bg-orange-500/10 text-orange-300 border border-orange-500/20",
};

const DIRECT_CANCEL_WINDOW_HOURS = 48;
const REQUEST_CANCEL_WINDOW_TOTAL_HOURS = 168;

function CustomerOrderDetailPageContent() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [showReviewModal, setShowReviewModal] = useState(
    searchParams.get("review") === "true",
  );
  const [reviewForm, setReviewForm] = useState({
    overallRating: 0,
    qualityRating: 0,
    communicationRating: 0,
    deliveryRating: 0,
    comment: "",
    recommend: true,
  });
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      if (data.success) {
        setOrder(data.order);
        if (data.order.reviewed) setReviewSubmitted(true);
      } else {
        alert(data.error || "Failed to load order");
      }
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
      if (session.user.role !== "customer") {
        router.push("/auth/login");
        return;
      }
      fetchOrder();
    }
  }, [status, session, router, fetchOrder]);

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}/cancel?action=request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancelReason || "Cancelled by customer",
        }),
      });
      const data = await res.json();

      if (data.success) {
        await fetchOrder();
        setShowCancelModal(false);
        setCancelReason("");

        if (data.requiresConfirmation) {
          alert(
            "Cancellation request sent to manufacturer. They have up to 72 hours to respond.",
          );
        } else {
          alert("Order cancelled. A full refund will be processed.");
        }
      } else {
        alert(data.error || "Failed to cancel order");

        if (data.requiresDispute) {
          const openDispute = confirm(
            "This order cannot be cancelled directly. Would you like to file a dispute instead?",
          );
          if (openDispute) {
            router.push(`/customer/orders/${id}/dispute`);
          }
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error processing cancellation request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (reviewForm.overallRating === 0) {
      alert("Please provide an overall rating.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewForm),
      });
      const data = await res.json();
      if (data.success) {
        setReviewSubmitted(true);
        setShowReviewModal(false);
        setOrder((prev) => ({ ...prev, reviewed: true }));
      } else {
        alert(data.error || "Failed to submit review");
      }
    } catch (err) {
      alert("Error submitting review");
    } finally {
      setActionLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return <GlobalLoader fullScreen text="Loading order details..." />;
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050507]">
        <p className="text-red-300">Order not found.</p>
      </div>
    );
  }

  const completedMilestones =
    order.milestones?.filter((m) => m.status === "completed").length || 0;
  const totalMilestones = order.milestones?.length || 0;
  const progressPercent =
    totalMilestones > 0
      ? Math.round((completedMilestones / totalMilestones) * 100)
      : 0;

  const trackingUrl =
    order.trackingNumber && order.shippingMethod
      ? getTrackingUrl(order.shippingMethod, order.trackingNumber)
      : null;

  const acceptanceReferenceDate =
    order.manufacturerAcceptedAt || order.createdAt || null;
  const acceptedHoursSince = acceptanceReferenceDate
    ? (Date.now() - new Date(acceptanceReferenceDate).getTime()) /
      (1000 * 60 * 60)
    : null;

  const canDirectCancelAccepted =
    order.status === "accepted" &&
    acceptedHoursSince !== null &&
    acceptedHoursSince <= DIRECT_CANCEL_WINDOW_HOURS;

  const canRequestCancelAccepted =
    order.status === "accepted" &&
    acceptedHoursSince !== null &&
    acceptedHoursSince > DIRECT_CANCEL_WINDOW_HOURS &&
    acceptedHoursSince <= REQUEST_CANCEL_WINDOW_TOTAL_HOURS;

  const cancellationWindowExpired =
    order.status === "accepted" &&
    !order.cancellationStatus &&
    acceptedHoursSince !== null &&
    acceptedHoursSince > REQUEST_CANCEL_WINDOW_TOTAL_HOURS;
  const orderModel3D = order.productDetails?.model3D?.url
    ? order.productDetails.model3D
    : order.productId?.model3D?.url
      ? order.productId.model3D
      : order.rfqId?.customOrderId?.model3D?.url
        ? order.rfqId.customOrderId.model3D
        : null;

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 space-y-6">
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0c0c11] p-6 sm:p-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.13),transparent_32%),radial-gradient(circle_at_left,rgba(235,151,40,0.12),transparent_28%)] pointer-events-none" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                href="/customer/orders"
                className="mb-4 inline-flex text-sm font-semibold text-white/45 hover:text-[#eb9728]"
              >
                ← Back to Orders
              </Link>

              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#eb9728]">
                Order Details
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="font-mono text-2xl font-black tracking-tight text-white">
                  {order.orderNumber}
                </h1>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    STATUS_COLORS[order.status]
                  }`}
                >
                  {order.status
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              </div>

              <p className="mt-2 text-sm text-white/50">
                Review order progress, manufacturer updates, shipment tracking,
                and available actions.
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eb9728] text-sm font-black text-white">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-[24px] border border-white/8 bg-[#0c0c11] p-5 sm:p-6">
              <h2 className="mb-5 text-lg font-black text-white">
                Order Summary
              </h2>

              <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <InfoItem
                  label="Product / Project"
                  value={order.productDetails?.name || "—"}
                />
                <InfoItem
                  label="Order Type"
                  value={order.orderType?.replace("_", " ")}
                  capitalize
                />
                <InfoItem label="Quantity" value={`${order.quantity} units`} />
                <InfoItem
                  label="Total Price"
                  value={`$${order.totalPrice?.toLocaleString()}`}
                  amber
                />
                <InfoItem
                  label="Payment"
                  value={order.paymentStatus}
                  capitalize
                />

                {order.timeline && (
                  <InfoItem
                    label="Production Timeline"
                    value={`${order.timeline} days`}
                  />
                )}

                {order.estimatedDeliveryDate && (
                  <InfoItem
                    label="Est. Delivery"
                    value={new Date(
                      order.estimatedDeliveryDate,
                    ).toLocaleDateString()}
                  />
                )}

                {order.trackingNumber && (
                  <div className="sm:col-span-2 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">
                      Shipment Tracking
                    </p>

                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-indigo-300">
                        local_shipping
                      </span>

                      <div className="flex-1">
                        <p className="text-xs text-white/40">
                          {order.shippingMethod || "Carrier"}
                        </p>
                        <p className="font-mono text-sm font-bold text-white">
                          {order.trackingNumber}
                        </p>
                      </div>

                      {trackingUrl ? (
                        <a
                          href={trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl bg-indigo-500 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-400"
                        >
                          Track Shipment
                        </a>
                      ) : (
                        <span className="text-xs text-white/35">
                          Use tracking # on carrier website
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {order.specialRequirements && (
                <div className="mt-5 border-t border-white/8 pt-5">
                  <p className="mb-1 text-sm font-bold text-white/70">
                    Special Requirements
                  </p>
                  <p className="text-sm leading-6 text-white/45">
                    {order.specialRequirements}
                  </p>
                </div>
              )}
            </section>

            {orderModel3D?.url && (
              <section className="rounded-[24px] border border-white/8 bg-[#0c0c11] p-5 sm:p-6">
                <h2 className="mb-5 text-lg font-black text-white flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-[#eb9728] text-white text-xs rounded font-medium">
                    3D
                  </span>
                  3D Model
                </h2>
                <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
                  <Editor3DWrapper
                    modelUrl={orderModel3D.url}
                    initialAnnotations={orderModel3D.annotations}
                    initialCameraState={orderModel3D.cameraState}
                    readOnly={true}
                  />
                  <div className="mt-3 flex items-center justify-between gap-3 p-3 bg-white/[0.03] border-t border-white/8">
                    <p className="text-sm text-white/60 truncate">
                      {orderModel3D.filename || "Attached 3D model"}
                    </p>
                    <a
                      href={orderModel3D.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-1.5 bg-[#eb9728]/10 text-[#eb9728] rounded-xl text-xs font-bold hover:bg-[#eb9728]/20 transition-colors"
                    >
                      Download
                    </a>
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-[24px] border border-white/8 bg-[#0c0c11] p-5 sm:p-6">
              <h2 className="mb-5 text-lg font-black text-white">
                Production Pipeline
              </h2>

              {order.status === "pending_acceptance" && (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] py-8 text-center text-white/45">
                  <span className="material-symbols-outlined mb-2 block text-4xl">
                    schedule
                  </span>
                  <p className="text-sm">
                    Waiting for manufacturer to accept your order...
                  </p>
                </div>
              )}

              {["accepted", "in_production", "shipped", "completed"].includes(
                order.status,
              ) &&
                totalMilestones === 0 && (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] py-8 text-center">
                    <p className="text-sm text-white/45">
                      The manufacturer hasn&apos;t added production milestones
                      yet.
                    </p>
                  </div>
                )}

              {totalMilestones > 0 && (
                <>
                  <div className="mb-6">
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="font-bold text-white/70">
                        Overall Progress
                      </span>
                      <span className="text-white/45">
                        {completedMilestones}/{totalMilestones} ·{" "}
                        {progressPercent}%
                      </span>
                    </div>

                    <div className="h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-[#eb9728] to-purple-500 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute bottom-0 left-4 top-0 w-0.5 bg-white/8" />

                    <div className="space-y-4">
                      {order.milestones.map((m, i) => (
                        <div key={m._id || i} className="relative flex gap-4">
                          <div
                            className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-black ${
                              m.status === "completed"
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : m.status === "in_progress"
                                  ? "border-purple-500 bg-purple-500 text-white"
                                  : "border-white/15 bg-[#0c0c11] text-white/35"
                            }`}
                          >
                            {m.status === "completed" ? "✓" : i + 1}
                          </div>

                          <div className="flex-1 pb-4">
                            <div className="mb-1 flex items-center justify-between gap-3">
                              <p className="text-sm font-bold text-white">
                                {m.name}
                              </p>

                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                  m.status === "completed"
                                    ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                    : m.status === "in_progress"
                                      ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                                      : "bg-white/[0.04] text-white/40 border border-white/8"
                                }`}
                              >
                                {m.status.replace("_", " ")}
                              </span>
                            </div>

                            {m.description && (
                              <p className="text-xs leading-5 text-white/45">
                                {m.description}
                              </p>
                            )}

                            {m.notes && (
                              <p className="mt-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
                                Update from manufacturer: {m.notes}
                              </p>
                            )}

                            {m.completedAt && (
                              <p className="mt-2 text-xs text-emerald-300">
                                Completed{" "}
                                {new Date(m.completedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </section>

            {order.deliveryAddress?.street && (
              <section className="rounded-[24px] border border-white/8 bg-[#0c0c11] p-5 sm:p-6">
                <h2 className="mb-4 text-lg font-black text-white">
                  Delivery Address
                </h2>

                <div className="space-y-1 text-sm text-white/55">
                  <p className="font-bold text-white">
                    {order.deliveryAddress.recipientName ||
                      order.deliveryAddress.name}
                  </p>
                  <p>{order.deliveryAddress.street}</p>
                  <p>
                    {order.deliveryAddress.city}, {order.deliveryAddress.state}{" "}
                    {order.deliveryAddress.postalCode}
                  </p>
                  <p>{order.deliveryAddress.country}</p>

                  {(order.deliveryAddress.recipientPhone ||
                    order.deliveryAddress.phone) && (
                    <p>
                      📞{" "}
                      {order.deliveryAddress.recipientPhone ||
                        order.deliveryAddress.phone}
                    </p>
                  )}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-5">
            <section className="rounded-[24px] border border-white/8 bg-[#0c0c11] p-5">
              <h2 className="mb-4 text-base font-black text-white">Actions</h2>

              <div className="space-y-3">
                {order.status === "pending_acceptance" && (
                  <DangerButton onClick={() => setShowCancelModal(true)}>
                    Cancel Order
                  </DangerButton>
                )}

                {order.status === "accepted" &&
                  !order.cancellationStatus &&
                  (canDirectCancelAccepted || canRequestCancelAccepted) && (
                    <DangerButton onClick={() => setShowCancelModal(true)}>
                      {canDirectCancelAccepted
                        ? "Cancel Order"
                        : "Request Cancellation"}
                    </DangerButton>
                  )}

                {order.status === "accepted" &&
                  order.cancellationStatus === "requested" && (
                    <NoticeCard tone="warning" title="Cancellation Pending">
                      Waiting for manufacturer response (up to 72 hours).
                    </NoticeCard>
                  )}

                {order.status === "accepted" &&
                  order.cancellationStatus === "rejected" && (
                    <NoticeCard tone="danger" title="Cancellation Declined">
                      The manufacturer declined your request.
                    </NoticeCard>
                  )}

                {cancellationWindowExpired && (
                  <NoticeCard title="Cancellation Window Ended">
                    Please file a dispute if you need admin intervention.
                  </NoticeCard>
                )}

                {["in_production", "shipped"].includes(order.status) && (
                  <NoticeCard title="Cancellation Unavailable">
                    Please file a dispute if you need intervention.
                  </NoticeCard>
                )}

                {order.status === "completed" && !reviewSubmitted && (
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="w-full rounded-xl bg-[#eb9728] py-3 text-sm font-bold text-white hover:bg-amber-500"
                  >
                    ⭐ Leave a Review
                  </button>
                )}

                {reviewSubmitted && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 py-3 text-center text-sm font-bold text-emerald-300">
                    ✓ Review submitted. Thank you!
                  </div>
                )}

                {["accepted", "in_production", "shipped", "completed"].includes(
                  order.status,
                ) && (
                  <Link
                    href={`/customer/orders/${id}/dispute`}
                    className="block w-full rounded-xl border border-[#eb9728]/20 bg-[#eb9728]/10 py-3 text-center text-sm font-bold text-[#eb9728] hover:bg-[#eb9728]/15"
                  >
                    File a Complaint
                  </Link>
                )}

                {order.status === "cancelled" && (
                  <NoticeCard tone="danger" title="Order Cancelled">
                    {order.cancellationReason ||
                      "This order has been cancelled."}
                  </NoticeCard>
                )}

                {order.status === "disputed" && (
                  <NoticeCard tone="warning" title="Dispute Open">
                    A dispute is currently open for this order.
                  </NoticeCard>
                )}
              </div>
            </section>

            <section className="rounded-[24px] border border-white/8 bg-[#0c0c11] p-5">
              <h2 className="mb-4 text-base font-black text-white">
                Manufacturer
              </h2>

              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#eb9728]/20 bg-[#eb9728]/10 text-sm font-black text-[#eb9728]">
                  {(
                    order.manufacturerId?.businessName ||
                    order.manufacturerId?.name ||
                    "M"
                  ).charAt(0)}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {order.manufacturerId?.businessName ||
                      order.manufacturerId?.name}
                  </p>
                  <p className="truncate text-xs text-white/35">
                    {order.manufacturerId?.email}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-white/8 bg-[#0c0c11] p-5">
              <h2 className="mb-4 text-base font-black text-white">
                Order Timeline
              </h2>

              <div className="space-y-4 text-sm">
                <TimelineItem label="Order Placed" date={order.createdAt} />

                {order.manufacturerAcceptedAt && (
                  <TimelineItem
                    label="Accepted by Manufacturer"
                    date={order.manufacturerAcceptedAt}
                  />
                )}

                {order.status === "shipped" ||
                order.status === "completed" ||
                order.actualDeliveryDate ? (
                  order.actualDeliveryDate ? (
                    <TimelineItem
                      label="Delivered"
                      date={order.actualDeliveryDate}
                    />
                  ) : (
                    order.trackingNumber && (
                      <TimelineItem label="Shipped" date={order.updatedAt} />
                    )
                  )
                ) : null}

                {order.completedAt && (
                  <TimelineItem
                    label="Order Completed"
                    date={order.completedAt}
                  />
                )}

                {order.cancelledAt && (
                  <TimelineItem
                    label="Order Cancelled"
                    date={order.cancelledAt}
                    error
                  />
                )}
              </div>
            </section>
          </aside>
        </div>

        {!["cancelled"].includes(order.status) && (
          <section className="mt-6">
            <h2 className="mb-3 text-base font-black text-white">
              Chat with Manufacturer
            </h2>

            <div className="h-[520px] overflow-hidden rounded-[24px] border border-white/8 bg-[#0c0c11]">
              <ChatBox
                orderId={id}
                currentUser={{
                  id: session.user.id,
                  name: session.user.name,
                  role: "customer",
                }}
                orderNumber={order.orderNumber}
                otherParty={{
                  name:
                    order.manufacturerId?.businessName ||
                    order.manufacturerId?.name ||
                    "Manufacturer",
                }}
              />
            </div>
          </section>
        )}
      </main>

      {showCancelModal && (
        <Modal title="Cancel Order" onClose={() => setShowCancelModal(false)}>
          <div className="space-y-4">
            <p className="text-sm leading-6 text-white/55">
              Please confirm your cancellation action. Add a reason below if
              needed.
            </p>

            <label className="block text-sm font-bold text-white/75">
              Reason (optional)
            </label>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="Why are you cancelling?"
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#eb9728] focus:outline-none"
            />

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={
                  actionLoading ||
                  (order.status === "accepted" &&
                    !canDirectCancelAccepted &&
                    !canRequestCancelAccepted)
                }
                className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-400 disabled:opacity-50"
              >
                {actionLoading
                  ? "Processing..."
                  : order.status === "accepted" && canRequestCancelAccepted
                    ? "Request Cancellation"
                    : "Confirm Cancel"}
              </button>

              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason("");
                }}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-bold text-white/70 hover:bg-white/[0.06]"
              >
                Keep Order
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showReviewModal && (
        <Modal title="Leave a Review" onClose={() => setShowReviewModal(false)}>
          <div className="space-y-4">
            {[
              { key: "overallRating", label: "Overall Rating *" },
              { key: "qualityRating", label: "Product Quality" },
              { key: "communicationRating", label: "Communication" },
              { key: "deliveryRating", label: "Delivery" },
            ].map((r) => (
              <div key={r.key}>
                <label className="mb-1 block text-sm font-bold text-white/75">
                  {r.label}
                </label>

                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() =>
                        setReviewForm((prev) => ({ ...prev, [r.key]: star }))
                      }
                      className={`text-2xl transition-colors ${
                        star <= reviewForm[r.key]
                          ? "text-[#eb9728]"
                          : "text-white/20 hover:text-[#eb9728]/60"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <textarea
              value={reviewForm.comment}
              onChange={(e) =>
                setReviewForm((p) => ({ ...p, comment: e.target.value }))
              }
              rows={3}
              placeholder="Share your experience..."
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#eb9728] focus:outline-none"
            />

            <label className="flex items-center gap-2 text-sm text-white/65">
              <input
                type="checkbox"
                checked={reviewForm.recommend}
                onChange={(e) =>
                  setReviewForm((p) => ({ ...p, recommend: e.target.checked }))
                }
                className="accent-[#eb9728]"
              />
              I would recommend this manufacturer
            </label>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSubmitReview}
                disabled={actionLoading}
                className="flex-1 rounded-xl bg-[#eb9728] py-3 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {actionLoading ? "Submitting..." : "Submit Review"}
              </button>

              <button
                onClick={() => setShowReviewModal(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-bold text-white/70 hover:bg-white/[0.06]"
              >
                Skip
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InfoItem({ label, value, amber = false, capitalize = false }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-white/30">
        {label}
      </p>
      <p
        className={`text-sm font-bold ${
          amber ? "text-[#eb9728] text-lg" : "text-white/80"
        } ${capitalize ? "capitalize" : ""}`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function DangerButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-red-500/20 bg-red-500/10 py-3 text-sm font-bold text-red-300 hover:bg-red-500/15"
    >
      {children}
    </button>
  );
}

function NoticeCard({ title, children, tone = "neutral" }) {
  const styles = {
    neutral: "border-white/8 bg-white/[0.03] text-white/55",
    warning: "border-[#eb9728]/20 bg-[#eb9728]/10 text-[#eb9728]",
    danger: "border-red-500/20 bg-red-500/10 text-red-300",
  };

  return (
    <div className={`rounded-xl border p-4 ${styles[tone]}`}>
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-1 text-xs leading-5 opacity-80">{children}</p>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[24px] border border-white/10 bg-[#0c0c11] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-white">{title}</h3>
          <button onClick={onClose} className="text-white/35 hover:text-white">
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function TimelineItem({ label, date, error = false }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
          error ? "bg-red-400" : "bg-emerald-400"
        }`}
      />

      <div>
        <p
          className={`text-sm font-bold ${error ? "text-red-300" : "text-white/75"}`}
        >
          {label}
        </p>
        <p className="text-xs text-white/35">
          {new Date(date).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default function CustomerOrderDetailPage() {
  return (
    <Suspense fallback={<GlobalLoader fullScreen text="Loading order details..." />}>
      <CustomerOrderDetailPageContent />
    </Suspense>
  );
}
