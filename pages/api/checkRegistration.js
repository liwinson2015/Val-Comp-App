// pages/api/checkRegistration.js

import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import Registration from "../../models/Registration";

const TOURNAMENT_ID = "VALO-SOLO-SKIRMISH-1";

export default async function handler(req, res) {
  try {
    // Make sure DB is connected
    await connectToDatabase();

    // 1. Get cookies off the request headers (manual parse)
    const cookieHeader = req.headers.cookie || "";
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [k, v] = c.trim().split("=");
        return [k, decodeURIComponent(v || "")];
      })
    );

    const playerId = cookies.playerId || null;

    // If no cookie, they're not logged in
    if (!playerId) {
      return res.status(200).json({
        loggedIn: false,
        alreadyRegistered: false,
      });
    }

    // 2. We have a cookie. Get the player.
    const player = await Player.findById(playerId).lean();

    if (!player) {
      // cookie is stale / bad
      return res.status(200).json({
        loggedIn: false,
        alreadyRegistered: false,
      });
    }

    // 3. Check if this player already has a registration in this tournament
    const existingReg = await Registration.findOne({
      playerId: player._id,
      tournamentId: TOURNAMENT_ID,
    }).lean();

    const alreadyRegistered = !!existingReg;

    // 4. Return status
    return res.status(200).json({
      loggedIn: true,
      alreadyRegistered,
      user: {
        username: player.username || "",
        discordId: player.discordId || "",
        avatar: player.avatar || "",
        _id: player._id.toString(),
      },
    });
  } catch (err) {
    console.error("checkRegistration error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
