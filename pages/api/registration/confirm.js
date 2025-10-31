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

    if (!playerId || !tournamentId || !ign || !rank) {
      return res.status(400).send("Missing required fields");
    }

    await connectToDatabase();

    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).send("Player not found");
    }

    const alreadyInRegistration = await Registration.findOne({
      discordTag: player.discordId,
      tournament: tournamentId,
    }).lean();

    const alreadyInPlayerArray = player.registeredFor?.some(
      (entry) => entry.tournamentId === tournamentId
    );

    if (alreadyInRegistration || alreadyInPlayerArray) {
      return res.status(409).json({
        ok: false,
        error: "Already registered for this tournament",
      });
    }

    const regDoc = await Registration.create({
      playerName: player.username,
      discordTag: player.discordId,
      rank,
      email: "",
      tournament: tournamentId,
      timestamp: new Date(),
    });

    await Player.findByIdAndUpdate(playerId, {
      $push: {
        registeredFor: {
          tournamentId,
          ign,
          rank,
        },
      },
    });

    return res.status(200).json({
      ok: true,
      registrationId: regDoc._id.toString(),
    });
  } catch (err) {
    console.error("[registration/confirm] error:", err);
    return res.status(500).send("Server error saving registration");
  }
}
