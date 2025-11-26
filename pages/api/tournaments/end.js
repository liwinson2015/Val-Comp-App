// pages/api/tournaments/end.js

import { getCurrentPlayerFromReq } from "../../../lib/getCurrentPlayer";
import { connectToDatabase } from "../../../lib/mongodb";
import TournamentState from "../../../models/TournamentState";
import Registration from "../../../models/Registration";
import Player from "../../../models/Player";
import Tournament from "../../../models/Tournament";

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

    const endedAt = new Date();

    // -------------------------------------------------------------------
    // 0) Read bracket.ranking from Tournament so we know placements
    // -------------------------------------------------------------------
    const tournamentDoc = await Tournament.findOne({ tournamentId }).lean();
    const ranking = tournamentDoc?.bracket?.ranking || null;

    const placementByPlayerId = {};

    if (ranking) {
      const addPlacement = (ids, label) => {
        if (!ids) return;
        const arr = Array.isArray(ids) ? ids : [ids];
        arr.forEach((id) => {
          if (!id) return;
          const key = id.toString();
          // don't overwrite if already assigned a better placement
          if (!placementByPlayerId[key]) {
            placementByPlayerId[key] = label;
          }
        });
      };

      addPlacement(ranking.first, "1st");
      addPlacement(ranking.second, "2nd");
      addPlacement(ranking.third, "3rd");
      addPlacement(ranking.fourth, "4th");
      addPlacement(ranking.fiveToSix, "5th-6th");
      addPlacement(ranking.sevenToEight, "7th-8th");
      addPlacement(ranking.nineToTwelve, "9th-12th");
      addPlacement(ranking.thirteenToSixteen, "13th-16th");
    }

    // -------------------------------------------------------------------
    // 1) Update TournamentState: mark it completed and un-feature it
    // -------------------------------------------------------------------
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

    // -------------------------------------------------------------------
    // 2) Update all registrations for this tournament
    // -------------------------------------------------------------------
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

    // -------------------------------------------------------------------
    // 3) Move players' active registrations into tournamentHistory
    //    and attach placement if we know it from the bracket
    // -------------------------------------------------------------------
    const playersWithReg = await Player.find({
      "registeredFor.tournamentId": tournamentId,
    }).lean();

    if (playersWithReg.length > 0) {
      const bulkOps = playersWithReg
        .map((p) => {
          const activeRegs = (p.registeredFor || []).filter(
            (r) => r.tournamentId === tournamentId
          );

          if (!activeRegs.length) return null;

          const placementKey = p._id.toString();
          const placement = placementByPlayerId[placementKey] || "";

          const historyEntries = activeRegs.map((r) => ({
            tournamentId: r.tournamentId,
            ign: r.ign,
            fullIgn: r.fullIgn,
            rank: r.rank,
            placement, // ⭐ pulled from bracket.ranking (or "" if unknown)
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
    console.error("Error ending tournament:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
