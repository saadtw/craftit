import mongoose from "mongoose";

const ChatMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["customer", "manufacturer", "admin"],
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    // Future: attachments: [{ url: String, filename: String, type: String }]
  },
  { timestamps: true },
);

// Core query: all messages in a conversation, chronological
ChatMessageSchema.index({ conversationId: 1, createdAt: 1 });

export default mongoose.models.ChatMessage ||
  mongoose.model("ChatMessage", ChatMessageSchema);
