// pages/api/tournaments/reopen.js

import { getCurrentPlayerFromReq } from "../../../lib/getCurrentPlayer";
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

    if (!player.isAdmin) {
      return res
        .status(403)
        .json({ ok: false, error: "Admin access required" });
    }

    const { tournamentId } = req.body || {};
    if (!tournamentId || typeof tournamentId !== "string") {
      return res
        .status(400)
        .json({ ok: false, error: "tournamentId is required" });
    }

    await connectToDatabase();

    // 1) Set TournamentState back to ongoing
    const doc = await TournamentState.findOneAndUpdate(
      { tournamentId },
      {
        $set: {
          tournamentId,
          status: "ongoing",
          isFeatured: false, // up to you, keep false on reopen
        },
        $unset: {
          endedAt: "",
          endedBy: "",
        },
      },
      { upsert: true, new: true }
    ).lean();

    // 2) Set registrations back to active
    await Registration.updateMany(
      {
        $or: [
          { tournament: tournamentId },
          { tournamentId: tournamentId },
        ],
      },
      {
        $set: {
          status: "active",
        },
        $unset: {
          completedAt: "",
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
    console.error("Error reopening tournament:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
