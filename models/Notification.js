import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: [
        // Order events
        "order_placed",
        "order_accepted",
        "order_rejected",
        "order_in_production",
        "order_shipped",
        "order_completed",
        "order_cancelled",
        // Bid events
        "bid_received",
        "bid_accepted",
        "bid_rejected",
        "bid_updated",
        // RFQ events
        "rfq_created",
        "rfq_closed",
        "rfq_expired",
        // Group Buy events
        "group_buy_joined",
        "group_buy_tier_reached",
        "group_buy_completed",
        "group_buy_cancelled",
        // Payment events
        "payment_received",
        "payment_refunded",
        // Dispute events
        "dispute_opened",
        "dispute_resolved",
        // Message events
        "new_message",
        // Product Q&A events
        "question_asked",
        "question_answered",
        // Support ticket events
        "support_ticket_created",
        "support_ticket_replied",
        "support_ticket_updated",
        // Verification events
        "verification_approved",
        "verification_rejected",
        "verification_info_requested",
        // System
        "system",
      ],
      required: true,
    },

    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },

    // Deep-link so clicking the notification navigates correctly
    link: {
      type: String,
    },

    // Optional reference to the related entity
    relatedType: {
      type: String,
      enum: [
        "order",
        "product",
        "payment",
        "rfq",
        "bid",
        "group_buy",
        "dispute",
        "support_ticket",
        "user",
      ],
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    emailSentAt: Date,
  },
  { timestamps: true },
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
