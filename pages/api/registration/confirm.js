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

    // 1. Validate input
    if (!playerId || !tournamentId || !ign || !rank) {
      return res.status(400).send("Missing required fields");
    }

    // 2. Connect DB
    await connectToDatabase();

    // 3. Verify player exists
    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).send("Player not found");
    }

    // 4. Check if this player already registered for this tournament
    //    We will check BOTH collections:
    //    - the Registration collection
    //    - the Player.registeredFor array
    //
    //    Why? Safety + future-proofing.
    const alreadyInRegistration = await Registration.findOne({
      discordTag: player.discordId,          // how you're storing identity in Registration
      tournament: tournamentId,              // how you're storing which tourney
    }).lean();

    const alreadyInPlayerArray = player.registeredFor?.some(
      (entry) => entry.tournamentId === tournamentId
    );

    if (alreadyInRegistration || alreadyInPlayerArray) {
      // tell frontend "you're already registered"
      return res.status(409).json({
        ok: false,
        error: "Already registered for this tournament",
      });
    }

    // 5. Create a Registration document
    const regDoc = await Registration.create({
      playerName: player.username,
      discordTag: player.discordId,
      rank,
      email: "", // still optional for now
      tournament: tournamentId,
      timestamp: new Date(),
    });

    // 6. Push tournament info into Player.registeredFor
    await Player.findByIdAndUpdate(playerId, {
      $push: {
        registeredFor: {
          tournamentId,
          ign,
          rank,
        },
      },
    });

    // 7. Respond success
    return res.status(200).json({
      ok: true,
      registrationId: regDoc._id.toString(),
    });

  } catch (err) {
    console.error("[registration/confirm] error:", err);
    return res.status(500).send("Server error saving registration");
  }
}
