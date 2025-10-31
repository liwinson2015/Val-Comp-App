// components/Bracket16.jsx
import React from "react";
import s from "../styles/Bracket16.module.css";

/**
 * Picture-style 16-player bracket.
 * Color scheme & connectors match the reference image:
 * - R16: light-blue pills
 * - QF:  gold pills
 * - SF:  dark pills
 * - Finalists (two small): white
 * - Champion (top center): white with WINNER label above
 */
export default function Bracket16({ data }) {
  const L = data?.left ?? {};
  const R = data?.right ?? {};
  const F = data?.final ?? {};

  const leftR16  = L.R16  ?? seqPairs(1, 8);
  const rightR16 = R.R16  ?? seqPairs(9, 16);

  return (
    <div className={s.viewport}>
      <div className={s.stage}>
        <div className={s.grid}>

          {/* LEFT */}
          <Round title="Round of 16" tier="r16">
            {leftR16.map((p, i) => (
              <Match key={`L16-${i}`} a={p[0]} b={p[1]} variant="blue" />
            ))}
          </Round>

          <Round title="Quarterfinals" tier="qf">
            {[0,1].map(i => (
              <Match key={`LQF-${i}`} a="Team Name" b="Team Name" variant="gold" />
            ))}
          </Round>

          <Round title="Semifinals" tier="sf">
            <Match a="Team Name" b="Team Name" variant="dark" />
          </Round>

          {/* FINAL (center) */}
          <Final
            left={F.left ?? "Team Name"}
            right={F.right ?? "Team Name"}
            champion={F.champion ?? "Team Name"}
          />

          {/* RIGHT (mirrored) */}
          <Round title="Semifinals" tier="sf" side="right">
            <Match a="Team Name" b="Team Name" variant="dark" />
          </Round>

          <Round title="Quarterfinals" tier="qf" side="right">
            {[0,1].map(i => (
              <Match key={`RQF-${i}`} a="Team Name" b="Team Name" variant="gold" />
            ))}
          </Round>

          <Round title="Round of 16" tier="r16" side="right">
            {rightR16.map((p, i) => (
              <Match key={`R16-${i}`} a={p[0]} b={p[1]} variant="blue" />
            ))}
          </Round>
        </div>
      </div>
    </div>
  );
}

function Round({ title, tier, side, children }) {
  return (
    <div className={`${s.round} ${s[tier]} ${side ? s.right : ""}`}>
      <div className={s.roundTitle}>{title}</div>
      <div className={s.stack}>{children}</div>
    </div>
  );
}

function Match({ a="Team Name", b="Team Name", variant="blue" }) {
  return (
    <div className={s.matchWrap}>
      <div className={`${s.match} ${pill(variant)}`}>
        <div className={s.row}><div className={s.name} title={a}>{label(a)}</div></div>
        <div className={s.row}><div className={s.name} title={b}>{label(b)}</div></div>
      </div>
    </div>
  );
}

function Final({ left="Team Name", right="Team Name", champion="Team Name" }) {
  return (
    <div className={s.finalCol}>
      <div className={s.winnerLabel}>WINNER</div>

      <div className={s.champWrap}>
        <div className={`${s.champ} ${s.pillWhite}`} title={champion}>
          {label(champion)}
        </div>
      </div>

      <div className={s.stem} aria-hidden="true" />

      <div className={s.finalRow}>
        <div className={`${s.finalBox} ${s.pillWhite}`} title={left}>{label(left)}</div>
        <div className={s.midbar} aria-hidden="true" />
        <div className={`${s.finalBox} ${s.pillWhite}`} title={right}>{label(right)}</div>
      </div>
    </div>
  );
}

/* helpers */
function pill(v) {
  switch (v) {
    case "gold": return s.pillGold;
    case "dark": return s.pillDark;
    case "white": return s.pillWhite;
    default: return s.pillBlue;
  }
}
function seqPairs(start, end) {
  const out = [];
  for (let s = start; s <= end; s += 2) out.push([`Team Name`, `Team Name`]); // labels like the image
  return out;
}
function label(x) {
  const s = String(x ?? "").trim();
  return s || "Team Name";
}
