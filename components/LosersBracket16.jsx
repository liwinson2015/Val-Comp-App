// components/LosersBracket16.jsx
import React from "react";
import s from "../styles/LosersBracket16.module.css";

// Reusable Card Component
function MatchCard({ p1, p2, theme = "ice" }) {
  let themeClass = s.cardIce;
  if (theme === "fire") themeClass = s.cardFire;
  if (theme === "clash") themeClass = s.cardClash;

  return (
    <div className={s.matchWrapper}>
      <div className={`${s.matchCard} ${themeClass}`}>
        <div className={s.team}><span>{p1}</span></div>
        {/* If P2 exists, render it. If it's a "Single" box, p2 will be null/undefined */}
        {p2 !== undefined && (
          <div className={s.team}><span>{p2}</span></div>
        )}
      </div>
    </div>
  );
}

export default function LosersBracket16(props) {
  const norm = normalize(props);

  // Flatten R3A pairs into 4 distinct names for the "Singles" round
  const r3aSingles = [];
  norm.R3A.forEach((pair) => {
    if (pair?.[0]) r3aSingles.push(String(pair[0] || "TBD"));
    if (pair?.[1]) r3aSingles.push(String(pair[1] || "TBD"));
  });
  while (r3aSingles.length < 4) r3aSingles.push("TBD");
  if (r3aSingles.length > 4) r3aSingles.length = 4;

  return (
    <div className={s.lbViewport}>
      <div className={s.bracketWrapper}>
        
        {/* COL 1: ROUND 1 (4 Matches) */}
        <div className={s.column}>
          <h3 className={`${s.roundTitle} ${s.iceTitle}`}>LB Round 1</h3>
          <div className={s.matchContainer}>
            {norm.R1.map((m, i) => (
              <MatchCard key={i} p1={m[0]} p2={m[1]} theme="ice" />
            ))}
          </div>
        </div>

        {/* COL 2: ROUND 2 (4 Matches) */}
        <div className={s.column}>
          <h3 className={`${s.roundTitle} ${s.iceTitle}`}>LB Round 2</h3>
          <div className={`${s.matchContainer} ${s.connectorLeft}`}>
            {norm.R2.map((m, i) => (
              <MatchCard key={i} p1={m[0]} p2={m[1]} theme="ice" />
            ))}
          </div>
        </div>

        {/* COL 3: ROUND 3A (4 Singles) */}
        {/* These are single players dropping in, so we pass p2={undefined} */}
        <div className={s.column}>
          <h3 className={`${s.roundTitle} ${s.fireTitle}`}>LB Round 3A</h3>
          <div className={`${s.matchContainer} ${s.connectorLeft}`}>
            {r3aSingles.map((name, i) => (
              <MatchCard key={i} p1={name} p2={undefined} theme="fire" />
            ))}
          </div>
        </div>

        {/* COL 4: ROUND 3B (2 Matches) */}
        <div className={s.column}>
          <h3 className={`${s.roundTitle} ${s.fireTitle}`}>LB Round 3B</h3>
          <div className={`${s.matchContainer} ${s.connectorLeft}`}>
            {norm.R3B.map((m, i) => (
              <MatchCard key={i} p1={m[0]} p2={m[1]} theme="fire" />
            ))}
          </div>
        </div>

        {/* COL 5: ROUND 4 (1 Match) */}
        <div className={s.column}>
          <h3 className={`${s.roundTitle} ${s.fireTitle}`}>LB Round 4</h3>
          <div className={`${s.matchContainer} ${s.connectorLeft}`}>
            <MatchCard p1={norm.R4[0][0]} p2={norm.R4[0][1]} theme="fire" />
          </div>
        </div>

        {/* COL 6: LB FINAL (1 Match) */}
        <div className={s.column}>
          <h3 className={`${s.roundTitle} ${s.clashTitle}`}>LB Final</h3>
          <div className={`${s.matchContainer} ${s.connectorLeft}`}>
            <MatchCard p1={norm.LBF[0]} p2={norm.LBF[1]} theme="clash" />
          </div>
        </div>

        {/* COL 7: WINNER (1 Pill) */}
        <div className={s.column} style={{ flex: '0 0 200px'}}>
           <h3 className={`${s.roundTitle} ${s.clashTitle}`}>Winner</h3>
           <div className={`${s.matchContainer} ${s.connectorLeft}`}>
             <div className={s.matchWrapper}>
                <div className={`${s.matchCard} ${s.cardClash}`}>
                   <div className={s.team}>
                     <span className={s.winnerText}>{norm.LBWinner}</span>
                   </div>
                </div>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}

// Data Normalization (Unchanged)
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