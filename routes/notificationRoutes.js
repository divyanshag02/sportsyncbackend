const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Notification = require("../models/Notification");

// GET /api/notifications — get all notifications for current user
router.get("/", auth, async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("sender", "name")
      .populate("match", "sport location")
      .populate("tournament", "name sport");

    const unreadCount = await Notification.countDocuments({
      recipient: req.user,
      read: false
    });

    res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/:id/read — mark single as read
router.put("/:id/read", auth, async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user },
      { read: true }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/read-all — mark all as read
router.put("/read-all", auth, async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user, read: false },
      { read: true }
    );
    res.json({ success: true, msg: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications/:id — delete single notification
router.delete("/:id", auth, async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications — clear all notifications
router.delete("/", auth, async (req, res, next) => {
  try {
    await Notification.deleteMany({ recipient: req.user });
    res.json({ success: true, msg: "All notifications cleared" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;