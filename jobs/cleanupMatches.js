const Match = require("../models/Match");

const cleanupOldMatches = async () => {
  try {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Delete upcoming/ongoing matches older than 6 hours
    const oldMatches = await Match.deleteMany({
      date: { $lt: sixHoursAgo },
      status: { $ne: "completed" }
    });

    // ✅ Delete completed matches older than 24 hours
    const oldCompleted = await Match.deleteMany({
      status: "completed",
      updatedAt: { $lt: oneDayAgo }
    });

    if (oldMatches.deletedCount > 0) {
      console.log(`[Cleanup] Deleted ${oldMatches.deletedCount} old upcoming match(es)`);
    }
    if (oldCompleted.deletedCount > 0) {
      console.log(`[Cleanup] Deleted ${oldCompleted.deletedCount} completed match(es) older than 24hrs`);
    }
  } catch (err) {
    console.error("[Cleanup] Error:", err.message);
  }
};

module.exports = cleanupOldMatches;