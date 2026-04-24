const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema(
  {
    sport: {
      type: String,
      required: [true, "Sport is required"],
      trim: true
    },

    location: {
      name: {
        type: String,
        required: [true, "Location name is required"],
        trim: true
      },
      coordinates: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], required: true }
      }
    },

    date:       { type: Date, required: true },
    maxPlayers: { type: Number, required: true, min: 2 },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    players: [
      {
        user:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: { type: String, enum: ["pending", "approved"], default: "pending" },
        team:   { type: String, enum: ["A", "B"], default: undefined }
      }
    ],

    price:     { type: Number, default: 0, min: 0 },
    paidUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    status:     { type: String, enum: ["upcoming", "ongoing", "completed"], default: "upcoming" },
    winnerTeam: { type: String, enum: ["A", "B", null], default: null },
    isCompleted:{ type: Boolean, default: false },

    chatOpenForAll: { type: Boolean, default: false },

    invites: [
      {
        user:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" }
      }
    ],

    noShows: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    motmVotes: [
      {
        voter:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        nominee: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
      }
    ],
    motmPlayer:   { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    motmDeclared: { type: Boolean, default: false },
    startingSoonNotified: { type: Boolean, default: false },



    // ✅ Per-player match stats — submitted after match
    playerStats: [
      {
        user:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        sport:  { type: String },

        // Cricket
        runs:           { type: Number, default: 0 },
        wickets:        { type: Number, default: 0 },
        catches:        { type: Number, default: 0 },

        // Football
        goals:          { type: Number, default: 0 },
        assists:        { type: Number, default: 0 },
        cleanSheet:     { type: Boolean, default: false },

        // Basketball
        points:         { type: Number, default: 0 },
        rebounds:       { type: Number, default: 0 },
        threePointers:  { type: Number, default: 0 },

        // Badminton / Tennis / Table Tennis
        setsWon:        { type: Number, default: 0 },
        setsLost:       { type: Number, default: 0 },

        // Volleyball
        kills:          { type: Number, default: 0 },
        aces:           { type: Number, default: 0 },
        blocks:         { type: Number, default: 0 },

        // Kabaddi
        raidPoints:     { type: Number, default: 0 },
        tacklePoints:   { type: Number, default: 0 },

        // Hockey
        goalsHockey:    { type: Number, default: 0 },
        penaltyCorners: { type: Number, default: 0 },

        submittedAt: { type: Date, default: Date.now }
      }
    ],

    // Track who has submitted stats
    statsSubmittedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

matchSchema.index({ "location.coordinates": "2dsphere" });

module.exports = mongoose.model("Match", matchSchema);