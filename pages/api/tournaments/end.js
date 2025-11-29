// pages/api/tournaments/end.js

import { getCurrentPlayerFromReq } from "../../../lib/getCurrentPlayer";
import { connectToDatabase } from "../../../lib/mongodb";
import TournamentState from "../../../models/TournamentState";
import Registration from "../../../models/Registration"; // Solo Regs
import TeamTournamentRegistration from "../../../models/TeamTournamentRegistration"; // ⭐ Team Regs
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
    // 0) Load Tournament to Check Type & Bracket
    // -------------------------------------------------------------------
    const tournamentDoc = await Tournament.findOne({ tournamentId }).lean();
    if (!tournamentDoc) {
      return res.status(404).json({ ok: false, error: "Tournament not found" });
    }

    // ⭐ Detect if Team Tournament
    const isTeamTournament =
      /-5V5-/i.test(tournamentId) ||
      tournamentDoc.mode === "5v5" ||
      tournamentDoc.modeKey === "5v5" ||
      tournamentDoc.type === "team" ||
      tournamentDoc.format === "team" ||
      tournamentDoc.meta?.isTeamTournament === true;

    // -------------------------------------------------------------------
    // 1) Read bracket.ranking to map IDs -> Placements
    // -------------------------------------------------------------------
    const ranking = tournamentDoc?.bracket?.ranking || null;
    const placementById = {}; // Keys can be PlayerIDs OR TeamIDs

    if (ranking) {
      const addPlacement = (ids, label) => {
        if (!ids) return;
        const arr = Array.isArray(ids) ? ids : [ids];
        arr.forEach((id) => {
          if (!id) return;
          const key = id.toString();
          if (!placementById[key]) {
            placementById[key] = label;
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
    // 2) Update TournamentState & Main Doc
    // -------------------------------------------------------------------
    const updateState = {
      tournamentId,
      status: "completed",
      isFeatured: false,
      endedAt,
      endedBy: player._id,
    };
    if (winnerTeamId) updateState.winnerTeamId = winnerTeamId;

    const doc = await TournamentState.findOneAndUpdate(
      { tournamentId },
      { $set: updateState },
      { upsert: true, new: true }
    ).lean();

    const tournamentUpdate = {
      status: "completed",
      endedAt,
    };
    if (winnerTeamId) tournamentUpdate.winnerTeamId = winnerTeamId;

    await Tournament.updateOne({ tournamentId }, { $set: tournamentUpdate });

    // -------------------------------------------------------------------
    // 3) Update Registrations & History (Branch Logic)
    // -------------------------------------------------------------------

    if (isTeamTournament) {
      // ==========================================
      // 🟦 TEAM TOURNAMENT LOGIC
      // ==========================================
      
      // 1. Find all team registrations
      const teamRegs = await TeamTournamentRegistration.find({
        tournamentId,
      }).lean();

      if (teamRegs.length > 0) {
        // 2. Prepare Bulk Updates for Team Registrations
        // We act on the Registration doc because that IS the history record for teams.
        const bulkOps = teamRegs.map((reg) => {
          const teamId = reg.team.toString();
          const placement = placementById[teamId] || ""; // e.g. "1st"

          return {
            updateOne: {
              filter: { _id: reg._id },
              update: {
                $set: {
                  status: "completed",
                  completedAt: endedAt,
                  placement: placement, // Save result directly to registration
                  // Ensure name is synced if needed
                  ign: reg.teamName || reg.teamTag || "Unnamed Team", 
                },
              },
            },
          };
        });

        await TeamTournamentRegistration.bulkWrite(bulkOps);
      }

    } else {
      // ==========================================
      // 👤 SOLO TOURNAMENT LOGIC (Your Old Code)
      // ==========================================

      // 1. Mark Registrations as completed
      await Registration.updateMany(
        {
          $or: [{ tournament: tournamentId }, { tournamentId: tournamentId }],
        },
        {
          $set: {
            status: "completed",
            completedAt: endedAt,
            tournamentId: tournamentId,
          },
        }
      );

      // 2. Move to Player History
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
            const placement = placementById[placementKey] || "";

            const historyEntries = activeRegs.map((r) => ({
              tournamentId: r.tournamentId,
              ign: r.ign,
              fullIgn: r.fullIgn,
              rank: r.rank,
              placement, // 1st, 2nd, etc.
              endedAt,
            }));

            return {
              updateOne: {
                filter: { _id: p._id },
                update: {
                  $pull: { registeredFor: { tournamentId } },
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
    }

    return res.status(200).json({
      ok: true,
      state: doc
        ? { ...doc, _id: doc._id.toString() }
        : null,
    });

  } catch (err) {
    console.error("Error ending tournament:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}