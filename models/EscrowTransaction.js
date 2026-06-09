import mongoose from "mongoose";

const EscrowTransactionSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    manufacturerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: [
        "payment_received",
        "held",
        "release_requested",
        "released",
        "refunded",
        "adjustment",
        "capture_failed",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "completed",
    },
    reference: { type: String },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

EscrowTransactionSchema.index({ type: 1, createdAt: -1 });
EscrowTransactionSchema.index({ manufacturerId: 1, type: 1 });

export default mongoose.models.EscrowTransaction ||
  mongoose.model("EscrowTransaction", EscrowTransactionSchema);
