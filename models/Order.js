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
        "pending_acceptance",
        "accepted",
        "in_production",
        "completed",
        "cancelled",
        "disputed",
      ],
      default: "pending_acceptance",
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
      },
    ],

    // Payment
    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "authorized",
        "captured",
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

    // Special Requirements
    specialRequirements: String,
    designFiles: [String],

    // Timestamps
    manufacturerAcceptedAt: Date,
    rejectedAt: Date,
    rejectionReason: String,
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancellationReason: String,
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
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ orderType: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });

// Generate order number before saving
OrderSchema.pre("save", async function () {
  if (!this.orderNumber) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = `ORD-${Date.now()}-${count + 1}`;
  }
});

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
