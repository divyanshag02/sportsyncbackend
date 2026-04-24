const mongoose = require("mongoose");

const tournamentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tournament name is required"],
      trim: true
    },
    sport: {
      type: String,
      required: [true, "Sport is required"],
      trim: true
    },
    description: {
      type: String,
      default: "",
      trim: true
    },
    location: {
      name: { type: String, required: true, trim: true },
      coordinates: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], required: true }
      }
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    maxTeams: {
      type: Number,
      enum: [4, 8, 16],
      default: 4
    },
    playersPerTeam: {
      type: Number,
      required: true,
      min: 1,
      max: 15
    },
    status: {
      type: String,
      enum: ["registration", "ongoing", "completed"],
      default: "registration"
    },
    startDate: {
      type: Date,
      required: true
    },
    // Teams registered for this tournament
    teams: [
      {
        name: { type: String, required: true, trim: true },
        captain: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        players: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 }
      }
    ],
    // Tournament rounds — each round has matches
    rounds: [
      {
        roundNumber: { type: Number, required: true },
        name: { type: String, default: "" }, // "Round 1", "Semifinals", "Final"
        matches: [
          {
            teamA: { type: mongoose.Schema.Types.ObjectId, default: null },
            teamB: { type: mongoose.Schema.Types.ObjectId, default: null },
            teamAName: { type: String, default: "TBD" },
            teamBName: { type: String, default: "TBD" },
            winner: { type: mongoose.Schema.Types.ObjectId, default: null },
            winnerName: { type: String, default: null },
            status: {
              type: String,
              enum: ["scheduled", "ongoing", "completed"],
              default: "scheduled"
            },
            scheduledDate: { type: Date, default: null }
          }
        ]
      }
    ],
    // Final winner team
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    winnerName: {
      type: String,
      default: null
    },
    // Friend invites
    invites: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: {
          type: String,
          enum: ["pending", "accepted", "declined"],
          default: "pending"
        }
      }
    ]
  },
  { timestamps: true }
);

tournamentSchema.index({ "location.coordinates": "2dsphere" });

module.exports = mongoose.model("Tournament", tournamentSchema);