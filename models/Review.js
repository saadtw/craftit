import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
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
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },

    overallRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    qualityRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    communicationRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    deliveryRating: {
      type: Number,
      min: 1,
      max: 5,
    },

    title: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    photos: [{ type: String }],

    recommended: {
      type: Boolean,
      default: true,
    },

    // Manufacturer can respond to reviews
    manufacturerResponse: {
      comment: String,
      respondedAt: Date,
    },
  },
  { timestamps: true },
);

ReviewSchema.index({ manufacturerId: 1, createdAt: -1 });
ReviewSchema.index({ customerId: 1 });
ReviewSchema.index({ orderId: 1 }, { unique: true });

export default mongoose.models.Review || mongoose.model("Review", ReviewSchema);
