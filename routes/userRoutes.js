const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const User = require("../models/User");
const Match = require("../models/Match");

// GET /api/users/me
router.get("/me", auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user).select("-password");
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/search?q=name — player search
router.get("/search", auth, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, msg: "Search query must be at least 2 characters" });
    }

    const users = await User.find({
      _id: { $ne: req.user }, // exclude self
      name: { $regex: q.trim(), $options: "i" }
    })
      .select("name email skillLevel sports wins losses matchesPlayed")
      .limit(20);

    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id
router.get("/:id", auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password -walletBalance");
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    const recentMatches = await Match.find({
      "players.user": req.params.id,
      status: "completed"
    })
      .select("sport location date winnerTeam players")
      .sort({ updatedAt: -1 })
      .limit(5);

    res.json({ success: true, user, recentMatches });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/me
router.put("/me", auth, async (req, res, next) => {
  try {
    const { name, sports, skillLevel, location } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.user,
      { $set: { name, sports, skillLevel, location } },
      { new: true, runValidators: true }
    ).select("-password");

    res.json({ success: true, user: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;