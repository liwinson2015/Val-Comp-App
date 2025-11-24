// components/Bracket16.jsx
import React from "react";
import s from "../styles/Bracket16.module.css";

// Helper: Infer winners by checking if a player appears in the NEXT round
function inferWinners(currentRound, nextRound) {
  if (!currentRound || !nextRound) return;

  currentRound.forEach((match) => {
    // If Player 1 is found in the next round, P1 won this match
    if (match.p1 !== "TBD" && playerExistsInRound(match.p1, nextRound)) {
      match.winner = 1;
    } 
    // If Player 2 is found in the next round, P2 won this match
    else if (match.p2 !== "TBD" && playerExistsInRound(match.p2, nextRound)) {
      match.winner = 2;
    }
  });
}

function playerExistsInRound(playerName, roundMatches) {
  return roundMatches.some(
    (m) => m.p1 === playerName || m.p2 === playerName
  );
}

// Convert ["A","B"] pairs into match objects
function pairsToMatches(pairs, prefix) {
  return (pairs || []).map((pair, idx) => ({
    id: `${prefix}-${idx}`,
    p1: pair?.[0] || "TBD",
    p2: pair?.[1] || "TBD",
    winner: 0, 
  }));
}

// Single match card
function MatchCard({ match, theme = "ice" }) {
  if (!match) return <div className={s.matchWrapper}></div>;

  let themeClass = s.cardIce;
  if (theme === "fire") themeClass = s.cardFire;
  if (theme === "clash") themeClass = s.cardClash;

  return (
    <div className={s.matchWrapper}>
      <div className={`${s.matchCard} ${themeClass}`}>
        <div
          className={`${s.team} ${
            match.winner === 1 ? s.winnerRow : ""
          }`}
        >
          <span>{match.p1}</span>
        </div>
        <div
          className={`${s.team} ${
            match.winner === 2 ? s.winnerRow : ""
          }`}
        >
          <span>{match.p2}</span>
        </div>
      </div>
    </div>
  );
}

export default function Bracket16({ data }) {
  const D = normalizeData(data);

  // 1. Create Match Objects
  const leftSide = {
    round1: pairsToMatches(D.left.R16, "L-R16"),
    round2: pairsToMatches(D.left.QF, "L-QF"),
    semis: [
      {
        id: "L-SF-0",
        p1: D.left.SF?.[0] || "TBD",
        p2: D.left.SF?.[1] || "TBD",
        winner: 0,
      },
    ],
  };

  const rightSide = {
    round1: pairsToMatches(D.right.R16, "R-R16"),
    round2: pairsToMatches(D.right.QF, "R-QF"),
    semis: [
      {
        id: "R-SF-0",
        p1: D.right.SF?.[0] || "TBD",
        p2: D.right.SF?.[1] || "TBD",
        winner: 0,
      },
    ],
  };

  // 2. Finals Object
  let finalWinner = 0;
  if (D.final.champion && D.final.champion !== "TBD") {
    if (D.final.champion === D.final.left) finalWinner = 1;
    else if (D.final.champion === D.final.right) finalWinner = 2;
  }

  const finalsMatch = {
    id: "FINAL",
    p1: D.final.left || "TBD",
    p2: D.final.right || "TBD",
    winner: finalWinner,
  };

  // 3. INFER WINNERS (Look Ahead Logic)
  
  // Left Side: R16 -> QF -> SF -> Final
  inferWinners(leftSide.round1, leftSide.round2);
  inferWinners(leftSide.round2, leftSide.semis);
  // Check if Semi-Final winner made it to the Grand Final (Left side of final)
  if (leftSide.semis[0].p1 === finalsMatch.p1) leftSide.semis[0].winner = 1;
  if (leftSide.semis[0].p2 === finalsMatch.p1) leftSide.semis[0].winner = 2;

  // Right Side: R16 -> QF -> SF -> Final
  inferWinners(rightSide.round1, rightSide.round2);
  inferWinners(rightSide.round2, rightSide.semis);
  // Check if Semi-Final winner made it to the Grand Final (Right side of final)
  if (rightSide.semis[0].p1 === finalsMatch.p2) rightSide.semis[0].winner = 1;
  if (rightSide.semis[0].p2 === finalsMatch.p2) rightSide.semis[0].winner = 2;


  return (
    <div className={s.container}>
      <header className={s.header}>
        <h1 className={s.title}>FROSTFIRE CHAMPIONS</h1>
        <p className={s.subtitle}>GLOBAL ELIMINATION BRACKET // 2025</p>
      </header>

      <div className={s.bracketWrapper}>
        {/* --- LEFT SIDE (ICE THEME) --- */}
        <div className={`${s.column} ${s.columnLeft}`}>
          {leftSide.round1.map((m) => (
            <MatchCard key={m.id} match={m} theme="ice" />
          ))}
        </div>
        <div className={`${s.column} ${s.columnLeft}`}>
          {leftSide.round2.map((m) => (
            <MatchCard key={m.id} match={m} theme="ice" />
          ))}
        </div>
        <div className={`${s.column} ${s.columnLeft}`}>
          {leftSide.semis.map((m) => (
            <MatchCard key={m.id} match={m} theme="ice" />
          ))}
        </div>

        {/* --- MIDDLE (CLASH THEME) --- */}
        <div className={`${s.column} ${s.columnMid}`}>
          <div style={{ textAlign: "center", marginBottom: "10px" }}>
            <h2 className={s.winnerText}>WINNER</h2>
          </div>
          <MatchCard match={finalsMatch} theme="clash" />
        </div>

        {/* --- RIGHT SIDE (FIRE THEME) --- */}
        <div className={`${s.column} ${s.columnRight}`}>
          {rightSide.semis.map((m) => (
            <MatchCard key={m.id} match={m} theme="fire" />
          ))}
        </div>
        <div className={`${s.column} ${s.columnRight}`}>
          {rightSide.round2.map((m) => (
            <MatchCard key={m.id} match={m} theme="fire" />
          ))}
        </div>
        <div className={`${s.column} ${s.columnRight}`}>
          {rightSide.round1.map((m) => (
            <MatchCard key={m.id} match={m} theme="fire" />
          ))}
        </div>
      </div>
    </div>
  );
}

function normalizeData(data) {
  const L = data?.left ?? {};
  const R = data?.right ?? {};
  const F = data?.final ?? {};
  return {
    left: {
      R16: L.R16 ?? Array(4).fill(["TBD", "TBD"]),
      QF: L.QF ?? Array(2).fill(["TBD", "TBD"]),
      SF: L.SF ?? ["TBD", "TBD"],
    },
    right: {
      R16: R.R16 ?? Array(4).fill(["TBD", "TBD"]),
      QF: R.QF ?? Array(2).fill(["TBD", "TBD"]),
      SF: R.SF ?? ["TBD", "TBD"],
    },
    final: {
      left: F.left ?? "TBD",
      right: F.right ?? "TBD",
      champion: F.champion ?? "TBD",
    },
  };
}