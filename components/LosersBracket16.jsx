// components/LosersBracket16.jsx
import React from "react";
import s from "../styles/LosersBracket16.module.css";

/**
 * Losers Bracket for 16-player double elimination (manual-first rendering)
 *
 * Props (all optional). Pass entries like: { name, avatar? }
 *  - lbR1:    8 entries  -> LB Round 1 (WB R1 losers)
 *  - dropR2:  4 entries  -> WB R2 losers (join at LB R2)
 *  - dropSF:  2 entries  -> WB SF losers (join at LB R3B)
 *  - dropWBF: 1 entry    -> WB Final loser (faces LB winner in LB Final)
 *  - wbChampion: 1 entry -> WB Champion (awaits in Grand Final)
 *
 * Rounds flow:
 *  LB R1 (8→4)
 *  LB R2 (4 winners + 4 WB R2 losers → 4)
 *  LB R3A (4→2)
 *  LB R3B (those 2 + 2 WB SF losers → 2)
 *  LB R4 (2→1)
 *  LB Final (LB winner vs WB Final loser → 1)
 *  Grand Final (LB champ vs WB champ; show Reset note)
 */
export default function LosersBracket16({
  lbR1 = empty(8),
  dropR2 = empty(4),
  dropSF = empty(2),
  dropWBF = empty(1),
  wbChampion = empty(1),
}) {
  const Slot = ({ entry }) => (
    <div className={s.slot} title={entry?.name || "TBD"}>
      {entry?.avatar ? (
        <img className={s.ava} src={entry.avatar} alt="" />
      ) : (
        <div className={s.avaBlank} />
      )}
      <div className={s.name}>{entry?.name || "TBD"}</div>
    </div>
  );

  const Match = ({ a, b, note }) => (
    <div className={s.match}>
      <Slot entry={a} />
      <div className={s.wire} />
      <Slot entry={b} />
      {note && <div className={s.note}>{note}</div>}
    </div>
  );

  return (
    <div className={s.wrap}>
      <h3 className={s.title}>LOSERS BRACKET</h3>

      <div className={s.columns}>
        {/* LB R1 — 8 → 4 */}
        <div className={s.col}>
          <div className={s.head}>LB Round 1</div>
          <div className={s.stack}>
            <Match a={lbR1[0]} b={lbR1[1]} />
            <Match a={lbR1[2]} b={lbR1[3]} />
            <Match a={lbR1[4]} b={lbR1[5]} />
            <Match a={lbR1[6]} b={lbR1[7]} />
          </div>
        </div>

        {/* LB R2 — LB winners vs WB R2 losers */}
        <div className={s.col}>
          <div className={s.head}>LB Round 2 (WB R2 drop-ins)</div>
          <div className={s.stack}>
            <Match a={null} b={dropR2[0]} note="vs WB R2 Loser" />
            <Match a={null} b={dropR2[1]} note="vs WB R2 Loser" />
            <Match a={null} b={dropR2[2]} note="vs WB R2 Loser" />
            <Match a={null} b={dropR2[3]} note="vs WB R2 Loser" />
          </div>
        </div>

        {/* LB R3A — 4 → 2 */}
        <div className={s.col}>
          <div className={s.head}>LB Round 3A</div>
          <div className={s.stack}>
            <Match a={null} b={null} />
            <Match a={null} b={null} />
          </div>
        </div>

        {/* LB R3B — (2 winners) vs (2 WB SF losers) → 2 */}
        <div className={s.col}>
          <div className={s.head}>LB Round 3B (WB SF drop-ins)</div>
          <div className={s.stack}>
            <Match a={null} b={dropSF[0]} note="vs WB SF Loser" />
            <Match a={null} b={dropSF[1]} note="vs WB SF Loser" />
          </div>
        </div>

        {/* LB R4 — 2 → 1 */}
        <div className={s.col}>
          <div className={s.head}>LB Round 4</div>
          <div className={s.stack}>
            <Match a={null} b={null} />
          </div>
        </div>

        {/* LB Final — LB winner vs WB Final loser */}
        <div className={s.col}>
          <div className={s.head}>LB Final</div>
          <div className={s.stack}>
            <Match a={null} b={dropWBF[0]} note="WB Final Loser" />
          </div>
        </div>

        {/* Grand Final + Reset note */}
        <div className={s.colWide}>
          <div className={s.head}>Grand Final</div>
          <div className={s.gfRow}>
            <Slot entry={null} />
            <div className={s.vs}>VS</div>
            <Slot entry={wbChampion[0]} />
          </div>
          <div className={s.reset}>Reset Match (if LB side wins first set)</div>
        </div>
      </div>
    </div>
  );
}

function empty(n) {
  return Array.from({ length: n }, () => null);
}
