import mongoose from "mongoose";

const SupportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      unique: true,
    },
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requesterRole: {
      type: String,
      enum: ["customer", "manufacturer"],
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    category: {
      type: String,
      enum: ["order", "payment", "product", "account", "technical", "other"],
      default: "other",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "waiting_for_user", "resolved", "closed"],
      default: "open",
    },
    assignedAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    relatedType: {
      type: String,
      enum: ["order", "product", "payment", "rfq", "bid", "other"],
      default: "other",
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    lastMessagePreview: {
      type: String,
      default: "",
      maxlength: 300,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    requesterUnreadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    adminUnreadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    resolvedAt: Date,
    closedAt: Date,
  },
  { timestamps: true },
);

SupportTicketSchema.index({ requesterId: 1, lastMessageAt: -1 });
SupportTicketSchema.index({ status: 1, lastMessageAt: -1 });
SupportTicketSchema.index({ assignedAdminId: 1, status: 1, lastMessageAt: -1 });

SupportTicketSchema.pre("save", function generateTicketNumber() {
  if (!this.ticketNumber) {
    const rand = Math.floor(Math.random() * 90000) + 10000;
    this.ticketNumber = `SUP-${Date.now()}-${rand}`;
  }
});

if (process.env.NODE_ENV === "development" && mongoose.models.SupportTicket) {
  delete mongoose.models.SupportTicket;
}

export default mongoose.models.SupportTicket ||
  mongoose.model("SupportTicket", SupportTicketSchema);
