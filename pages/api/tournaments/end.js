// pages/api/tournaments/end.js

import { getCurrentPlayerFromReq } from "../../../lib/getCurrentPlayer";
import { connectToDatabase } from "../../../lib/mongodb";
import TournamentState from "../../../models/TournamentState";
import Registration from "../../../models/Registration";
import Player from "../../../models/Player";

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
    const endedAt = new Date();
    const update = {
      tournamentId,
      status: "completed",
      isFeatured: false,
      endedAt,
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
        $or: [{ tournament: tournamentId }, { tournamentId: tournamentId }],
      },
      {
        $set: {
          status: "completed",
          completedAt: endedAt,
          // Keep tournamentId in sync going forward
          tournamentId: tournamentId,
        },
      }
    );

    // 3) Move players' active registrations into tournamentHistory
    //    - copy matching registeredFor entries
    //    - remove them from registeredFor
    const playersWithReg = await Player.find({
      "registeredFor.tournamentId": tournamentId,
    }).lean();

    if (playersWithReg.length > 0) {
      const bulkOps = playersWithReg.map((p) => {
        const activeRegs = (p.registeredFor || []).filter(
          (r) => r.tournamentId === tournamentId
        );

        if (!activeRegs.length) return null;

        const historyEntries = activeRegs.map((r) => ({
          tournamentId: r.tournamentId,
          ign: r.ign,
          fullIgn: r.fullIgn,
          rank: r.rank,
          // placement can be filled later from bracket ranking if you want
          placement: "",
          endedAt,
        }));

        return {
          updateOne: {
            filter: { _id: p._id },
            update: {
              // remove from active registrations
              $pull: { registeredFor: { tournamentId } },
              // add to history
              $push: {
                tournamentHistory: { $each: historyEntries },
              },
            },
          },
        };
      }).filter(Boolean);

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
    console.error("Error ending tournament:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
