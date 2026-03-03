import mongoose from "mongoose";

const CustomOrderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    materialPreferences: [String],
    colorSpecifications: [String],
    deadline: Date,

    model3D: {
      url: String,
      filename: String,
      fileSize: Number,
      dimensions: {
        length: Number,
        width: Number,
        height: Number,
        unit: {
          type: String,
          default: "mm",
        },
      },
    },

    images: [
      {
        url: String,
        caption: String,
      },
    ],

    specialRequirements: String,
    budget: {
      type: Number,
      min: 0,
    },

    // Breakdown items (if customer breaks down the design)
    items: [
      {
        name: String,
        description: String,
        quantity: Number,
        material: String,
        specifications: mongoose.Schema.Types.Mixed,
      },
    ],

    status: {
      type: String,
      enum: ["draft", "submitted", "rfq_created", "order_placed"],
      default: "draft",
    },

    rfqId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RFQ",
    },
  },
  { timestamps: true },
);

// Indexes
CustomOrderSchema.index({ customerId: 1, status: 1 });
CustomOrderSchema.index({ createdAt: -1 });
CustomOrderSchema.index({ budget: 1 }); // For budget range filtering
CustomOrderSchema.index({ materialPreferences: 1 }); // For material matching
CustomOrderSchema.index({ deadline: 1 }); // For deadline sorting and filtering

export default mongoose.models.CustomOrder ||
  mongoose.model("CustomOrder", CustomOrderSchema);
