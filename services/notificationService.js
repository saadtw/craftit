import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";

/**
 * Central helper to create notifications.
 * Call this from any API route after a meaningful event.
 *
 * @param {object} params
 * @param {string} params.userId     - recipient
 * @param {string} params.type       - NotificationSchema enum
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} [params.link]     - frontend route to navigate to on click
 * @param {string} [params.relatedType]
 * @param {string} [params.relatedId]
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
  relatedType,
  relatedId,
}) {
  try {
    await connectDB();
    await Notification.create({
      userId,
      type,
      title,
      message,
      link,
      relatedType,
      relatedId,
    });
  } catch (err) {
    // Never let a notification failure break the calling flow
    console.error("Failed to create notification:", err.message);
  }
}

// ─── Pre-built templates ───────────────────────────────────────────────────

export const notify = {
  // Orders
  orderPlaced: (manufacturerId, orderId, orderNumber) =>
    createNotification({
      userId: manufacturerId,
      type: "order_placed",
      title: "New order received",
      message: `Order #${orderNumber} has been placed and is awaiting your acceptance.`,
      link: `/manufacturer/orders/${orderId}`,
      relatedType: "order",
      relatedId: orderId,
    }),

  orderAccepted: (customerId, orderId, orderNumber) =>
    createNotification({
      userId: customerId,
      type: "order_accepted",
      title: "Order accepted",
      message: `Your order #${orderNumber} has been accepted and is now in production.`,
      link: `/customer/orders/${orderId}`,
      relatedType: "order",
      relatedId: orderId,
    }),

  orderRejected: (customerId, orderId, orderNumber) =>
    createNotification({
      userId: customerId,
      type: "order_rejected",
      title: "Order rejected",
      message: `Your order #${orderNumber} was rejected by the manufacturer.`,
      link: `/customer/orders/${orderId}`,
      relatedType: "order",
      relatedId: orderId,
    }),

  orderShipped: (customerId, orderId, orderNumber) =>
    createNotification({
      userId: customerId,
      type: "order_shipped",
      title: "Order shipped",
      message: `Your order #${orderNumber} has been shipped. Check tracking details.`,
      link: `/customer/orders/${orderId}`,
      relatedType: "order",
      relatedId: orderId,
    }),

  orderCompleted: async (customerId, manufacturerId, orderId, orderNumber) => {
    return Promise.all([
      createNotification({
        userId: customerId,
        type: "order_completed",
        title: "Order completed",
        message: `Order #${orderNumber} is complete. Leave a review!`,
        link: `/customer/orders/${orderId}`,
        relatedType: "order",
        relatedId: orderId,
      }),
      createNotification({
        userId: manufacturerId,
        type: "order_completed",
        title: "Order completed",
        message: `Order #${orderNumber} has been marked as completed.`,
        link: `/manufacturer/orders/${orderId}`,
        relatedType: "order",
        relatedId: orderId,
      }),
    ]);
  },

  orderCancelled: (recipientId, orderId, orderNumber, isCustomer) =>
    createNotification({
      userId: recipientId,
      type: "order_cancelled",
      title: "Order cancelled",
      message: `Order #${orderNumber} has been cancelled.`,
      link: `/${isCustomer ? "customer" : "manufacturer"}/orders/${orderId}`,
      relatedType: "order",
      relatedId: orderId,
    }),

  // Bids
  bidReceived: (customerId, rfqId, bidId, manufacturerName) =>
    createNotification({
      userId: customerId,
      type: "bid_received",
      title: "New bid received",
      message: `${manufacturerName} has placed a bid on your RFQ.`,
      link: `/customer/rfqs/${rfqId}/bids`,
      relatedType: "bid",
      relatedId: bidId,
    }),

  bidAccepted: (manufacturerId, bidId, rfqTitle) =>
    createNotification({
      userId: manufacturerId,
      type: "bid_accepted",
      title: "Bid accepted!",
      message: `Your bid for "${rfqTitle}" was accepted. Check your orders.`,
      link: `/manufacturer/orders`,
      relatedType: "bid",
      relatedId: bidId,
    }),

  bidRejected: (manufacturerId, bidId, rfqTitle) =>
    createNotification({
      userId: manufacturerId,
      type: "bid_rejected",
      title: "Bid not selected",
      message: `Your bid for "${rfqTitle}" was not selected.`,
      link: `/manufacturer/bids`,
      relatedType: "bid",
      relatedId: bidId,
    }),

  bidUpdated: (customerId, rfqId, bidId, manufacturerName) =>
    createNotification({
      userId: customerId,
      type: "bid_updated",
      title: "Bid updated",
      message: `${manufacturerName} has updated their bid. Review the new terms.`,
      link: `/customer/rfqs/${rfqId}/bids`,
      relatedType: "bid",
      relatedId: bidId,
    }),

  // Messages
  newMessage: (recipientId, conversationId, senderName, contextType) =>
    createNotification({
      userId: recipientId,
      type: "new_message",
      title: "New message",
      message: `${senderName} sent you a message.`,
      link:
        contextType === "bid"
          ? `/bids/${conversationId}`
          : `/customer/orders/${conversationId}`,
      relatedType: contextType === "bid" ? "bid" : "order",
      relatedId: conversationId,
    }),

  // Group Buy
  groupBuyCompleted: (customerId, groupBuyId, productName) =>
    createNotification({
      userId: customerId,
      type: "group_buy_completed",
      title: "Group buy completed!",
      message: `The group buy for "${productName}" is complete. Your order is being processed.`,
      link: `/customer/group-buys/${groupBuyId}`,
      relatedType: "group_buy",
      relatedId: groupBuyId,
    }),

  groupBuyCancelled: (customerId, groupBuyId, productName) =>
    createNotification({
      userId: customerId,
      type: "group_buy_cancelled",
      title: "Group buy cancelled",
      message: `The group buy for "${productName}" was cancelled. A full refund will be processed.`,
      link: `/customer/group-buys/${groupBuyId}`,
      relatedType: "group_buy",
      relatedId: groupBuyId,
    }),

  // Disputes
  disputeOpened: (manufacturerId, disputeId, orderNumber) =>
    createNotification({
      userId: manufacturerId,
      type: "dispute_opened",
      title: "Dispute opened",
      message: `A dispute has been opened for order #${orderNumber}. Please respond within 48 hours.`,
      link: `/manufacturer/disputes/${disputeId}`,
      relatedType: "dispute",
      relatedId: disputeId,
    }),

  disputeResolved: async (
    customerId,
    manufacturerId,
    disputeId,
    resolution,
  ) => {
    const msg =
      resolution === "refund_customer"
        ? "The dispute was resolved in your favour. A refund has been issued."
        : resolution === "side_with_manufacturer"
          ? "The dispute has been resolved."
          : "The dispute was resolved with a partial refund.";
    return Promise.all([
      createNotification({
        userId: customerId,
        type: "dispute_resolved",
        title: "Dispute resolved",
        message: msg,
        link: `/customer/orders`,
        relatedType: "dispute",
        relatedId: disputeId,
      }),
      createNotification({
        userId: manufacturerId,
        type: "dispute_resolved",
        title: "Dispute resolved",
        message: "A dispute on your order has been resolved by admin.",
        link: `/manufacturer/disputes/${disputeId}`,
        relatedType: "dispute",
        relatedId: disputeId,
      }),
    ]);
  },

  // Verification
  verificationApproved: (manufacturerId) =>
    createNotification({
      userId: manufacturerId,
      type: "verification_approved",
      title: "Account verified!",
      message:
        "Congratulations! Your business has been verified. Your profile now shows a verified badge.",
      link: `/manufacturer/settings`,
    }),

  verificationRejected: (manufacturerId, reason) =>
    createNotification({
      userId: manufacturerId,
      type: "verification_rejected",
      title: "Verification rejected",
      message: `Your verification was rejected: ${reason}. Please resubmit your documents.`,
      link: `/manufacturer/settings`,
    }),

  // Payment
  paymentReceived: (manufacturerId, orderId, orderNumber, amount) =>
    createNotification({
      userId: manufacturerId,
      type: "payment_received",
      title: "Payment received",
      message: `Payment of $${amount} for order #${orderNumber} has been released to your account.`,
      link: `/manufacturer/orders/${orderId}`,
      relatedType: "order",
      relatedId: orderId,
    }),

  paymentRefunded: (customerId, orderId, orderNumber, amount) =>
    createNotification({
      userId: customerId,
      type: "payment_refunded",
      title: "Refund processed",
      message: `A refund of $${amount} for order #${orderNumber} has been processed.`,
      link: `/customer/orders/${orderId}`,
      relatedType: "order",
      relatedId: orderId,
    }),
};
