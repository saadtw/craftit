import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { formatPKR } from "@/lib/currency";

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
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      link,
      relatedType,
      relatedId,
    });

    const user = await User.findById(userId).select(
      "email name emailNotifications isEmailVerified",
    );

    // Email notification logic has been removed as part of the migration away from Nodemailer.
    // In-app notifications are still saved below.
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

  orderInProduction: (customerId, orderId, orderNumber) =>
    createNotification({
      userId: customerId,
      type: "order_in_production",
      title: "Order in production",
      message: `Your order #${orderNumber} is now in production.`,
      link: `/customer/orders/${orderId}`,
      relatedType: "order",
      relatedId: orderId,
    }),

  orderConfirmedFromBid: (manufacturerId, orderId, orderNumber) =>
    createNotification({
      userId: manufacturerId,
      type: "order_confirmed_from_bid",
      title: "Bid accepted, order confirmed",
      message: `Your bid has been accepted. Order #${orderNumber} is confirmed. You have 48 hours to request cancellation if you cannot fulfil it.`,
      link: `/manufacturer/orders/${orderId}`,
      relatedType: "order",
      relatedId: orderId,
    }),

  productionStarted: (customerId, orderId, orderNumber) =>
    createNotification({
      userId: customerId,
      type: "production_started",
      title: "Production started",
      message: `Production has started for order #${orderNumber}.`,
      link: `/customer/orders/${orderId}`,
      relatedType: "order",
      relatedId: orderId,
    }),

  manufacturerCancelled: (customerId, orderId, orderNumber, reason, alternativeCount = 0) =>
    createNotification({
      userId: customerId,
      type: "manufacturer_cancelled",
      title: "Manufacturer requested cancellation",
      message: `The manufacturer cancelled order #${orderNumber} within the cancellation window.${reason ? ` Reason: ${reason}` : ""} ${alternativeCount} alternative bid(s) are available on your RFQ.`,
      link: `/customer/orders/${orderId}`,
      relatedType: "order",
      relatedId: orderId,
    }),

  orderDelivered: (manufacturerId, orderId, orderNumber) =>
    createNotification({
      userId: manufacturerId,
      type: "order_delivered",
      title: "Order delivered",
      message: `Order #${orderNumber} has been marked delivered. Payment can now be requested if eligible.`,
      link: `/manufacturer/orders/${orderId}`,
      relatedType: "order",
      relatedId: orderId,
    }),

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

  cancellationRequested: (manufacturerId, orderId, orderNumber, reason) =>
    createNotification({
      userId: manufacturerId,
      type: "system",
      title: "Cancellation request received",
      message: `Customer requested cancellation for order #${orderNumber}.${reason ? ` Reason: ${reason}` : ""}`,
      link: `/manufacturer/orders/${orderId}`,
      relatedType: "order",
      relatedId: orderId,
    }),

  cancellationConfirmed: (customerId, orderId, orderNumber) =>
    createNotification({
      userId: customerId,
      type: "system",
      title: "Cancellation approved",
      message: `Your cancellation request for order #${orderNumber} was approved. A full refund will be processed.`,
      link: `/customer/orders/${orderId}`,
      relatedType: "order",
      relatedId: orderId,
    }),

  cancellationRejected: (customerId, orderId, orderNumber, rejectionReason) =>
    createNotification({
      userId: customerId,
      type: "system",
      title: "Cancellation declined",
      message: `Your cancellation request for order #${orderNumber} was declined.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`,
      link: `/customer/orders/${orderId}`,
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
      link: `/bids/${bidId}#chat`,
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
      message: `Your bid for "${rfqTitle}" was not accepted.`,
      link: `/manufacturer/bids`,
      relatedType: "bid",
      relatedId: bidId.toString(),
    }),

  bidUpdated: (customerId, rfqId, bidId, manufacturerName) =>
    createNotification({
      userId: customerId,
      type: "bid_updated",
      title: "Bid updated",
      message: `${manufacturerName} has updated their bid. Review the new terms.`,
      link: `/bids/${bidId}#chat`,
      relatedType: "bid",
      relatedId: bidId,
    }),

  // Messages
  // contextId: for order context = orderId; for bid context = bidId
  // extraContextId: for bid context = rfqId (to build a precise deep-link)
  newMessage: (
    recipientId,
    contextId,
    senderName,
    contextType,
    isCustomer = true,
    extraContextId = null,
  ) =>
    createNotification({
      userId: recipientId,
      type: "new_message",
      title: "New message",
      message: `${senderName} sent you a message.`,
      link:
        contextType === "bid"
          ? `/bids/${contextId}#chat`
          : isCustomer
            ? `/customer/orders/${contextId}`
            : `/manufacturer/orders/${contextId}`,
      relatedType: contextType === "bid" ? "bid" : "order",
      relatedId: contextId,
    }),

  // RFQ
  rfqCreated: (manufacturerId, rfqId, rfqTitle) =>
    createNotification({
      userId: manufacturerId,
      type: "rfq_created",
      title: "New RFQ available",
      message: `A new RFQ "${rfqTitle}" is available for bidding.`,
      link: `/manufacturer/rfqs/${rfqId}`,
      relatedType: "rfq",
      relatedId: rfqId,
    }),

  rfqClosed: (manufacturerId, rfqId, rfqTitle) =>
    createNotification({
      userId: manufacturerId,
      type: "rfq_closed",
      title: "RFQ closed",
      message: `The RFQ "${rfqTitle}" has been closed — another bid was selected.`,
      link: `/manufacturer/rfqs`,
      relatedType: "rfq",
      relatedId: rfqId,
    }),

  rfqExpired: (customerId, rfqId, rfqTitle) =>
    createNotification({
      userId: customerId,
      type: "rfq_expired",
      title: "RFQ expired",
      message: `Your RFQ "${rfqTitle}" has expired with no bid selected.`,
      link: `/customer/rfqs/${rfqId}`,
      relatedType: "rfq",
      relatedId: rfqId,
    }),

  // Group Buy
  groupBuyJoined: (manufacturerId, groupBuyId, participantCount) =>
    createNotification({
      userId: manufacturerId,
      type: "group_buy_joined",
      title: "New participant joined",
      message: `A new customer joined your group buy. Total participants: ${participantCount}.`,
      link: `/manufacturer/group-buys/${groupBuyId}`,
      relatedType: "group_buy",
      relatedId: groupBuyId,
    }),

  groupBuyFunded: (customerId, groupBuyId, productName) =>
    createNotification({
      userId: customerId,
      type: "group_buy_funded",
      title: "Group buy funded!",
      message: `The group buy for "${productName}" has reached its minimum participant threshold and is officially funded.`,
      link: `/customer/group-buys/${groupBuyId}`,
      relatedType: "group_buy",
      relatedId: groupBuyId,
    }),

  groupBuyTierReached: (
    manufacturerId,
    groupBuyId,
    tierNumber,
    discountPercent,
  ) =>
    createNotification({
      userId: manufacturerId,
      type: "group_buy_tier_reached",
      title: `Tier ${tierNumber} unlocked!`,
      message: `Your group buy has reached Tier ${tierNumber} — ${discountPercent}% discount now active.`,
      link: `/manufacturer/group-buys/${groupBuyId}`,
      relatedType: "group_buy",
      relatedId: groupBuyId,
    }),

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

  // Product Q&A
  questionCustomerReply: (
    recipientId,
    productId,
    productName,
    isManufacturer,
  ) =>
    createNotification({
      userId: recipientId,
      type: "question_customer_reply",
      title: "New reply on Q&A",
      message: `A new reply was posted on a Q&A thread for ${productName}.`,
      link: isManufacturer
        ? `/manufacturer/products/${productId}`
        : `/customer/products/${productId}`,
      relatedType: "product",
      relatedId: productId,
    }),

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
      message: `Payment of ${formatPKR(amount)} for order #${orderNumber} has been released to your account.`,
      link: `/manufacturer/orders/${orderId}`,
      relatedType: "order",
      relatedId: orderId,
    }),

  paymentRefunded: (customerId, orderId, orderNumber, amount) =>
    createNotification({
      userId: customerId,
      type: "payment_refunded",
      title: "Refund processed",
      message: `A refund of ${formatPKR(amount)} for order #${orderNumber} has been processed.`,
      link: `/customer/orders/${orderId}`,
      relatedType: "order",
      relatedId: orderId,
    }),

  // Disputes
  disputeOpened: (userId, disputeId, orderNumber, isCustomer) =>
    createNotification({
      userId,
      type: "dispute_opened",
      title: "Dispute opened",
      message: `A dispute has been opened for order #${orderNumber}.`,
      link: isCustomer
        ? `/customer/orders/${orderNumber}/dispute`
        : `/manufacturer/disputes/${disputeId}`,
      relatedType: "dispute",
      relatedId: disputeId,
    }),

  disputeUnderReview: (customerId, manufacturerId, disputeId, orderNumber) =>
    Promise.all([
      createNotification({
        userId: customerId,
        type: "dispute_under_review",
        title: "Dispute under review",
        message: `The dispute for order #${orderNumber} is now under admin review.`,
        link: `/customer/orders/${orderNumber}/dispute`,
        relatedType: "dispute",
        relatedId: disputeId,
      }),
      createNotification({
        userId: manufacturerId,
        type: "dispute_under_review",
        title: "Dispute under review",
        message: `The dispute for order #${orderNumber} is now under admin review.`,
        link: `/manufacturer/disputes/${disputeId}`,
        relatedType: "dispute",
        relatedId: disputeId,
      }),
    ]),

  disputeResolved: (
    customerId,
    manufacturerId,
    disputeId,
    resolution,
    orderNumber,
  ) => {
    const isRefund = resolution === "refund_customer";
    const text = isRefund
      ? "resolved with a refund"
      : "resolved in favor of the manufacturer";

    return Promise.all([
      createNotification({
        userId: customerId,
        type: "dispute_resolved",
        title: "Dispute resolved",
        message: `Your dispute for order #${orderNumber} has been ${text}.`,
        link: `/customer/orders/${orderNumber}/dispute`,
        relatedType: "dispute",
        relatedId: disputeId,
      }),
      createNotification({
        userId: manufacturerId,
        type: "dispute_resolved",
        title: "Dispute resolved",
        message: `The dispute for order #${orderNumber} has been ${text}.`,
        link: `/manufacturer/disputes/${disputeId}`,
        relatedType: "dispute",
        relatedId: disputeId,
      }),
    ]);
  },

  paymentReleaseRequested: (customerId, orderId, orderNumber, amount) =>
    createNotification({
      userId: customerId,
      type: "payment_release_requested",
      title: "Payment Release Requested",
      message: `The manufacturer has requested a payment release of ${formatPKR(amount)} for order #${orderNumber}. Please review and approve.`,
      link: `/customer/orders/${orderId}`,
      relatedType: "order",
      relatedId: orderId,
    }),

  paymentReleaseApproved: (manufacturerId, orderId, orderNumber, amount) =>
    createNotification({
      userId: manufacturerId,
      type: "payment_release_approved",
      title: "Payment Release Approved",
      message: `The customer has approved your payment release request of ${formatPKR(amount)} for order #${orderNumber}.`,
      link: `/manufacturer/orders/${orderId}`,
      relatedType: "order",
      relatedId: orderId,
    }),

  paymentReleaseRejected: (manufacturerId, orderId, orderNumber, amount) =>
    createNotification({
      userId: manufacturerId,
      type: "payment_release_rejected",
      title: "Payment Release Rejected",
      message: `The customer has rejected your payment release request of ${formatPKR(amount)} for order #${orderNumber}.`,
      link: `/manufacturer/orders/${orderId}`,
      relatedType: "order",
      relatedId: orderId,
    }),

  paymentReleaseAutoApproved: (
    customerId,
    manufacturerId,
    orderId,
    orderNumber,
    amount,
  ) =>
    Promise.all([
      createNotification({
        userId: customerId,
        type: "payment_release_auto_approved",
        title: "Payment Release Auto-Approved",
        message: `The payment release of ${formatPKR(amount)} for order #${orderNumber} has been automatically approved after 72 hours.`,
        link: `/customer/orders/${orderId}`,
        relatedType: "order",
        relatedId: orderId,
      }),
      createNotification({
        userId: manufacturerId,
        type: "payment_release_auto_approved",
        title: "Payment Release Auto-Approved",
        message: `The payment release of ${formatPKR(amount)} for order #${orderNumber} has been automatically approved after 72 hours.`,
        link: `/manufacturer/orders/${orderId}`,
        relatedType: "order",
        relatedId: orderId,
      }),
    ]),
};
