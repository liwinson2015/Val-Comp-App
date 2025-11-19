// pages/api/profile/featured-games.js
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";

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

// Must match the game codes we use in profile.js
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

  let { featuredGames } = req.body || {};
  if (!Array.isArray(featuredGames)) {
    return res.status(400).json({
      ok: false,
      error: "featuredGames must be an array of game codes.",
    });
  }

  // Filter to allowed games, unique, max 3
  const seen = new Set();
  const cleaned = [];
  for (const code of featuredGames) {
    if (!ALLOWED_GAMES.includes(code)) continue;
    if (seen.has(code)) continue;
    seen.add(code);
    cleaned.push(code);
    if (cleaned.length >= 3) break;
  }

  try {
    await connectToDatabase();

    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ ok: false, error: "Player not found." });
    }

    player.featuredGames = cleaned;
    await player.save();

    return res.status(200).json({
      ok: true,
      featuredGames: cleaned,
    });
  } catch (err) {
    console.error("Error updating featured games:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Internal server error." });
  }
}
