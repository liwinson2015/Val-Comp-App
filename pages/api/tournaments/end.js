// pages/api/tournaments/end.js

import { getCurrentPlayerFromReq } from "../../../lib/getCurrentPlayerFromReq"; // or ../getCurrentPlayer if that's your file
import { connectToDatabase } from "../../../lib/mongodb";
import TournamentState from "../../../models/TournamentState";
import Registration from "../../../models/Registration";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const player = await getCurrentPlayerFromReq(req);
    if (!player) {
      return res.status(401).json({ ok: false, error: "Not logged in" });
    }

    // 🔐 Admin-only
    if (!player.isAdmin) {
      return res
        .status(403)
        .json({ ok: false, error: "Admin access required" });
    }

    const { tournamentId, winnerTeamId } = req.body || {};

    if (!tournamentId || typeof tournamentId !== "string") {
      return res
        .status(400)
        .json({ ok: false, error: "tournamentId is required" });
    }

    await connectToDatabase();

    // 1) Update TournamentState: mark it completed and un-feature it
    const update = {
      tournamentId,
      status: "completed",
      isFeatured: false,
      endedAt: new Date(),
      endedBy: player._id,
    };

    if (winnerTeamId && typeof winnerTeamId === "string") {
      update.winnerTeamId = winnerTeamId;
    }

    const doc = await TournamentState.findOneAndUpdate(
      { tournamentId },
      { $set: update },
      { upsert: true, new: true }
    ).lean();

    // 2) Update all registrations for this tournament
    // Your Registration model uses `tournament` but we also allow `tournamentId`
    await Registration.updateMany(
      {
        $or: [
          { tournament: tournamentId },
          { tournamentId: tournamentId },
        ],
      },
      {
        $set: {
          status: "completed",
          completedAt: new Date(),
          // Keep tournamentId in sync going forward
          tournamentId: tournamentId,
        },
      }
    );

    return res.status(200).json({
      ok: true,
      state: {
        ...doc,
        _id: doc._id.toString(),
      },
    });
  } catch (err) {
    console.error("Error ending tournament:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
