// components/Bracket16.js
import React from "react";

/**
 * 16-player single-elimination bracket, esports style.
 * - Bigger boxes + thicker outlines
 * - Perfect alignment (no overlap)
 * - No scroll: whole bracket scales to fit the screen
 * - Default ordered seeds:
 *   Left R16:  [1-2], [3-4], [5-6], [7-8]
 *   Right R16: [9-10], [11-12], [13-14], [15-16]
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

          {/* FINAL */}
          <FinalBlock
            left={F.left ?? "TBD"}
            right={F.right ?? "TBD"}
            champion={F.champion ?? "TBD"}
          />

          {/* RIGHT */}
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
        /* ========= Fit-to-screen scaler (no scroll, no overlap) =========
           We design at a roomy BASE size, then scale down so the whole
           bracket fits both width and height of the viewport.
        */
        .viewport {
          --baseW: 1600px;         /* base canvas width */
          --baseH: 820px;          /* base canvas height */
          --topSpace: 140px;       /* space your page header/nav consumes */
          --fitW: calc(100vw / var(--baseW));
          --fitH: calc((100vh - var(--topSpace)) / var(--baseH));
          --scale: min(1, var(--fitW), var(--fitH));

          display: grid;
          place-items: center;
          width: 100%;
          height: calc(100vh - var(--topSpace));
          overflow: hidden; /* never show scrollbars here */
        }
        .stage {
          width: var(--baseW);
          height: var(--baseH);
          transform-origin: top center;
          transform: scale(var(--scale));
        }

        /* ========= Grid & spacing (roomy, non-overlapping) ========= */
        .grid {
          --colw: 230px;           /* match card column width */
          --gap: 40px;             /* column gap */
          --pairH: 96px;           /* height of a pair block (two rows) */
          --r16Space: 36px;        /* vertical rhythm between R16 pairs */
          --qfSpace: 124px;        /* vertical rhythm between QF pairs */
          --sfSpace: 270px;        /* vertical rhythm between SF pairs */

          width: 100%;
          height: 100%;
          display: grid;
          grid-template-columns: repeat(7, var(--colw));
          gap: var(--gap);
          align-items: start;
          padding: 10px 0;
        }
      `}</style>
    </div>
  );
}

/* ================= Subcomponents ================ */

function Round({ title, children, side, tier }) {
  return (
    <div className={`round ${side || ""} ${tier}`}>
      <div className="label">{title}</div>
      <div className="stack">{children}</div>

      <style jsx>{`
        .round { position: relative; }

        .label {
          font-weight: 900;
          font-size: 13px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #e7ecf5;
          margin-bottom: 12px;
          text-shadow: 0 1px 0 rgba(0,0,0,0.3);
        }

        .stack {
          display: grid;
          gap: 0; /* spacing handled by pair-wrap margins for precise rhythm */
          position: relative;
        }

        /* vertical rhythm per round to match connectors exactly */
        .r16 .stack :global(.pair-wrap) { margin: calc(var(--r16Space) / 2) 0; }
        .qf  .stack :global(.pair-wrap) { margin: calc(var(--qfSpace) / 2) 0; }
        .sf  .stack :global(.pair-wrap) { margin: calc(var(--sfSpace) / 2) 0; }

        /* connector to next column */
        .round:not(.final) .stack :global(.pair-wrap)::after {
          content: "";
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          height: 3px;
          width: var(--gap);
          right: calc(var(--gap) * -1);
          background: linear-gradient(90deg, #7aa6ff, #ff6b81);
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
          padding: 12px 14px;
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
      </style>
    </div>
  );
}

/** GRAND FINAL: two finalists in a row with a small connector up to champion box */
function FinalBlock({ left = "TBD", right = "TBD", champion = "TBD" }) {
  return (
    <div className="final-col">
      <div className="label">Grand Final</div>

      <div className="champ-wrap">
        <div className="champ">{label(champion)}</div>
      </div>

      <div className="stem" aria-hidden />

      <div className="finalists">
        <div className="final-box">{label(left)}</div>
        <div className="midbar" aria-hidden />
        <div className="final-box">{label(right)}</div>
      </div>

      <style jsx>{`
        .final-col { position: relative; }
        .label {
          font-weight: 900;
          font-size: 13px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #e7ecf5;
          margin-bottom: 12px;
          text-align: center;
          text-shadow: 0 1px 0 rgba(0,0,0,0.3);
        }

        .champ-wrap {
          display: grid;
          place-items: center;
          margin-bottom: 10px;
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
          height: 22px;
          background: linear-gradient(180deg, #7aa6ff, #ff6b81);
          margin: 0 auto 12px auto;
          border-radius: 2px;
        }

        .finalists {
          display: grid;
          grid-template-columns: 1fr 22px 1fr;
          align-items: center;
          gap: 12px;
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
          background: linear-gradient(90deg, #7aa6ff, #ff6b81);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

/* ================= Helpers ================= */

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
