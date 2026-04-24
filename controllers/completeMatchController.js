const Match = require("../models/Match");
const User = require("../models/User");
const Activity = require("../models/Activity");
const { checkAndAwardBadges } = require("../utils/badgeEngine");

function calculateElo(playerRating, opponentRating, won) {
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const score = won ? 1 : 0;
  return Math.round(playerRating + K * (score - expected));
}

exports.completeMatch = async (req, res, next) => {
  try {
    const { winnerTeam } = req.body;

    if (!winnerTeam || !["A", "B"].includes(winnerTeam)) {
      return res.status(400).json({ success: false, msg: "winnerTeam must be 'A' or 'B'" });
    }

    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, msg: "Match not found" });

    const createdById = match.createdBy?._id?.toString() || match.createdBy?.toString();
    if (createdById !== req.user.toString()) {
      return res.status(403).json({ success: false, msg: "Only the organizer can complete the match" });
    }
    if (match.status === "completed") {
      return res.status(400).json({ success: false, msg: "Match is already completed" });
    }

    const approvedPlayers = match.players.filter(p => p.status === "approved");
    if (approvedPlayers.length < 2) {
      return res.status(400).json({ success: false, msg: "Need at least 2 approved players to complete a match" });
    }

    match.winnerTeam = winnerTeam;
    match.isCompleted = true;
    match.status = "completed";
    await match.save();

    const loserTeam = winnerTeam === "A" ? "B" : "A";
    const teamAPlayers = approvedPlayers.filter(p => p.team === "A");
    const teamBPlayers = approvedPlayers.filter(p => p.team === "B");

    const getAvgElo = async (playerList) => {
      const users = await Promise.all(
        playerList.map(p => User.findById(p.user?._id || p.user).select("rating"))
      );
      const ratings = users.filter(Boolean).map(u => u.rating || 1000);
      return ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 1000;
    };

    const avgEloA = await getAvgElo(teamAPlayers);
    const avgEloB = await getAvgElo(teamBPlayers);

    // Update stats + ELO + consecutive wins
    const statUpdates = approvedPlayers.map(async p => {
      const uid = p.user?._id?.toString() || p.user?.toString();
      const isWinner = p.team === winnerTeam;
      const isLoser = p.team === loserTeam;
      const oppTeamAvgElo = p.team === "A" ? avgEloB : avgEloA;

      const user = await User.findById(uid).select("rating consecutiveWins");
      if (!user) return;

      const newElo = calculateElo(user.rating || 1000, oppTeamAvgElo, isWinner);
      const newConsecutiveWins = isWinner ? (user.consecutiveWins || 0) + 1 : 0;

      await User.findByIdAndUpdate(uid, {
        $inc: {
          matchesPlayed: 1,
          ...(isWinner && { wins: 1 }),
          ...(isLoser && { losses: 1 }),
          reliabilityScore: 5
        },
        $set: {
          rating: newElo,
          consecutiveWins: newConsecutiveWins
        }
      });

      // Check badges after stats update
      await checkAndAwardBadges(uid, { isWinner });
    });

    await Promise.all(statUpdates);

    await Activity.create({
      actor: req.user,
      type: "match_completed",
      match: match._id,
      sport: match.sport,
      winnerTeam
    });

    const populated = await Match.findById(match._id)
      .populate("players.user", "name email")
      .populate("createdBy", "name email");

    res.json({
      success: true,
      msg: `Match completed! Team ${winnerTeam} wins!`,
      match: populated
    });
  } catch (err) {
    next(err);
  }
};