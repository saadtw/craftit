import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    manufacturerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    subCategory: String,

    price: {
      type: Number,
      required: true,
      min: 0,
    },
    moq: {
      type: Number,
      required: true,
      min: 1,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    images: [
      {
        url: {
          type: String,
          required: true,
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],

    model3D: {
      url: String,
      filename: String,
      fileSize: Number,
    },

    specifications: {
      material: String,
      dimensions: {
        length: Number,
        width: Number,
        height: Number,
        unit: {
          type: String,
          default: "cm",
        },
      },
      weight: Number,
      color: [String],
    },

    shippingWeight: Number, // in kg
    shippingDimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: {
        type: String,
        default: "cm",
      },
    },

    customizationOptions: {
      type: Boolean,
      default: false,
    },

    leadTime: Number, // in days

    tags: [String],

    seoTitle: String,
    seoDescription: String,

    views: {
      type: Number,
      default: 0,
    },
    totalOrders: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["active", "draft", "out_of_stock", "archived"],
      default: "draft",
    },
  },
  { timestamps: true },
);

// Indexes
ProductSchema.index({ manufacturerId: 1, status: 1 });
ProductSchema.index({ category: 1, status: 1 });
ProductSchema.index({ name: "text", description: "text", tags: "text" });
ProductSchema.index({ price: 1 });
ProductSchema.index({ averageRating: -1 });
ProductSchema.index({ createdAt: -1 });

export default mongoose.models.Product ||
  mongoose.model("Product", ProductSchema);
