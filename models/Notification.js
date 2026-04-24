const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    type: {
      type: String,
      enum: [
        "friend_request",
        "friend_accepted",
        "match_invite",
        "match_approved",
        "match_join_request",
        "motm_awarded",
        "tournament_invite",
        "match_starting_soon"
      ],
      required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    // Optional references
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    match: { type: mongoose.Schema.Types.ObjectId, ref: "Match", default: null },
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", default: null },
    friendRequest: { type: mongoose.Schema.Types.ObjectId, ref: "FriendRequest", default: null },
    // Deep link
    actionUrl: { type: String, default: null }
  },
  { timestamps: true }
);

// Index for fast recipient queries
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);