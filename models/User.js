const mongoose = require("mongoose");

// Sport-specific stats schema
const sportStatsSchema = new mongoose.Schema({
  sport: { type: String, required: true },
  matchesPlayed: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  motmCount: { type: Number, default: 0 },

  // Cricket
  totalRuns: { type: Number, default: 0 },
  totalWickets: { type: Number, default: 0 },
  highestScore: { type: Number, default: 0 },
  bestBowling: { type: Number, default: 0 },
  centuries: { type: Number, default: 0 },
  fifties: { type: Number, default: 0 },
  fiveWicketHauls: { type: Number, default: 0 },

  // Football
  totalGoals: { type: Number, default: 0 },
  totalAssists: { type: Number, default: 0 },
  cleanSheets: { type: Number, default: 0 },
  hatTricks: { type: Number, default: 0 },

  // Basketball
  totalPoints: { type: Number, default: 0 },
  totalRebounds: { type: Number, default: 0 },
  doubleDoubles: { type: Number, default: 0 },
  threePointers: { type: Number, default: 0 },

  // Badminton / Table Tennis / Tennis
  setsWon: { type: Number, default: 0 },
  straightSetWins: { type: Number, default: 0 },
  comebackWins: { type: Number, default: 0 },

  // Volleyball
  totalKills: { type: Number, default: 0 },
  totalAces: { type: Number, default: 0 },
  totalBlocks: { type: Number, default: 0 },

  // Kabaddi
  totalRaids: { type: Number, default: 0 },
  successfulRaids: { type: Number, default: 0 },
  superRaids: { type: Number, default: 0 },

  // Hockey
  totalGoalsHockey: { type: Number, default: 0 },
  penaltyCorners: { type: Number, default: 0 }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },

  skillLevel: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced"],
    default: "Beginner"
  },

  rating: { type: Number, default: 1000 },
  sports: [String],

  location: {
    lat: Number,
    lng: Number
  },

  matchesPlayed: { type: Number, default: 0 },
  wins:          { type: Number, default: 0 },
  losses:        { type: Number, default: 0 },

  reliabilityScore:   { type: Number, default: 75, min: 0, max: 100 },
  sportsmanshipScore: { type: Number, default: 0 },
  sportsmanshipCount: { type: Number, default: 0 },

  motmCount:       { type: Number, default: 0 },
  consecutiveMotm: { type: Number, default: 0 },
  consecutiveWins: { type: Number, default: 0 },

  badges: [
    {
      id:          { type: String, required: true },
      name:        { type: String, required: true },
      emoji:       { type: String, required: true },
      description: { type: String, default: "" },
      sport:       { type: String, default: null },
      earnedAt:    { type: Date, default: Date.now }
    }
  ],

  // ✅ Per-sport stats
  sportStats: [sportStatsSchema],

  walletBalance: { type: Number, default: 0 },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);