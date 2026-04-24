const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Tournament = require("../models/Tournament");
const User = require("../models/User");

function getRoundName(roundNumber, totalRounds) {
  if (roundNumber === totalRounds) return "Final";
  if (roundNumber === totalRounds - 1) return "Semifinals";
  if (roundNumber === totalRounds - 2) return "Quarterfinals";
  return `Round ${roundNumber}`;
}

function generateFirstRound(teams, totalRounds) {
  const matches = [];
  for (let i = 0; i < teams.length; i += 2) {
    const teamA = teams[i];
    const teamB = teams[i + 1] || null;
    matches.push({
      teamA: teamA._id,
      teamAName: teamA.name,
      teamB: teamB ? teamB._id : null,
      teamBName: teamB ? teamB.name : "BYE",
      status: teamB ? "scheduled" : "completed",
      winner: teamB ? null : teamA._id,
      winnerName: teamB ? null : teamA.name
    });
  }
  return matches;
}

function totalRoundsNeeded(maxTeams) {
  return Math.log2(maxTeams);
}

// POST /api/tournaments
router.post("/", auth, async (req, res, next) => {
  try {
    const { name, sport, description, location, maxTeams, playersPerTeam, startDate } = req.body;

    if (!name || !sport || !location?.name || !location?.coordinates?.coordinates) {
      return res.status(400).json({ success: false, msg: "Name, sport, and location are required" });
    }
    if (!startDate || isNaN(new Date(startDate))) {
      return res.status(400).json({ success: false, msg: "Valid start date is required" });
    }
    if (![4, 8, 16].includes(Number(maxTeams))) {
      return res.status(400).json({ success: false, msg: "maxTeams must be 4, 8, or 16" });
    }

    const tournament = await Tournament.create({
      name: name.trim(),
      sport: sport.trim(),
      description: description?.trim() || "",
      location,
      maxTeams: Number(maxTeams),
      playersPerTeam: Number(playersPerTeam) || 5,
      startDate: new Date(startDate),
      createdBy: req.user,
      teams: [],
      rounds: []
    });

    res.status(201).json({ success: true, tournament });
  } catch (err) {
    next(err);
  }
});

// GET /api/tournaments
router.get("/", auth, async (req, res, next) => {
  try {
    const tournaments = await Tournament.find()
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });
    res.json({ success: true, tournaments });
  } catch (err) {
    next(err);
  }
});

// GET /api/tournaments/:id
router.get("/:id", auth, async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate("createdBy", "name")
      .populate("teams.captain", "name")
      .populate("teams.players", "name");

    if (!tournament) {
      return res.status(404).json({ success: false, msg: "Tournament not found" });
    }
    res.json({ success: true, tournament });
  } catch (err) {
    next(err);
  }
});

