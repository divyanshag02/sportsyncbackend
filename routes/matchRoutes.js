const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const matchController = require("../controllers/matchController");
const { completeMatch } = require("../controllers/completeMatchController");

// CREATE
router.post("/", auth, matchController.createMatch);

// ✅ JOIN — with notification to host
router.post("/:id/join", auth, async (req, res, next) => {
  try {
    const Match = require("../models/Match");
    const User = require("../models/User");
    const { createNotification } = require("../utils/notificationHelper");

    const match = await Match.findById(req.params.id).populate("createdBy", "name");
    if (!match) return res.status(404).json({ success: false, msg: "Match not found" });
    if (match.status === "completed") return res.status(400).json({ success: false, msg: "Match is already completed" });

    const approvedCount = match.players.filter(p => p.status === "approved").length;
    if (approvedCount >= match.maxPlayers) {
      return res.status(400).json({ success: false, msg: "Match is full" });
    }

    const alreadyJoined = match.players.some(p => {
      const pid = p.user?._id?.toString() || p.user?.toString();
      return pid === req.user.toString();
    });
    if (alreadyJoined) return res.status(400).json({ success: false, msg: "Already joined" });

    match.players.push({ user: req.user, status: "pending" });
    await match.save();

    // Notify host
    const joiningUser = await User.findById(req.user).select("name");
    const io = req.app.get("io");
    const hostId = match.createdBy?._id?.toString() || match.createdBy?.toString();

    if (hostId !== req.user.toString()) {
      await createNotification(io, {
        recipientId: hostId,
        type: "match_join_request",
        title: "New Join Request",
        message: `${joiningUser.name} wants to join your ${match.sport} match`,
        senderId: req.user,
        matchId: match._id,
        actionUrl: `/match/${match._id}`
      });
    }

    res.json({ success: true, msg: "Join request sent! Waiting for host approval." });
  } catch (err) {
    next(err);
  }
});

// LEAVE
router.post("/:id/leave", auth, matchController.leaveMatch);

// ✅ APPROVE — with notification to player
router.post("/:id/approve", auth, async (req, res, next) => {
  try {
    const { playerId } = req.body;
    const Match = require("../models/Match");
    const { createNotification } = require("../utils/notificationHelper");

    const match = await Match.findById(req.params.id).populate("createdBy", "name");
    if (!match) return res.status(404).json({ success: false, msg: "Match not found" });

    const createdById = match.createdBy?._id?.toString() || match.createdBy?.toString();
    if (createdById !== req.user.toString()) {
      return res.status(403).json({ success: false, msg: "Only host can approve players" });
    }

    const player = match.players.find(p => {
      const pid = p.user?._id?.toString() || p.user?.toString();
      return pid === playerId;
    });
    if (!player) return res.status(404).json({ success: false, msg: "Player not found in match" });

    // Auto team assignment
    const approvedPlayers = match.players.filter(p => p.status === "approved");
    const teamACnt = approvedPlayers.filter(p => p.team === "A").length;
    const teamBCnt = approvedPlayers.filter(p => p.team === "B").length;
    player.team = teamACnt <= teamBCnt ? "A" : "B";
    player.status = "approved";
    await match.save();

    // Notify approved player
    const io = req.app.get("io");
    await createNotification(io, {
      recipientId: playerId,
      type: "match_approved",
      title: "Match Request Approved",
      message: `You have been approved to play ${match.sport} at ${match.location?.name || "the venue"}`,
      senderId: req.user,
      matchId: match._id,
      actionUrl: `/match/${match._id}`
    });

    const populated = await Match.findById(match._id)
      .populate("players.user", "name email")
      .populate("createdBy", "name email");

    res.json({ success: true, msg: "Player approved!", match: populated });
  } catch (err) {
    next(err);
  }
});

// COMPLETE
router.post("/:id/complete", auth, completeMatch);

// TOGGLE CHAT
router.post("/:id/toggle-chat", auth, async (req, res, next) => {
  try {
    const match = await require("../models/Match").findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, msg: "Match not found" });
    const createdById = match.createdBy?.toString();
    if (createdById !== req.user.toString()) {
      return res.status(403).json({ success: false, msg: "Only host can control chat visibility" });
    }
    match.chatOpenForAll = !match.chatOpenForAll;
    await match.save();
    res.json({ success: true, chatOpenForAll: match.chatOpenForAll });
  } catch (err) {
    next(err);
  }
});

