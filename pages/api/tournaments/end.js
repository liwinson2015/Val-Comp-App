// pages/api/tournaments/end.js

import { getCurrentPlayerFromReq } from "../../../lib/getCurrentPlayer";
import { connectToDatabase } from "../../../lib/mongodb";
import TournamentState from "../../../models/TournamentState";
import Registration from "../../../models/Registration";
import TeamTournamentRegistration from "../../../models/TeamTournamentRegistration";
import Player from "../../../models/Player";
import Team from "../../../models/Team"; 
import Tournament from "../../../models/Tournament";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const player = await getCurrentPlayerFromReq(req);
    if (!player || !player.isAdmin) {
      return res.status(403).json({ ok: false, error: "Not authorized" });
    }

    const { tournamentId, winnerTeamId } = req.body || {};
    if (!tournamentId) {
      return res.status(400).json({ ok: false, error: "Missing tournamentId" });
    }

    await connectToDatabase();
    console.log(`[END-TOURNAMENT] Starting end process for: ${tournamentId}`);

    const endedAt = new Date();

    // 1. Load Tournament & Determine Type
    const tDoc = await Tournament.findOne({ tournamentId }).lean();
    if (!tDoc) return res.status(404).json({ ok: false, error: "Tournament not found" });

    const isTeamTournament =
      /-5V5-/i.test(tournamentId) ||
      tDoc.mode === "5v5" ||
      tDoc.meta?.isTeamTournament === true;

    // 2. Map Placements
    const ranking = tDoc?.bracket?.ranking || null;
    const placementById = {};

    if (ranking) {
      const addPlacement = (ids, label) => {
        if (!ids) return;
        const arr = Array.isArray(ids) ? ids : [ids];
        arr.forEach((id) => {
          if (id) placementById[id.toString()] = label;
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

    // 3. Mark Tournament as Completed
    await TournamentState.findOneAndUpdate(
      { tournamentId },
      { 
        $set: { 
          status: "completed", 
          isFeatured: false, 
          endedAt, 
          endedBy: player._id,
          winnerTeamId: winnerTeamId || null
        } 
      },
      { upsert: true }
    );

    await Tournament.updateOne(
      { tournamentId },
      { $set: { status: "completed", endedAt, winnerTeamId: winnerTeamId || null } }
    );

    // ---------------------------------------------------------
    // 4. PROCESS HISTORY (TEAM vs SOLO)
    // ---------------------------------------------------------

    if (isTeamTournament) {
      console.log(`[END-TOURNAMENT] Detected TEAM tournament.`);
      
      const teamRegs = await TeamTournamentRegistration.find({ tournamentId });
      console.log(`[END-TOURNAMENT] Found ${teamRegs.length} team registrations.`);

      // Use a Loop instead of BulkWrite for better debugging and reliability with mixed schemas
      for (const reg of teamRegs) {
        // A. Update Registration Status
        reg.status = "completed";
        reg.completedAt = endedAt;
        reg.placement = placementById[reg.team.toString()] || "";
        await reg.save();

        // B. Push to Team History
        const teamName = reg.teamName || reg.teamTag || "Unnamed Team";
        const placement = placementById[reg.team.toString()] || "";
        
        console.log(`[END-TOURNAMENT] Updating Team ID: ${reg.team} | Place: ${placement}`);

        const updateResult = await Team.findByIdAndUpdate(
          reg.team, 
          {
            $push: {
              tournamentHistory: {
                tournamentId: tournamentId,
                ign: teamName,
                placement: placement,
                endedAt: endedAt
              }
            }
          },
          { new: true } // Return updated doc so we can verify
        );

        if (!updateResult) {
          console.error(`[END-TOURNAMENT] ❌ Failed to find Team with ID: ${reg.team}`);
        } else {
          // Check if history was actually added (helps debug Schema issues)
          const historyAdded = updateResult.tournamentHistory.find(h => h.tournamentId === tournamentId);
          if (!historyAdded) {
            console.error(`[END-TOURNAMENT] ⚠️ Team found, but history NOT added. Schema issue?`);
          } else {
            console.log(`[END-TOURNAMENT] ✅ History saved for ${teamName}`);
          }
        }
      }

    } else {
      // === SOLO LOGIC ===
      console.log(`[END-TOURNAMENT] Detected SOLO tournament.`);
      
      // Update Registrations
      await Registration.updateMany(
        { $or: [{ tournament: tournamentId }, { tournamentId: tournamentId }] },
        { $set: { status: "completed", completedAt: endedAt, tournamentId } }
      );

      // Update Players
      const players = await Player.find({ "registeredFor.tournamentId": tournamentId });
      
      for (const p of players) {
        const regEntry = p.registeredFor.find(r => r.tournamentId === tournamentId);
        if (!regEntry) continue;

        const placement = placementById[p._id.toString()] || "";
        
        await Player.updateOne(
          { _id: p._id },
          {
            $pull: { registeredFor: { tournamentId } },
            $push: {
              tournamentHistory: {
                tournamentId,
                ign: regEntry.ign,
                fullIgn: regEntry.fullIgn,
                rank: regEntry.rank,
                placement,
                endedAt
              }
            }
          }
        );
      }
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error("[END-TOURNAMENT] Error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}