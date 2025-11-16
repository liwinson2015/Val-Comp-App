// pages/api/admin/brackets/[tournamentId]/save.js
import { connectToDatabase } from "../../../../../lib/mongodb";
import Tournament from "../../../../models/Tournament";
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
    const matches = Array.isArray(body.matches) ? body.matches : null;
    const lbMatches = Array.isArray(body.lbMatches) ? body.lbMatches : null;

    if (!matches) {
      return res.status(400).json({ error: "Missing matches array" });
    }

    // Build winners Round 1
    const rounds = [
      {
        roundNumber: 1,
        type: "winners",
        matches: matches.map((m) => sanitizeMatch(m)),
      },
    ];

    // Optional: build losers Round 1
    const losersRounds = lbMatches
      ? [
          {
            roundNumber: 1,
            type: "losers",
            matches: lbMatches.map((m) => sanitizeMatch(m)),
          },
        ]
      : [];

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
