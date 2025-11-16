// pages/api/admin/brackets/[tournamentId]/save.js
import { getCurrentPlayerFromReq } from "../../../../../lib/getCurrentPlayer";
import { connectToDatabase } from "../../../../../lib/mongodb";
import Tournament from "../../../../../models/Tournament";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = await getCurrentPlayerFromReq(req);
  if (!admin || !admin.isAdmin) {
    return res.status(403).json({ error: "Not authorized" });
  }

  await connectToDatabase();

  const rawId = req.query.tournamentId;
  const tournamentId = decodeURIComponent(rawId);

  const { matches } = req.body || {};
  if (!Array.isArray(matches)) {
    return res.status(400).json({ error: "Invalid matches payload." });
  }

  // Ensure structure is clean
  const cleanedMatches = matches.map((m) => ({
    player1Id: m.player1Id || null,
    player2Id: m.player2Id || null,
    winnerId: m.winnerId || null,
  }));

  // Load existing tournament (if any)
  let t = await Tournament.findOne({ tournamentId });

  if (!t) {
    // If somehow no tournament doc yet, create one with just round 1
    t = new Tournament({
      tournamentId,
      bracket: {
        rounds: [
          {
            roundNumber: 1,
            matches: cleanedMatches,
          },
        ],
        isPublished: false,
      },
    });
  } else {
    // Update just round 1, keep other rounds if they exist
    const existing = t.bracket || {};
    let rounds = existing.rounds || [];

    const idx = rounds.findIndex((r) => r.roundNumber === 1);
    if (idx === -1) {
      rounds.unshift({
        roundNumber: 1,
        matches: cleanedMatches,
      });
    } else {
      rounds[idx].matches = cleanedMatches;
    }

    t.bracket = {
      ...existing,
      rounds,
    };
  }

  await t.save();

  return res.status(200).json({ ok: true });
}
