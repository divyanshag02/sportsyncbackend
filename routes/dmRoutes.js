const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Conversation = require("../models/Conversation");
const DirectMessage = require("../models/DirectMessage");

// GET /api/dm/conversations — sab conversations for logged-in user
router.get("/conversations", auth, async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user,
    })
      .populate("participants", "name email")
      .sort({ lastMessageTime: -1 });

    const formatted = conversations.map((conv) => {
      const other = conv.participants.find(
        (p) => p._id.toString() !== req.user.toString()
      );
      return {
        _id: conv._id,
        friend: other,
        lastMessage: conv.lastMessage,
        lastMessageTime: conv.lastMessageTime,
        unread: conv.unreadCount.get(req.user.toString()) || 0,
      };
    });

    res.json({ success: true, conversations: formatted });
  } catch (err) {
    next(err);
  }
});

// GET /api/dm/messages/:friendId — messages with a specific friend
router.get("/messages/:friendId", auth, async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      participants: { $all: [req.user, req.params.friendId] },
    });

    if (!conversation) return res.json({ success: true, messages: [], conversationId: null });

    const messages = await DirectMessage.find({
      conversationId: conversation._id,
    })
      .populate("sender", "name")
      .sort({ createdAt: 1 })
      .limit(100);

    // Unread count read hone ke baad reset
    const unreadBefore = conversation.unreadCount.get(req.user.toString()) || 0;
    await DirectMessage.updateMany(
      { conversationId: conversation._id, receiver: req.user, read: false },
      { read: true }
    );
    conversation.unreadCount.set(req.user.toString(), 0);
    await conversation.save();

    res.json({
      success: true,
      conversationId: conversation._id,
      messages,
      unreadBefore,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;