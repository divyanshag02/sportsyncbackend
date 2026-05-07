const jwt = require("jsonwebtoken");
const Match = require("../models/Match");
const Message = require("../models/Message");

module.exports = function initSocket(server) {
  const { Server } = require("socket.io");

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://sportssync.netlify.app"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token provided"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.userId}`);

    socket.join(socket.userId);

    socket.on("joinMatchRoom", async ({ matchId }) => {
      try {
        const match = await Match.findById(matchId);
        if (!match) return socket.emit("error", { msg: "Match not found" });

        const isApproved = match.players.some((p) => {
          const pid = p.user?._id?.toString() || p.user?.toString();
          return pid === socket.userId && p.status === "approved";
        });

        if (!isApproved) return socket.emit("error", { msg: "Only approved players can chat" });

        socket.join(matchId);

        const isHost = match.createdBy?.toString() === socket.userId;
        const history = await getVisibleMessages(matchId, socket.userId, isHost, match.chatOpenForAll);

        socket.emit("chatHistory", history);
        socket.emit("chatVisibility", { chatOpenForAll: match.chatOpenForAll, isHost });

      } catch (err) {
        socket.emit("error", { msg: err.message });
      }
    });

    socket.on("sendMessage", async ({ matchId, text }) => {
      try {
        if (!text || !text.trim()) return;
        if (text.length > 500) return socket.emit("error", { msg: "Message too long" });

        const match = await Match.findById(matchId);
        if (!match) return socket.emit("error", { msg: "Match not found" });

        const isApproved = match.players.some((p) => {
          const pid = p.user?._id?.toString() || p.user?.toString();
          return pid === socket.userId && p.status === "approved";
        });

        if (!isApproved) return socket.emit("error", { msg: "Not authorized to chat" });

        const isHost = match.createdBy?.toString() === socket.userId;

        const message = await Message.create({
          matchId,
          sender: socket.userId,
          text: text.trim()
        });

        const populated = await Message.findById(message._id).populate("sender", "name");
        const socketsInRoom = await io.in(matchId).fetchSockets();

        for (const s of socketsInRoom) {
          const receiverIsHost = match.createdBy?.toString() === s.userId;

          if (receiverIsHost) {
            s.emit("newMessage", { ...populated.toObject(), isHostMessage: isHost });
            continue;
          }

          if (match.chatOpenForAll) {
            s.emit("newMessage", { ...populated.toObject(), isHostMessage: isHost });
            continue;
          }

          if (isHost) {
            s.emit("newMessage", { ...populated.toObject(), isHostMessage: true });
          } else if (s.userId === socket.userId) {
            s.emit("newMessage", { ...populated.toObject(), isHostMessage: false, onlyVisibleToSelf: true });
          }
        }

      } catch (err) {
        socket.emit("error", { msg: err.message });
      }
    });

    socket.on("notifyChatToggle", ({ matchId, chatOpenForAll }) => {
      io.to(matchId).emit("chatVisibilityChanged", { chatOpenForAll });
    });

    socket.on("dm:send", async ({ receiverId, text }) => {
      try {
        if (!text || !text.trim()) return;
        if (text.length > 1000)
          return socket.emit("dm:error", { message: "Message too long" });

        const Conversation = require("../models/Conversation");
        const DirectMessage = require("../models/DirectMessage");

        let conversation = await Conversation.findOne({
          participants: { $all: [socket.userId, receiverId] },
        });

        if (!conversation) {
          conversation = await Conversation.create({
            participants: [socket.userId, receiverId],
            unreadCount: { [socket.userId]: 0, [receiverId]: 0 },
          });
        }

        const message = await DirectMessage.create({
          conversationId: conversation._id,
          sender: socket.userId,
          receiver: receiverId,
          text: text.trim(),
        });

        const populated = await message.populate("sender", "name");

        const prevUnread = conversation.unreadCount.get(receiverId) || 0;
        conversation.lastMessage = text.trim();
        conversation.lastMessageTime = new Date();
        conversation.unreadCount.set(receiverId, prevUnread + 1);
        await conversation.save();

        io.to(receiverId).emit("dm:receive", {
          message: populated,
          conversationId: conversation._id,
        });

        socket.emit("dm:sent", {
          message: populated,
          conversationId: conversation._id,
        });

      } catch (err) {
        console.error("[DM Error]", err.message);
        socket.emit("dm:error", { message: "Message send failed" });
      }
    });

    socket.on("dm:typing", ({ receiverId, isTyping }) => {
      io.to(receiverId).emit("dm:typing", {
        senderId: socket.userId,
        isTyping,
      });
    });

    socket.on("activity:broadcast", async ({ activityId }) => {
      try {
        const Activity = require("../models/Activity");
        const User = require("../models/User");

        const activity = await Activity.findById(activityId)
          .populate("actor", "name")
          .populate("match", "sport location")
          .populate("targetUser", "name");

        if (!activity) return;

        const user = await User.findById(socket.userId).select("friends");
        const friendIds = user.friends.map(f => f.toString());

        friendIds.forEach(fid => {
          io.to(fid).emit("activity:new", activity);
        });

      } catch (err) {
        console.error("[Activity Broadcast Error]", err.message);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.userId}`);
    });
  });

  return io;
};

async function getVisibleMessages(matchId, userId, isHost, chatOpenForAll) {
  const match = await Match.findById(matchId);
  const hostId = match.createdBy?.toString();

  let query = { matchId };

  if (!isHost && !chatOpenForAll) {
    query.sender = hostId;
  }

  return await Message.find(query)
    .populate("sender", "name")
    .sort({ createdAt: 1 })
    .limit(50);
}