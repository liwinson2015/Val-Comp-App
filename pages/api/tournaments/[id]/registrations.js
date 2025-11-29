// /pages/api/tournaments/[id]/registrations.js
import { connectToDatabase } from "../../../../lib/mongodb";
import Registration from "../../../../models/Registration";
import Player from "../../../../models/Player";
import Tournament from "../../../../models/Tournament";
import TeamTournamentRegistration from "../../../../models/TeamTournamentRegistration";
import { tournamentsById } from "../../../../lib/tournaments";

const FALLBACK_CAPACITY = 16;

// Same team-mode logic we use on the register page
function isTeamMode(gameKey, modeKey) {
  const g = (gameKey || "").toLowerCase();
  const m = (modeKey || "").toLowerCase();

  // Solo:  valorant 1v1, tft solo
  // Team:  valorant 2v2 & 5v5, tft doubleup, hok 5v5
  if (g === "valorant" && (m === "2v2" || m === "5v5")) return true;
  if (g === "tft" && m === "doubleup") return true;
  if (g === "hok" && m === "5v5") return true;

  return false;
}

export default async function handler(req, res) {
  try {
    const { id } = req.query; // tournamentId, e.g. "VALO-SOLO-SKIRMISH-1"

    await connectToDatabase();

    // Try Mongo tournament first (new system)
    const tournamentDoc = await Tournament.findOne({
      tournamentId: id,
    }).lean();

    // Legacy config (old catalog)
    const legacy = tournamentsById[id];

    // If we have neither -> 404
    if (!tournamentDoc && !legacy) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    // If this is a legacy-only tournament (no Mongo doc),
    // fall back to old Registration-based logic
    if (!tournamentDoc && legacy) {
      const capacity = legacy.capacity ?? FALLBACK_CAPACITY;

      const registered = await Registration.countDocuments({
        tournament: id,
      });

      const players = await Registration.find(
        { tournament: id },
        { playerName: 1, discordTag: 1, rank: 1, _id: 0 }
      )
        .sort({ timestamp: 1 })
        .lean();

      return res.status(200).json({
        tournamentId: id,
        title: legacy.title || legacy.name || "Tournament",
        capacity,
        registered,
        remaining: Math.max(capacity - registered, 0),
        isFull: registered >= capacity,
        players,
      });
    }

    // ----- NEW SYSTEM (Mongo Tournament exists) -----
    const capacity =
      tournamentDoc.capacity ??
      legacy?.capacity ??
      FALLBACK_CAPACITY;

    const gameKey = String(
      tournamentDoc.game || legacy?.game || "valorant"
    ).toLowerCase();

    const modeKey = String(
      tournamentDoc.mode || legacy?.mode || "1v1"
    ).toLowerCase();

    const teamMode = isTeamMode(gameKey, modeKey);

    let registered = 0;
    let players = [];

    if (teamMode) {
      // TEAM TOURNAMENTS (VAL 2v2/5v5, TFT Double Up, HOK 5v5)
      // Each ACTIVE team registration counts as ONE slot
      registered = await TeamTournamentRegistration.countDocuments({
        tournamentId: id,
        status: "active",
      });

      // (Optional) If you ever want a list of teams,
      // you could query TeamTournamentRegistration here
      // and map teamName, members, etc.
    } else {
      // SOLO TOURNAMENTS (VAL 1v1, TFT solo)
      // Use Player.registeredFor as the source of truth
      registered = await Player.countDocuments({
        "registeredFor.tournamentId": id,
      });

      // Lightweight list of players (optional)
      const playerDocs = await Player.find(
        { "registeredFor.tournamentId": id },
        { username: 1, discordId: 1, _id: 0 }
      ).lean();

      players = playerDocs.map((p) => ({
        playerName: p.username || "",
        discordTag: p.discordId || "",
      }));
    }

    const title =
      tournamentDoc.name ||
      legacy?.title ||
      legacy?.name ||
      "Tournament";

    return res.status(200).json({
      tournamentId: id,
      title,
      capacity,
      registered,
      remaining: Math.max(capacity - registered, 0),
      isFull: registered >= capacity,
      players,
    });
  } catch (err) {
    console.error(
      "[api/tournaments/[id]/registrations] error:",
      err
    );
    return res
      .status(500)
      .json({ error: "Failed to load registrations" });
  }
}
