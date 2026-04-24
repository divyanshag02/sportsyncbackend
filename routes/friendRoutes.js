const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const FriendRequest = require("../models/FriendRequest");
const User = require("../models/User");
const Activity = require("../models/Activity");
const { createNotification } = require("../utils/notificationHelper");

// POST /api/friends/send/:userId
router.post("/send/:userId", auth, async (req, res, next) => {
  try {
    const receiverId = req.params.userId;

    if (receiverId === req.user.toString()) {
      return res.status(400).json({ success: false, msg: "You cannot add yourself" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    const me = await User.findById(req.user);
    const alreadyFriends = me.friends.some((fid) => fid.toString() === receiverId);
    if (alreadyFriends) {
      return res.status(400).json({ success: false, msg: "Already friends" });
    }

    const existing = await FriendRequest.findOne({ sender: req.user, receiver: receiverId });
    if (existing) {
      return res.status(400).json({ success: false, msg: "Request already sent" });
    }

    // Auto-accept if reverse request exists
    const reverse = await FriendRequest.findOne({ sender: receiverId, receiver: req.user });
    if (reverse) {
      reverse.status = "accepted";
      await reverse.save();
      await User.findByIdAndUpdate(req.user, { $addToSet: { friends: receiverId } });
      await User.findByIdAndUpdate(receiverId, { $addToSet: { friends: req.user } });

      await Activity.create({ actor: req.user, type: "friend_added", targetUser: receiverId });

      // ✅ Notify both users — you are now friends
      const io = req.app.get("io");
      await createNotification(io, {
        recipientId: receiverId,
        type: "friend_accepted",
        title: "Friend Request Accepted",
        message: `You and ${me.name} are now friends!`,
        senderId: req.user,
        actionUrl: `/profile/${req.user}`
      });
      await createNotification(io, {
        recipientId: req.user.toString(),
        type: "friend_accepted",
        title: "Friend Request Accepted",
        message: `You and ${receiver.name} are now friends!`,
        senderId: receiverId,
        actionUrl: `/profile/${receiverId}`
      });

      return res.json({ success: true, msg: "Friend request accepted automatically — you are now friends!" });
    }

    const friendReq = await FriendRequest.create({ sender: req.user, receiver: receiverId });

    // ✅ Notify receiver — new friend request
    const io = req.app.get("io");
    await createNotification(io, {
      recipientId: receiverId,
      type: "friend_request",
      title: "New Friend Request",
      message: `${me.name} sent you a friend request`,
      senderId: req.user,
      friendRequestId: friendReq._id,
      actionUrl: "/friends"
    });

    res.status(201).json({ success: true, msg: "Friend request sent!" });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, msg: "Request already sent" });
    }
    next(err);
  }
});

// POST /api/friends/accept/:requestId
router.post("/accept/:requestId", auth, async (req, res, next) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId).populate("sender", "name").populate("receiver", "name");

    if (!request) return res.status(404).json({ success: false, msg: "Request not found" });
    if (request.receiver._id.toString() !== req.user.toString()) {
      return res.status(403).json({ success: false, msg: "Not authorized" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ success: false, msg: "Request already handled" });
    }

    request.status = "accepted";
    await request.save();

    await User.findByIdAndUpdate(request.sender._id, { $addToSet: { friends: request.receiver._id } });
    await User.findByIdAndUpdate(request.receiver._id, { $addToSet: { friends: request.sender._id } });

    await Activity.create({ actor: req.user, type: "friend_added", targetUser: request.sender._id });

    // ✅ Notify original sender — request accepted
    const io = req.app.get("io");
    await createNotification(io, {
      recipientId: request.sender._id.toString(),
      type: "friend_accepted",
      title: "Friend Request Accepted",
      message: `${request.receiver.name} accepted your friend request`,
      senderId: req.user,
      actionUrl: `/profile/${req.user}`
    });

    res.json({ success: true, msg: "Friend request accepted!" });
  } catch (err) {
    next(err);
  }
});

// POST /api/friends/reject/:requestId
router.post("/reject/:requestId", auth, async (req, res, next) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ success: false, msg: "Request not found" });
    if (request.receiver.toString() !== req.user.toString()) {
      return res.status(403).json({ success: false, msg: "Not authorized" });
    }
    await request.deleteOne();
    res.json({ success: true, msg: "Request rejected" });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/friends/remove/:userId
router.delete("/remove/:userId", auth, async (req, res, next) => {
  try {
    const friendId = req.params.userId;
    await User.findByIdAndUpdate(req.user, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: req.user } });
    await FriendRequest.deleteMany({
      $or: [
        { sender: req.user, receiver: friendId },
        { sender: friendId, receiver: req.user }
      ]
    });
    res.json({ success: true, msg: "Friend removed" });
  } catch (err) {
    next(err);
  }
});

// GET /api/friends/requests
router.get("/requests", auth, async (req, res, next) => {
  try {
    const requests = await FriendRequest.find({ receiver: req.user, status: "pending" })
      .populate("sender", "name email");
    res.json({ success: true, requests });
  } catch (err) {
    next(err);
  }
});

// GET /api/friends
router.get("/", auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user)
      .populate("friends", "name email skillLevel sports matchesPlayed wins losses");
    res.json({ success: true, friends: user.friends });
  } catch (err) {
    next(err);
  }
});

module.exports = router;