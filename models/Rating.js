const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema(
  {
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true
    },
    rater: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    rated: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    sportsmanship: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200
    }
  },
  { timestamps: true }
);

// One rating per rater per rated per match
ratingSchema.index({ match: 1, rater: 1, rated: 1 }, { unique: true });

module.exports = mongoose.model("Rating", ratingSchema);