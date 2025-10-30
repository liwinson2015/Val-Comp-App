// pages/api/register.js

import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import Registration from "../../models/Registration";

const TOURNAMENT_ID = "VALO-SOLO-SKIRMISH-1";
const TOURNAMENT_NAME = "Valorant Solo Skirmish #1";
const TOURNAMENT_GAME = "VALORANT";
const TOURNAMENT_MODE = "1v1";
// ✅ Nov 2 (UTC; adjust if you have a specific local time)
const TOURNAMENT_START = "2025-11-02T00:00:00Z";

function readCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .filter(Boolean)
      .map((c) => {
        const [k, ...rest] = c.trim().split("=");
        return [k, decodeURIComponent(rest.join("=") || "")];
      })
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectToDatabase();

    // 1) Identify player via cookie
    const cookies = readCookies(req);
    const playerIdFromCookie = cookies.playerId || null;
    if (!playerIdFromCookie) {
      return res.status(401).json({ error: "Not logged in" });
    }

    // 2) Verify player exists
    const player = await Player.findById(playerIdFromCookie);
    if (!player) {
      return res.status(401).json({ error: "Invalid player" });
    }

    // 3) Form data
    const { ign, rank } = req.body || {};
    if (!ign || !rank) {
      return res.status(400).json({ error: "Missing required fields (ign or rank)" });
    }

    // 4) Prevent duplicates
    const existing = await Registration.findOne({
      playerId: player._id,
      tournamentId: TOURNAMENT_ID,
    }).lean();
    if (existing) {
      return res.status(409).json({
        error: "Already registered",
        registrationId: existing._id.toString(),
      });
    }

    // 5) Create Registration (source of truth)
    const newReg = await Registration.create({
      playerId: player._id,
      tournamentId: TOURNAMENT_ID,
      ign,
      rank,
      discordId: player.discordId || "",
      username: player.username || "",
    });

    // 6) Mirror entry on Player for fast “My Registrations”
    if (!Array.isArray(player.registeredFor)) player.registeredFor = [];
    const alreadyInPlayer =
      player.registeredFor.findIndex((r) => (r.id || r.tournamentId) === TOURNAMENT_ID) !== -1;

    if (!alreadyInPlayer) {
      player.registeredFor.push({
        id: TOURNAMENT_ID,
        name: TOURNAMENT_NAME,
        game: TOURNAMENT_GAME,
        mode: TOURNAMENT_MODE,
        start: TOURNAMENT_START,           // ✅ will show as Nov 2
        status: "open",
        detailsUrl: "/valorant",           // ✅ goes to event details page
      });
      await player.save();
    }

    return res.status(200).json({
      success: true,
      registrationId: newReg._id.toString(),
      registeredFor: player.registeredFor,
    });
  } catch (err) {
    console.error("Register API error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
