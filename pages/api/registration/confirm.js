// pages/api/registration/confirm.js

import { connectToDatabase } from "../../../lib/mongodb.js";
import Player from "../../../models/Player.js";
import Registration from "../../../models/Registration.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    const { playerId, tournamentId, ign, rank } = req.body;

    // Basic validation - don't accept empty form submits
    if (!playerId || !tournamentId || !ign || !rank) {
      return res.status(400).send("Missing required fields");
    }

    // Connect to Mongo
    await connectToDatabase();

    // Make sure this player actually exists
    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).send("Player not found");
    }

    // 1. Create a Registration document
    const regDoc = await Registration.create({
      playerName: player.username,
      discordTag: player.discordId,
      rank,
      email: "", // you can collect later if you want
      tournament: tournamentId,
      timestamp: new Date(),
    });

    // 2. Also push tournament info into Player.registeredFor
    await Player.findByIdAndUpdate(playerId, {
      $push: {
        registeredFor: {
          tournamentId,
          ign,
          rank,
        },
      },
    });

    // Send success back to the browser
    return res.status(200).json({
      ok: true,
      registrationId: regDoc._id.toString(),
    });
  } catch (err) {
    console.error("[registration/confirm] error:", err);
    return res.status(500).send("Server error saving registration");
  }
}
