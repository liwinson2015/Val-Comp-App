// components/LosersBracket16.jsx
import React from "react";
import s from "../styles/LosersBracket16.module.css";

/**
 * Losers Bracket (16p double-elim) — UI matches Winners bracket:
 * - square slots
 * - crisp connectors
 * - auto-fit scaling to screen (no cutoff)
 *
 * Props (optional, use your data later):
 *  lbR1[8], dropR2[4], dropSF[2], dropWBF[1], wbChampion[1]
 */
export default function LosersBracket16({
  lbR1 = empty(8),
  dropR2 = empty(4),
  dropSF = empty(2),
  dropWBF = empty(1),
  wbChampion = empty(1),
}) {
  return (
    <div className={s.viewport}>
      <div className={s.stage}>
        <div className={s.grid}>

          {/* 1) LB Round 1 — 8 → 4 */}
          <Round title="LB Round 1">
            <Pair a={lbR1[0]} b={lbR1[1]} />
            <Pair a={lbR1[2]} b={lbR1[3]} />
            <Pair a={lbR1[4]} b={lbR1[5]} />
            <Pair a={lbR1[6]} b={lbR1[7]} />
          </Round>

          {/* 2) LB Round 2 — LB winners vs WB R2 drop-ins */}
          <Round title="LB Round 2 (WB R2 Drop-ins)">
            <Pair a={null} b={dropR2[0]} note="vs WB R2 Loser" />
            <Pair a={null} b={dropR2[1]} note="vs WB R2 Loser" />
            <Pair a={null} b={dropR2[2]} note="vs WB R2 Loser" />
            <Pair a={null} b={dropR2[3]} note="vs WB R2 Loser" />
          </Round>

          {/* 3) LB Round 3A — 4 → 2 */}
          <Round title="LB Round 3A">
            <Pair a={null} b={null} />
            <Pair a={null} b={null} />
          </Round>

          {/* 4) LB Round 3B — winners vs WB SF drop-ins → 2 */}
          <Round title="LB Round 3B (WB SF Drop-ins)">
            <Pair a={null} b={dropSF[0]} note="vs WB SF Loser" />
            <Pair a={null} b={dropSF[1]} note="vs WB SF Loser" />
          </Round>

          {/* 5) LB Round 4 — 2 → 1 */}
          <Round title="LB Round 4">
            <Pair a={null} b={null} />
          </Round>

          {/* 6) LB Final — LB winner vs WB Final loser */}
          <Round title="LB Final">
            <Pair a={null} b={dropWBF[0]} note="WB Final Loser" />
          </Round>

          {/* 7) Grand Final — LB champ vs WB champ (visual only) */}
          <FinalColumn wb={wbChampion[0]} />

        </div>
      </div>
    </div>
  );
}

/* ---------- building blocks (mirror winners look) ---------- */

function Round({ title, children, side }) {
  return (
    <div className={`${s.round} ${side ? s.right : ""}`}>
      <div className={s.roundTitle}>{title}</div>
      <div className={s.stack}>{children}</div>
    </div>
  );
}

function Pair({ a, b, note, side }) {
  return (
    <div className={`${s.pair} ${side ? s.sideRight : ""}`}>
      <Slot entry={a} />
      <Slot entry={b} />
      {note && <div className={s.note}>{note}</div>}
    </div>
  );
}

function Slot({ entry }) {
  const label = entry?.name || (typeof entry === "string" ? entry : "TBD");
  return (
    <div className={s.slot} title={label}>
      <span className={s.label}>{label}</span>
    </div>
  );
}

function FinalColumn({ wb }) {
  return (
    <div className={s.finalCol}>
      <div className={s.roundTitle}>Grand Final</div>
      <div className={s.finalRow}>
        <div className={s.finalSlot}>TBD</div>
        <div className={s.vs} />
        <div className={s.finalSlot}>{wb?.name || (typeof wb === "string" ? wb : "WB Champion")}</div>
      </div>
      <div className={s.reset}>Reset match if LB side wins first set</div>
    </div>
  );
}

function empty(n){ return Array.from({length:n}, () => null); }
