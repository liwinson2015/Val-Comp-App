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

    const player = await getCurrentPlayerFromReq(req);
    if (!player || !player.isAdmin) {
      return res.status(403).json({ error: "Admin only" });
    }

    const rawId = req.query.tournamentId;
    const tournamentId = decodeURIComponent(rawId);

    const body = req.body || {};
    const matchesR1 = Array.isArray(body.matches) ? body.matches : [];
    const matchesR2 = Array.isArray(body.matches2) ? body.matches2 : [];
    const matchesR3 = Array.isArray(body.matches3) ? body.matches3 : [];

    const lbMatchesR1 = Array.isArray(body.lbMatches) ? body.lbMatches : [];
    const lbMatchesR2 = Array.isArray(body.lbMatches2) ? body.lbMatches2 : [];
    const lbMatchesR3 = Array.isArray(body.lbMatches3) ? body.lbMatches3 : [];
    const lbMatchesR4 = Array.isArray(body.lbMatches4) ? body.lbMatches4 : [];
    const lbMatchesR5 = Array.isArray(body.lbMatches5) ? body.lbMatches5 : []; // LB R4 (your UI)

    const winnersFinalArr = Array.isArray(body.winnersFinal)
      ? body.winnersFinal
      : [];
    const lbFinalArr = Array.isArray(body.lbFinal) ? body.lbFinal : [];
    const grandFinalArr = Array.isArray(body.grandFinal)
      ? body.grandFinal
      : [];

    const winnersFinal = winnersFinalArr[0]
      ? sanitizeMatch(winnersFinalArr[0])
      : null;
    const losersFinal = lbFinalArr[0] ? sanitizeMatch(lbFinalArr[0]) : null;
    const grandFinal = grandFinalArr[0]
      ? sanitizeMatch(grandFinalArr[0])
      : null;

    // ===== winners rounds =====
    const rounds = [];
    if (matchesR1.length > 0) {
      rounds.push({
        roundNumber: 1,
        type: "winners",
        matches: matchesR1.map((m) => sanitizeMatch(m)),
      });
    }
    if (matchesR2.length > 0) {
      rounds.push({
        roundNumber: 2,
        type: "winners",
        matches: matchesR2.map((m) => sanitizeMatch(m)),
      });
    }
    if (matchesR3.length > 0) {
      rounds.push({
        roundNumber: 3,
        type: "winners",
        matches: matchesR3.map((m) => sanitizeMatch(m)),
      });
    }

    // ===== losers rounds (LB R1–R4 in your UI) =====
    const losersRounds = [];
    if (lbMatchesR1.length > 0) {
      losersRounds.push({
        roundNumber: 1,
        type: "losers",
        matches: lbMatchesR1.map((m) => sanitizeMatch(m)),
      });
    }
    if (lbMatchesR2.length > 0) {
      losersRounds.push({
        roundNumber: 2,
        type: "losers",
        matches: lbMatchesR2.map((m) => sanitizeMatch(m)),
      });
    }
    if (lbMatchesR3.length > 0) {
      losersRounds.push({
        roundNumber: 3,
        type: "losers",
        matches: lbMatchesR3.map((m) => sanitizeMatch(m)),
      });
    }
    if (lbMatchesR4.length > 0) {
      losersRounds.push({
        roundNumber: 4,
        type: "losers",
        matches: lbMatchesR4.map((m) => sanitizeMatch(m)),
      });
    }
    if (lbMatchesR5.length > 0) {
      // This is the LB ROUND 4 column on your public bracket
      losersRounds.push({
        roundNumber: 5,
        type: "losers",
        matches: lbMatchesR5.map((m) => sanitizeMatch(m)),
      });
    }

    const update = {
      $set: {
        "bracket.rounds": rounds,
        "bracket.winnersFinal": winnersFinal,
        "bracket.losersFinal": losersFinal,
        "bracket.grandFinal": grandFinal,
      },
    };

    if (losersRounds.length > 0) {
      update.$set["bracket.losersRounds"] = losersRounds;
    } else {
      update.$unset = { "bracket.losersRounds": "" };
    }

    await Tournament.findOneAndUpdate({ tournamentId }, update, {
      upsert: true,
      new: true,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Error saving bracket:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
