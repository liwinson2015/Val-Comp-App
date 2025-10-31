// components/Bracket16.jsx
import React from "react";
import s from "../styles/Bracket16.module.css";

/**
 * 16-player single-elimination bracket.
 * Defaults to ordered seeds:
 *   Left R16:  [1–2], [3–4], [5–6], [7–8]
 *   Right R16: [9–10], [11–12], [13–14], [15–16]
 *
 * Optional prop `data`:
 *  {
 *    left:  { R16?: string[][], QF?: string[][], SF?: string[][] },
 *    right: { R16?: string[][], QF?: string[][], SF?: string[][] },
 *    final?: { left?: string, right?: string, champion?: string }
 *  }
 */
export default function Bracket16({ data }) {
  const L = data?.left ?? {};
  const R = data?.right ?? {};
  const F = data?.final ?? {};

  const leftR16 =
    L.R16 ??
    seqPairs(1, 8); // [[Seed 1, Seed 2], [Seed 3, Seed 4], [Seed 5, Seed 6], [Seed 7, Seed 8]]
  const rightR16 =
    R.R16 ??
    seqPairs(9, 16); // [[Seed 9, Seed 10], ..., [Seed 15, Seed 16]]

  return (
    <div className={s.viewport}>
      <div className={s.stage}>
        <div className={s.grid}>
          {/* LEFT */}
          <Round title="Round of 16" tier="r16">
            {leftR16.map((p, i) => (
              <Match key={`L16-${i}`} a={p[0]} b={p[1]} />
            ))}
          </Round>

          <Round title="Quarterfinals" tier="qf">
            {[0, 1].map((i) => (
              <Match key={`LQF-${i}`} a="TBD" b="TBD" />
            ))}
          </Round>

          <Round title="Semifinals" tier="sf">
            <Match a="TBD" b="TBD" />
          </Round>

          {/* FINAL (center) */}
          <Final
            left={F.left ?? "TBD"}
            right={F.right ?? "TBD"}
            champion={F.champion ?? "TBD"}
          />

          {/* RIGHT (mirrored) */}
          <Round title="Semifinals" tier="sf" side="right">
            <Match a="TBD" b="TBD" />
          </Round>

          <Round title="Quarterfinals" tier="qf" side="right">
            {[0, 1].map((i) => (
              <Match key={`RQF-${i}`} a="TBD" b="TBD" />
            ))}
          </Round>

          <Round title="Round of 16" tier="r16" side="right">
            {rightR16.map((p, i) => (
              <Match key={`R16-${i}`} a={p[0]} b={p[1]} />
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

function Match({ a = "TBD", b = "TBD" }) {
  return (
    <div className={s.matchWrap}>
      <div className={s.match}>
        <div className={s.row}>
          <div className={s.name} title={a}>
            {label(a)}
          </div>
        </div>
        <div className={s.row}>
          <div className={s.name} title={b}>
            {label(b)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Final({ left, right, champion }) {
  return (
    <div className={s.finalCol}>
      <div className={s.finalHeader}>Grand Final</div>

      <div className={s.champWrap}>
        <div className={s.champ} title={champion}>
          {label(champion)}
        </div>
      </div>

      <div className={s.stem} aria-hidden="true" />

      <div className={s.finalRow}>
        <div className={s.finalBox} title={left}>
          {label(left)}
        </div>
        <div className={s.midbar} aria-hidden="true" />
        <div className={s.finalBox} title={right}>
          {label(right)}
        </div>
      </div>
    </div>
  );
}

/* helpers */
function seqPairs(start, end) {
  const out = [];
  for (let s = start; s <= end; s += 2) out.push([`Seed ${s}`, `Seed ${s + 1}`]);
  return out;
}
function label(x) {
  if (x == null) return "TBD";
  const s = String(x).trim();
  if (!s) return "TBD";
  if (/^\d+$/.test(s)) return `Seed ${s}`;
  return s;
}
