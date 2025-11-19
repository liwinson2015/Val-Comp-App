// pages/api/teams/index.js
import { connectToDatabase } from "../../../lib/mongodb";
import Team from "../../../models/Team";
import Player from "../../../models/Player";

// Supported game codes
const SUPPORTED_GAMES = ["VALORANT", "HOK"]; // you can add more later

// basic cookie parser
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const cookies = parseCookies(req.headers.cookie || "");
    const playerId = cookies.playerId || null;

    if (!playerId) {
      return res.status(401).json({ ok: false, error: "Not logged in" });
    }

    const { name, tag, game } = req.body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res
        .status(400)
        .json({ ok: false, error: "Team name is required." });
    }

    let gameCode = typeof game === "string" ? game.toUpperCase().trim() : "";

    // Default to VALORANT if missing/invalid, but only allow known games
    if (!SUPPORTED_GAMES.includes(gameCode)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid or missing game. Please select a valid game.",
      });
    }

    await connectToDatabase();

    const captain = await Player.findById(playerId);
    if (!captain) {
      return res
        .status(404)
        .json({ ok: false, error: "Player not found for this session." });
    }

    const team = await Team.create({
      name: name.trim(),
      tag: (tag || "").trim(),
      game: gameCode,
      captain: captain._id,
      members: [captain._id], // captain starts as the only member
    });

    return res.status(201).json({
      ok: true,
      team: {
        id: team._id.toString(),
        name: team.name,
        tag: team.tag || "",
        game: team.game,
        captainId: team.captain.toString(),
        memberCount: team.members.length,
      },
    });
  } catch (err) {
    console.error("Error creating team:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
