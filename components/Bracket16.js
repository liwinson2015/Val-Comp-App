// components/Bracket16.js
import React from "react";

/**
 * Single-elimination 16-player (8 matches total).
 * Layout (7 cols):  L-R16 | L-QF | L-SF | FINAL | R-SF | R-QF | R-R16
 *
 * Props (optional):
 *  data = {
 *    left:  { R16?: string[][], QF?: string[][], SF?: string[][] },
 *    right: { R16?: string[][], QF?: string[][], SF?: string[][] },
 *    final?: string[] // [leftWinner, rightWinner]
 *  }
 */
export default function Bracket16({ data }) {
  const L = data?.left ?? {};
  const R = data?.right ?? {};
  const F = data?.final ?? [];

  return (
    <div className="bracket-outer">
      <div className="bracket-scale">
        <div className="grid">
          {/* LEFT */}
          <Round title="Round of 16" sub="8 → 4" side="left" tier="r16">
            {makePairs(L.R16, 4).map((pair, i) => (
              <Pair key={`L-R16-${i}`} a={pair[0]} b={pair[1]} />
            ))}
          </Round>

          <Round title="Quarterfinals" sub="4 → 2" side="left" tier="qf">
            {makePairs(L.QF, 2).map((pair, i) => (
              <Pair key={`L-QF-${i}`} a={pair[0]} b={pair[1]} big />
            ))}
          </Round>

          <Round title="Semifinals" sub="2 → 1" side="left" tier="sf">
            {makePairs(L.SF, 1).map((pair, i) => (
              <Pair key={`L-SF-${i}`} a={pair[0]} b={pair[1]} bigger />
            ))}
          </Round>

          {/* FINAL */}
          <Round title="Grand Final" sub="Champion" tier="final" center>
            <Pair a={F[0] ?? "TBD"} b={F[1] ?? "TBD"} biggest crown />
          </Round>

          {/* RIGHT (mirrored) */}
          <Round title="Semifinals" sub="1 ← 2" side="right" tier="sf">
            {makePairs(R.SF, 1).map((pair, i) => (
              <Pair key={`R-SF-${i}`} a={pair[0]} b={pair[1]} bigger />
            ))}
          </Round>

          <Round title="Quarterfinals" sub="2 ← 4" side="right" tier="qf">
            {makePairs(R.QF, 2).map((pair, i) => (
              <Pair key={`R-QF-${i}`} a={pair[0]} b={pair[1]} big />
            ))}
          </Round>

          <Round title="Round of 16" sub="4 ← 8" side="right" tier="r16">
            {makePairs(R.R16, 4).map((pair, i) => (
              <Pair key={`R-R16-${i}`} a={pair[0]} b={pair[1]} />
            ))}
          </Round>
        </div>
      </div>

      <style jsx>{`
        /* Container + responsive scale so it fits without side scroll */
        .bracket-outer {
          width: 100%;
          overflow: hidden;
          padding: 8px 0 24px;
        }
        .bracket-scale {
          transform-origin: top center;
        }
        /* Scale down on smaller viewports to avoid horizontal scroll */
        @media (max-width: 1200px) {
          .bracket-scale { transform: scale(0.95); }
        }
        @media (max-width: 1080px) {
          .bracket-scale { transform: scale(0.9); }
        }
        @media (max-width: 980px) {
          .bracket-scale { transform: scale(0.85); }
        }
        @media (max-width: 900px) {
          .bracket-scale { transform: scale(0.8); }
        }

        /* 7 columns, but much tighter than before */
        .grid {
          margin: 0 auto;
          max-width: 1100px;
          display: grid;
          grid-template-columns: repeat(7, minmax(120px, 1fr));
          gap: 14px;
          align-items: start;
        }
      `}</style>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function Round({ title, sub, children, side, tier, center }) {
  return (
    <div className={`round ${side || ""} ${tier}`}>
      <div className="label">
        <div className="t">{title}</div>
        <div className="s">{sub}</div>
      </div>
      <div className={`stack ${center ? "center" : ""}`}>{children}</div>

      <style jsx>{`
        .round {
          position: relative;
        }
        .label { margin-bottom: 8px; }
        .t {
          font-weight: 900;
          font-size: 12px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #e6ebf3;
        }
        .s {
          font-size: 11px;
          color: #8ea0b3;
        }
        .stack {
          display: grid;
          gap: 12px;
          position: relative;
          padding: 4px 0;
        }
        .stack.center { place-items: center; }

        /* spacing between matches to mimic connectors */
        .r16 .stack :global(.pair-wrap) { margin: 10px 0; }
        .qf  .stack :global(.pair-wrap) { margin: 26px 0; }
        .sf  .stack :global(.pair-wrap) { margin: 62px 0; }

        /* connector “wires” */
        .round:not(.final) .stack :global(.pair-wrap)::after {
          content: "";
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          height: 1px;
          width: 16px;
          right: -16px;
          background: rgba(180, 196, 216, 0.9);
        }
        .round.right .stack :global(.pair-wrap)::after {
          left: -16px;
          right: auto;
        }
      `}</style>
    </div>
  );
}

function Pair({ a = "TBD", b = "TBD", big, bigger, biggest, crown }) {
  return (
    <div className="pair-wrap">
      <div className={`pair ${big ? "big" : ""} ${bigger ? "bigger" : ""} ${biggest ? "biggest" : ""}`}>
        <div className="row">
          <div className="name" title={a}>{a}</div>
          {crown && <span className="crown" aria-hidden>👑</span>}
        </div>
        <div className="row">
          <div className="name" title={b}>{b}</div>
        </div>
      </div>

      <style jsx>{`
        .pair-wrap { position: relative; }

        /* Esports-y: crisp white cards on dark, subtle neon glow on hover */
        .pair {
          background: #0e141b;
          border: 2px solid #2a3544;
          border-radius: 10px;
          width: 100%;
          max-width: 210px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.25);
          overflow: hidden;
        }
        .pair.big { max-width: 220px; }
        .pair.bigger { max-width: 230px; }
        .pair.biggest { max-width: 240px; }
        .pair:hover {
          border-color: #ff4655;
          box-shadow: 0 0 0 2px rgba(255,70,85,0.15), 0 10px 30px rgba(255,70,85,0.08);
        }

        .row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-top: 1px solid #1d2632;
        }
        .row:first-child { border-top: none; }

        .name {
          font-size: 13px;
          color: #e6ebf3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .crown { margin-left: auto; opacity: 0.9; }
      `}</style>
    </div>
  );
}

/* Helpers */
function makePairs(source, defaultCount) {
  if (Array.isArray(source)) return source.map(pair => [safe(pair[0]), safe(pair[1])]);
  return Array.from({ length: defaultCount }, () => ["TBD", "TBD"]);
}
function safe(x) { return (x && String(x).trim()) || "TBD"; }
