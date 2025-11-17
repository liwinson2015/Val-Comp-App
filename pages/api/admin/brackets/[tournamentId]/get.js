// pages/api/admin/brackets/[tournamentId]/get.js
import { connectToDatabase } from "../../../../../lib/mongodb";
import Tournament from "../../../../../models/Tournament";
import { getCurrentPlayerFromReq } from "../../../../../lib/getCurrentPlayer";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectToDatabase();

    const player = await getCurrentPlayerFromReq(req);
    if (!player || !player.isAdmin) {
      return res.status(403).json({ error: "Admin only" });
    }

    const rawId = req.query.tournamentId;
    const tournamentId = decodeURIComponent(rawId);

    const t = await Tournament.findOne({ tournamentId }).lean();

    if (!t || !t.bracket) {
      return res.status(200).json({
        bracket: {
          rounds: [],
          losersRounds: [],
          winnersFinal: null,
          losersFinal: null,
          grandFinal: null,
        },
      });
    }

    const b = t.bracket;

    // Make sure we always send all pieces the admin UI expects
    const payload = {
      rounds: b.rounds || [],
      losersRounds: b.losersRounds || [],
      winnersFinal: b.winnersFinal || null,
      losersFinal: b.losersFinal || null,
      grandFinal: b.grandFinal || null,
      // you can add other fields here later if needed (e.g., isPublished)
    };

    return res.status(200).json({ bracket: payload });
  } catch (err) {
    console.error("Error loading bracket:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
