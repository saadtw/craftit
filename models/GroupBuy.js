import mongoose from "mongoose";

const TierSchema = new mongoose.Schema(
  {
    tierNumber: { type: Number, required: true }, // 1, 2, 3
    minQuantity: { type: Number, required: true }, // total units needed to unlock
    discountPercent: { type: Number, required: true, min: 0, max: 100 },
    discountedPrice: { type: Number, required: true }, // base price after discount
  },
  { _id: false },
);

const ParticipantSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: Number, // locked-in price at time of joining
    totalPrice: Number,
    paymentIntentId: String,
    paymentStatus: {
      type: String,
      enum: ["authorized", "captured", "refunded"],
      default: "authorized",
    },
    joinedAt: { type: Date, default: Date.now },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" }, // set on completion
  },
  { _id: true },
);

const GroupBuySchema = new mongoose.Schema(
  {
    manufacturerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    title: { type: String, required: true, trim: true },
    description: String,

    basePrice: { type: Number, required: true },

    tiers: {
      type: [TierSchema],
      validate: {
        validator: function (tiers) {
          if (!tiers || tiers.length === 0) return false;
          // quantities must be strictly increasing
          for (let i = 1; i < tiers.length; i++) {
            if (tiers[i].minQuantity <= tiers[i - 1].minQuantity) return false;
            if (tiers[i].discountPercent <= tiers[i - 1].discountPercent)
              return false;
          }
          return true;
        },
        message:
          "Tiers must have strictly increasing quantities and discount percentages",
      },
    },

    minParticipants: { type: Number, default: 1 },
    maxParticipants: Number, // optional cap

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    termsAndConditions: String,

    status: {
      type: String,
      enum: ["scheduled", "active", "paused", "completed", "cancelled"],
      default: "scheduled",
    },

    participants: [ParticipantSchema],

    // Computed / cached for performance
    currentQuantity: { type: Number, default: 0 }, // sum of all participant quantities
    currentParticipantCount: { type: Number, default: 0 },
    currentTierIndex: { type: Number, default: -1 }, // -1 = no tier unlocked yet
    currentDiscountedPrice: Number, // active discounted price (null = base price)

    completedAt: Date,
    cancelledAt: Date,
    cancelReason: String,
  },
  { timestamps: true },
);

// Indexes
GroupBuySchema.index({ manufacturerId: 1, status: 1 });
GroupBuySchema.index({ productId: 1 });
GroupBuySchema.index({ status: 1, endDate: 1 });
GroupBuySchema.index({ startDate: 1 });

// Auto-activate scheduled campaigns whose startDate has passed
GroupBuySchema.methods.syncStatus = function () {
  const now = new Date();
  if (this.status === "scheduled" && now >= this.startDate) {
    this.status = "active";
  }
  if (["active", "paused"].includes(this.status) && now >= this.endDate) {
    this.status = "completed";
    this.completedAt = now;
  }
};

// Recalculate cached quantity + active tier after participant change
GroupBuySchema.methods.recalculate = function () {
  this.currentQuantity = this.participants.reduce(
    (sum, p) => sum + p.quantity,
    0,
  );
  this.currentParticipantCount = this.participants.length;

  // Find highest unlocked tier
  let activeTier = -1;
  for (let i = this.tiers.length - 1; i >= 0; i--) {
    if (this.currentQuantity >= this.tiers[i].minQuantity) {
      activeTier = i;
      break;
    }
  }
  this.currentTierIndex = activeTier;
  this.currentDiscountedPrice =
    activeTier >= 0 ? this.tiers[activeTier].discountedPrice : this.basePrice;
};

export default mongoose.models.GroupBuy ||
  mongoose.model("GroupBuy", GroupBuySchema);
