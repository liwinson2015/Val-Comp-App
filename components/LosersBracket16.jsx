// components/LosersBracket16.jsx
import React from "react";
import s from "../styles/LosersBracket16.module.css";

export default function LosersBracket16(props) {
  const norm = normalize(props);

  // Flatten R3A pairs into singles
  const r3aSingles = [];
  norm.R3A.forEach((pair) => {
    if (pair?.[0]) r3aSingles.push(String(pair[0] || "TBD"));
    if (pair?.[1]) r3aSingles.push(String(pair[1] || "TBD"));
  });
  while (r3aSingles.length < 4) r3aSingles.push("TBD");
  if (r3aSingles.length > 4) r3aSingles.length = 4;

  return (
    <div className={s.lbViewport}>
      <div className={s.lbStage}>
        <div className={s.lbGrid}>
          
          {/* R1 - Ice Theme */}
          <Round title="LB Round 1" cls="r1">
            {norm.R1.map((m, i) => (
              <Pair key={`r1-${i}`} top={m[0]} bot={m[1]} theme="ice" />
            ))}
          </Round>

          {/* R2 - Ice Theme (Connects from R1) */}
          <Round title="LB Round 2" cls="r2">
            {norm.R2.map((m, i) => (
              <Pair key={`r2-${i}`} top={m[0]} bot={m[1]} theme="ice" connectorTheme="ice" />
            ))}
          </Round>

          {/* R3A - Singles - Ice Theme */}
          <Round title="LB Round 3A" cls="r3a">
            {r3aSingles.map((name, i) => (
              <Single key={`r3a-single-${i}`} name={name} theme="ice" />
            ))}
          </Round>

          {/* R3B - Fire Theme starts here (getting hotter) */}
          <Round title="LB Round 3B" cls="r3b">
            {norm.R3B.map((m, i) => (
              <Pair key={`r3b-${i}`} top={m[0]} bot={m[1]} theme="fire" connectorTheme="ice" />
            ))}
          </Round>

          {/* R4 - Fire Theme */}
          <Round title="LB Round 4" cls="r4">
            <Pair top={norm.R4[0][0]} bot={norm.R4[0][1]} theme="fire" connectorTheme="fire" />
          </Round>

          {/* LB Final - Clash Theme (The big one before Grand Final) */}
          <Round title="LB Final" cls="rFinal">
            <Pair top={norm.LBF[0]} bot={norm.LBF[1]} theme="clash" connectorTheme="fire" />
          </Round>

          {/* LB Winner pill - Clash Theme */}
          <div className={s.lbWinnerCol}>
            <div className={s.lbWinnerTitle}>LB WINNER</div>
            <div className={s.lbWinnerPillWrapper}>
                 {/* Reusing the matchCard style for the winner pill */}
                <div className={`${s.matchCard} ${s.cardClash}`}>
                  <div className={s.team}>
                     <span className={s.lbWinnerText}>{norm.LBWinner}</span>
                  </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

function Round({ title, cls, children }) {
  return (
    <div className={`${s.round} ${s[cls] || ""}`}>
      <div className={s.roundTitle}>{title}</div>
      <div className={s.stack}>{children}</div>
    </div>
  );
}

/** * New Pair component using the Frostfire UI structure.
 * theme = style of the box itself (ice, fire, clash)
 * connectorTheme = style of the lines connecting TO this box from the left.
 */
function Pair({ top = "TBD", bot = "TBD", theme = "ice", connectorTheme = "ice" }) {
  const themeClass = s[`card${theme.charAt(0).toUpperCase() + theme.slice(1)}`];
  const connectorClass = s[`${connectorTheme}Connectors`];

  return (
    // Wrapper handles positioning and connector lines
    <div className={`${s.pairWrapper} ${connectorClass}`}>
      {/* Inner card handles visual style (clip path, blur, border glow) */}
      <div className={`${s.matchCard} ${themeClass}`}>
        <div className={s.team} title={top}>
          <span>{top}</span>
        </div>
        <div className={s.team} title={bot}>
          <span>{bot}</span>
        </div>
      </div>
    </div>
  );
}

/** Single player drop-in box */
function Single({ name = "TBD", theme = "ice" }) {
  const themeClass = s[`card${theme.charAt(0).toUpperCase() + theme.slice(1)}`];
  // Singles don't usually have incoming connectors in this layout, so we default outgoing to match theme
  const connectorClass = s[`${theme}Connectors`]; 

  return (
    <div className={`${s.singleWrapper} ${connectorClass}`}>
      {/* For a single, we reuse matchCard but it only has one team entry */}
      <div className={`${s.matchCard} ${themeClass}`} style={{height: 'var(--singleHeight)'}}>
        <div className={s.team} title={name} style={{borderBottom: 'none'}}>
          <span>{name}</span>
        </div>
      </div>
    </div>
  );
}


// (Normalize function remains exactly the same as your original code)
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