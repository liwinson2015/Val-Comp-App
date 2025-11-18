// pages/api/admin/update-player-notes.js
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";
import { getCurrentPlayerFromReq } from "../../../lib/getCurrentPlayer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    await connectToDatabase();

    const admin = await getCurrentPlayerFromReq(req);
    if (!admin || !admin.isAdmin) {
      return res.status(403).send("Admin access required");
    }

    const { playerId, notes } = req.body || {};

    if (!playerId || typeof notes !== "string") {
      return res.status(400).send("Missing or invalid fields");
    }

    await Player.findByIdAndUpdate(
      playerId,
      { adminNotes: notes },
      { new: true }
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[admin/update-player-notes] error:", err);
    return res.status(500).send("Server error updating notes");
  }
}
