import mongoose from "mongoose";

const PaymentScheduleSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
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
    status: {
      type: String,
      enum: ["proposed", "accepted", "rejected"],
      default: "proposed",
    },
    instalments: [
      {
        name: {
          type: String,
          required: true,
        },
        percent: {
          type: Number,
          required: true,
          min: 1,
          max: 100,
        },
        releaseCondition: {
          type: String,
          required: true,
        },
        releasedAt: {
          type: Date,
        },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.PaymentSchedule ||
  mongoose.model("PaymentSchedule", PaymentScheduleSchema);