// MARK NO-SHOW
router.post("/:id/no-show", auth, async (req, res, next) => {
  try {
    const { playerIds } = req.body;
    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return res.status(400).json({ success: false, msg: "playerIds array required" });
    }
    const Match = require("../models/Match");
    const User = require("../models/User");
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, msg: "Match not found" });
    const createdById = match.createdBy?.toString();
    if (createdById !== req.user.toString()) {
      return res.status(403).json({ success: false, msg: "Only host can mark no-shows" });
    }
    if (match.status !== "completed") {
      return res.status(400).json({ success: false, msg: "Can only mark no-shows after match is completed" });
    }
    const alreadyMarked = match.noShows?.map(id => id.toString()) || [];
    const newNoShows = playerIds.filter(pid => !alreadyMarked.includes(pid));
    if (newNoShows.length === 0) {
      return res.status(400).json({ success: false, msg: "These players are already marked as no-show" });
    }
    await Promise.all(newNoShows.map(pid =>
      User.findByIdAndUpdate(pid, { $inc: { reliabilityScore: -10 } })
    ));
    if (!match.noShows) match.noShows = [];
    match.noShows.push(...newNoShows);
    await match.save();
    res.json({ success: true, msg: `${newNoShows.length} player(s) marked as no-show.` });
  } catch (err) {
    next(err);
  }
});

// RATE PLAYERS
router.post("/:id/rate", auth, async (req, res, next) => {
  try {
    const { ratings } = req.body;
    if (!ratings || !Array.isArray(ratings) || ratings.length === 0) {
      return res.status(400).json({ success: false, msg: "ratings array required" });
    }
    const Match = require("../models/Match");
    const User = require("../models/User");
    const Rating = require("../models/Rating");
    const { checkAndAwardBadges } = require("../utils/badgeEngine");

    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, msg: "Match not found" });
    if (match.status !== "completed") {
      return res.status(400).json({ success: false, msg: "Can only rate after match is completed" });
    }
    const isApproved = match.players.some(p => {
      const pid = p.user?._id?.toString() || p.user?.toString();
      return pid === req.user.toString() && p.status === "approved";
    });
    if (!isApproved) {
      return res.status(403).json({ success: false, msg: "Only approved players can rate" });
    }
    const saved = [];
    const errors = [];
    for (const r of ratings) {
      if (!r.userId || !r.sportsmanship) continue;
      if (r.userId === req.user.toString()) continue;
      if (r.sportsmanship < 1 || r.sportsmanship > 5) continue;
      try {
        await Rating.findOneAndUpdate(
          { match: match._id, rater: req.user, rated: r.userId },
          { match: match._id, rater: req.user, rated: r.userId, sportsmanship: r.sportsmanship, comment: r.comment?.trim() || "" },
          { upsert: true, new: true }
        );
        const allRatings = await Rating.find({ rated: r.userId });
        const avg = allRatings.reduce((sum, rt) => sum + rt.sportsmanship, 0) / allRatings.length;
        await User.findByIdAndUpdate(r.userId, {
          sportsmanshipScore: Math.round(avg * 10) / 10,
          sportsmanshipCount: allRatings.length
        });
        await checkAndAwardBadges(r.userId, {});
        saved.push(r.userId);
      } catch (err) {
        if (err.code === 11000) errors.push(r.userId);
      }
    }
    res.json({ success: true, msg: `${saved.length} player(s) rated successfully`, alreadyRated: errors.length });
  } catch (err) {
    next(err);
  }
});

// GET MY RATINGS
router.get("/:id/my-ratings", auth, async (req, res, next) => {
  try {
    const Rating = require("../models/Rating");
    const ratings = await Rating.find({ match: req.params.id, rater: req.user });
    const ratedIds = ratings.map(r => r.rated.toString());
    res.json({ success: true, ratedIds });
  } catch (err) {
    next(err);
  }
});

