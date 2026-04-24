const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Message = require("../models/Message");
const Match = require("../models/Match");

// GET /api/messages/:matchId — fetch last 50 messages for a match
// Used as fallback if socket history fails
router.get("/:matchId", auth, async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ success: false, msg: "Match not found" });

    // Only approved players can read chat
    const isApproved = match.players.some((p) => {
      const pid = p.user?._id?.toString() || p.user?.toString();
      return pid === req.user.toString() && p.status === "approved";
    });

    if (!isApproved) {
      return res.status(403).json({ success: false, msg: "Only approved players can view chat" });
    }

    const messages = await Message.find({ matchId: req.params.matchId })
      .populate("sender", "name")
      .sort({ createdAt: 1 })
      .limit(50);

    res.json({ success: true, messages });
  } catch (err) {
    next(err);
  }
});

module.exports = router;