const Notification = require("../models/Notification");

// Create notification + emit via socket
async function createNotification(io, {
  recipientId,
  type,
  title,
  message,
  senderId = null,
  matchId = null,
  tournamentId = null,
  friendRequestId = null,
  actionUrl = null
}) {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      sender: senderId,
      match: matchId,
      tournament: tournamentId,
      friendRequest: friendRequestId,
      actionUrl
    });

    // Real-time socket emit to recipient
    if (io) {
      io.to(recipientId.toString()).emit("notification:new", {
        _id: notification._id,
        type,
        title,
        message,
        actionUrl,
        createdAt: notification.createdAt
      });
    }

    return notification;
  } catch (err) {
    console.error("Failed to create notification:", err);
    return null;
  }
}

module.exports = { createNotification };