const express = require("express");
const http = require("http");
const dotenv = require("dotenv");
const cors = require("cors");
const cron = require("node-cron");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorMiddleware");
const initSocket = require("./socket/socketHandler");
const cleanupOldMatches = require("./jobs/cleanupMatches");

dotenv.config();

// ✅ Check required env variables
const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET"];
REQUIRED_ENV.forEach((key) => {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

// ✅ Connect DB
connectDB();

const app = express();
const server = http.createServer(app);

// ✅ Init Socket.io
const io = initSocket(server);
app.set("io", io);
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://sportssync.netlify.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ✅ Preflight fix (important)
// ✅ Middleware
app.use(express.json());

// ✅ Rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, msg: "Too many requests, try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false
});

// ✅ Routes
app.use("/api/auth",          authLimiter, require("./routes/authRoutes"));
app.use("/api/users",         require("./routes/userRoutes"));
app.use("/api/matches",       require("./routes/matchRoutes"));
app.use("/api/messages",      require("./routes/messageRoutes"));
app.use("/api/friends",       require("./routes/friendRoutes"));
app.use("/api/dm",            require("./routes/dmRoutes"));
app.use("/api/activity",      require("./routes/activityRoutes"));
app.use("/api/tournaments",   require("./routes/tournamentRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));

// ✅ Health route (helps Render detect service)
app.get("/", (req, res) => {
  res.send("API running 🚀");
});

// ✅ Error handler
app.use(errorHandler);

// ✅ Cron: cleanup old matches every hour
cron.schedule("0 * * * *", () => {
  console.log("[Cron] Running match cleanup...");
  cleanupOldMatches();
});

// ✅ Cron: match starting soon — runs every minute
cron.schedule("* * * * *", async () => {
  try {
    const Match = require("./models/Match");
    const { createNotification } = require("./utils/notificationHelper");

    const now = new Date();
    const in55mins = new Date(now.getTime() + 55 * 60 * 1000);
    const in65mins = new Date(now.getTime() + 65 * 60 * 1000);

    const upcomingMatches = await Match.find({
      status: "upcoming",
      date: { $gte: in55mins, $lte: in65mins },
      startingSoonNotified: { $ne: true }
    })
      .populate("players.user", "name")
      .populate("createdBy", "name");

    for (const match of upcomingMatches) {
      const approvedPlayers = match.players.filter(p => p.status === "approved");

      console.log(`[Cron] Sending starting soon notification for match: ${match.sport}`);

      for (const player of approvedPlayers) {
        const uid = player.user?._id?.toString() || player.user?.toString();
        if (!uid) continue;

        await createNotification(io, {
          recipientId: uid,
          type: "match_starting_soon",
          title: "Match Starting Soon ⏰",
          message: `Your ${match.sport} match at ${match.location?.name || "the venue"} starts in about 1 hour!`,
          matchId: match._id,
          actionUrl: `/match/${match._id}`
        });
      }

      await Match.findByIdAndUpdate(match._id, { startingSoonNotified: true });
    }
  } catch (err) {
    console.error("[Cron] Starting soon notification error:", err);
  }
});

// ✅ Initial cleanup run
cleanupOldMatches();

// ✅ Start server (Render compatible)
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server + Socket.io running on port ${PORT}`);
});