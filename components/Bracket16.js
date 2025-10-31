// components/Bracket16.js
import React from "react";

/**
 * Props:
 * - data?: {
 *     left?: { R16: string[][], QF?: string[][], SF?: string[][] },
 *     right?: { R16: string[][], QF?: string[][], SF?: string[][] },
 *     final?: string[] // [playerA, playerB]
 *   }
 *
 * For now you can omit data to render TBD boxes. Later, feed real names.
 */
export default function Bracket16({ data }) {
  const L = data?.left ?? {};
  const R = data?.right ?? {};
  const F = data?.final ?? [];

  // Utility for safe player names
  const p = (name) => (name && name.trim()) || "TBD";

  return (
    <div className="bracket-shell">
      <div className="bracket-grid">
        {/* LEFT SIDE */}
        <div className="round r16">
          <RoundLabel title="Round of 16" sub="16 → 8" />
          <div className="stack">
            {makePairs(L.R16 ?? 8).map((pair, i) => (
              <Pair key={`L-R16-${i}`} a={p(pair[0])} b={p(pair[1])} />
            ))}
          </div>
        </div>
        <div className="round qf">
          <RoundLabel title="Quarterfinals" sub="8 → 4" />
          <div className="stack">
            {makePairs(L.QF ?? 4).map((pair, i) => (
              <Pair key={`L-QF-${i}`} a={p(pair[0])} b={p(pair[1])} big />
            ))}
          </div>
        </div>
        <div className="round sf">
          <RoundLabel title="Semifinals" sub="4 → 2" />
          <div className="stack">
            {makePairs(L.SF ?? 2).map((pair, i) => (
              <Pair key={`L-SF-${i}`} a={p(pair[0])} b={p(pair[1])} bigger />
            ))}
          </div>
        </div>

        {/* CENTER FINAL */}
        <div className="round final">
          <RoundLabel title="Grand Final" sub="Champion" />
          <div className="stack center">
            <Pair a={p(F[0])} b={p(F[1])} biggest />
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="round sf right">
          <RoundLabel title="Semifinals" sub="4 → 2" />
          <div className="stack">
            {makePairs(R.SF ?? 2).map((pair, i) => (
              <Pair key={`R-SF-${i}`} a={p(pair[0])} b={p(pair[1])} bigger />
            ))}
          </div>
        </div>
        <div className="round qf right">
          <RoundLabel title="Quarterfinals" sub="8 → 4" />
          <div className="stack">
            {makePairs(R.QF ?? 4).map((pair, i) => (
              <Pair key={`R-QF-${i}`} a={p(pair[0])} b={p(pair[1])} big />
            ))}
          </div>
        </div>
        <div className="round r16 right">
          <RoundLabel title="Round of 16" sub="16 → 8" />
          <div className="stack">
            {makePairs(R.R16 ?? 8).map((pair, i) => (
              <Pair key={`R-R16-${i}`} a={p(pair[0])} b={p(pair[1])} />
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .bracket-shell {
          width: 100%;
          overflow-x: auto;
          padding: 16px 0 32px;
        }

        /* 7 columns: L-R16, L-QF, L-SF, FINAL, R-SF, R-QF, R-R16 */
        .bracket-grid {
          min-width: 1100px;
          display: grid;
          grid-template-columns: repeat(7, minmax(140px, 1fr));
          gap: 18px;
          align-items: start;
        }

        .round {
          position: relative;
        }
        .round.right {
          direction: rtl; /* mirror blocks only; boxes still LTR via inner */
        }

        .stack {
          display: grid;
          gap: 16px;
          position: relative;
          padding: 6px 0;
        }
        .stack.center {
          place-items: center;
        }

        /* Connector columns (draw lines between pairs like the reference image) */
        .r16 .stack :global(.pair-wrap) {
          margin: 8px 0;
        }
        .qf .stack :global(.pair-wrap) {
          margin: 28px 0;
        }
        .sf .stack :global(.pair-wrap) {
          margin: 70px 0;
        }

        /* For the “wire” look we add a horizontal line on each pair going toward the next column. */
        .round:not(.final) .stack :global(.pair-wrap)::after {
          content: "";
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          height: 1px;
          width: 18px;
          background: #c8c8c8;
          right: -18px; /* extend to next col */
          opacity: 0.8;
        }
        .round.right .stack :global(.pair-wrap)::after {
          left: -18px;
          right: auto;
        }

        /* Column labels */
        .label {
          margin-bottom: 8px;
        }
        .label .t {
          font-weight: 700;
          font-size: 13px;
          color: #e9e9e9;
        }
        .label .s {
          font-size: 11px;
          color: #9ca3af;
        }

        /* Responsive (allow scroll instead of squishing) */
        @media (max-width: 900px) {
          .bracket-grid {
            min-width: 900px;
          }
        }
      `}</style>
    </div>
  );
}

/* ========== atoms ========== */

function RoundLabel({ title, sub }) {
  return (
    <div className="label">
      <div className="t">{title}</div>
      {sub ? <div className="s">{sub}</div> : null}
      <style jsx>{`
        .label {
          margin-bottom: 10px;
        }
        .t {
          font-weight: 800;
          font-size: 12px;
          letter-spacing: 0.04em;
        }
        .s {
          margin-top: 2px;
          font-size: 11px;
        }
      `}</style>
    </div>
  );
}

/* Draw a single match box with two rows (player A / player B) */
function Pair({ a, b, big, bigger, biggest }) {
  return (
    <div className="pair-wrap">
      <div className={`pair ${big ? "big" : ""} ${bigger ? "bigger" : ""} ${biggest ? "biggest" : ""}`}>
        <div className="row">
          <div className="slot">{a}</div>
        </div>
        <div className="row">
          <div className="slot">{b}</div>
        </div>
      </div>

      <style jsx>{`
        .pair-wrap {
          position: relative;
        }
        .pair {
          background: #ffffff;
          border: 2px solid #bdbdbd;
          border-radius: 8px;
          width: 100%;
          max-width: 220px;
          box-shadow: 0 1px 0 rgba(0,0,0,0.04);
        }
        .pair.big    { max-width: 230px; }
        .pair.bigger { max-width: 240px; }
        .pair.biggest{ max-width: 260px; }

        .row {
          padding: 8px 10px;
          border-top: 1px solid #d6d6d6;
        }
        .row:first-child {
          border-top: none;
        }
        .slot {
          font-size: 13px;
          color: #2b2b2b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </div>
  );
}

/* Helper to create placeholder pairs:
   - if input is a number N, produce N pairs of ["TBD","TBD"]
   - if input is string[][], return as-is
*/
function makePairs(source) {
  if (Array.isArray(source)) return source;
  const n = typeof source === "number" ? source : 0;
  return Array.from({ length: n }, () => ["TBD", "TBD"]);
}
