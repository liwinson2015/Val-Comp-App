// pages/api/tournaments/reopen.js

import { getCurrentPlayerFromReq } from "../../../lib/getCurrentPlayer";
import { connectToDatabase } from "../../../lib/mongodb";
import TournamentState from "../../../models/TournamentState";
import Registration from "../../../models/Registration";
import Player from "../../../models/Player";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  try {
    const player = await getCurrentPlayerFromReq(req);
    if (!player) {
      return res
        .status(401)
        .json({ ok: false, error: "Not logged in" });
    }

    // 🔐 Admin-only
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
          isFeatured: false, // we keep it unfeatured on reopen; you can flip manually
        },
        $unset: {
          endedAt: "",
          endedBy: "",
          winnerTeamId: "",
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

    // 3) Move players' history entries BACK into registeredFor
    //    - find players with tournamentHistory.tournamentId === tournamentId
    //    - for each, build new registeredFor entries from history
    //    - remove those entries from tournamentHistory
    const playersWithHistory = await Player.find({
      "tournamentHistory.tournamentId": tournamentId,
    }).lean();

    if (playersWithHistory.length > 0) {
      const bulkOps = playersWithHistory
        .map((p) => {
          const history = Array.isArray(p.tournamentHistory)
            ? p.tournamentHistory
            : [];

          // Only the entries for this tournament
          const histEntries = history.filter(
            (h) => h.tournamentId === tournamentId
          );

          if (!histEntries.length) return null;

          // If player somehow already has an active registration
          // for this tournament, we’ll skip adding duplicates.
          const activeRegs = Array.isArray(p.registeredFor)
            ? p.registeredFor
            : [];

          const alreadyHasActive = activeRegs.some(
            (r) => r.tournamentId === tournamentId
          );

          if (alreadyHasActive) {
            // Just remove these history entries, don't re-add
            return {
              updateOne: {
                filter: { _id: p._id },
                update: {
                  $pull: {
                    tournamentHistory: { tournamentId },
                  },
                },
              },
            };
          }

          // Build registeredFor entries from history
          const newRegs = histEntries.map((h) => ({
            tournamentId: h.tournamentId,
            ign: h.ign,
            fullIgn: h.fullIgn,
            rank: h.rank,
            // createdAt is rehydrated; we can use endedAt or "now"
            createdAt: h.endedAt || new Date(),
          }));

          return {
            updateOne: {
              filter: { _id: p._id },
              update: {
                // remove from history
                $pull: { tournamentHistory: { tournamentId } },
                // add back to active registrations
                $push: {
                  registeredFor: { $each: newRegs },
                },
              },
            },
          };
        })
        .filter(Boolean);

      if (bulkOps.length > 0) {
        await Player.bulkWrite(bulkOps);
      }
    }

    return res.status(200).json({
      ok: true,
      state: doc
        ? {
            ...doc,
            _id: doc._id.toString(),
          }
        : null,
    });
  } catch (err) {
    console.error("Error reopening tournament:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
