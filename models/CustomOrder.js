import mongoose from "mongoose";
import { CUSTOMIZATION_TYPE_IDS } from "../lib/customization.js";

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
      thumbnailUrl: String,
      // Stored as Mixed so any shape from the editor is preserved
      annotations: [mongoose.Schema.Types.Mixed],
      // Measurements: { id, label, pointA: [x,y,z], pointB: [x,y,z] }
      measurements: [mongoose.Schema.Types.Mixed],
      cameraState: {
        position: { x: Number, y: Number, z: Number },
        target: { x: Number, y: Number, z: Number },
        zoom: Number,
      },
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

    sourceType: {
      type: String,
      enum: ["general_custom", "product_customization", "manufacturer_direct"],
      default: "general_custom",
    },

    sourceProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },

    sourceManufacturerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    requestedCustomizationTypes: [
      {
        type: String,
        enum: CUSTOMIZATION_TYPE_IDS,
      },
    ],

    customizationDetails: String,

    sourceContext: {
      productName: String,
      manufacturerName: String,
      productCustomizationCapabilities: [String],
    },

    // Breakdown items (deprecated in favor of 'parts')
    items: [
      {
        name: String,
        description: String,
        quantity: Number,
        material: String,
        specifications: mongoose.Schema.Types.Mixed,
      },
    ],
    
    parts: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        name: { type: String, required: true },
        description: String,
        quantity: { type: Number, default: 1, min: 1 },
        material: String,
        colorSpec: String,
        budget: Number,
        deadline: Date,
        specialRequirements: String,
        annotationIds: [String],
        rfqId: { type: mongoose.Schema.Types.ObjectId, ref: 'RFQ' },
        rfqStatus: {
          type: String,
          enum: ['pending', 'rfq_created', 'bid_accepted', 'order_placed'],
          default: 'pending',
        },
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
        createdAt: { type: Date, default: Date.now },
      }
    ],
    isPartitioned: { type: Boolean, default: false },

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
CustomOrderSchema.index({ sourceProductId: 1, createdAt: -1 });
CustomOrderSchema.index({ sourceManufacturerId: 1, createdAt: -1 });

/*
 * MIGRATION NOTES (Phase 4):
 * When deploying to production, run the following index creations manually via MongoDB Atlas UI
 * or a seed script to optimize parts division queries:
 * 
 * db.customorders.createIndex({ "parts.rfqId": 1 });
 * db.customorders.createIndex({ isPartitioned: 1 });
 */

export default mongoose.models.CustomOrder ||
  mongoose.model("CustomOrder", CustomOrderSchema);
