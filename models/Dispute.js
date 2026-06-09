import mongoose from "mongoose";

const DisputeSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
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

    disputeNumber: {
      type: String,
      unique: true,
    },

    initiatedBy: {
      type: String,
      enum: ["customer", "manufacturer"],
      default: "customer",
    },

    issueType: {
      type: String,
      enum: [
        // Customer issues
        "item_not_received",
        "item_not_as_described",
        "quality_issue",
        "wrong_item",
        "damaged_item",
        "late_delivery",
        "refund_not_received",
        // Manufacturer issues
        "payment_release_rejected",
        "customer_unresponsive",
        "other",
      ],
      required: true,
    },

    description: {
      type: String,
      required: true,
      maxlength: 3000,
    },

    desiredResolution: {
      type: String,
      enum: [
        "full_refund",
        "partial_refund",
        "replacement",
        "other",
        "release_payment",
        "partial_release",
      ],
      required: true,
    },

    // Evidence from customer
    customerEvidence: [{ type: String }], // URLs

    // Manufacturer response
    manufacturerResponse: {
      comment: String,
      evidence: [{ type: String }],
      respondedAt: Date,
    },

    // Admin resolution
    adminNotes: {
      type: String,
    },
    resolution: {
      type: String,
      enum: [
        "refund_customer",
        "side_with_manufacturer",
        "partial_resolution",
        "release_payment",
      ],
    },
    resolutionAmount: Number,
    resolutionMessage: String,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    resolvedAt: Date,

    status: {
      type: String,
      enum: [
        "open",
        "manufacturer_responded",
        "under_review",
        "resolved",
        "closed",
      ],
      default: "open",
    },
  },
  { timestamps: true },
);

// Auto-generate dispute number
DisputeSchema.pre("save", async function () {
  if (!this.disputeNumber) {
    const count = await this.constructor.countDocuments();
    this.disputeNumber = `DSP-${Date.now()}-${count + 1}`;
  }
});

DisputeSchema.index({ customerId: 1, status: 1 });
DisputeSchema.index({ manufacturerId: 1, status: 1 });
DisputeSchema.index({ status: 1, createdAt: -1 });
DisputeSchema.index({ orderId: 1 });

export default mongoose.models.Dispute ||
  mongoose.model("Dispute", DisputeSchema);