// SUBMIT MATCH STATS
router.post("/:id/stats", auth, async (req, res, next) => {
  try {
    const { stats } = req.body;
    if (!stats || typeof stats !== "object") {
      return res.status(400).json({ success: false, msg: "stats object required" });
    }

    const Match = require("../models/Match");
    const User = require("../models/User");
    const { checkSportBadges } = require("../utils/badgeEngine");

    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, msg: "Match not found" });
    if (match.status !== "completed") {
      return res.status(400).json({ success: false, msg: "Can only submit stats after match is completed" });
    }

    const isApproved = match.players.some(p => {
      const pid = p.user?._id?.toString() || p.user?.toString();
      return pid === req.user.toString() && p.status === "approved";
    });
    if (!isApproved) {
      return res.status(403).json({ success: false, msg: "Only approved players can submit stats" });
    }

    const alreadySubmitted = match.statsSubmittedBy?.some(
      uid => uid.toString() === req.user.toString()
    );
    if (alreadySubmitted) {
      return res.status(400).json({ success: false, msg: "You have already submitted stats for this match" });
    }

    if (!match.playerStats) match.playerStats = [];
    match.playerStats.push({ user: req.user, sport: match.sport, ...stats });

    if (!match.statsSubmittedBy) match.statsSubmittedBy = [];
    match.statsSubmittedBy.push(req.user);
    await match.save();

    const sport = match.sport;
    const user = await User.findById(req.user).select("sportStats");
    const existingIdx = user.sportStats?.findIndex(
      s => s.sport.toLowerCase() === sport.toLowerCase()
    );

    const increment = {};

    if (sport.toLowerCase() === "cricket") {
      if (stats.runs)    increment["sportStats.$.totalRuns"]    = stats.runs;
      if (stats.wickets) increment["sportStats.$.totalWickets"] = stats.wickets;
      if (stats.runs >= 100) increment["sportStats.$.centuries"] = 1;
      if (stats.runs >= 50 && stats.runs < 100) increment["sportStats.$.fifties"] = 1;
      if (stats.wickets >= 5) increment["sportStats.$.fiveWicketHauls"] = 1;
    } else if (sport.toLowerCase() === "football") {
      if (stats.goals)   increment["sportStats.$.totalGoals"]   = stats.goals;
      if (stats.assists) increment["sportStats.$.totalAssists"] = stats.assists;
      if (stats.goals >= 3) increment["sportStats.$.hatTricks"] = 1;
      if (stats.cleanSheet) increment["sportStats.$.cleanSheets"] = 1;
    } else if (sport.toLowerCase() === "basketball") {
      if (stats.points)        increment["sportStats.$.totalPoints"]   = stats.points;
      if (stats.rebounds)      increment["sportStats.$.totalRebounds"] = stats.rebounds;
      if (stats.threePointers) increment["sportStats.$.threePointers"] = stats.threePointers;
      if (stats.points >= 10 && stats.rebounds >= 10) increment["sportStats.$.doubleDoubles"] = 1;
    } else if (sport.toLowerCase() === "volleyball") {
      if (stats.kills)  increment["sportStats.$.totalKills"]  = stats.kills;
      if (stats.aces)   increment["sportStats.$.totalAces"]   = stats.aces;
      if (stats.blocks) increment["sportStats.$.totalBlocks"] = stats.blocks;
    } else if (sport.toLowerCase() === "kabaddi") {
      if (stats.raidPoints)   increment["sportStats.$.totalRaids"]      = stats.raidPoints;
      if (stats.tacklePoints) increment["sportStats.$.successfulRaids"] = stats.tacklePoints;
      if (stats.raidPoints >= 3) increment["sportStats.$.superRaids"]   = 1;
    } else if (sport.toLowerCase() === "hockey") {
      if (stats.goalsHockey)    increment["sportStats.$.totalGoalsHockey"] = stats.goalsHockey;
      if (stats.penaltyCorners) increment["sportStats.$.penaltyCorners"]   = stats.penaltyCorners;
    } else if (["badminton", "tennis", "table tennis"].includes(sport.toLowerCase())) {
      if (stats.setsWon) increment["sportStats.$.setsWon"] = stats.setsWon;
      if (stats.comebackWin) increment["sportStats.$.comebackWins"] = 1;
      if (stats.setsLost === 0 && stats.setsWon >= 2) increment["sportStats.$.straightSetWins"] = 1;
    }

    if (existingIdx >= 0) {
      const incQuery = {};
      Object.keys(increment).forEach(k => { incQuery[k] = increment[k]; });
      await User.findOneAndUpdate(
        { _id: req.user, "sportStats.sport": sport },
        { $inc: { ...incQuery, "sportStats.$.matchesPlayed": 1 } }
      );
    } else {
      const newStats = {
        sport,
        matchesPlayed: 1,
        ...(stats.runs        && { totalRuns: stats.runs }),
        ...(stats.wickets     && { totalWickets: stats.wickets }),
        ...(stats.goals       && { totalGoals: stats.goals }),
        ...(stats.assists     && { totalAssists: stats.assists }),
        ...(stats.points      && { totalPoints: stats.points }),
        ...(stats.rebounds    && { totalRebounds: stats.rebounds }),
        ...(stats.kills       && { totalKills: stats.kills }),
        ...(stats.aces        && { totalAces: stats.aces }),
        ...(stats.blocks      && { totalBlocks: stats.blocks }),
        ...(stats.raidPoints  && { totalRaids: stats.raidPoints }),
        ...(stats.goalsHockey && { totalGoalsHockey: stats.goalsHockey }),
        ...(stats.setsWon     && { setsWon: stats.setsWon })
      };
      await User.findByIdAndUpdate(req.user, { $push: { sportStats: newStats } });
    }

    const newBadges = await checkSportBadges(req.user.toString(), sport, stats);

    res.json({ success: true, msg: "Stats submitted successfully!", newBadges });
  } catch (err) {
    next(err);
  }
});

