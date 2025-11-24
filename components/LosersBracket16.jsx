// components/LosersBracket16.jsx
import React from "react";
import s from "../styles/LosersBracket16.module.css";

// --- HELPERS ---

// Convert pairs ["A", "B"] into objects { p1: "A", p2: "B", winner: 0 }
function toMatchObjects(pairs) {
  return pairs.map((pair) => ({
    p1: pair?.[0] || "TBD",
    p2: pair?.[1] || "TBD",
    winner: 0,
  }));
}

// Check current round against next round to determine winners
function calcWinners(currentRound, nextRound) {
  if (!currentRound || !nextRound) return;

  currentRound.forEach((match) => {
    // If P1 is in the next round, P1 won
    if (match.p1 !== "TBD" && playerInRound(match.p1, nextRound)) {
      match.winner = 1;
    } 
    // If P2 is in the next round, P2 won
    else if (match.p2 && match.p2 !== "TBD" && playerInRound(match.p2, nextRound)) {
      match.winner = 2;
    }
  });
}

function playerInRound(name, targetRound) {
  return targetRound.some((m) => m.p1 === name || m.p2 === name);
}

// --- COMPONENTS ---

function MatchCard({ match, theme = "ice" }) {
  let themeClass = s.cardIce;
  if (theme === "fire") themeClass = s.cardFire;
  if (theme === "clash") themeClass = s.cardClash;

  return (
    <div className={s.matchWrapper}>
      <div className={`${s.matchCard} ${themeClass}`}>
        <div className={`${s.team} ${match.winner === 1 ? s.winnerRow : ""}`}>
          <span>{match.p1}</span>
        </div>
        {/* Only render P2 if it exists (Singles rounds don't have P2) */}
        {match.p2 !== undefined && (
          <div className={`${s.team} ${match.winner === 2 ? s.winnerRow : ""}`}>
            <span>{match.p2}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LosersBracket16(props) {
  const norm = normalize(props);

  // 1. PREPARE ROUND 3A SINGLES
  const r3aRawNames = [];
  norm.R3A.forEach((pair) => {
    if (pair?.[0]) r3aRawNames.push(String(pair[0] || "TBD"));
    if (pair?.[1]) r3aRawNames.push(String(pair[1] || "TBD"));
  });
  while (r3aRawNames.length < 4) r3aRawNames.push("TBD");
  if (r3aRawNames.length > 4) r3aRawNames.length = 4;

  // 2. CONVERT ALL TO MATCH OBJECTS
  const matches = {
    R1: toMatchObjects(norm.R1),
    R2: toMatchObjects(norm.R2),
    // Special: Singles are matches with only p1
    R3A: r3aRawNames.map(name => ({ p1: name, p2: undefined, winner: 0 })),
    R3B: toMatchObjects(norm.R3B),
    R4: toMatchObjects(norm.R4),
    LBF: toMatchObjects([norm.LBF]), // wrap single pair in array
    // This is the "LB Champion" slot (Winner of LB Final)
    LBChamp: [{ p1: norm.LBWinner || "TBD", p2: undefined, winner: 0 }]
  };

  // 3. CALCULATE WINNERS (Look Ahead Logic)
  calcWinners(matches.R1, matches.R2);
  calcWinners(matches.R2, matches.R3A);
  calcWinners(matches.R3A, matches.R3B);
  calcWinners(matches.R3B, matches.R4);
  calcWinners(matches.R4, matches.LBF);
  calcWinners(matches.LBF, matches.LBChamp); // LB Final -> LB Champion

  return (
    <div className={s.lbViewport}>
      <div className={s.bracketWrapper}>
        
        {/* COL 1: ROUND 1 */}
        <div className={s.column}>
          <h3 className={`${s.roundTitle} ${s.iceTitle}`}>LB Round 1</h3>
          <div className={s.matchContainer}>
            {matches.R1.map((m, i) => <MatchCard key={i} match={m} theme="ice" />)}
          </div>
        </div>

        {/* COL 2: ROUND 2 */}
        <div className={s.column}>
          <h3 className={`${s.roundTitle} ${s.iceTitle}`}>LB Round 2</h3>
          <div className={`${s.matchContainer} ${s.connectorLeft}`}>
            {matches.R2.map((m, i) => <MatchCard key={i} match={m} theme="ice" />)}
          </div>
        </div>

        {/* COL 3: ROUND 3A (Singles) */}
        <div className={s.column}>
          <h3 className={`${s.roundTitle} ${s.fireTitle}`}>LB Round 3A</h3>
          <div className={`${s.matchContainer} ${s.connectorLeft}`}>
            {matches.R3A.map((m, i) => <MatchCard key={i} match={m} theme="fire" />)}
          </div>
        </div>

        {/* COL 4: ROUND 3B */}
        <div className={s.column}>
          <h3 className={`${s.roundTitle} ${s.fireTitle}`}>LB Round 3B</h3>
          <div className={`${s.matchContainer} ${s.connectorLeft}`}>
            {matches.R3B.map((m, i) => <MatchCard key={i} match={m} theme="fire" />)}
          </div>
        </div>

        {/* COL 5: ROUND 4 */}
        <div className={s.column}>
          <h3 className={`${s.roundTitle} ${s.fireTitle}`}>LB Round 4</h3>
          <div className={`${s.matchContainer} ${s.connectorLeft}`}>
            {matches.R4.map((m, i) => <MatchCard key={i} match={m} theme="fire" />)}
          </div>
        </div>

        {/* COL 6: LB FINAL */}
        <div className={s.column}>
          <h3 className={`${s.roundTitle} ${s.clashTitle}`}>LB Final</h3>
          <div className={`${s.matchContainer} ${s.connectorLeft}`}>
            <MatchCard match={matches.LBF[0]} theme="clash" />
          </div>
        </div>

        {/* COL 7: LB CHAMPION (Glow Up + Header) */}
        <div className={s.column} style={{ flex: '0 0 200px'}}>
           <h3 className={`${s.roundTitle} ${s.clashTitle}`}>LB Champion</h3>
           <div className={`${s.matchContainer} ${s.connectorLeft}`}>
             <div style={{ width: '100%' }}>
                {/* 1. Add WINNER text above */}
                <h2 className={s.winnerText}>WINNER</h2>
                
                <div className={s.matchWrapper}>
                   <div className={`${s.matchCard} ${s.cardClash}`}>
                      {/* 2. Force the winnerRow glow since this IS the champion */}
                      <div className={`${s.team} ${s.winnerRow}`}>
                        <span>{matches.LBChamp[0].p1}</span>
                      </div>
                   </div>
                </div>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}

// --- NORMALIZATION ---
function normalize(props) {
  const d = props.data;
  if (d) {
    return {
      R1: ensurePairs(d.R1, 4, "TBD"),
      R2: mergePairs(d.R2A, d.R2B, 2, "WB R2 Loser"),
      R3A: ensurePairs(d.R3A ?? [["TBD", "TBD"], ["TBD", "TBD"]], 2, "TBD"),
      R3B: ensurePairs(d.R3B ?? [["TBD", "WB SF Loser 1"], ["TBD", "WB SF Loser 2"]], 2, "TBD"),
      R4: ensurePairs(d.R4, 1, "TBD"),
      LBF: Array.isArray(d.LBF) ? d.LBF : ["TBD", "WB Final Loser"],
      LBWinner: d.LBWinner ?? "TBD",
    };
  }
  const r1 = props.r1 ?? Array(4).fill(["TBD", "TBD"]);
  const r2 = props.r2 ?? [["TBD", "WB R2 Loser"], ["TBD", "WB R2 Loser"], ["TBD", "WB R2 Loser"], ["TBD", "WB R2 Loser"]];
  const r3a = props.r3a ?? Array(2).fill(["TBD", "TBD"]);
  const r3b = props.r3b ?? [["TBD", "WB SF Loser 1"], ["TBD", "WB SF Loser 2"]];
  const r4 = props.r4 ?? Array(1).fill(["TBD", "TBD"]);
  const lbFinal = props.lbFinal ?? ["TBD", "WB Final Loser"];
  const lbWinner = props.lbWinner ?? "TBD";

  return {
    R1: ensurePairs(r1, 4, "TBD"),
    R2: ensurePairs(r2, 4, "TBD"),
    R3A: ensurePairs(r3a, 2, "TBD"),
    R3B: ensurePairs(r3b, 2, "TBD"),
    R4: ensurePairs(r4, 1, "TBD"),
    LBF: lbFinal,
    LBWinner: lbWinner,
  };
}

function ensurePairs(arr, needed, filler) {
  return Array.from({ length: needed }, (_, i) => {
    const v = arr?.[i];
    if (Array.isArray(v) && v.length >= 2) {
      return [String(v[0] ?? "TBD"), String(v[1] ?? "TBD")];
    }
    return [filler, "TBD"];
  });
}

function mergePairs(r2a, r2b, needed, dropInLabelBase) {
  const a = ensurePairs(r2a ?? [], needed, "TBD");
  const b = ensurePairs(r2b ?? [["TBD", `${dropInLabelBase} 1`], ["TBD", `${dropInLabelBase} 2`]], needed, "TBD");
  return [a[0], b[0], a[1], b[1]];
}