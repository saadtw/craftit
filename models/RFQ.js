import mongoose from "mongoose";

const RFQSchema = new mongoose.Schema(
  {
    customOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomOrder",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    rfqNumber: {
      type: String,
      unique: true,
    },

    // Auction Duration
    duration: {
      type: Number,
      required: true,
    }, // in hours
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "closed", "bid_accepted", "cancelled"],
      default: "active",
    },

    minBidThreshold: {
      type: Number,
      min: 0,
    },

    bidsCount: {
      type: Number,
      default: 0,
    },

    acceptedBidId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bid",
    },

    // Targeting
    targetManufacturers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    broadcastToAll: {
      type: Boolean,
      default: true,
    },

    // Closure
    closedAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
  },
  { timestamps: true }
);

// Indexes
RFQSchema.index({ customerId: 1, status: 1 });
RFQSchema.index({ status: 1, endDate: 1 });
RFQSchema.index({ rfqNumber: 1 });
RFQSchema.index({ broadcastToAll: 1, status: 1 });

// Generate RFQ number before saving
RFQSchema.pre("save", async function () {
  if (!this.rfqNumber) {
    const count = await this.constructor.countDocuments();
    this.rfqNumber = `RFQ-${Date.now()}-${count + 1}`;
  }
});

export default mongoose.models.RFQ || mongoose.model("RFQ", RFQSchema);
