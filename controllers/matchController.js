const Match = require("../models/Match");
const Activity = require("../models/Activity");

const getUserId = (playerOrId) => {
  if (!playerOrId) return null;
  if (playerOrId._id) return playerOrId._id.toString();
  return playerOrId.toString();
};

// ✅ CREATE MATCH
exports.createMatch = async (req, res, next) => {
  try {
    const { sport, location, date, maxPlayers } = req.body;

    if (!sport || !sport.trim()) {
      return res.status(400).json({ success: false, msg: "Sport is required" });
    }
    if (!location?.name || !location?.coordinates?.coordinates) {
      return res.status(400).json({ success: false, msg: "Location name and coordinates are required" });
    }
    const [lng, lat] = location.coordinates.coordinates;
    if (typeof lng !== "number" || typeof lat !== "number" || isNaN(lng) || isNaN(lat)) {
      return res.status(400).json({ success: false, msg: "Valid coordinates (lat/lng) are required" });
    }
    if (!date || isNaN(new Date(date))) {
      return res.status(400).json({ success: false, msg: "A valid date is required" });
    }
    if (new Date(date) <= new Date()) {
      return res.status(400).json({ success: false, msg: "Match date must be in the future" });
    }
    const max = Number(maxPlayers);
    if (!max || max < 2) {
      return res.status(400).json({ success: false, msg: "Max players must be at least 2" });
    }

    const match = new Match({
      ...req.body,
      maxPlayers: max,
      createdBy: req.user,
      players: [{ user: req.user, status: "approved", team: "A" }]
    });
    await match.save();

    // ✅ Activity log
    await Activity.create({
      actor: req.user,
      type: "match_created",
      match: match._id,
      sport: sport.trim()
    });

    const populated = await Match.findById(match._id)
      .populate("players.user", "name email");

    res.status(201).json({ success: true, match: populated });
  } catch (err) {
    next(err);
  }
};

// ✅ JOIN MATCH
exports.joinMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ success: false, msg: "Match not found" });
    }
    if (match.status === "completed") {
      return res.status(400).json({ success: false, msg: "Cannot join a completed match" });
    }
    const alreadyJoined = match.players.some(
      (p) => getUserId(p.user) === req.user.toString()
    );
    if (alreadyJoined) {
      return res.status(400).json({ success: false, msg: "Already joined this match" });
    }
    if (match.players.length >= match.maxPlayers) {
      return res.status(400).json({ success: false, msg: "Match is full" });
    }

    match.players.push({ user: req.user, status: "pending" });
    await match.save();

    // ✅ Activity log
    await Activity.create({
      actor: req.user,
      type: "match_joined",
      match: match._id,
      sport: match.sport
    });

    const populated = await Match.findById(match._id)
      .populate("players.user", "name email");

    res.json({ success: true, msg: "Join request sent", match: populated });
  } catch (err) {
    next(err);
  }
};

// ✅ LEAVE MATCH
exports.leaveMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ success: false, msg: "Match not found" });
    }
    if (getUserId(match.createdBy) === req.user.toString()) {
      return res.status(400).json({ success: false, msg: "Creator cannot leave the match" });
    }
    const playerIndex = match.players.findIndex(
      (p) => getUserId(p.user) === req.user.toString()
    );
    if (playerIndex === -1) {
      return res.status(400).json({ success: false, msg: "You are not in this match" });
    }

    match.players.splice(playerIndex, 1);
    await match.save();

    const populated = await Match.findById(match._id)
      .populate("players.user", "name email");

    res.json({ success: true, msg: "Left match successfully", match: populated });
  } catch (err) {
    next(err);
  }
};

// ✅ APPROVE PLAYER
exports.approvePlayer = async (req, res, next) => {
  try {
    const { playerId } = req.body;

    if (!playerId) {
      return res.status(400).json({ success: false, msg: "playerId is required" });
    }

    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ success: false, msg: "Match not found" });
    }
    if (getUserId(match.createdBy) !== req.user.toString()) {
      return res.status(403).json({ success: false, msg: "Only the organizer can approve players" });
    }

    const approvedCount = match.players.filter((p) => p.status === "approved").length;
    let found = false;

    match.players = match.players.map((p) => {
      if (getUserId(p.user) === playerId) {
        found = true;
        const team = approvedCount % 2 === 0 ? "A" : "B";
        return { ...p._doc, status: "approved", team };
      }
      return p;
    });

    if (!found) {
      return res.status(404).json({ success: false, msg: "Player not found in this match" });
    }

    await match.save();

    const populated = await Match.findById(match._id)
      .populate("players.user", "name email");

    res.json({ success: true, msg: "Player approved and assigned to team", match: populated });
  } catch (err) {
    next(err);
  }
};

// ✅ GET ALL MATCHES
exports.getAllMatches = async (req, res, next) => {
  try {
    const matches = await Match.find()
      .populate("players.user", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, matches });
  } catch (err) {
    next(err);
  }
};

// ✅ GET SINGLE MATCH
exports.getMatchById = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate("players.user", "name email")
      .populate("createdBy", "name email");

    if (!match) {
      return res.status(404).json({ success: false, msg: "Match not found" });
    }

    res.json({ success: true, match });
  } catch (err) {
    next(err);
  }
};

// ✅ DELETE MATCH
exports.deleteMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ success: false, msg: "Match not found" });
    }
    if (getUserId(match.createdBy) !== req.user.toString()) {
      return res.status(403).json({ success: false, msg: "Only the organizer can delete this match" });
    }

    await match.deleteOne();
    res.json({ success: true, msg: "Match deleted" });
  } catch (err) {
    next(err);
  }
};

// ✅ GET NEARBY MATCHES
exports.getNearbyMatches = async (req, res, next) => {
  try {
    const { lat, lng, distance = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, msg: "lat and lng query params are required" });
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const parsedDist = parseFloat(distance);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return res.status(400).json({ success: false, msg: "lat and lng must be valid numbers" });
    }

    const matches = await Match.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [parsedLng, parsedLat] },
          distanceField: "distance",
          maxDistance: parsedDist * 1000,
          spherical: true
        }
      },
      { $sort: { distance: 1 } },
      {
        $lookup: {
          from: "users",
          localField: "players.user",
          foreignField: "_id",
          as: "_playerUsers"
        }
      }
    ]);

    const ids = matches.map((m) => m._id);
    const distanceMap = {};
    matches.forEach((m) => { distanceMap[m._id.toString()] = m.distance; });

    const populated = await Match.find({ _id: { $in: ids } })
      .populate("players.user", "name email");

    const withDistance = populated.map((m) => {
      const obj = m.toObject();
      obj.distance = distanceMap[m._id.toString()] || 0;
      return obj;
    });

    withDistance.sort((a, b) => a.distance - b.distance);

    res.json({ success: true, matches: withDistance });
  } catch (err) {
    next(err);
  }
};