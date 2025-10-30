// /pages/api/registration/cancel.js
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";
import Registration from "../../../models/Registration"; // ok if unused; guarded below

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    await connectToDatabase();

    const { tournamentId } = req.body || {};
    const playerId = req.cookies?.playerId;

    if (!tournamentId) return res.status(400).json({ error: "Missing tournamentId" });
    if (!playerId) return res.status(401).json({ error: "Not authenticated" });

    // Load the player from cookie identity
    const player = await Player.findById(playerId);
    if (!player) return res.status(401).json({ error: "Player not found" });

    // ------------- Keep Registration history (status: "canceled") -------------
    // If you are already using a separate Registration collection, mark it canceled.
    try {
      await Registration.findOneAndUpdate(
        { tournament: tournamentId, discordTag: player.discordTag, status: "confirmed" },
        { $set: { status: "canceled" } }
      );
    } catch {
      // If Registration model/collection isn't in use, it's fine to ignore.
    }

    // ------------- Sync Player.registeredFor (your page reads from this) -------------
    if (Array.isArray(player.registeredFor)) {
      player.registeredFor = player.registeredFor.filter(
        (r) => r?.tournamentId !== tournamentId
      );
      await player.save();
    }

    console.log(`[CANCEL] ${player.discordTag || player._id} -> ${tournamentId}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Cancel registration error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
