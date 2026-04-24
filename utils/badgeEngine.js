const User = require("../models/User");

const BADGES = {
  // ── Universal ─────────────────────────────────────────
  FIRST_MATCH:    { id: "first_match",    name: "First Step",      emoji: "🏃", description: "Played your first match",              sport: null },
  FIRST_WIN:      { id: "first_win",      name: "First Win",       emoji: "🥇", description: "Won your first match",                 sport: null },
  FIRST_MOTM:     { id: "first_motm",     name: "Rising Star",     emoji: "⭐", description: "Won Man of the Match first time",      sport: null },
  WINS_5:         { id: "wins_5",         name: "On a Roll",       emoji: "🔥", description: "Won 5 matches",                        sport: null },
  WINS_10:        { id: "wins_10",        name: "Sharp Shooter",   emoji: "🎯", description: "Won 10 matches",                       sport: null },
  WINS_25:        { id: "wins_25",        name: "Veteran",         emoji: "⚔️", description: "Won 25 matches",                       sport: null },
  WINS_50:        { id: "wins_50",        name: "Legend",          emoji: "👑", description: "Won 50 matches",                       sport: null },
  PLAYED_10:      { id: "played_10",      name: "Regular",         emoji: "📅", description: "Played 10 matches",                    sport: null },
  PLAYED_50:      { id: "played_50",      name: "Dedicated",       emoji: "💪", description: "Played 50 matches",                    sport: null },
  PLAYED_100:     { id: "played_100",     name: "Century",         emoji: "💯", description: "Played 100 matches",                   sport: null },
  HAT_TRICK:      { id: "hat_trick",      name: "Hat-trick",       emoji: "🎩", description: "Won 3 matches in a row",               sport: null },
  UNSTOPPABLE:    { id: "unstoppable",    name: "Unstoppable",     emoji: "⚡", description: "Won 5 matches in a row",               sport: null },
  MOTM_3:         { id: "motm_3",         name: "Match Winner",    emoji: "🌟", description: "Won MoTM 3 times",                     sport: null },
  MOTM_10:        { id: "motm_10",        name: "MoTM Legend",     emoji: "👑", description: "Won MoTM 10 times",                    sport: null },
  MOTM_HAT_TRICK: { id: "motm_hat_trick", name: "Hat-trick Hero",  emoji: "🏆", description: "Won MoTM 3 times in a row",            sport: null },
  RELIABLE:       { id: "reliable",       name: "Mr. Reliable",    emoji: "🛡️", description: "Reliability score above 90",           sport: null },
  GOOD_SPORT:     { id: "good_sport",     name: "Good Sport",      emoji: "🤝", description: "5-star sportsmanship rating",          sport: null },
  FAIR_PLAY:      { id: "fair_play",      name: "Fair Play",       emoji: "🎖️", description: "4+ sportsmanship for 10 ratings",      sport: null },

  // ── Cricket ───────────────────────────────────────────
  CRICKET_FIRST:      { id: "cricket_first",      name: "Cricket Debut",    emoji: "🏏", description: "Played first cricket match",          sport: "Cricket" },
  CRICKET_FIFTY:      { id: "cricket_fifty",       name: "Half Century",     emoji: "5️⃣0️⃣", description: "Scored 50+ runs in a match",          sport: "Cricket" },
  CRICKET_CENTURY:    { id: "cricket_century",     name: "Centurion",        emoji: "💯", description: "Scored 100+ runs in a match",         sport: "Cricket" },
  CRICKET_WICKET:     { id: "cricket_wicket",      name: "Wicket Taker",     emoji: "🎳", description: "Took first wicket",                   sport: "Cricket" },
  CRICKET_FIVE_WKT:   { id: "cricket_five_wkt",    name: "Five-for",         emoji: "🌀", description: "5 wickets in a single match",          sport: "Cricket" },
  CRICKET_ALL_ROUND:  { id: "cricket_all_round",   name: "All-rounder",      emoji: "⚡", description: "30+ runs and 2+ wickets in one match", sport: "Cricket" },
  CRICKET_MOTM_5:     { id: "cricket_motm_5",      name: "Cricket Star",     emoji: "🌟", description: "Won MoTM 5 times in Cricket",          sport: "Cricket" },
  CRICKET_500_RUNS:   { id: "cricket_500_runs",    name: "Run Machine",      emoji: "🔱", description: "500 career runs in Cricket",           sport: "Cricket" },
  CRICKET_50_WICKETS: { id: "cricket_50_wickets",  name: "Bowling Legend",   emoji: "🏆", description: "50 career wickets in Cricket",         sport: "Cricket" },

  // ── Football ──────────────────────────────────────────
  FOOTBALL_FIRST:      { id: "football_first",      name: "Football Debut",   emoji: "⚽", description: "Played first football match",         sport: "Football" },
  FOOTBALL_FIRST_GOAL: { id: "football_first_goal", name: "First Goal",       emoji: "🥅", description: "Scored first goal",                   sport: "Football" },
  FOOTBALL_HAT_TRICK:  { id: "football_hat_trick",  name: "Hat-trick",        emoji: "🎩", description: "3 goals in one match",                 sport: "Football" },
  FOOTBALL_ASSIST_5:   { id: "football_assist_5",   name: "Playmaker",        emoji: "🅰️", description: "5 career assists in Football",         sport: "Football" },
  FOOTBALL_CLEAN_SHEET:{ id: "football_clean_sheet","name": "Clean Sheet",    emoji: "🧤", description: "Goalkeeper — no goals conceded",       sport: "Football" },
  FOOTBALL_GOALS_20:   { id: "football_goals_20",   name: "Golden Boot",      emoji: "👟", description: "20 career goals in Football",          sport: "Football" },
  FOOTBALL_MOTM_5:     { id: "football_motm_5",     name: "Football Star",    emoji: "🌟", description: "Won MoTM 5 times in Football",         sport: "Football" },

  // ── Basketball ────────────────────────────────────────
  BASKETBALL_FIRST:       { id: "basketball_first",       name: "Baller Debut",    emoji: "🏀", description: "Played first basketball match",       sport: "Basketball" },
  BASKETBALL_FIRST_POINT: { id: "basketball_first_point", name: "First Bucket",    emoji: "🎯", description: "Scored first point",                  sport: "Basketball" },
  BASKETBALL_DOUBLE_DBL:  { id: "basketball_double_dbl",  name: "Double Double",   emoji: "💫", description: "10+ pts and 10+ reb in one match",     sport: "Basketball" },
  BASKETBALL_3PT_5:       { id: "basketball_3pt_5",       name: "Sharpshooter",    emoji: "🎯", description: "5 three-pointers in career",           sport: "Basketball" },
  BASKETBALL_POINTS_100:  { id: "basketball_points_100",  name: "Scorer",          emoji: "💯", description: "100 career points in Basketball",      sport: "Basketball" },
  BASKETBALL_MOTM_5:      { id: "basketball_motm_5",      name: "Basketball Star", emoji: "🌟", description: "Won MoTM 5 times in Basketball",       sport: "Basketball" },

  // ── Badminton ─────────────────────────────────────────
  BADMINTON_FIRST:      { id: "badminton_first",      name: "Shuttle Debut",   emoji: "🏸", description: "Played first badminton match",         sport: "Badminton" },
  BADMINTON_STRAIGHT:   { id: "badminton_straight",   name: "Dominator",       emoji: "💪", description: "Won match without dropping a set",     sport: "Badminton" },
  BADMINTON_COMEBACK:   { id: "badminton_comeback",   name: "Comeback King",   emoji: "👑", description: "Won after losing first set",            sport: "Badminton" },
  BADMINTON_MOTM_5:     { id: "badminton_motm_5",     name: "Badminton Star",  emoji: "🌟", description: "Won MoTM 5 times in Badminton",         sport: "Badminton" },

  // ── Volleyball ────────────────────────────────────────
  VOLLEYBALL_FIRST:   { id: "volleyball_first",   name: "Setter Debut",    emoji: "🏐", description: "Played first volleyball match",        sport: "Volleyball" },
  VOLLEYBALL_ACE_5:   { id: "volleyball_ace_5",   name: "Ace Server",      emoji: "🎯", description: "5 career aces in Volleyball",          sport: "Volleyball" },
  VOLLEYBALL_BLOCK_5: { id: "volleyball_block_5", name: "Wall",            emoji: "🧱", description: "5 career blocks in Volleyball",        sport: "Volleyball" },
  VOLLEYBALL_MOTM_5:  { id: "volleyball_motm_5",  name: "Volleyball Star", emoji: "🌟", description: "Won MoTM 5 times in Volleyball",       sport: "Volleyball" },

  // ── Kabaddi ───────────────────────────────────────────
  KABADDI_FIRST:       { id: "kabaddi_first",       name: "Raider Debut",   emoji: "🤼", description: "Played first kabaddi match",            sport: "Kabaddi" },
  KABADDI_SUPER_RAID:  { id: "kabaddi_super_raid",  name: "Super Raider",   emoji: "⚡", description: "3+ raid points in a single raid",       sport: "Kabaddi" },
  KABADDI_RAIDS_50:    { id: "kabaddi_raids_50",    name: "Raid Master",    emoji: "🏆", description: "50 career raid points in Kabaddi",      sport: "Kabaddi" },
  KABADDI_MOTM_5:      { id: "kabaddi_motm_5",      name: "Kabaddi Star",   emoji: "🌟", description: "Won MoTM 5 times in Kabaddi",           sport: "Kabaddi" },

  // ── Hockey ────────────────────────────────────────────
  HOCKEY_FIRST:    { id: "hockey_first",    name: "Hockey Debut",   emoji: "🏑", description: "Played first hockey match",             sport: "Hockey" },
  HOCKEY_GOALS_10: { id: "hockey_goals_10", name: "Goal Machine",   emoji: "🥅", description: "10 career goals in Hockey",             sport: "Hockey" },
  HOCKEY_MOTM_5:   { id: "hockey_motm_5",   name: "Hockey Star",    emoji: "🌟", description: "Won MoTM 5 times in Hockey",            sport: "Hockey" },

  // ── Tennis / Table Tennis ─────────────────────────────
  TENNIS_FIRST:    { id: "tennis_first",    name: "Tennis Debut",   emoji: "🎾", description: "Played first tennis match",             sport: "Tennis" },
  TENNIS_STRAIGHT: { id: "tennis_straight", name: "Straight Sets",  emoji: "💪", description: "Won match in straight sets",            sport: "Tennis" },
  TENNIS_COMEBACK: { id: "tennis_comeback", name: "Comeback King",  emoji: "👑", description: "Won after losing first set",            sport: "Tennis" },
  TENNIS_MOTM_5:   { id: "tennis_motm_5",   name: "Tennis Star",    emoji: "🌟", description: "Won MoTM 5 times in Tennis",            sport: "Tennis" },

  TT_FIRST:    { id: "tt_first",    name: "TT Debut",        emoji: "🏓", description: "Played first table tennis match",       sport: "Table Tennis" },
  TT_STRAIGHT: { id: "tt_straight", name: "Clean Sweep",     emoji: "💪", description: "Won match without dropping a set",     sport: "Table Tennis" },
  TT_MOTM_5:   { id: "tt_motm_5",   name: "TT Star",         emoji: "🌟", description: "Won MoTM 5 times in Table Tennis",     sport: "Table Tennis" }
};

