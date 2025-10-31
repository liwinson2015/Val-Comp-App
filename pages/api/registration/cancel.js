// /pages/api/registration/cancel.js
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";
import Registration from "../../../models/Registration";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectToDatabase();

    const { tournamentId } = req.body || {};
    const playerId = req.cookies?.playerId || null;

    if (!playerId) return res.status(401).json({ error: "Not authenticated" });
    if (!tournamentId) return res.status(400).json({ error: "Missing tournamentId" });

    // Load player from cookie identity
    const player = await Player.findById(playerId);
    if (!player) return res.status(401).json({ error: "Player not found" });

    // 1) Hard-delete the registration record
    await Registration.findOneAndDelete({
      playerId: player._id,
      tournamentId: tournamentId,
    });

    // 2) Remove mirror from Player.registeredFor
    if (Array.isArray(player.registeredFor)) {
      player.registeredFor = player.registeredFor.filter(
        (r) => (r?.tournamentId || r?.id) !== tournamentId
      );
      await player.save();
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Cancel registration error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
