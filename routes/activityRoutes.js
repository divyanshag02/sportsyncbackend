const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Activity = require("../models/Activity");
const User = require("../models/User");

// GET /api/activity/feed — friends ki activities
router.get("/feed", auth, async (req, res, next) => {
  try {
    // Pehle friends list lo
    const me = await User.findById(req.user).select("friends");
    const friendIds = me.friends.map(f => f.toString());

    // Friends + apni activities — last 50
    const activities = await Activity.find({
      actor: { $in: [...friendIds, req.user.toString()] }
    })
      .populate("actor", "name")
      .populate("match", "sport location")
      .populate("targetUser", "name")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, activities });
  } catch (err) {
    next(err);
  }
});

module.exports = router;