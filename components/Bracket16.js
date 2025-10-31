// components/Bracket16.js
import React from "react";

/**
 * 16-player single-elimination bracket, esports style.
 * - Ordered default seeds:
 *   Left:  [1-2], [3-4], [5-6], [7-8]
 *   Right: [9-10], [11-12], [13-14], [15-16]
 * - Auto-scales to fit screen (no scroll), no overlap
 * - Grand Final: two finalists feeding up to champion (your requested layout)
 *
 * Optional prop:
 *  data = {
 *    left:  { R16?: string[][], QF?: string[][], SF?: string[][] },
 *    right: { R16?: string[][], QF?: string[][], SF?: string[][] },
 *    final?: { left?: string, right?: string, champion?: string }
 *  }
 */

export default function Bracket16({ data }) {
  const L = data?.left ?? {};
  const R = data?.right ?? {};
  const F = data?.final ?? {};

  const defaultLeftR16  = seqPairs(1, 8);   // [[1,2],[3,4],[5,6],[7,8]]
  const defaultRightR16 = seqPairs(9, 16);  // [[9,10],[11,12],[13,14],[15,16]]

  return (
    <div className="viewport">
      <div className="stage">
        <div className="grid">
          {/* LEFT */}
          <Round title="Round of 16" side="left" tier="r16">
            {makePairs(L.R16, defaultLeftR16).map((pair, i) => (
              <Pair key={`L-R16-${i}`} a={pair[0]} b={pair[1]} />
            ))}
          </Round>

          <Round title="Quarterfinals" side="left" tier="qf">
            {makePairs(L.QF, 2).map((pair, i) => (
              <Pair key={`L-QF-${i}`} a={pair[0]} b={pair[1]} big />
            ))}
          </Round>

          <Round title="Semifinals" side="left" tier="sf">
            {makePairs(L.SF, 1).map((pair, i) => (
              <Pair key={`L-SF-${i}`} a={pair[0]} b={pair[1]} bigger />
            ))}
          </Round>

          {/* FINAL (center) */}
          <FinalBlock
            left={F.left ?? "TBD"}
            right={F.right ?? "TBD"}
            champion={F.champion ?? "TBD"}
          />

          {/* RIGHT (mirrored) */}
          <Round title="Semifinals" side="right" tier="sf">
            {makePairs(R.SF, 1).map((pair, i) => (
              <Pair key={`R-SF-${i}`} a={pair[0]} b={pair[1]} bigger />
            ))}
          </Round>

          <Round title="Quarterfinals" side="right" tier="qf">
            {makePairs(R.QF, 2).map((pair, i) => (
              <Pair key={`R-QF-${i}`} a={pair[0]} b={pair[1]} big />
            ))}
          </Round>

          <Round title="Round of 16" side="right" tier="r16">
            {makePairs(R.R16, defaultRightR16).map((pair, i) => (
              <Pair key={`R-R16-${i}`} a={pair[0]} b={pair[1]} />
            ))}
          </Round>
        </div>
      </div>

      <style jsx>{`
        /* ---------- Global sizing (tuned smaller & derived width) ---------- */
        .viewport {
          /* core bracket sizing knobs */
          --colw: 200px;    /* width of each round column */
          --gap: 28px;      /* horizontal gap between columns */
          --pairH: 88px;    /* visual height of a match block */
          --r16Space: 28px; /* vertical rhythm spacers to align connectors */
          --qfSpace: 96px;
          --sfSpace: 220px;

          /* derive canvas width from columns so nothing gets clipped */
          --baseW: calc(var(--colw) * 7 + var(--gap) * 6);
          /* roomy canvas height; tweak if your navbar is taller */
          --baseH: 760px;
          --topSpace: 132px; /* header + section title area in your layout */

          --fitW: calc(100vw / var(--baseW));
          --fitH: calc((100vh - var(--topSpace)) / var(--baseH));
          --scale: min(1, var(--fitW), var(--fitH));

          display: grid;
          place-items: center;
          width: 100%;
          height: calc(100vh - var(--topSpace));
          overflow: hidden; /* no scroll; we scale instead */
        }
        .stage {
          width: var(--baseW);
          height: var(--baseH);
          transform-origin: top center;
          transform: scale(var(--scale));
        }

        .grid {
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-columns: repeat(7, var(--colw));
          gap: var(--gap);
          align-items: start;
          padding: 6px 0;
        }
      `}</style>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function Round({ title, children, side, tier }) {
  return (
    <div className={`round ${side || ""} ${tier}`}>
      <div className="label">{title}</div>
      <div className="stack">{children}</div>

      <style jsx>{`
        .round { position: relative; }

        .label {
          font-weight: 900;
          font-size: 12px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #e7ecf5;
          margin-bottom: 10px;
          text-shadow: 0 1px 0 rgba(0,0,0,0.3);
        }

        .stack {
          display: grid;
          gap: 0; /* spacing controlled via pair-wrap margins for rhythm */
          position: relative;
        }

        /* vertical rhythm to match connector midpoints exactly */
        .r16 .stack :global(.pair-wrap) { margin: calc(var(--r16Space) / 2) 0; }
        .qf  .stack :global(.pair-wrap) { margin: calc(var(--qfSpace) / 2) 0; }
        .sf  .stack :global(.pair-wrap) { margin: calc(var(--sfSpace) / 2) 0; }

        /* connector to next column */
        .round:not(.final) .stack :global(.pair-wrap)::after {
          content: "";
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          height: 2px;
          width: var(--gap);
          right: calc(var(--gap) * -1);
          background: #ff6b81;
          opacity: 0.9;
          border-radius: 2px;
        }
        .right .stack :global(.pair-wrap)::after {
          left: calc(var(--gap) * -1);
          right: auto;
          transform: translateY(-50%) scaleX(-1);
        }
      `}</style>
    </div>
  );
}

function Pair({ a = "TBD", b = "TBD", big, bigger }) {
  return (
    <div className="pair-wrap">
      <div className={`pair ${big ? "big" : ""} ${bigger ? "bigger" : ""}`}>
        <div className="row"><div className="name" title={a}>{label(a)}</div></div>
        <div className="row"><div className="name" title={b}>{label(b)}</div></div>
      </div>

      <style jsx>{`
        .pair-wrap {
          position: relative;
          height: var(--pairH);
          display: grid;
          align-items: center;
        }

        .pair {
          background: #0f151d;
          border: 3px solid #293446;
          border-radius: 12px;
          width: 100%;
          box-shadow: 0 10px 28px rgba(0,0,0,0.35);
          overflow: hidden;
          transition: border-color .15s ease, box-shadow .15s ease, transform .08s ease;
        }
        .pair:hover {
          border-color: #ff4655;
          box-shadow: 0 0 0 3px rgba(255,70,85,0.18), 0 16px 36px rgba(255,70,85,0.12);
          transform: translateY(-1px);
        }

        .row {
          display: flex;
          align-items: center;
          padding: 11px 14px;
          border-top: 1px solid #1b2430;
        }
        .row:first-child { border-top: none; }

        .name {
          font-size: 14px;
          font-weight: 700;
          color: #e7ecf5;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </div>
  );
}

/** GRAND FINAL: finalists row feeding a champion box above (like your image) */
function FinalBlock({ left = "TBD", right = "TBD", champion = "TBD" }) {
  return (
    <div className="final-col">
      <div className="label">Grand Final</div>

      <div className="champ-wrap">
        <div className="champ" title={champion}>{label(champion)}</div>
      </div>

      <div className="stem" aria-hidden="true" />

      <div className="finalists">
        <div className="final-box" title={left}>{label(left)}</div>
        <div className="midbar" aria-hidden="true" />
        <div className="final-box" title={right}>{label(right)}</div>
      </div>

      <style jsx>{`
        .final-col { position: relative; }

        .label {
          font-weight: 900;
          font-size: 12px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #e7ecf5;
          margin-bottom: 10px;
          text-align: center;
          text-shadow: 0 1px 0 rgba(0,0,0,0.3);
        }

        .champ-wrap {
          display: grid;
          place-items: center;
          margin-bottom: 8px;
        }
        .champ {
          background: #0f151d;
          border: 3px solid #293446;
          border-radius: 12px;
          min-width: var(--colw);
          padding: 12px 16px;
          text-align: center;
          color: #e7ecf5;
          font-weight: 900;
          letter-spacing: 0.04em;
          box-shadow: 0 10px 28px rgba(0,0,0,0.35);
        }

        .stem {
          width: 3px;
          height: 20px;
          background: #ff6b81;
          margin: 0 auto 10px auto;
          border-radius: 2px;
        }

        .finalists {
          display: grid;
          grid-template-columns: 1fr 20px 1fr;
          align-items: center;
          gap: 10px;
        }
        .final-box {
          background: #0f151d;
          border: 3px solid #293446;
          border-radius: 12px;
          padding: 12px 16px;
          text-align: center;
          color: #e7ecf5;
          font-weight: 800;
          box-shadow: 0 10px 28px rgba(0,0,0,0.35);
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .final-box:hover {
          border-color: #ff4655;
          box-shadow: 0 0 0 3px rgba(255,70,85,0.18), 0 16px 36px rgba(255,70,85,0.12);
        }
        .midbar {
          height: 3px;
          width: 100%;
          background: #ff6b81;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

/* ---------- Helpers ---------- */

function makePairs(source, fallback) {
  if (Array.isArray(source)) return source.map(([a, b]) => [label(a), label(b)]);
  if (Array.isArray(fallback)) return fallback.map(([a, b]) => [label(a), label(b)]);
  const n = typeof fallback === "number" ? fallback : 0;
  return Array.from({ length: n }, () => ["TBD", "TBD"]);
}

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
  if (/^\d+$/.test(str)) return `Seed ${str}`;
  return str;
}