function hasBadge(user, badgeId) {
  return user.badges?.some(b => b.id === badgeId);
}

async function awardBadge(userId, badge) {
  const user = await User.findById(userId);
  if (!user || hasBadge(user, badge.id)) return null;

  await User.findByIdAndUpdate(userId, {
    $push: {
      badges: {
        id: badge.id,
        name: badge.name,
        emoji: badge.emoji,
        description: badge.description,
        sport: badge.sport || null,
        earnedAt: new Date()
      }
    }
  });
  return badge;
}

// Helper — get or create sport stats entry for a user
async function getSportStats(userId, sport) {
  const user = await User.findById(userId).select("sportStats");
  if (!user) return null;
  return user.sportStats?.find(s => s.sport.toLowerCase() === sport.toLowerCase()) || null;
}

// ✅ Universal badge check
async function checkAndAwardBadges(userId, { isWinner, isMotm = false } = {}) {
  const user = await User.findById(userId);
  if (!user) return [];
  const awarded = [];

  const tryAward = async (badge) => {
    const b = await awardBadge(userId, badge);
    if (b) awarded.push(b);
  };

  if (user.matchesPlayed >= 1)  await tryAward(BADGES.FIRST_MATCH);
  if (user.wins >= 1)           await tryAward(BADGES.FIRST_WIN);
  if (user.wins >= 5)           await tryAward(BADGES.WINS_5);
  if (user.wins >= 10)          await tryAward(BADGES.WINS_10);
  if (user.wins >= 25)          await tryAward(BADGES.WINS_25);
  if (user.wins >= 50)          await tryAward(BADGES.WINS_50);
  if (user.matchesPlayed >= 10) await tryAward(BADGES.PLAYED_10);
  if (user.matchesPlayed >= 50) await tryAward(BADGES.PLAYED_50);
  if (user.matchesPlayed >= 100)await tryAward(BADGES.PLAYED_100);
  if (user.consecutiveWins >= 3)await tryAward(BADGES.HAT_TRICK);
  if (user.consecutiveWins >= 5)await tryAward(BADGES.UNSTOPPABLE);
  if (user.motmCount >= 1)      await tryAward(BADGES.FIRST_MOTM);
  if (user.motmCount >= 3)      await tryAward(BADGES.MOTM_3);
  if (user.motmCount >= 10)     await tryAward(BADGES.MOTM_10);
  if (user.consecutiveMotm >= 3)await tryAward(BADGES.MOTM_HAT_TRICK);
  if (user.reliabilityScore >= 90) await tryAward(BADGES.RELIABLE);
  if (user.sportsmanshipScore >= 5 && user.sportsmanshipCount >= 1) await tryAward(BADGES.GOOD_SPORT);
  if (user.sportsmanshipScore >= 4 && user.sportsmanshipCount >= 10) await tryAward(BADGES.FAIR_PLAY);

  return awarded;
}

