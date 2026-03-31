import mongoose from "mongoose";

const SupportTicketMessageSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportTicket",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["customer", "manufacturer", "admin"],
      required: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
  },
  { timestamps: true },
);

SupportTicketMessageSchema.index({ ticketId: 1, createdAt: 1 });

export default mongoose.models.SupportTicketMessage ||
  mongoose.model("SupportTicketMessage", SupportTicketMessageSchema);
