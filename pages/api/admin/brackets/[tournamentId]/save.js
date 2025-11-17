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

function computeWinnersFromMatches(matches = []) {
  const winners = [];
  (matches || []).forEach((m) => {
    if (m && m.winnerId) winners.push(m.winnerId);
  });
  return winners;
}

function computeLosersFromMatches(matches = []) {
  const losers = [];
  (matches || []).forEach((m) => {
    if (!m || !m.winnerId) return;
    if (!m.player1Id || !m.player2Id) return;
    const loser = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
    losers.push(loser);
  });
  return losers;
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

    // Raw arrays from client
    const matchesR1Raw = Array.isArray(body.matches) ? body.matches : [];
    const matchesR2Raw = Array.isArray(body.matches2) ? body.matches2 : [];
    const matchesR3Raw = Array.isArray(body.matches3) ? body.matches3 : [];

    const lbMatchesR1Raw = Array.isArray(body.lbMatches) ? body.lbMatches : [];
    const lbMatchesR2Raw = Array.isArray(body.lbMatches2)
      ? body.lbMatches2
      : [];
    const lbMatchesR3Raw = Array.isArray(body.lbMatches3)
      ? body.lbMatches3
      : [];
    const lbMatchesR4Raw = Array.isArray(body.lbMatches4)
      ? body.lbMatches4
      : [];
    const lbMatchesR5Raw = Array.isArray(body.lbMatches5)
      ? body.lbMatches5
      : []; // LB Round 5 (your LB R4 column on public bracket)

    const winnersFinalArr = Array.isArray(body.winnersFinal)
      ? body.winnersFinal
      : [];
    const lbFinalArr = Array.isArray(body.lbFinal) ? body.lbFinal : [];
    const grandFinalArr = Array.isArray(body.grandFinal)
      ? body.grandFinal
      : [];

    // 🔹 NEW: ranking from client (1st–16th)
    const ranking = body.ranking || null;

    // Sanitize all matches
    const matchesR1 = matchesR1Raw.map((m) => sanitizeMatch(m));
    const matchesR2 = matchesR2Raw.map((m) => sanitizeMatch(m));
    const matchesR3 = matchesR3Raw.map((m) => sanitizeMatch(m));

    const lbMatchesR1 = lbMatchesR1Raw.map((m) => sanitizeMatch(m));
    const lbMatchesR2 = lbMatchesR2Raw.map((m) => sanitizeMatch(m));
    const lbMatchesR3 = lbMatchesR3Raw.map((m) => sanitizeMatch(m));
    const lbMatchesR4 = lbMatchesR4Raw.map((m) => sanitizeMatch(m));
    const lbMatchesR5 = lbMatchesR5Raw.map((m) => sanitizeMatch(m));

    let winnersFinal = winnersFinalArr[0]
      ? sanitizeMatch(winnersFinalArr[0])
      : null;
    let losersFinal = lbFinalArr[0] ? sanitizeMatch(lbFinalArr[0]) : null;
    let grandFinal = grandFinalArr[0]
      ? sanitizeMatch(grandFinalArr[0])
      : null;

    // ===== Build winners rounds =====
    const rounds = [];
    if (matchesR1.length > 0) {
      rounds.push({
        roundNumber: 1,
        type: "winners",
        matches: matchesR1,
      });
    }
    if (matchesR2.length > 0) {
      rounds.push({
        roundNumber: 2,
        type: "winners",
        matches: matchesR2,
      });
    }
    if (matchesR3.length > 0) {
      rounds.push({
        roundNumber: 3,
        type: "winners",
        matches: matchesR3,
      });
    }

    // ===== Build losers rounds =====
    const losersRounds = [];
    if (lbMatchesR1.length > 0) {
      losersRounds.push({
        roundNumber: 1,
        type: "losers",
        matches: lbMatchesR1,
      });
    }
    if (lbMatchesR2.length > 0) {
      losersRounds.push({
        roundNumber: 2,
        type: "losers",
        matches: lbMatchesR2,
      });
    }
    if (lbMatchesR3.length > 0) {
      losersRounds.push({
        roundNumber: 3,
        type: "losers",
        matches: lbMatchesR3,
      });
    }
    if (lbMatchesR4.length > 0) {
      losersRounds.push({
        roundNumber: 4,
        type: "losers",
        matches: lbMatchesR4,
      });
    }
    if (lbMatchesR5.length > 0) {
      // This is the LB ROUND 4 column on your public bracket
      losersRounds.push({
        roundNumber: 5,
        type: "losers",
        matches: lbMatchesR5,
      });
    }

    // =====================================================================
    // AUTO-POPULATION LOGIC (server-side safety net)
    // =====================================================================

    // ---- 1) Ensure Winners Final is seeded from Winners Semifinals ----
    const sfWinners = computeWinnersFromMatches(matchesR3);
    if (sfWinners.length >= 2) {
      if (!winnersFinal) {
        winnersFinal = {
          player1Id: null,
          player2Id: null,
          winnerId: null,
        };
      }

      // Only auto-fill empty slots; don't override admin decisions.
      if (!winnersFinal.player1Id) {
        winnersFinal.player1Id = sfWinners[0];
      }
      if (!winnersFinal.player2Id) {
        winnersFinal.player2Id = sfWinners[1];
      }

      if (
        winnersFinal.winnerId &&
        winnersFinal.winnerId !== winnersFinal.player1Id &&
        winnersFinal.winnerId !== winnersFinal.player2Id
      ) {
        winnersFinal.winnerId = null;
      }
    }

    // ---- 2) From Winners Final, infer winner & loser ----
    let wbWinner = null;
    let wbLoser = null;
    if (
      winnersFinal &&
      winnersFinal.winnerId &&
      winnersFinal.player1Id &&
      winnersFinal.player2Id
    ) {
      wbWinner = winnersFinal.winnerId;
      wbLoser =
        winnersFinal.winnerId === winnersFinal.player1Id
          ? winnersFinal.player2Id
          : winnersFinal.player1Id;
    }

    // ---- 3) Get LB Round 5 winner (LB R4 column on public bracket) ----
    const lbR5 = losersRounds.find(
      (r) => r.roundNumber === 5 && r.type === "losers"
    );
    const lbR5Winner = lbR5
      ? computeWinnersFromMatches(lbR5.matches)[0] || null
      : null;

    // ---- 4) Auto-fill Losers Final (VS between LB R5 winner and Winners Final loser) ----
    if (wbLoser || lbR5Winner) {
      if (!losersFinal) {
        losersFinal = {
          player1Id: null,
          player2Id: null,
          winnerId: null,
        };
      }

      // Prefer to put LB R5 winner in slot 1, WB loser in slot 2 — but only if empty
      if (!losersFinal.player1Id && lbR5Winner) {
        losersFinal.player1Id = lbR5Winner;
      }
      if (!losersFinal.player2Id && wbLoser) {
        losersFinal.player2Id = wbLoser;
      }

      if (
        losersFinal.winnerId &&
        losersFinal.winnerId !== losersFinal.player1Id &&
        losersFinal.winnerId !== losersFinal.player2Id
      ) {
        losersFinal.winnerId = null;
      }
    }

    // ---- 5) Auto-fill Grand Final slots ----
    if (!grandFinal) {
      grandFinal = {
        player1Id: null,
        player2Id: null,
        winnerId: null,
      };
    }

    // Slot 1: Winners Final winner
    if (wbWinner && !grandFinal.player1Id) {
      grandFinal.player1Id = wbWinner;
    }

    // Slot 2: Losers Final winner
    const lfWinner =
      losersFinal && losersFinal.winnerId ? losersFinal.winnerId : null;
    if (lfWinner && !grandFinal.player2Id) {
      grandFinal.player2Id = lfWinner;
    }

    if (
      grandFinal.winnerId &&
      grandFinal.winnerId !== grandFinal.player1Id &&
      grandFinal.winnerId !== grandFinal.player2Id
    ) {
      grandFinal.winnerId = null;
    }

    // =====================================================================
    // SAVE TO DB (including ranking)
    // =====================================================================

    const update = {
      $set: {
        "bracket.rounds": rounds,
        "bracket.winnersFinal": winnersFinal,
        "bracket.losersFinal": losersFinal,
        "bracket.grandFinal": grandFinal,
        // 🔹 NEW: persist ranking with bracket
        "bracket.ranking": ranking || null,
      },
    };

    if (losersRounds.length > 0) {
      update.$set["bracket.losersRounds"] = losersRounds;
    } else {
      // keep ranking even if losersRounds are cleared
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
