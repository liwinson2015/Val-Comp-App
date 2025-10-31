// /pages/api/registration/status.js
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const playerId = req.cookies?.playerId || null;
    const tournamentId = req.query?.tournamentId || "";

    if (!tournamentId) {
      return res.status(400).json({ error: "Missing tournamentId" });
    }

    if (!playerId) {
      // Not logged in -> definitely not registered
      return res.status(200).json({ loggedIn: false, isRegistered: false });
    }

    await connectToDatabase();
    const player = await Player.findById(playerId).lean();
    if (!player) {
      return res.status(200).json({ loggedIn: false, isRegistered: false });
    }

    const regs = Array.isArray(player.registeredFor) ? player.registeredFor : [];
    const isRegistered = regs.some((r) => r?.tournamentId === tournamentId);

    return res.status(200).json({ loggedIn: true, isRegistered });
  } catch (err) {
    console.error("registration/status error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
