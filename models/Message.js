const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true,
      index: true // fast lookup by match
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, "Message too long"]
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);