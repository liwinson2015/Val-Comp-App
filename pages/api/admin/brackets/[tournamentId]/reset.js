// pages/api/admin/brackets/[tournamentId]/reset.js
import { connectToDatabase } from "../../../../../lib/mongodb";
import Tournament from "../../../../../models/Tournament";
import { getCurrentPlayerFromReq } from "../../../../../lib/getCurrentPlayer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectToDatabase();

    const player = await getCurrentPlayerFromReq(req);
    if (!player || !player.isAdmin) {
      return res.status(403).json({ error: "Admin only" });
    }

    const tournamentId = decodeURIComponent(req.query.tournamentId);

    await Tournament.findOneAndUpdate(
      { tournamentId },
      {
        $set: {
          "bracket.rounds": [],
          "bracket.losersRounds": [],
          "bracket.winnersFinal": null,
          "bracket.losersFinal": null,
          "bracket.grandFinal": null,
        },
      }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("RESET BRACKET ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