// POST /api/tournaments/:id/register
router.post("/:id/register", auth, async (req, res, next) => {
  try {
    const { teamName, playerIds } = req.body;

    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ success: false, msg: "Team name is required" });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ success: false, msg: "Tournament not found" });
    if (tournament.status !== "registration") return res.status(400).json({ success: false, msg: "Registration is closed" });
    if (tournament.teams.length >= tournament.maxTeams) return res.status(400).json({ success: false, msg: "Tournament is full" });

    const alreadyCaptain = tournament.teams.some(t => t.captain?.toString() === req.user.toString());
    if (alreadyCaptain) return res.status(400).json({ success: false, msg: "You already registered a team" });

    const nameTaken = tournament.teams.some(t => t.name.toLowerCase() === teamName.trim().toLowerCase());
    if (nameTaken) return res.status(400).json({ success: false, msg: "Team name already taken" });

    const players = [req.user, ...(playerIds || [])].slice(0, tournament.playersPerTeam);
    tournament.teams.push({ name: teamName.trim(), captain: req.user, players });
    await tournament.save();

    const updated = await Tournament.findById(tournament._id)
      .populate("createdBy", "name")
      .populate("teams.captain", "name")
      .populate("teams.players", "name");

    res.json({ success: true, msg: "Team registered!", tournament: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/tournaments/:id/start
router.post("/:id/start", auth, async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ success: false, msg: "Tournament not found" });
    if (tournament.createdBy.toString() !== req.user.toString()) return res.status(403).json({ success: false, msg: "Only the organizer can start the tournament" });
    if (tournament.status !== "registration") return res.status(400).json({ success: false, msg: "Tournament already started" });
    if (tournament.teams.length < 2) return res.status(400).json({ success: false, msg: "Need at least 2 teams to start" });

    const shuffled = [...tournament.teams].sort(() => Math.random() - 0.5);
    const total = totalRoundsNeeded(tournament.maxTeams);
    const firstRoundMatches = generateFirstRound(shuffled, total);

    const rounds = [{ roundNumber: 1, name: getRoundName(1, total), matches: firstRoundMatches }];

    let teamsInNextRound = Math.ceil(shuffled.length / 2);
    for (let r = 2; r <= total; r++) {
      const roundMatches = [];
      for (let m = 0; m < Math.ceil(teamsInNextRound / 2); m++) {
        roundMatches.push({
          teamA: null, teamAName: "TBD",
          teamB: null, teamBName: "TBD",
          status: "scheduled", winner: null, winnerName: null
        });
      }
      rounds.push({ roundNumber: r, name: getRoundName(r, total), matches: roundMatches });
      teamsInNextRound = Math.ceil(teamsInNextRound / 2);
    }

    tournament.rounds = rounds;
    tournament.status = "ongoing";
    await tournament.save();

    const updated = await Tournament.findById(tournament._id)
      .populate("createdBy", "name")
      .populate("teams.captain", "name");

    res.json({ success: true, msg: "Tournament started!", tournament: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/tournaments/:id/result
router.post("/:id/result", auth, async (req, res, next) => {
  try {
    const { roundNumber, matchIndex, winnerTeamId } = req.body;

    if (roundNumber === undefined || matchIndex === undefined || !winnerTeamId) {
      return res.status(400).json({ success: false, msg: "roundNumber, matchIndex, and winnerTeamId are required" });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ success: false, msg: "Tournament not found" });
    if (tournament.createdBy.toString() !== req.user.toString()) return res.status(403).json({ success: false, msg: "Only the organizer can declare results" });
    if (tournament.status !== "ongoing") return res.status(400).json({ success: false, msg: "Tournament is not ongoing" });

    const round = tournament.rounds.find(r => r.roundNumber === Number(roundNumber));
    if (!round) return res.status(404).json({ success: false, msg: "Round not found" });

    const match = round.matches[matchIndex];
    if (!match) return res.status(404).json({ success: false, msg: "Match not found" });
    if (match.status === "completed") return res.status(400).json({ success: false, msg: "Match already completed" });

    const winnerTeam = tournament.teams.find(t => t._id.toString() === winnerTeamId);
    if (!winnerTeam) return res.status(404).json({ success: false, msg: "Winner team not found" });

    match.winner = winnerTeam._id;
    match.winnerName = winnerTeam.name;
    match.status = "completed";

    const loserTeamId = match.teamA?.toString() === winnerTeamId
      ? match.teamB?.toString()
      : match.teamA?.toString();

    tournament.teams = tournament.teams.map(t => {
      if (t._id.toString() === winnerTeamId) return { ...t._doc, wins: (t.wins || 0) + 1 };
      if (t._id.toString() === loserTeamId) return { ...t._doc, losses: (t.losses || 0) + 1 };
      return t;
    });

    const nextRound = tournament.rounds.find(r => r.roundNumber === Number(roundNumber) + 1);
    if (nextRound) {
      const nextMatchIndex = Math.floor(matchIndex / 2);
      const nextMatch = nextRound.matches[nextMatchIndex];
      if (nextMatch) {
        if (matchIndex % 2 === 0) {
          nextMatch.teamA = winnerTeam._id;
          nextMatch.teamAName = winnerTeam.name;
        } else {
          nextMatch.teamB = winnerTeam._id;
          nextMatch.teamBName = winnerTeam.name;
        }
      }
    }

    const totalRounds = tournament.rounds.length;
    const currentRoundIsLast = Number(roundNumber) === totalRounds;
    const allMatchesInRoundDone = round.matches.every(m => m.status === "completed");

    if (currentRoundIsLast && allMatchesInRoundDone) {
      tournament.status = "completed";
      tournament.winner = winnerTeam._id;
      tournament.winnerName = winnerTeam.name;

      const winnerTeamFull = tournament.teams.find(t => t._id.toString() === winnerTeamId);
      if (winnerTeamFull) {
        const winnerPlayerIds = winnerTeamFull.players || [];
        await Promise.all(winnerPlayerIds.map(pid =>
          User.findByIdAndUpdate(pid, { $inc: { wins: 1, matchesPlayed: 1 } })
        ));
      }
    }

    tournament.markModified("rounds");
    tournament.markModified("teams");
    await tournament.save();

    const updated = await Tournament.findById(tournament._id)
      .populate("createdBy", "name")
      .populate("teams.captain", "name")
      .populate("teams.players", "name");

    res.json({ success: true, msg: "Result declared!", tournament: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/tournaments/:id/invite
router.post("/:id/invite", auth, async (req, res, next) => {
  try {
    const { friendIds } = req.body;
    if (!friendIds || !Array.isArray(friendIds) || friendIds.length === 0) {
      return res.status(400).json({ success: false, msg: "friendIds array required" });
    }

    const tournament = await Tournament.findById(req.params.id).populate("createdBy", "name");
    if (!tournament) return res.status(404).json({ success: false, msg: "Tournament not found" });

    const existingIds = tournament.invites.map(inv => inv.user?.toString());
    const newInvites = friendIds
      .filter(fid => !existingIds.includes(fid))
      .map(fid => ({ user: fid, status: "pending" }));

    tournament.invites.push(...newInvites);
    await tournament.save();

    const io = req.app.get("io");
    if (io) {
      newInvites.forEach(inv => {
        io.to(inv.user.toString()).emit("tournament:invite", {
          tournamentId: tournament._id,
          name: tournament.name,
          sport: tournament.sport,
          hostName: tournament.createdBy?.name || "Someone"
        });
      });
    }

    res.json({ success: true, msg: `${newInvites.length} invite(s) sent!` });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tournaments/:id
router.delete("/:id", auth, async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ success: false, msg: "Tournament not found" });
    if (tournament.createdBy.toString() !== req.user.toString()) return res.status(403).json({ success: false, msg: "Only the organizer can delete" });
    await tournament.deleteOne();
    res.json({ success: true, msg: "Tournament deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;