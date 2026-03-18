"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import ChatBox from "@/components/chat/ChatBox";

const STATUS_COLORS = {
  pending_acceptance: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  in_production: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  disputed: "bg-orange-100 text-orange-800",
};

const MILESTONE_STATUS_COLORS = {
  pending: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

export default function ManufacturerOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  const [acceptForm, setAcceptForm] = useState({ estimatedDeliveryDate: "" });
  const [rejectForm, setRejectForm] = useState({ reason: "" });
  const [trackingForm, setTrackingForm] = useState({
    trackingNumber: "",
    shippingMethod: "",
  });

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
      } else {
        alert(data.error || "Failed to save tracking info");
      }
    } catch (err) {
      alert("Error saving tracking info");
    } finally {
      setActionLoading(false);
    }
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
      } else {
        alert(data.error || "Failed to update milestone");
      }
    } catch (err) {
      alert("Error updating milestone");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-blue-50 to-white">
        <p className="text-gray-600 text-lg">Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Order not found.</p>
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
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-10 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              href="/manufacturer/orders"
              className="text-sm text-gray-600 hover:text-orange-500 flex items-center gap-1"
            >
              ← Orders
            </Link>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-mono font-bold text-blue-900">
              {order.orderNumber}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_COLORS[order.status]}`}
            >
              {order.status
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-10 py-8 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-blue-900 mb-4">
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
                  <p className="text-gray-500">Agreed Price</p>
                  <p className="font-bold text-orange-500 text-lg">
                    $
                    {order.agreedPrice?.toLocaleString() ||
                      order.totalPrice?.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Payment Status</p>
                  <p className="font-semibold text-gray-900 capitalize">
                    {order.paymentStatus}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Timeline</p>
                  <p className="font-semibold text-gray-900">
                    {order.timeline ? `${order.timeline} days` : "—"}
                  </p>
                </div>
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
                    <p className="font-semibold text-gray-900">
                      {order.trackingNumber}
                    </p>
                  </div>
                )}
              </div>
              {order.productDetails?.description && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-gray-500 text-sm mb-1">Description</p>
                  <p className="text-gray-700 text-sm">
                    {order.productDetails.description}
                  </p>
                </div>
              )}
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

            {/* Delivery Address */}
            {order.deliveryAddress?.street && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-bold text-blue-900 mb-4">
                  Delivery Address
                </h2>
                <div className="text-sm text-gray-700 space-y-1">
                  <p className="font-semibold">{order.deliveryAddress.name}</p>
                  <p>{order.deliveryAddress.street}</p>
                  <p>
                    {order.deliveryAddress.city}, {order.deliveryAddress.state}{" "}
                    {order.deliveryAddress.postalCode}
                  </p>
                  <p>{order.deliveryAddress.country}</p>
                  {order.deliveryAddress.phone && (
                    <p>📞 {order.deliveryAddress.phone}</p>
                  )}
                </div>
              </div>
            )}

            {/* Production Milestones */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-blue-900">
                  Production Milestones
                </h2>
                {["accepted", "in_production"].includes(order.status) && (
                  <Link
                    href={`/manufacturer/orders/${id}/milestones`}
                    className="text-sm text-orange-500 hover:text-orange-600 font-medium"
                  >
                    Manage →
                  </Link>
                )}
              </div>

              {totalMilestones > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Overall Progress</span>
                    <span>
                      {completedMilestones}/{totalMilestones} ·{" "}
                      {progressPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className="bg-purple-500 h-2.5 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {order.milestones?.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <p className="text-sm">No milestones yet.</p>
                  {["accepted", "in_production"].includes(order.status) && (
                    <Link
                      href={`/manufacturer/orders/${id}/milestones`}
                      className="text-sm text-orange-500 underline"
                    >
                      Add milestones
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {order.milestones.map((m, i) => (
                    <div
                      key={m._id || i}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          m.status === "completed"
                            ? "bg-green-500 text-white"
                            : m.status === "in_progress"
                              ? "bg-blue-500 text-white"
                              : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {m.status === "completed" ? "✓" : i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {m.name}
                        </p>
                        {m.description && (
                          <p className="text-xs text-gray-500">
                            {m.description}
                          </p>
                        )}
                        {m.notes && (
                          <p className="text-xs text-blue-600 mt-0.5">
                            Note: {m.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${MILESTONE_STATUS_COLORS[m.status]}`}
                        >
                          {m.status.replace("_", " ")}
                        </span>
                        {["accepted", "in_production"].includes(order.status) &&
                          m.status !== "completed" && (
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value)
                                  updateMilestone(m._id, e.target.value);
                              }}
                              className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none"
                            >
                              <option value="" disabled>
                                Update
                              </option>
                              {m.status === "pending" && (
                                <option value="in_progress">
                                  Mark In Progress
                                </option>
                              )}
                              {m.status === "in_progress" && (
                                <option value="completed">Mark Complete</option>
                              )}
                            </select>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bid Details (for RFQ orders) */}
            {order.bidId && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-bold text-blue-900 mb-4">
                  Your Bid Details
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Bid Amount</p>
                    <p className="font-semibold text-gray-900">
                      ${order.bidId?.amount?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Proposed Timeline</p>
                    <p className="font-semibold text-gray-900">
                      {order.bidId?.timeline} days
                    </p>
                  </div>
                </div>
                {order.bidId?.materialsDescription && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Materials</p>
                    <p className="text-sm text-gray-700">
                      {order.bidId.materialsDescription}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Actions + Customer info */}
          <div className="space-y-6">
            {/* Primary Actions */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-blue-900 mb-4">Actions</h2>
              <div className="space-y-3">
                {order.status === "pending_acceptance" && (
                  <>
                    <button
                      onClick={() => setShowAcceptModal(true)}
                      className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700"
                    >
                      ✓ Accept Order
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="w-full py-3 bg-red-100 text-red-700 font-bold rounded-lg hover:bg-red-200"
                    >
                      ✗ Reject Order
                    </button>
                  </>
                )}

                {order.status === "accepted" && (
                  <>
                    <Link
                      href={`/manufacturer/orders/${id}/milestones`}
                      className="block w-full py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 text-center"
                    >
                      📋 Manage Milestones
                    </Link>
                    <button
                      onClick={() => setShowTrackingModal(true)}
                      className="w-full py-3 bg-blue-100 text-blue-700 font-bold rounded-lg hover:bg-blue-200"
                    >
                      🚚 Update Shipping Info
                    </button>
                  </>
                )}

                {order.status === "in_production" && (
                  <>
                    <Link
                      href={`/manufacturer/orders/${id}/milestones`}
                      className="block w-full py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 text-center"
                    >
                      📋 Update Milestones
                    </Link>
                    <button
                      onClick={() => setShowCompleteModal(true)}
                      className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700"
                    >
                      ✅ Mark as Completed
                    </button>
                    <button
                      onClick={() => setShowTrackingModal(true)}
                      className="w-full py-3 bg-blue-100 text-blue-700 font-bold rounded-lg hover:bg-blue-200"
                    >
                      🚚 Update Tracking
                    </button>
                  </>
                )}

                {["completed", "cancelled"].includes(order.status) && (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    No further actions available.
                  </div>
                )}
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-blue-900 mb-4">Customer</h2>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-600">
                  {order.customerId?.name?.charAt(0) || "C"}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {order.customerId?.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {order.customerId?.email}
                  </p>
                </div>
              </div>
              {order.customerId?.phone && (
                <p className="text-sm text-gray-600">
                  📞 {order.customerId.phone}
                </p>
              )}
            </div>

            {/* Order Timeline */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-blue-900 mb-4">
                Order Timeline
              </h2>
              <div className="space-y-3 text-sm">
                <TimelineItem label="Order Placed" date={order.createdAt} />
                {order.manufacturerAcceptedAt && (
                  <TimelineItem
                    label="Accepted by You"
                    date={order.manufacturerAcceptedAt}
                  />
                )}
                {order.completedAt && (
                  <TimelineItem label="Completed" date={order.completedAt} />
                )}
                {order.cancelledAt && (
                  <TimelineItem
                    label="Cancelled"
                    date={order.cancelledAt}
                    error
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chat with Customer */}
        {order.status !== "cancelled" && (
          <div className="mt-6">
            <h2 className="text-base font-bold text-blue-900 mb-3">
              Chat with Customer
            </h2>
            <div className="h-[520px]">
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
            You are about to accept order <strong>{order.orderNumber}</strong>.
            Please set an estimated delivery date.
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
            Please provide a reason for rejecting this order. The customer will
            be notified.
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

      {/* Complete Modal */}
      {showCompleteModal && (
        <Modal
          title="Mark as Completed"
          onClose={() => setShowCompleteModal(false)}
        >
          <p className="text-sm text-gray-600 mb-4">
            Confirm that order <strong>{order.orderNumber}</strong> has been
            fully completed and delivered to the customer.
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

      {/* Tracking Modal */}
      {showTrackingModal && (
        <Modal
          title="Update Shipping Info"
          onClose={() => setShowTrackingModal(false)}
        >
          <div className="space-y-3 mb-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shipping Method
              </label>
              <input
                type="text"
                value={trackingForm.shippingMethod}
                onChange={(e) =>
                  setTrackingForm((p) => ({
                    ...p,
                    shippingMethod: e.target.value,
                  }))
                }
                placeholder="e.g. DHL Express, FedEx..."
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
              {actionLoading ? "Saving..." : "Save Tracking Info"}
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
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
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
          className={`font-medium ${error ? "text-red-700" : "text-gray-800"}`}
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
