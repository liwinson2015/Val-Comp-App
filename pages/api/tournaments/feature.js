// pages/api/tournaments/feature.js

import { getCurrentPlayerFromReq } from "../../../lib/getCurrentPlayerFromReq";
import { connectToDatabase } from "../../../lib/mongodb";
import TournamentState from "../../../models/TournamentState";

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
      return res.status(403).json({ ok: false, error: "Admin access required" });
    }

    const { tournamentId } = req.body || {};
    if (!tournamentId || typeof tournamentId !== "string") {
      return res
        .status(400)
        .json({ ok: false, error: "tournamentId is required" });
    }

    await connectToDatabase();

    // Clear any existing featured tournaments
    await TournamentState.updateMany(
      { isFeatured: true },
      { $set: { isFeatured: false } }
    );

    // Set this one as featured (create state doc if needed)
    const doc = await TournamentState.findOneAndUpdate(
      { tournamentId },
      {
        $set: {
          tournamentId,
          isFeatured: true,
          featuredAt: new Date(),
        },
      },
      { upsert: true, new: true }
    ).lean();

    return res.status(200).json({
      ok: true,
      state: {
        ...doc,
        _id: doc._id.toString(),
      },
    });
  } catch (err) {
    console.error("Error featuring tournament:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
