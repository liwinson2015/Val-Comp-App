// pages/api/profile/game-profiles.js
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";

// Simple cookie parser for playerId
function parseCookies(header = "") {
  return Object.fromEntries(
    (header || "")
      .split(";")
      .filter(Boolean)
      .map((c) => {
        const [k, ...rest] = c.trim().split("=");
        return [k, decodeURIComponent(rest.join("=") || "")];
      })
  );
}

// Only allow these game keys for now
const ALLOWED_GAMES = ["VALORANT", "HOK", "TFT"];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed. Use POST." });
  }

  const cookies = parseCookies(req.headers.cookie || "");
  const playerId = cookies.playerId || null;

  if (!playerId) {
    return res.status(401).json({ ok: false, error: "Not logged in." });
  }

  const { game, profile } = req.body || {};

  if (!game || !ALLOWED_GAMES.includes(game)) {
    return res.status(400).json({
      ok: false,
      error: "Invalid or missing game key.",
    });
  }

  if (!profile || typeof profile !== "object") {
    return res.status(400).json({
      ok: false,
      error: "Missing profile payload.",
    });
  }

  const ign = (profile.ign || "").trim();
  const rankTier = (profile.rankTier || "").trim();
  const rankDivision = (profile.rankDivision || "").trim();
  const region = (profile.region || "").trim();

  try {
    await connectToDatabase();

    const player = await Player.findById(playerId);
    if (!player) {
      return res
        .status(404)
        .json({ ok: false, error: "Player not found." });
    }

    // Ensure gameProfiles object exists
    if (!player.gameProfiles) {
      player.gameProfiles = {};
    }

    // Upsert this game's profile
    player.gameProfiles[game] = {
      ...(player.gameProfiles[game]?.toObject
        ? player.gameProfiles[game].toObject()
        : player.gameProfiles[game] || {}),
      ign,
      rankTier,
      rankDivision,
      region,
      lastUpdated: new Date(),
    };

    await player.save();

    return res.status(200).json({
      ok: true,
      game,
      profile: {
        ign,
        rankTier,
        rankDivision,
        region,
      },
    });
  } catch (err) {
    console.error("Error saving game profile:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Internal server error." });
  }
}
