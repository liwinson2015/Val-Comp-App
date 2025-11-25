// pages/api/tournaments/feature.js

import { getCurrentPlayerFromReq } from "../../../lib/getCurrentPlayer";
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
      return res
        .status(403)
        .json({ ok: false, error: "Admin access required" });
    }

    const { tournamentId, isFeatured } = req.body || {};

    if (!tournamentId || typeof tournamentId !== "string") {
      return res
        .status(400)
        .json({ ok: false, error: "tournamentId is required" });
    }

    if (typeof isFeatured !== "boolean") {
      return res
        .status(400)
        .json({ ok: false, error: "isFeatured boolean is required" });
    }

    await connectToDatabase();

    if (isFeatured) {
      // If we're setting this one as featured:
      // 1) Un-feature everyone else
      await TournamentState.updateMany(
        { tournamentId: { $ne: tournamentId } },
        { $set: { isFeatured: false } }
      );

      // 2) Upsert this one as featured
      const doc = await TournamentState.findOneAndUpdate(
        { tournamentId },
        {
          $set: {
            tournamentId,
            isFeatured: true,
          },
        },
        { upsert: true, new: true }
      ).lean();

      return res.status(200).json({
        ok: true,
        isFeatured: true,
        state: { ...doc, _id: doc._id.toString() },
      });
    } else {
      // Just un-feature this tournament
      const doc = await TournamentState.findOneAndUpdate(
        { tournamentId },
        {
          $set: {
            tournamentId,
            isFeatured: false,
          },
        },
        { upsert: true, new: true }
      ).lean();

      return res.status(200).json({
        ok: true,
        isFeatured: false,
        state: { ...doc, _id: doc._id.toString() },
      });
    }
  } catch (err) {
    console.error("Error updating featured tournament:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
