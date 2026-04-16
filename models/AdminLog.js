import mongoose from "mongoose";

const AdminLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: [
        "manufacturer_approved",
        "manufacturer_rejected",
        "manufacturer_info_requested",
        "user_suspended",
        "user_unsuspended",
        "dispute_resolved",
        "order_viewed",
        "order_force_cancelled",
        "support_ticket_updated",
      ],
      required: true,
    },
    targetType: {
      type: String,
      enum: ["user", "manufacturer", "order", "dispute", "support_ticket"],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    details: {
      type: String,
    },
    description: {
      type: String, // human-readable summary shown in activity log UI
    },
    ipAddress: String,
  },
  { timestamps: true },
);

AdminLogSchema.index({ adminId: 1, createdAt: -1 });
AdminLogSchema.index({ createdAt: -1 });

export default mongoose.models.AdminLog ||
  mongoose.model("AdminLog", AdminLogSchema);
