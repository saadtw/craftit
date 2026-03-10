"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import ChatBox from "@/components/chat/ChatBox";

const STATUS_COLORS = {
  pending_acceptance: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  in_production: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  disputed: "bg-orange-100 text-orange-800",
};

export default function CustomerOrderDetailPage() {
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
  }, [status, session]);

  const fetchOrder = async () => {
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
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancelReason || "Cancelled by customer",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOrder((prev) => ({ ...prev, status: "cancelled" }));
        setShowCancelModal(false);
        alert("Order cancelled. A full refund will be processed.");
      } else {
        alert(data.error || "Failed to cancel order");
      }
    } catch (err) {
      alert("Error cancelling order");
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
    return (
      <div className="flex h-screen bg-[#f8f7f6]">
        <CustomerSidebar active="orders" />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Loading order...</p>
        </main>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-screen bg-[#f8f7f6]">
        <CustomerSidebar active="orders" />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-red-600">Order not found.</p>
        </main>
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

  return (
    <div className="flex h-screen bg-[#f8f7f6]">
      <CustomerSidebar active="orders" session={session} />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Link
              href="/customer/orders"
              className="text-sm text-gray-500 hover:text-[#eb9728]"
            >
              ← Orders
            </Link>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-mono font-bold text-gray-900">
              {order.orderNumber}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status]}`}
            >
              {order.status
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 bg-[#eb9728] rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
          </div>
        </header>

        <div className="p-8 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Summary */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Order Summary
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Product / Project</p>
                    <p className="font-semibold text-gray-900">
                      {order.productDetails?.name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Order Type</p>
                    <p className="font-semibold text-gray-900 capitalize">
                      {order.orderType?.replace("_", " ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Quantity</p>
                    <p className="font-semibold text-gray-900">
                      {order.quantity} units
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Price</p>
                    <p className="font-bold text-[#eb9728] text-lg">
                      ${order.totalPrice?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Payment</p>
                    <p className="font-semibold text-gray-900 capitalize">
                      {order.paymentStatus}
                    </p>
                  </div>
                  {order.timeline && (
                    <div>
                      <p className="text-gray-500">Production Timeline</p>
                      <p className="font-semibold text-gray-900">
                        {order.timeline} days
                      </p>
                    </div>
                  )}
                  {order.estimatedDeliveryDate && (
                    <div>
                      <p className="text-gray-500">Est. Delivery</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(
                          order.estimatedDeliveryDate,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {order.trackingNumber && (
                    <div>
                      <p className="text-gray-500">Tracking #</p>
                      <p className="font-semibold text-blue-600">
                        {order.trackingNumber}
                      </p>
                    </div>
                  )}
                </div>
                {order.specialRequirements && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-gray-500 text-sm mb-1">
                      Special Requirements
                    </p>
                    <p className="text-gray-700 text-sm">
                      {order.specialRequirements}
                    </p>
                  </div>
                )}
              </div>

              {/* Production Pipeline */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Production Pipeline
                </h2>

                {order.status === "pending_acceptance" && (
                  <div className="text-center py-6 text-gray-400">
                    <span className="material-symbols-outlined text-4xl block mb-2">
                      schedule
                    </span>
                    <p className="text-sm">
                      Waiting for manufacturer to accept your order...
                    </p>
                  </div>
                )}

                {["accepted", "in_production", "completed"].includes(
                  order.status,
                ) &&
                  totalMilestones === 0 && (
                    <div className="text-center py-6 text-gray-400">
                      <p className="text-sm">
                        The manufacturer hasn&apos;t added production milestones
                        yet.
                      </p>
                    </div>
                  )}

                {totalMilestones > 0 && (
                  <>
                    <div className="mb-5">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 font-medium">
                          Overall Progress
                        </span>
                        <span className="text-gray-500">
                          {completedMilestones}/{totalMilestones} ·{" "}
                          {progressPercent}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3">
                        <div
                          className="bg-linear-to-r from-purple-500 to-[#eb9728] h-3 rounded-full transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="relative">
                      {/* vertical line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100" />
                      <div className="space-y-4">
                        {order.milestones.map((m, i) => (
                          <div key={m._id || i} className="flex gap-4 relative">
                            <div
                              className={`z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${
                                m.status === "completed"
                                  ? "border-green-500 bg-green-500 text-white"
                                  : m.status === "in_progress"
                                    ? "border-purple-500 bg-purple-500 text-white"
                                    : "border-gray-300 bg-white text-gray-400"
                              }`}
                            >
                              {m.status === "completed" ? "✓" : i + 1}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="flex items-center justify-between mb-0.5">
                                <p className="font-semibold text-gray-900 text-sm">
                                  {m.name}
                                </p>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    m.status === "completed"
                                      ? "bg-green-100 text-green-700"
                                      : m.status === "in_progress"
                                        ? "bg-purple-100 text-purple-700"
                                        : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  {m.status.replace("_", " ")}
                                </span>
                              </div>
                              {m.description && (
                                <p className="text-xs text-gray-500">
                                  {m.description}
                                </p>
                              )}
                              {m.notes && (
                                <p className="text-xs text-blue-600 mt-1 bg-blue-50 rounded px-2 py-1">
                                  Update from manufacturer: {m.notes}
                                </p>
                              )}
                              {m.completedAt && (
                                <p className="text-xs text-green-600 mt-1">
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
              </div>

              {/* Delivery Address */}
              {order.deliveryAddress?.street && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-3">
                    Delivery Address
                  </h2>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p className="font-semibold">
                      {order.deliveryAddress.name}
                    </p>
                    <p>{order.deliveryAddress.street}</p>
                    <p>
                      {order.deliveryAddress.city},{" "}
                      {order.deliveryAddress.state}{" "}
                      {order.deliveryAddress.postalCode}
                    </p>
                    <p>{order.deliveryAddress.country}</p>
                    {order.deliveryAddress.phone && (
                      <p>📞 {order.deliveryAddress.phone}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT */}
            <div className="space-y-5">
              {/* Actions */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-base font-bold text-gray-900 mb-4">
                  Actions
                </h2>
                <div className="space-y-3">
                  {order.status === "pending_acceptance" && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="w-full py-2.5 bg-red-100 text-red-700 font-semibold rounded-lg hover:bg-red-200 text-sm"
                    >
                      Cancel Order
                    </button>
                  )}
                  {order.status === "completed" && !reviewSubmitted && (
                    <button
                      onClick={() => setShowReviewModal(true)}
                      className="w-full py-2.5 bg-[#eb9728] text-white font-semibold rounded-lg hover:bg-[#eb9728]/90 text-sm"
                    >
                      ⭐ Leave a Review
                    </button>
                  )}
                  {reviewSubmitted && (
                    <div className="text-center text-sm text-green-600 font-medium py-2">
                      ✓ Review submitted. Thank you!
                    </div>
                  )}

                  {["accepted", "in_production", "completed"].includes(
                    order.status,
                  ) && (
                    <Link
                      href={`/customer/orders/${id}/dispute`}
                      className="block w-full py-2.5 bg-orange-50 text-orange-700 font-semibold rounded-lg hover:bg-orange-100 text-sm text-center"
                    >
                      File a Complaint
                    </Link>
                  )}
                  {["completed", "cancelled"].includes(order.status) &&
                    !reviewSubmitted &&
                    order.status !== "cancelled" &&
                    null}
                  {order.status === "cancelled" && (
                    <div className="text-center text-sm text-red-500 font-medium py-2">
                      This order has been cancelled.
                      {order.cancellationReason && (
                        <p className="text-xs text-gray-400 mt-1">
                          {order.cancellationReason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Manufacturer */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-base font-bold text-gray-900 mb-3">
                  Manufacturer
                </h2>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700">
                    {(
                      order.manufacturerId?.businessName ||
                      order.manufacturerId?.name ||
                      "M"
                    ).charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {order.manufacturerId?.businessName ||
                        order.manufacturerId?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {order.manufacturerId?.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Timeline */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-base font-bold text-gray-900 mb-4">
                  Order Timeline
                </h2>
                <div className="space-y-3 text-sm">
                  <TimelineItem label="Order Placed" date={order.createdAt} />
                  {order.manufacturerAcceptedAt && (
                    <TimelineItem
                      label="Accepted by Manufacturer"
                      date={order.manufacturerAcceptedAt}
                    />
                  )}
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
              </div>
            </div>
          </div>

          {/* Chat with Manufacturer */}
          {!order.status.includes("cancelled") && (
            <div className="mt-6">
              <h2 className="text-base font-bold text-gray-900 mb-3">
                Chat with Manufacturer
              </h2>
              <div className="h-[520px]">
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
            </div>
          )}
        </div>
      </main>

      {/* Cancel Modal */}
      {showCancelModal && (
        <Modal title="Cancel Order" onClose={() => setShowCancelModal(false)}>
          <p className="text-sm text-gray-600 mb-1">
            You can only cancel orders that haven&apos;t been accepted yet. A
            full refund will be processed.
          </p>
          <p className="text-sm text-red-500 font-medium mb-4">
            This action cannot be undone.
          </p>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason (optional)
          </label>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            placeholder="Why are you cancelling?"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 resize-none focus:outline-none"
          />
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
            >
              {actionLoading ? "Cancelling..." : "Confirm Cancel"}
            </button>
            <button
              onClick={() => setShowCancelModal(false)}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 text-sm"
            >
              Keep Order
            </button>
          </div>
        </Modal>
      )}

      {/* Review Modal */}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                          : "text-gray-300 hover:text-[#eb9728]/50"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Written Review
              </label>
              <textarea
                value={reviewForm.comment}
                onChange={(e) =>
                  setReviewForm((p) => ({ ...p, comment: e.target.value }))
                }
                rows={3}
                placeholder="Share your experience..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recommend"
                checked={reviewForm.recommend}
                onChange={(e) =>
                  setReviewForm((p) => ({ ...p, recommend: e.target.checked }))
                }
                className="rounded text-[#eb9728]"
              />
              <label htmlFor="recommend" className="text-sm text-gray-700">
                I would recommend this manufacturer
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSubmitReview}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-[#eb9728] text-white font-bold rounded-lg hover:bg-[#eb9728]/90 disabled:opacity-50 text-sm"
              >
                {actionLoading ? "Submitting..." : "Submit Review"}
              </button>
              <button
                onClick={() => setShowReviewModal(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 text-sm"
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

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
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
    <div className="flex items-center gap-3">
      <div
        className={`w-2.5 h-2.5 rounded-full shrink-0 ${error ? "bg-red-400" : "bg-green-400"}`}
      />
      <div>
        <p
          className={`text-sm font-medium ${error ? "text-red-700" : "text-gray-800"}`}
        >
          {label}
        </p>
        <p className="text-xs text-gray-400">
          {new Date(date).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function CustomerSidebar({ active, session }) {
  const navItems = [
    {
      href: "/customer/dashboard",
      icon: "home",
      label: "Dashboard",
      key: "dashboard",
    },
    {
      href: "/customer/custom-orders",
      icon: "inventory_2",
      label: "My Custom Orders",
      key: "custom-orders",
    },
    { href: "/customer/rfqs", icon: "gavel", label: "My RFQs", key: "rfqs" },
    {
      href: "/customer/orders",
      icon: "receipt_long",
      label: "Orders History",
      key: "orders",
    },
    {
      href: "#",
      icon: "favorite",
      label: "Wishlist",
      key: "wishlist",
      disabled: true,
    },
    {
      href: "#",
      icon: "mail",
      label: "Messages",
      key: "messages",
      disabled: true,
    },
    {
      href: "#",
      icon: "payments",
      label: "Payments",
      key: "payments",
      disabled: true,
    },
    {
      href: "#",
      icon: "settings",
      label: "Settings",
      key: "settings",
      disabled: true,
    },
  ];

  return (
    <aside className="w-64 shrink-0 bg-[#f8f7f6] p-6 flex flex-col justify-between border-r border-gray-200">
      <div>
        <div className="mb-10">
          <svg
            className="h-8 w-8 text-amber-600"
            fill="none"
            viewBox="0 0 48 48"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4.177,14.686,21.5,4.2a3,3,0,0,1,3,0l17.323,10.485a3,3,0,0,1,1.5,2.6V30.714a3,3,0,0,1-1.5,2.6L24.5,43.8a3,3,0,0,1-3,0L4.177,33.314a3,3,0,0,1-1.5-2.6V17.286a3,3,0,0,1,1.5-2.6Z"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="3"
            />
            <path
              d="m22.5,24,14.5-8.5M22.5,24V43.5M22.5,24,9,16"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Craftit</h1>
        </div>
        <nav className="flex flex-col space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                item.disabled
                  ? "text-gray-400 cursor-not-allowed"
                  : active === item.key
                    ? "bg-[#eb9728]/20 text-[#eb9728]"
                    : "text-gray-700 hover:bg-[#eb9728]/10"
              }`}
              title={item.disabled ? "Coming soon" : undefined}
            >
              <span className="material-symbols-outlined text-lg">
                {item.icon}
              </span>
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
      <LogoutButton />
    </aside>
  );
}