// ✅ Sport-specific badge check — called after stats submission
async function checkSportBadges(userId, sport, stats) {
  const user = await User.findById(userId);
  if (!user) return [];
  const awarded = [];
  const s = sport.toLowerCase();

  const tryAward = async (badge) => {
    const b = await awardBadge(userId, badge);
    if (b) awarded.push(b);
  };

  // Get career sport stats
  const careerStats = user.sportStats?.find(st => st.sport.toLowerCase() === s) || {};

  if (s === "cricket") {
    await tryAward(BADGES.CRICKET_FIRST);
    if (stats.runs >= 50)  await tryAward(BADGES.CRICKET_FIFTY);
    if (stats.runs >= 100) await tryAward(BADGES.CRICKET_CENTURY);
    if (stats.wickets >= 1) await tryAward(BADGES.CRICKET_WICKET);
    if (stats.wickets >= 5) await tryAward(BADGES.CRICKET_FIVE_WKT);
    if (stats.runs >= 30 && stats.wickets >= 2) await tryAward(BADGES.CRICKET_ALL_ROUND);
    if ((careerStats.totalRuns || 0) >= 500)    await tryAward(BADGES.CRICKET_500_RUNS);
    if ((careerStats.totalWickets || 0) >= 50)  await tryAward(BADGES.CRICKET_50_WICKETS);
    if ((careerStats.motmCount || 0) >= 5)      await tryAward(BADGES.CRICKET_MOTM_5);
  }

  if (s === "football") {
    await tryAward(BADGES.FOOTBALL_FIRST);
    if (stats.goals >= 1)  await tryAward(BADGES.FOOTBALL_FIRST_GOAL);
    if (stats.goals >= 3)  await tryAward(BADGES.FOOTBALL_HAT_TRICK);
    if (stats.cleanSheet)  await tryAward(BADGES.FOOTBALL_CLEAN_SHEET);
    if ((careerStats.totalAssists || 0) >= 5)  await tryAward(BADGES.FOOTBALL_ASSIST_5);
    if ((careerStats.totalGoals || 0) >= 20)   await tryAward(BADGES.FOOTBALL_GOALS_20);
    if ((careerStats.motmCount || 0) >= 5)     await tryAward(BADGES.FOOTBALL_MOTM_5);
  }

  if (s === "basketball") {
    await tryAward(BADGES.BASKETBALL_FIRST);
    if (stats.points >= 1) await tryAward(BADGES.BASKETBALL_FIRST_POINT);
    if (stats.points >= 10 && stats.rebounds >= 10) await tryAward(BADGES.BASKETBALL_DOUBLE_DBL);
    if ((careerStats.threePointers || 0) >= 5)  await tryAward(BADGES.BASKETBALL_3PT_5);
    if ((careerStats.totalPoints || 0) >= 100)  await tryAward(BADGES.BASKETBALL_POINTS_100);
    if ((careerStats.motmCount || 0) >= 5)      await tryAward(BADGES.BASKETBALL_MOTM_5);
  }

  if (s === "badminton") {
    await tryAward(BADGES.BADMINTON_FIRST);
    if (stats.setsLost === 0 && stats.setsWon >= 2) await tryAward(BADGES.BADMINTON_STRAIGHT);
    if (stats.comebackWin)                           await tryAward(BADGES.BADMINTON_COMEBACK);
    if ((careerStats.motmCount || 0) >= 5)           await tryAward(BADGES.BADMINTON_MOTM_5);
  }

  if (s === "volleyball") {
    await tryAward(BADGES.VOLLEYBALL_FIRST);
    if ((careerStats.totalAces || 0) >= 5)   await tryAward(BADGES.VOLLEYBALL_ACE_5);
    if ((careerStats.totalBlocks || 0) >= 5) await tryAward(BADGES.VOLLEYBALL_BLOCK_5);
    if ((careerStats.motmCount || 0) >= 5)   await tryAward(BADGES.VOLLEYBALL_MOTM_5);
  }

  if (s === "kabaddi") {
    await tryAward(BADGES.KABADDI_FIRST);
    if (stats.raidPoints >= 3)                     await tryAward(BADGES.KABADDI_SUPER_RAID);
    if ((careerStats.totalRaids || 0) >= 50)        await tryAward(BADGES.KABADDI_RAIDS_50);
    if ((careerStats.motmCount || 0) >= 5)          await tryAward(BADGES.KABADDI_MOTM_5);
  }

  if (s === "hockey") {
    await tryAward(BADGES.HOCKEY_FIRST);
    if ((careerStats.totalGoalsHockey || 0) >= 10) await tryAward(BADGES.HOCKEY_GOALS_10);
    if ((careerStats.motmCount || 0) >= 5)         await tryAward(BADGES.HOCKEY_MOTM_5);
  }

  if (s === "tennis") {
    await tryAward(BADGES.TENNIS_FIRST);
    if (stats.setsLost === 0 && stats.setsWon >= 2) await tryAward(BADGES.TENNIS_STRAIGHT);
    if (stats.comebackWin)                           await tryAward(BADGES.TENNIS_COMEBACK);
    if ((careerStats.motmCount || 0) >= 5)           await tryAward(BADGES.TENNIS_MOTM_5);
  }

  if (s === "table tennis") {
    await tryAward(BADGES.TT_FIRST);
    if (stats.setsLost === 0 && stats.setsWon >= 2) await tryAward(BADGES.TT_STRAIGHT);
    if ((careerStats.motmCount || 0) >= 5)           await tryAward(BADGES.TT_MOTM_5);
  }

  return awarded;
}

module.exports = { checkAndAwardBadges, checkSportBadges, BADGES, awardBadge };