// GET MATCH STATS
router.get("/:id/stats", auth, async (req, res, next) => {
  try {
    const Match = require("../models/Match");
    const match = await Match.findById(req.params.id)
      .populate("playerStats.user", "name")
      .select("playerStats statsSubmittedBy sport status");
    if (!match) return res.status(404).json({ success: false, msg: "Match not found" });
    const hasSubmitted = match.statsSubmittedBy?.some(
      uid => uid.toString() === req.user.toString()
    );
    res.json({ success: true, playerStats: match.playerStats || [], hasSubmitted, sport: match.sport });
  } catch (err) {
    next(err);
  }
});

// MOTM VOTE
router.post("/:id/motm/vote", auth, async (req, res, next) => {
  try {
    const { nomineeId } = req.body;
    if (!nomineeId) return res.status(400).json({ success: false, msg: "nomineeId required" });

    const Match = require("../models/Match");
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, msg: "Match not found" });
    if (match.status !== "completed") {
      return res.status(400).json({ success: false, msg: "Match must be completed for MoTM voting" });
    }

    const isApproved = match.players.some(p => {
      const pid = p.user?._id?.toString() || p.user?.toString();
      return pid === req.user.toString() && p.status === "approved";
    });
    if (!isApproved) return res.status(403).json({ success: false, msg: "Only approved players can vote" });
    if (nomineeId === req.user.toString()) return res.status(400).json({ success: false, msg: "You cannot vote for yourself" });

    const nomineeIsPlayer = match.players.some(p => {
      const pid = p.user?._id?.toString() || p.user?.toString();
      return pid === nomineeId && p.status === "approved";
    });
    if (!nomineeIsPlayer) return res.status(400).json({ success: false, msg: "Nominee must be an approved player" });

    const alreadyVoted = match.motmVotes?.some(v => v.voter?.toString() === req.user.toString());
    if (alreadyVoted) return res.status(400).json({ success: false, msg: "You have already voted" });

    if (!match.motmVotes) match.motmVotes = [];
    match.motmVotes.push({ voter: req.user, nominee: nomineeId });
    await match.save();

    res.json({ success: true, msg: "Vote submitted!" });
  } catch (err) {
    next(err);
  }
});

