import mongoose from "mongoose";

const BidSchema = new mongoose.Schema(
  {
    rfqId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RFQ",
      required: true,
    },
    manufacturerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    costBreakdown: {
      materials: Number,
      labor: Number,
      overhead: Number,
      profit: Number,
    },

    timeline: {
      type: Number,
      required: true,
      min: 1,
    }, // in days

    proposedMilestones: [
      {
        name: String,
        duration: Number,
        description: String,
      },
    ],

    materialsDescription: String,
    processDescription: String,

    portfolioSamples: [
      {
        url: String,
        description: String,
      },
    ],

    certifications: [String],

    questions: String,
    alternativeProposals: String,
    paymentTerms: String,
    warrantyInfo: String,

    // Counter Offers
    counterOffers: [
      {
        from: {
          type: String,
          enum: ["customer", "manufacturer"],
          required: true,
        },
        amount: Number,
        timeline: Number,
        modifiedRequirements: String,
        notes: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    status: {
      type: String,
      enum: [
        "pending",
        "under_consideration",
        "accepted",
        "rejected",
        "withdrawn",
      ],
      default: "pending",
    },

    // Customer Actions
    markedForConsideration: {
      type: Boolean,
      default: false,
    },
    customerFeedback: String,

    submittedAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: Date,
    rejectedAt: Date,
    withdrawnAt: Date,
  },
  { timestamps: true }
);

// Indexes
BidSchema.index({ rfqId: 1, status: 1 });
BidSchema.index({ manufacturerId: 1, status: 1 });
BidSchema.index({ rfqId: 1, amount: 1 });

export default mongoose.models.Bid || mongoose.model("Bid", BidSchema);
