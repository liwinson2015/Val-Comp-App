// pages/api/teams/index.js
import { connectToDatabase } from "../../../lib/mongodb";
import Team from "../../../models/Team";
import Player from "../../../models/Player";

// Supported game codes
const SUPPORTED_GAMES = ["VALORANT", "HOK"];

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

    // --- UPDATED: Extract new fields from body ---
    const { name, tag, game, rank, rolesNeeded } = req.body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res
        .status(400)
        .json({ ok: false, error: "Team name is required." });
    }

    if (!tag || typeof tag !== "string" || !tag.trim()) {
      return res
        .status(400)
        .json({ ok: false, error: "Team tag is required." });
    }

    // Sanitize: letters only, uppercase, max 4
    const rawTag = tag.trim();
    const lettersOnly = rawTag.replace(/[^a-zA-Z]/g, "");
    const tagUpper = lettersOnly.toUpperCase().slice(0, 4);

    if (!tagUpper) {
      return res.status(400).json({
        ok: false,
        error: "Team tag must contain at least one English letter (A–Z).",
      });
    }

    if (tagUpper.length > 4) {
      return res.status(400).json({
        ok: false,
        error: "Team tag must be 4 characters or fewer.",
      });
    }

    let gameCode = typeof game === "string" ? game.toUpperCase().trim() : "";

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

    // Check Team Limit (Max 5 per game)
    const existingCount = await Team.countDocuments({
      game: gameCode,
      $or: [{ captain: playerId }, { members: playerId }],
    });

    if (existingCount >= 5) {
      return res.status(400).json({
        ok: false,
        error: `You cannot join or create more than 5 teams for ${gameCode}.`,
      });
    }

    // Generate Invite Code
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // --- UPDATED: Create Team with Rank and Roles ---
    const team = await Team.create({
      name: name.trim().toUpperCase(),
      tag: tagUpper,
      game: gameCode,
      captain: captain._id,
      members: [captain._id],
      joinCode: joinCode,
      maxSize: 7,
      
      // Save new fields (with defaults)
      rank: rank || "Unranked",
      rolesNeeded: Array.isArray(rolesNeeded) ? rolesNeeded : [],
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
        maxSize: team.maxSize,
        joinCode: team.joinCode,
        // Return new fields so frontend updates immediately
        rank: team.rank,
        rolesNeeded: team.rolesNeeded,
      },
    });
  } catch (err) {
    console.error("Error creating team:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}