// MOTM DECLARE
router.post("/:id/motm/declare", auth, async (req, res, next) => {
  try {
    const { motmUserId } = req.body;
    if (!motmUserId) return res.status(400).json({ success: false, msg: "motmUserId required" });

    const Match = require("../models/Match");
    const User = require("../models/User");
    const { checkAndAwardBadges } = require("../utils/badgeEngine");
    const { createNotification } = require("../utils/notificationHelper");

    const match = await Match.findById(req.params.id).populate("players.user", "name");
    if (!match) return res.status(404).json({ success: false, msg: "Match not found" });

    const createdById = match.createdBy?._id?.toString() || match.createdBy?.toString();
    if (createdById !== req.user.toString()) {
      return res.status(403).json({ success: false, msg: "Only host can declare MoTM" });
    }
    if (match.status !== "completed") return res.status(400).json({ success: false, msg: "Match must be completed" });
    if (match.motmDeclared) return res.status(400).json({ success: false, msg: "MoTM already declared" });

    match.motmPlayer = motmUserId;
    match.motmDeclared = true;
    await match.save();

    const motmUser = await User.findById(motmUserId).select("motmCount consecutiveMotm name");
    if (!motmUser) return res.status(404).json({ success: false, msg: "Player not found" });

    const newMotmCount = (motmUser.motmCount || 0) + 1;
    const newConsecutiveMotm = (motmUser.consecutiveMotm || 0) + 1;

    await User.findByIdAndUpdate(motmUserId, {
      $set: { motmCount: newMotmCount, consecutiveMotm: newConsecutiveMotm },
      $inc: { rating: 25 }
    });

    const otherPlayerIds = match.players
      .filter(p => {
        const pid = p.user?._id?.toString() || p.user?.toString();
        return p.status === "approved" && pid !== motmUserId;
      })
      .map(p => p.user?._id?.toString() || p.user?.toString());

    await Promise.all(
      otherPlayerIds.map(pid =>
        User.findByIdAndUpdate(pid, { $set: { consecutiveMotm: 0 } })
      )
    );

    await checkAndAwardBadges(motmUserId, { isMotm: true });

    const Activity = require("../models/Activity");
    await Activity.create({
      actor: req.user,
      type: "match_completed",
      match: match._id,
      sport: match.sport,
      winnerTeam: match.winnerTeam
    });

    // ✅ Socket + notification to MoTM player
    const io = req.app.get("io");
    io.to(motmUserId).emit("motm:awarded", {
      matchId: match._id,
      sport: match.sport,
      message: `You won Man of the Match in ${match.sport}!`
    });

    await createNotification(io, {
      recipientId: motmUserId,
      type: "motm_awarded",
      title: "Man of the Match",
      message: `You won Man of the Match in ${match.sport}! +25 ELO bonus awarded`,
      senderId: req.user,
      matchId: match._id,
      actionUrl: `/match/${match._id}`
    });

    const populated = await Match.findById(match._id)
      .populate("motmPlayer", "name")
      .populate("players.user", "name");

    res.json({
      success: true,
      msg: `${motmUser.name} declared as Man of the Match!`,
      motmPlayer: populated.motmPlayer
    });
  } catch (err) {
    next(err);
  }
});

// GET MOTM VOTES
router.get("/:id/motm/votes", auth, async (req, res, next) => {
  try {
    const Match = require("../models/Match");
    const match = await Match.findById(req.params.id)
      .populate("motmVotes.nominee", "name")
      .populate("motmPlayer", "name");
    if (!match) return res.status(404).json({ success: false, msg: "Match not found" });

    const createdById = match.createdBy?._id?.toString() || match.createdBy?.toString();
    if (createdById !== req.user.toString()) {
      return res.status(403).json({ success: false, msg: "Only host can see votes" });
    }

    const tally = {};
    (match.motmVotes || []).forEach(v => {
      const nid = v.nominee?._id?.toString() || v.nominee?.toString();
      if (!tally[nid]) tally[nid] = { userId: nid, name: v.nominee?.name || "Unknown", votes: 0 };
      tally[nid].votes++;
    });

    const results = Object.values(tally).sort((a, b) => b.votes - a.votes);

    res.json({
      success: true,
      votes: results,
      totalVotes: (match.motmVotes || []).length,
      motmDeclared: match.motmDeclared,
      motmPlayer: match.motmPlayer
    });
  } catch (err) {
    next(err);
  }
});

// GET MY MOTM VOTE STATUS
router.get("/:id/motm/my-vote", auth, async (req, res, next) => {
  try {
    const Match = require("../models/Match");
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, msg: "Match not found" });

    const myVote = match.motmVotes?.find(v => v.voter?.toString() === req.user.toString());

    res.json({
      success: true,
      hasVoted: !!myVote,
      nomineeId: myVote?.nominee?.toString() || null,
      motmDeclared: match.motmDeclared,
      motmPlayer: match.motmPlayer
    });
  } catch (err) {
    next(err);
  }
});

