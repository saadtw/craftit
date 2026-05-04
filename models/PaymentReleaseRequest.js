import mongoose from "mongoose";

const PaymentReleaseRequestSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    manufacturerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    proofUrls: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "auto_approved", "cancelled"],
      default: "pending",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    resolvedAt: {
      type: Date,
    },
    transferId: {
      type: String, // Stripe transfer ID
    },
    scheduleRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentSchedule",
    },
  },
  { timestamps: true }
);

export default mongoose.models.PaymentReleaseRequest ||
  mongoose.model("PaymentReleaseRequest", PaymentReleaseRequestSchema);
