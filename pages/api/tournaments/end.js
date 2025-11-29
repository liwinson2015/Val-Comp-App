// pages/api/tournaments/end.js

import { getCurrentPlayerFromReq } from "../../../lib/getCurrentPlayer";
import { connectToDatabase } from "../../../lib/mongodb";
import TournamentState from "../../../models/TournamentState";
import Registration from "../../../models/Registration"; // Solo Regs
import TeamTournamentRegistration from "../../../models/TeamTournamentRegistration"; // Team Regs
import Player from "../../../models/Player";
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
    console.log(`[END] Ending tournament: ${tournamentId}`);

    const endedAt = new Date();

    // 1. Load Tournament Info
    const tDoc = await Tournament.findOne({ tournamentId }).lean();
    if (!tDoc) return res.status(404).json({ ok: false, error: "Tournament not found" });

    const isTeamTournament =
      /-5V5-/i.test(tournamentId) ||
      tDoc.mode === "5v5" ||
      tDoc.meta?.isTeamTournament === true;

    // 2. Map Placements (Who got 1st, 2nd, etc.)
    const ranking = tDoc?.bracket?.ranking || null;
    const placementById = {}; // Key = TeamID (for team tourney) or PlayerID (for solo)

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

    // 3. Mark Tournament as Completed in DB
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
    // 4. PROCESS HISTORY (THE IMPORTANT PART)
    // ---------------------------------------------------------

    if (isTeamTournament) {
      // === TEAM LOGIC ===
      // Goal: Find every PLAYER in every TEAM and update their personal history
      
      const teamRegs = await TeamTournamentRegistration.find({ tournamentId }).lean();
      
      console.log(`[END] Found ${teamRegs.length} team registrations.`);

      for (const reg of teamRegs) {
        // A. Update the Registration Document status
        await TeamTournamentRegistration.updateOne(
          { _id: reg._id },
          { $set: { status: "completed", completedAt: endedAt } }
        );

        // B. Update PLAYERS inside this team
        const teamId = reg.team.toString();
        const placement = placementById[teamId] || ""; // e.g. "1st"
        const teamName = reg.teamName || reg.teamTag || "Unnamed Team";

        // reg.members contains the list of players on this team
        if (reg.members && reg.members.length > 0) {
          const memberIds = reg.members.map(m => m.player);
          
          console.log(`[END] Updating ${memberIds.length} players for Team ${teamName} (${placement})`);

          await Player.updateMany(
            { _id: { $in: memberIds } },
            {
              // 1. Remove from Active
              $pull: { registeredFor: { tournamentId } },
              
              // 2. Add to History
              $push: {
                tournamentHistory: {
                  tournamentId,
                  ign: teamName, // ⭐ Shows Team Name as IGN in history
                  fullIgn: "",   // Optional
                  rank: "N/A",   // Team rank not usually stored on player
                  placement: placement,
                  endedAt: endedAt
                }
              }
            }
          );
        }
      }

    } else {
      // === SOLO LOGIC ===
      // (This part was already working for you)
      
      await Registration.updateMany(
        { $or: [{ tournament: tournamentId }, { tournamentId: tournamentId }] },
        { $set: { status: "completed", completedAt: endedAt, tournamentId } }
      );

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