// ✅ INVITE FRIENDS — with notification
router.post("/:id/invite", auth, async (req, res, next) => {
  try {
    const { friendIds } = req.body;
    if (!friendIds || !Array.isArray(friendIds) || friendIds.length === 0) {
      return res.status(400).json({ success: false, msg: "friendIds array required" });
    }

    const Match = require("../models/Match");
    const { createNotification } = require("../utils/notificationHelper");

    const match = await Match.findById(req.params.id).populate("createdBy", "name");
    if (!match) return res.status(404).json({ success: false, msg: "Match not found" });

    const createdById = match.createdBy?._id?.toString() || match.createdBy?.toString();
    if (createdById !== req.user.toString()) {
      return res.status(403).json({ success: false, msg: "Only host can send invites" });
    }

    const existingInviteIds = match.invites.map(inv => inv.user?.toString());
    const newInvites = friendIds
      .filter(fid => !existingInviteIds.includes(fid))
      .map(fid => ({ user: fid, status: "pending" }));

    match.invites.push(...newInvites);
    await match.save();

    const io = req.app.get("io");

    for (const inv of newInvites) {
      const invUserId = inv.user.toString();

      // Socket emit (existing InviteNotification component ke liye)
      io.to(invUserId).emit("match:invite", {
        matchId: match._id,
        sport: match.sport,
        location: match.location?.name,
        date: match.date,
        hostName: match.createdBy?.name || "Someone"
      });

      // ✅ Persistent notification
      await createNotification(io, {
        recipientId: invUserId,
        type: "match_invite",
        title: "Match Invite",
        message: `${match.createdBy?.name} invited you to play ${match.sport} at ${match.location?.name || "the venue"}`,
        senderId: req.user,
        matchId: match._id,
        actionUrl: `/match/${match._id}`
      });
    }

    res.json({ success: true, msg: `${newInvites.length} invite(s) sent!` });
  } catch (err) {
    next(err);
  }
});

// RESPOND TO INVITE
router.post("/:id/invite/respond", auth, async (req, res, next) => {
  try {
    const { response } = req.body;
    if (!["accepted", "declined"].includes(response)) {
      return res.status(400).json({ success: false, msg: "response must be 'accepted' or 'declined'" });
    }
    const Match = require("../models/Match");
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, msg: "Match not found" });

    const invite = match.invites.find(inv => inv.user?.toString() === req.user.toString());
    if (!invite) return res.status(404).json({ success: false, msg: "Invite not found" });

    invite.status = response;
    if (response === "accepted") {
      const alreadyJoined = match.players.some(
        p => (p.user?._id?.toString() || p.user?.toString()) === req.user.toString()
      );
      if (!alreadyJoined) match.players.push({ user: req.user, status: "pending" });
    }
    await match.save();

    res.json({
      success: true,
      msg: response === "accepted" ? "Match join request sent!" : "Invite declined"
    });
  } catch (err) {
    next(err);
  }
});

// GET MY PENDING INVITES
router.get("/invites/me", auth, async (req, res, next) => {
  try {
    const Match = require("../models/Match");
    const matches = await Match.find({
      "invites.user": req.user,
      "invites.status": "pending",
      status: { $ne: "completed" }
    })
      .populate("createdBy", "name")
      .select("sport location date maxPlayers players invites createdBy");

    const pending = matches.map(m => ({
      _id: m._id,
      sport: m.sport,
      location: m.location?.name,
      date: m.date,
      hostName: m.createdBy?.name,
      playersCount: m.players.filter(p => p.status === "approved").length,
      maxPlayers: m.maxPlayers
    }));

    res.json({ success: true, invites: pending });
  } catch (err) {
    next(err);
  }
});

// GET ALL
router.get("/", matchController.getAllMatches);

// NEARBY
router.get("/nearby/search", matchController.getNearbyMatches);

// GET SINGLE
router.get("/:id", matchController.getMatchById);

// DELETE with penalty
router.delete("/:id", auth, async (req, res, next) => {
  try {
    const Match = require("../models/Match");
    const User = require("../models/User");

    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, msg: "Match not found" });

    const createdById = match.createdBy?._id?.toString() || match.createdBy?.toString();
    if (createdById !== req.user.toString()) {
      return res.status(403).json({ success: false, msg: "Only the organizer can delete this match" });
    }

    const othersApproved = match.players.filter(p => {
      const pid = p.user?._id?.toString() || p.user?.toString();
      return p.status === "approved" && pid !== req.user.toString();
    }).length;

    if (othersApproved > 0) {
      await User.findByIdAndUpdate(req.user, { $inc: { reliabilityScore: -15 } });
    }

    await match.deleteOne();

    res.json({
      success: true,
      msg: othersApproved > 0
        ? "Match deleted. Your reliability score has been reduced."
        : "Match deleted successfully"
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;