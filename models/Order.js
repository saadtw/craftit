import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
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

    // Order Type References
    orderType: {
      type: String,
      enum: ["product", "rfq", "group_buy"],
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    rfqId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RFQ",
    },
    bidId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bid",
    },
    groupBuyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupBuy",
    },

    orderNumber: {
      type: String,
      unique: true,
    },

    // Product Details (snapshot at order time)
    productDetails: {
      name: String,
      description: String,
      specifications: mongoose.Schema.Types.Mixed,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    // Pricing
    unitPrice: Number,
    totalPrice: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    agreedPrice: Number, // For RFQ orders
    timeline: Number, // in days

    // Order Status
    status: {
      type: String,
      enum: [
        "confirmed",
        "cancellation_requested",
        "accepted",
        "in_production",
        "shipped",
        "delivered",
        "completed",
        "cancelled",
        "disputed",
      ],
      default: "confirmed",
    },

    // Production Milestones
    milestones: [
      {
        name: String,
        description: String,
        status: {
          type: String,
          enum: ["pending", "in_progress", "completed"],
          default: "pending",
        },
        dueDate: Date,
        completedAt: Date,
        photos: [String],
        notes: String,
        customerStatus: {
          type: String,
          enum: ["pending", "awaiting_confirmation", "confirmed", "disputed"],
          default: "pending",
        },
        customerConfirmedAt: Date,
      },
    ],

    // Payment
    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "authorized",
        "captured",
        "held_in_escrow",
        "release_requested",
        "released",
        "refunded",
        "partially_refunded",
      ],
      default: "pending",
    },
    paymentIntentId: String,
    paymentMethod: String,
    refundAmount: Number,
    refundReason: String,

    // Delivery
    deliveryAddress: {
      name: String,
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      phone: String,
    },
    shippingMethod: String,
    trackingNumber: String,
    estimatedDeliveryDate: Date,
    actualDeliveryDate: Date,
    deliveredAt: Date,
    deliveryConfirmedBy: {
      type: String,
      enum: ["customer", "auto"],
    },
    disputeWindowClosedAt: Date,

    // Special Requirements
    specialRequirements: String,
    designFiles: [String],

    // Timestamps
    manufacturerAcceptedAt: Date,
    cancellationWindowExpiresAt: { type: Date, default: null },
    cancellationRequestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    productionAcknowledgedAt: { type: Date, default: null },
    rejectedAt: Date,
    rejectionReason: String,
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancellationReason: String,
    cancellationStatus: {
      type: String,
      enum: ["requested", "confirmed", "rejected"],
    },
    cancellationRequestedAt: Date,
    cancellationRequestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancellationConfirmedAt: Date,
    cancellationRejectedAt: Date,
    cancellationRejectionReason: String,
    completedAt: Date,

    // Reviews & Feedback
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
    },
    reviewed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Indexes
OrderSchema.index({ customerId: 1, status: 1 });
OrderSchema.index({ manufacturerId: 1, status: 1 });

OrderSchema.index({ orderType: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ cancellationStatus: 1 });

// Generate order number before saving
OrderSchema.pre("save", async function () {
  if (!this.orderNumber) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = `ORD-${Date.now()}-${count + 1}`;
  }
});

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
