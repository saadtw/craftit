import mongoose from "mongoose";

// A Conversation ties two participants to a context (bid, order, etc.)
// This is created once per context — reused for the whole lifecycle.
const ConversationSchema = new mongoose.Schema(
  {
    // Who is talking
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    // What they're talking about — polymorphic reference
    contextType: {
      type: String,
      enum: ["bid", "order"], // extend as needed: "support", etc.
      required: true,
    },
    contextId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "contextType", // Mongoose dynamic populate
    },

    // Snapshot for inbox display — avoids extra lookups
    lastMessage: {
      text: String,
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      sentAt: Date,
    },

    // Unread counts per participant: { "userId": 3 }
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Fast lookup: find conversation for a given context
ConversationSchema.index({ contextType: 1, contextId: 1 }, { unique: true });
// Inbox query: all conversations for a user, newest first
ConversationSchema.index({ participants: 1, "lastMessage.sentAt": -1 });
// Optimized inbox list query used by /api/chat/inbox
ConversationSchema.index({
  participants: 1,
  contextType: 1,
  isActive: 1,
  "lastMessage.sentAt": -1,
});

export default mongoose.models.Conversation ||
  mongoose.model("Conversation", ConversationSchema);
