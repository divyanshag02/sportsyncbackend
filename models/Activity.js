const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    type: {
      type: String,
      enum: [
        "match_created",
        "match_joined",
        "match_completed",
        "friend_added"
      ],
      required: true
    },
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      default: null
    },
    sport: {
      type: String,
      default: ""
    },
    // friend_added ke liye — dusra user
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    // match_completed ke liye — winning team
    winnerTeam: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

// Fast lookup — actor ki activities
activitySchema.index({ actor: 1, createdAt: -1 });

module.exports = mongoose.model("Activity", activitySchema);