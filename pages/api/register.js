// pages/api/register.js

import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import Registration from "../../models/Registration";

const TOURNAMENT_ID = "VALO-SOLO-SKIRMISH-1";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectToDatabase();

    // 1. Read the cookie to identify the player
    const cookieHeader = req.headers.cookie || "";
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [k, v] = c.trim().split("=");
        return [k, decodeURIComponent(v || "")];
      })
    );

    const playerIdFromCookie = cookies.playerId || null;

    if (!playerIdFromCookie) {
      return res.status(401).json({ error: "Not logged in" });
    }

    // 2. Verify player is valid
    const player = await Player.findById(playerIdFromCookie).lean();
    if (!player) {
      return res.status(401).json({ error: "Invalid player" });
    }

    // 3. Get form data
    const { ign, rank } = req.body;

    if (!ign || !rank) {
      return res.status(400).json({
        error: "Missing required fields (ign or rank)",
      });
    }

    // 4. Check if already registered for this tournament
    const existing = await Registration.findOne({
      playerId: player._id,
      tournamentId: TOURNAMENT_ID,
    }).lean();

    if (existing) {
      // They already registered. Frontend should redirect them to /valorant/already
      return res.status(409).json({
        error: "Already registered",
        registrationId: existing._id.toString(),
      });
    }

    // 5. Create new registration
    const newReg = await Registration.create({
      playerId: player._id,
      tournamentId: TOURNAMENT_ID,
      ign,
      rank,
      discordId: player.discordId || "",
      username: player.username || "",
    });

    return res.status(200).json({
      success: true,
      registrationId: newReg._id.toString(),
    });
  } catch (err) {
    console.error("Register API error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
