// components/Bracket16.js
import React from "react";

/**
 * Single-elimination 16-player bracket (no scroll, esports styling).
 *
 * Props (optional):
 *  data = {
 *    left:  { R16?: string[][], QF?: string[][], SF?: string[][] },
 *    right: { R16?: string[][], QF?: string[][], SF?: string[][] },
 *    final?: { left?: string, right?: string, champion?: string }
 *  }
 * If data is omitted, we render ordered seeds:
 *   Left R16:  [1-2], [3-4], [5-6], [7-8]
 *   Right R16: [9-10], [11-12], [13-14], [15-16]
 */

export default function Bracket16({ data }) {
  const L = data?.left ?? {};
  const R = data?.right ?? {};
  const F = data?.final ?? {};

  // Defaults: ordered seeds if no data given
  const defaultLeftR16  = seqPairs(1, 8);   // [[1,2],[3,4],[5,6],[7,8]]
  const defaultRightR16 = seqPairs(9, 16);  // [[9,10],[11,12],[13,14],[15,16]]

  return (
    <div className="bracket-outer">
      <div className="bracket-scale">
        <div className="grid">
          {/* LEFT SIDE */}
          <Round title="Round of 16" sub="8 → 4" side="left" tier="r16">
            {makePairs(L.R16, defaultLeftR16).map((pair, i) => (
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

          {/* GRAND FINAL (custom layout like your image) */}
          <FinalBlock
            left={F.left ?? "TBD"}
            right={F.right ?? "TBD"}
            champion={F.champion ?? "TBD"}
          />

          {/* RIGHT SIDE (mirrored) */}
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
            {makePairs(R.R16, defaultRightR16).map((pair, i) => (
              <Pair key={`R-R16-${i}`} a={pair[0]} b={pair[1]} />
            ))}
          </Round>
        </div>
      </div>

      <style jsx>{`
        .bracket-outer {
          width: 100%;
          overflow: hidden;
          padding: 8px 0 24px;
        }
        .bracket-scale { transform-origin: top center; }

        /* Keep it fitting without side-scroll by scaling a bit on smaller widths */
        @media (max-width: 1200px) { .bracket-scale { transform: scale(0.95); } }
        @media (max-width: 1080px) { .bracket-scale { transform: scale(0.9); } }
        @media (max-width: 980px)  { .bracket-scale { transform: scale(0.85); } }
        @media (max-width: 900px)  { .bracket-scale { transform: scale(0.8); } }

        /* Tight 7-column grid */
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

function Round({ title, sub, children, side, tier }) {
  return (
    <div className={`round ${side || ""} ${tier}`}>
      <div className="label">
        <div className="t">{title}</div>
        <div className="s">{sub}</div>
      </div>
      <div className="stack">{children}</div>

      <style jsx>{`
        .round { position: relative; }

        .label { margin-bottom: 8px; }
        .t {
          font-weight: 900;
          font-size: 12px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #e6ebf3;
        }
        .s { font-size: 11px; color: #8ea0b3; }

        .stack {
          display: grid;
          gap: 12px;
          position: relative;
          padding: 4px 0;
        }

        /* Vertical spacing to visually align the connectors between rounds */
        .r16 .stack :global(.pair-wrap) { margin: 10px 0; }
        .qf  .stack :global(.pair-wrap) { margin: 26px 0; }
        .sf  .stack :global(.pair-wrap) { margin: 62px 0; }

        /* “Wire” connectors going to the next column */
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
        .right .stack :global(.pair-wrap)::after {
          left: -16px;
          right: auto;
        }
      `}</style>
    </div>
  );
}

function Pair({ a = "TBD", b = "TBD", big, bigger }) {
  return (
    <div className="pair-wrap">
      <div className={`pair ${big ? "big" : ""} ${bigger ? "bigger" : ""}`}>
        <div className="row"><div className="name" title={a}>{a}</div></div>
        <div className="row"><div className="name" title={b}>{b}</div></div>
      </div>

      <style jsx>{`
        .pair-wrap { position: relative; }
        .pair {
          background: #0e141b;
          border: 2px solid #2a3544;
          border-radius: 10px;
          width: 100%;
          max-width: 210px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.25);
          overflow: hidden;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .pair.big    { max-width: 220px; }
        .pair.bigger { max-width: 230px; }
        .pair:hover {
          border-color: #ff4655;
          box-shadow: 0 0 0 2px rgba(255,70,85,0.15), 0 10px 30px rgba(255,70,85,0.08);
        }

        .row {
          display: flex;
          align-items: center;
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
      `}</style>
    </div>
  );
}

/** GRAND FINAL block: two finalists side-by-side feeding up to champion box */
function FinalBlock({ left = "TBD", right = "TBD", champion = "TBD" }) {
  return (
    <div className="final-col">
      <div className="label">
        <div className="t">Grand Final</div>
        <div className="s">Champion</div>
      </div>

      {/* Champion box (top, centered) */}
      <div className="champ-wrap">
        <div className="champ-box" title={champion}>{champion}</div>
      </div>

      {/* connector down to the finalists row */}
      <div className="stem" aria-hidden />

      {/* finalists row: left vs right */}
      <div className="finalists">
        <div className="final-box" title={left}>{left}</div>
        <div className="vs-stem" aria-hidden />
        <div className="final-box" title={right}>{right}</div>
      </div>

      <style jsx>{`
        .final-col { position: relative; }
        .label { margin-bottom: 8px; }
        .t {
          font-weight: 900;
          font-size: 12px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #e6ebf3;
        }
        .s { font-size: 11px; color: #8ea0b3; }

        .champ-wrap {
          display: grid;
          place-items: center;
          margin-bottom: 8px;
        }
        .champ-box {
          background: #0e141b;
          border: 2px solid #2a3544;
          border-radius: 10px;
          min-width: 210px;
          padding: 10px 14px;
          text-align: center;
          color: #e6ebf3;
          font-weight: 800;
          box-shadow: 0 6px 20px rgba(0,0,0,0.25);
        }

        /* small vertical connector from finalists up to champion */
        .stem {
          width: 2px;
          height: 16px;
          background: rgba(180,196,216,0.9);
          margin: 0 auto 8px auto;
        }

        .finalists {
          display: grid;
          grid-template-columns: 1fr 16px 1fr;
          align-items: center;
          gap: 8px;
          padding: 0 6px;
        }
        .final-box {
          background: #0e141b;
          border: 2px solid #2a3544;
          border-radius: 10px;
          padding: 10px 14px;
          text-align: center;
          color: #e6ebf3;
          box-shadow: 0 6px 20px rgba(0,0,0,0.25);
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .final-box:hover {
          border-color: #ff4655;
          box-shadow: 0 0 0 2px rgba(255,70,85,0.15), 0 10px 30px rgba(255,70,85,0.08);
        }

        /* little horizontal bar between the two finalists (like the image) */
        .vs-stem {
          height: 2px;
          width: 100%;
          background: rgba(180,196,216,0.9);
        }
      `}</style>
    </div>
  );
}

/* ---------- Helpers ---------- */

/** If array of pairs provided, use it; otherwise, make defaultCount pairs of ["TBD","TBD"]. */
function makePairs(source, defaultOrPairs) {
  if (Array.isArray(source)) return source.map(([a, b]) => [label(a), label(b)]);
  if (Array.isArray(defaultOrPairs))
    return defaultOrPairs.map(([a, b]) => [label(a), label(b)]);
  const n = typeof defaultOrPairs === "number" ? defaultOrPairs : 0;
  return Array.from({ length: n }, () => ["TBD", "TBD"]);
}

/** Build sequential seed pairs from start..end inclusive (e.g., 1..8 => [1-2,3-4,5-6,7-8]) */
function seqPairs(start, end) {
  const out = [];
  for (let s = start; s <= end; s += 2) {
    out.push([`Seed ${s}`, `Seed ${s + 1}`]);
  }
  return out;
}

function label(x) {
  if (x == null) return "TBD";
  const str = String(x).trim();
  if (!str) return "TBD";
  // If they passed a bare number, make it "Seed N"
  if (/^\d+$/.test(str)) return `Seed ${str}`;
  return str;
}
