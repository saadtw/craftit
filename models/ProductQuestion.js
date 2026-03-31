import mongoose from "mongoose";

const ProductQuestionSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
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
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 800,
    },
    status: {
      type: String,
      enum: ["pending", "answered"],
      default: "pending",
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    answer: {
      text: {
        type: String,
        trim: true,
        maxlength: 1200,
      },
      answeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      answeredAt: Date,
    },
  },
  { timestamps: true },
);

ProductQuestionSchema.index({
  productId: 1,
  isVisible: 1,
  status: 1,
  createdAt: -1,
});
ProductQuestionSchema.index({ manufacturerId: 1, status: 1, createdAt: -1 });
ProductQuestionSchema.index({ customerId: 1, createdAt: -1 });

export default mongoose.models.ProductQuestion ||
  mongoose.model("ProductQuestion", ProductQuestionSchema);
