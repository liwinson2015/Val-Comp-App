// components/Bracket16.jsx
import React from "react";
import s from "../styles/Bracket16.module.css";

// Single match card for the Fire/Ice/Clash themes
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

// Convert ["A","B"] pairs into match objects accepted by MatchCard
function pairsToMatches(pairs, prefix) {
  return (pairs || []).map((pair, idx) => ({
    id: `${prefix}-${idx}`,
    p1: pair?.[0] || "TBD",
    p2: pair?.[1] || "TBD",
    winner: 0, // unknown from this data structure
  }));
}

export default function Bracket16({ data }) {
  // keep your original data contract: left.R16/QF/SF, right.R16/QF/SF, final.left/right/champion
  const D = normalizeData(data);

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

  // Finals: highlight champion row if it matches left/right
  let finalWinner = 0;
  if (D.final.champion && D.final.champion === D.final.left) finalWinner = 1;
  else if (D.final.champion && D.final.champion === D.final.right) finalWinner = 2;

  const finalsMatch = {
    id: "FINAL",
    p1: D.final.left || "TBD",
    p2: D.final.right || "TBD",
    winner: finalWinner,
  };

  return (
    <div className={s.container}>
      <header className={s.header}>
        <h1 className={s.title}>FROSTFIRE CHAMPIONS</h1>
        <p className={s.subtitle}>GLOBAL ELIMINATION BRACKET // 2025</p>
      </header>

      <div className={s.bracketWrapper}>
        {/* --- LEFT SIDE (ICE THEME) --- */}

        {/* Left Round of 16 */}
        <div className={`${s.column} ${s.columnLeft}`}>
          {leftSide.round1.map((m) => (
            <MatchCard key={m.id} match={m} theme="ice" />
          ))}
        </div>

        {/* Left Quarters */}
        <div className={`${s.column} ${s.columnLeft}`}>
          {leftSide.round2.map((m) => (
            <MatchCard key={m.id} match={m} theme="ice" />
          ))}
        </div>

        {/* Left Semis */}
        <div className={`${s.column} ${s.columnLeft}`}>
          {leftSide.semis.map((m) => (
            <MatchCard key={m.id} match={m} theme="ice" />
          ))}
        </div>

        {/* --- MIDDLE (CLASH THEME / WINNER) --- */}

        <div className={`${s.column} ${s.columnMid}`}>
          <div style={{ textAlign: "center", marginBottom: "10px" }}>
            <h2 className={s.winnerText}>WINNER</h2>
          </div>
          <MatchCard match={finalsMatch} theme="clash" />
        </div>

        {/* --- RIGHT SIDE (FIRE THEME) --- */}

        {/* Right Semis */}
        <div className={`${s.column} ${s.columnRight}`}>
          {rightSide.semis.map((m) => (
            <MatchCard key={m.id} match={m} theme="fire" />
          ))}
        </div>

        {/* Right Quarters */}
        <div className={`${s.column} ${s.columnRight}`}>
          {rightSide.round2.map((m) => (
            <MatchCard key={m.id} match={m} theme="fire" />
          ))}
        </div>

        {/* Right Round of 16 */}
        <div className={`${s.column} ${s.columnRight}`}>
          {rightSide.round1.map((m) => (
            <MatchCard key={m.id} match={m} theme="fire" />
          ))}
        </div>
      </div>
    </div>
  );
}

// same normalizeData helper as your original file
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
