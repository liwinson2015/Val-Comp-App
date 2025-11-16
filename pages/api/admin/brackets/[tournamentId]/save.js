// pages/api/admin/brackets/[tournamentId]/save.js
import { connectToDatabase } from "../../../../../lib/mongodb";
import Tournament from "../../../../../models/Tournament";
import { getCurrentPlayerFromReq } from "../../../../../lib/getCurrentPlayer";

function sanitizeMatch(input) {
  if (!input) return null;
  const { player1Id = null, player2Id = null, winnerId = null } = input;
  return {
    player1Id: player1Id || null,
    player2Id: player2Id || null,
    winnerId: winnerId || null,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectToDatabase();

    // Auth & admin check
    const player = await getCurrentPlayerFromReq(req);
    if (!player || !player.isAdmin) {
      return res.status(403).json({ error: "Admin only" });
    }

    const rawId = req.query.tournamentId;
    const tournamentId = decodeURIComponent(rawId);

    const body = req.body || {};
    const matchesR1 = Array.isArray(body.matches) ? body.matches : null; // Round 1
    const matchesR2 = Array.isArray(body.matches2) ? body.matches2 : null; // QF / Round 2

    const lbMatchesR1 = Array.isArray(body.lbMatches) ? body.lbMatches : null; // LB Round 1
    const lbMatchesR2 = Array.isArray(body.lbMatches2) ? body.lbMatches2 : null; // LB Round 2

    if (!matchesR1) {
      return res.status(400).json({ error: "Missing matches (Round 1) array" });
    }

    const rounds = [];

    // Winners Round 1
    rounds.push({
      roundNumber: 1,
      type: "winners",
      matches: matchesR1.map((m) => sanitizeMatch(m)),
    });

    // Winners Round 2 (Quarterfinals) if provided
    if (matchesR2 && matchesR2.length > 0) {
      rounds.push({
        roundNumber: 2,
        type: "winners",
        matches: matchesR2.map((m) => sanitizeMatch(m)),
      });
    }

    const losersRounds = [];

    // Losers Round 1
    if (lbMatchesR1 && lbMatchesR1.length > 0) {
      losersRounds.push({
        roundNumber: 1,
        type: "losers",
        matches: lbMatchesR1.map((m) => sanitizeMatch(m)),
      });
    }

    // Losers Round 2 (from QF losers)
    if (lbMatchesR2 && lbMatchesR2.length > 0) {
      losersRounds.push({
        roundNumber: 2,
        type: "losers",
        matches: lbMatchesR2.map((m) => sanitizeMatch(m)),
      });
    }

    const update = {
      $set: {
        "bracket.rounds": rounds,
      },
    };

    if (losersRounds.length > 0) {
      update.$set["bracket.losersRounds"] = losersRounds;
    }

    await Tournament.findOneAndUpdate(
      { tournamentId },
      update,
      { upsert: true, new: true }
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Error saving bracket:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
