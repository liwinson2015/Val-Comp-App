// pages/api/registration/confirm.js
import { connectToDatabase } from "../../../lib/mongodb.js";
import Player from "../../../models/Player.js";
import Registration from "../../../models/Registration.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    // 🔹 NEW: accept fullIgn (optional extra field)
    const { playerId, tournamentId, ign, fullIgn, rank } = req.body;

    const cleanIgn = typeof ign === "string" ? ign.trim() : "";
    const cleanFullIgn =
      typeof fullIgn === "string" ? fullIgn.trim() : "";
    const cleanRank = typeof rank === "string" ? rank.trim() : "";

    // We still only *require* ign + rank (same behavior as before)
    if (!playerId || !tournamentId || !cleanIgn || !cleanRank) {
      return res.status(400).send("Missing required fields");
    }

    await connectToDatabase();

    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).send("Player not found");
    }

    // Check if already registered (via Registration collection)
    const alreadyInRegistration = await Registration.findOne({
      discordTag: player.discordId,
      tournament: tournamentId,
    }).lean();

    // Check if already registered (via Player.registeredFor array)
    const alreadyInPlayerArray = player.registeredFor?.some(
      (entry) => entry.tournamentId === tournamentId
    );

    if (alreadyInRegistration || alreadyInPlayerArray) {
      return res.status(409).json({
        ok: false,
        error: "Already registered for this tournament",
      });
    }

    // Create registration doc (rank is now the "peak rank" string, e.g. "Gold 2")
    const regDoc = await Registration.create({
      playerName: player.username,
      discordTag: player.discordId,
      rank: cleanRank,
      email: "",
      tournament: tournamentId,
      timestamp: new Date(),
    });

    // Also store on the Player document for history / admin view
    // 🔹 ign = name only (what your backend already uses)
    // 🔹 fullIgn = optional full Riot ID (name#tagline)
    const registeredEntry = {
      tournamentId,
      ign: cleanIgn,          // e.g. "5TQ"  (name only)
      rank: cleanRank,        // e.g. "Gold 2" (peak rank)
    };

    if (cleanFullIgn) {
      registeredEntry.fullIgn = cleanFullIgn; // e.g. "5TQ#NA1"
    }

    await Player.findByIdAndUpdate(playerId, {
      $push: {
        registeredFor: registeredEntry,
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
