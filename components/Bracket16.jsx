// components/Bracket16.jsx
import React, { useMemo } from "react";
import s from "../styles/Bracket16.module.css";

/**
 * Geometry-first bracket:
 *  - All boxes absolutely positioned from computed (x,y).
 *  - One SVG draws connectors using the SAME coordinates.
 *  - Final is the midpoint of the two Semifinals (no drift).
 */
export default function Bracket16({ data }) {
  const D = normalizeData(data);

  // --- TUNABLE GEOMETRY ---
  const G = useMemo(() => {
    const colW        = 150;  // px
    const gap         = 34;   // px column spacing
    const slotH       = 38;   // px slot height
    const slotGap     = 12;   // px gap inside a pair
    const stub        = 14;   // px short horizontal from box
    const wire        = 2;    // px line thickness

    const pairBlock   = slotH * 2 + slotGap;

    const r16Space    = 26;           // vertical air between R16 pairs
    const qfSpace     = pairBlock + r16Space;
    const sfSpace     = pairBlock + qfSpace;

    const X           = (i) => i * (colW + gap);

    const titleBand   = 28;
    const headerPad   = 64;           // push under navbar
    const topPad      = titleBand + headerPad;

    const r16Centers  = Array.from({ length: 4 }, (_, i) =>
      topPad + (pairBlock / 2) + i * (pairBlock + r16Space)
    );

    // Make QF pairs a bit farther apart than the pure midpoint,
    // while still centered around the same overall band.
    const qfSpreadExtra = 16; // <— increase/decrease as needed
    const qfAvgTop      = avg(r16Centers[0], r16Centers[1]);
    const qfAvgBot      = avg(r16Centers[2], r16Centers[3]);
    const qfCenters     = [
      qfAvgTop - qfSpreadExtra / 2,
      qfAvgBot + qfSpreadExtra / 2,
    ];

    const sfCenter     = avg(qfCenters[0], qfCenters[1]);
    const finalY       = sfCenter;

    const stageW       = X(6) + colW;
    const lastBottom   = r16Centers[3] + pairBlock / 2;
    const bottomPad    = 100;
    const stageH       = Math.ceil(lastBottom + bottomPad);

    // Finals layout
    const finalW       = 84;
    const finalMidGap  = 22;
    const centerX      = X(3) + colW / 2;

    // Champ pill + WINNER label positions (WINNER above pill)
    const champOffset  = 8;                  // distance above the finals line
    const champTop     = finalY - slotH - champOffset;
    const winnerTop    = champTop - 20;      // slightly above the pill

    return {
      colW, gap, slotH, slotGap, stub, wire,
      pairBlock, r16Space, qfSpace, sfSpace,
      X, topPad, r16Centers, qfCenters, sfCenter, finalY,
      stageW, stageH,
      finalW, finalMidGap, centerX,
      champTop, winnerTop
    };
  }, []);

  const { X, slotH, slotGap, stub, wire, stageW, stageH } = G;

  // Slot-center helpers
  const slotCenterOffset = (slotGap / 2 + slotH / 2);
  const pairTopCenter  = (pairY) => pairY - slotCenterOffset;
  const pairBotCenter  = (pairY) => pairY + slotCenterOffset;

  const topSlotTop  = (pairY) => pairY - (slotGap / 2) - slotH;
  const botSlotTop  = (pairY) => pairY + (slotGap / 2);

  // --- Build all boxes -------------------------------------------------------
  const boxes = [];

  // LEFT: R16 (col 0)
  for (let i = 0; i < 4; i++) {
    const y = G.r16Centers[i];
    boxes.push(box(X(0), topSlotTop(y), D.left.R16[i][0]));
    boxes.push(box(X(0), botSlotTop(y), D.left.R16[i][1]));
  }
  // LEFT: QF (col 1) — spaced with qfSpreadExtra and centered visually
  for (let i = 0; i < 2; i++) {
    const y = G.qfCenters[i];
    boxes.push(box(X(1), topSlotTop(y), D.left.QF[i][0]));
    boxes.push(box(X(1), botSlotTop(y), D.left.QF[i][1]));
  }
  // LEFT: SF (col 2)
  boxes.push(box(X(2), topSlotTop(G.sfCenter), D.left.SF[0]));
  boxes.push(box(X(2), botSlotTop(G.sfCenter), D.left.SF[1]));

  // RIGHT: mirror (cols 6,5,4)
  for (let i = 0; i < 4; i++) {
    const y = G.r16Centers[i];
    boxes.push(box(X(6), topSlotTop(y), D.right.R16[i][0]));
    boxes.push(box(X(6), botSlotTop(y), D.right.R16[i][1]));
  }
  for (let i = 0; i < 2; i++) {
    const y = G.qfCenters[i];
    boxes.push(box(X(5), topSlotTop(y), D.right.QF[i][0]));
    boxes.push(box(X(5), botSlotTop(y), D.right.QF[i][1]));
  }
  boxes.push(box(X(4), topSlotTop(G.sfCenter), D.right.SF[0]));
  boxes.push(box(X(4), botSlotTop(G.sfCenter), D.right.SF[1]));

  // CENTER: tiny finalists
  const finalLeftX  = G.centerX - G.finalMidGap/2 - G.finalW;
  const finalRightX = G.centerX + G.finalMidGap/2;
  const finalTop    = G.finalY - slotH / 2;
  const finalLeft   = miniBox(finalLeftX, finalTop, D.final.left);
  const finalRight  = miniBox(finalRightX, finalTop, D.final.right);

  // --- Build connectors (SVG) ------------------------------------------------
  const paths = [];

  // Join two R16 slots -> QF pair (left side)
  for (let i = 0; i < 2; i++) {
    const rTop  = pairTopCenter(G.r16Centers[2*i]);
    const rBot  = pairBotCenter(G.r16Centers[2*i+1]);

    const qTop  = pairTopCenter(G.qfCenters[i]);
    const qBot  = pairBotCenter(G.qfCenters[i]);

    joinLeftToRight(X(0)+G.colW, X(1), rTop, rBot, qTop, qBot);
  }
  // QF -> SF (left side)
  {
    const qTop  = pairTopCenter(G.qfCenters[0]);
    const qBot  = pairBotCenter(G.qfCenters[1]);

    const sTop  = pairTopCenter(G.sfCenter);
    const sBot  = pairBotCenter(G.sfCenter);

    joinLeftToRight(X(1)+G.colW, X(2), qTop, qBot, sTop, sBot);
  }
  // SF -> Final left mini box (single bar)
  paths.push(h(X(2)+G.colW, G.sfCenter, finalLeftX));

  // Join two R16 slots -> QF pair (right side, mirrored)
  for (let i = 0; i < 2; i++) {
    const rTop  = pairTopCenter(G.r16Centers[2*i]);
    const rBot  = pairBotCenter(G.r16Centers[2*i+1]);

    const qTop  = pairTopCenter(G.qfCenters[i]);
    const qBot  = pairBotCenter(G.qfCenters[i]);

    joinRightToLeft(X(6), X(5)+G.colW, rTop, rBot, qTop, qBot);
  }
  // QF -> SF (right side)
  {
    const qTop  = pairTopCenter(G.qfCenters[0]);
    const qBot  = pairBotCenter(G.qfCenters[1]);

    const sTop  = pairTopCenter(G.sfCenter);
    const sBot  = pairBotCenter(G.sfCenter);

    joinRightToLeft(X(5), X(4)+G.colW, qTop, qBot, sTop, sBot);
  }
  // SF -> Final right mini box
  paths.push(h(X(4), G.sfCenter, finalRightX+G.finalW));

  // mid-bar between finalists
  paths.push(h(finalLeftX+G.finalW, G.finalY, finalRightX));

  return (
    <div className={s.viewport}>
      <div
        className={s.stage}
        style={{
          width: `${G.stageW}px`,
          height: `${G.stageH}px`,
          "--slotH": `${G.slotH}px`,
          "--colw": `${G.colW}px`,
          "--gap": `${G.gap}px`,
          "--joinW": `${G.wire}px`,
        }}
      >
        {/* Round titles (middle says FINAL per your request) */}
        <div className={s.titles}>
          <span className={s.title}>Round of 16</span>
          <span className={s.title}>Quarterfinals</span>
          <span className={s.title}>Semifinals</span>
          <span className={s.title}>Final</span>
          <span className={s.title}>Semifinals</span>
          <span className={s.title}>Quarterfinals</span>
          <span className={s.title}>Round of 16</span>
        </div>

        {/* WINNER label above the champ pill */}
        <div className={s.winnerLabel} style={{ top: G.winnerTop }}>WINNER</div>
        <div className={s.champ} style={{ top: G.champTop }}>TBD</div>

        {/* Lines */}
        <svg className={s.wires} width={G.stageW} height={G.stageH}>
          <g stroke="#2a2f36" strokeWidth={wire} strokeLinecap="square" fill="none" shapeRendering="crispEdges">
            {paths}
          </g>
        </svg>

        {/* Boxes */}
        {boxes}
        {finalLeft}
        {finalRight}
      </div>
    </div>
  );

  // helpers
  function box(x, y, text) {
    return (
      <div key={`${x}-${y}-${text}`} className={s.slot} style={{ left: x, top: y }}>
        {text}
      </div>
    );
  }
  function miniBox(x, y, text) {
    return (
      <div key={`final-${x}-${y}-${text}`} className={`${s.slot} ${s.finalSlot}`} style={{ left: x, top: y }}>
        {text}
      </div>
    );
  }

  // Lines
  function h(x1, y, x2) { return <path key={`h-${x1}-${y}-${x2}`} d={`M ${x1} ${y} H ${x2}`} />; }
  function v(x, y1, y2) { return <path key={`v-${x}-${y1}-${y2}`} d={`M ${x} ${y1} V ${y2}`} />; }

  // Joiners that align source slot centers to DEST slot centers
  function joinLeftToRight(x1, x2, ySrcTop, ySrcBot, yDstTop, yDstBot) {
    const xStubEnd   = x1 + G.stub;
    const xCollector = (x1 + x2) / 2;
    // stubs from R16/QF source
    paths.push(h(x1, ySrcTop, xStubEnd)); paths.push(h(x1, ySrcBot, xStubEnd));
    // arms to collector at source levels
    paths.push(h(xStubEnd, ySrcTop, xCollector)); paths.push(h(xStubEnd, ySrcBot, xCollector));
    // collector spanning source top↔bottom
    paths.push(v(xCollector, ySrcTop, ySrcBot));
    // arms out to target at target slot midlines
    paths.push(h(xCollector, yDstTop, x2)); paths.push(h(xCollector, yDstBot, x2));
  }
  function joinRightToLeft(x1, x2, ySrcTop, ySrcBot, yDstTop, yDstBot) {
    const xStubEnd   = x1 - G.stub;
    const xCollector = (x1 + x2) / 2;
    paths.push(h(x1, ySrcTop, xStubEnd)); paths.push(h(x1, ySrcBot, xStubEnd));
    paths.push(h(xStubEnd, ySrcTop, xCollector)); paths.push(h(xStubEnd, ySrcBot, xCollector));
    paths.push(v(xCollector, ySrcTop, ySrcBot));
    paths.push(h(xCollector, yDstTop, x2)); paths.push(h(xCollector, yDstBot, x2));
  }
}

function normalizeData(data) {
  const L = data?.left ?? {};
  const R = data?.right ?? {};
  const F = data?.final ?? {};
  return {
    left: {
      R16: L.R16 ?? [
        ["Seed 1","Seed 2"],
        ["Seed 3","Seed 4"],
        ["Seed 5","Seed 6"],
        ["Seed 7","Seed 8"],
      ],
      QF: L.QF ?? [["TBD","TBD"],["TBD","TBD"]],
      SF: L.SF ?? ["TBD","TBD"],
    },
    right: {
      R16: R.R16 ?? [
        ["Seed 9","Seed 10"],
        ["Seed 11","Seed 12"],
        ["Seed 13","Seed 14"],
        ["Seed 15","Seed 16"],
      ],
      QF: R.QF ?? [["TBD","TBD"],["TBD","TBD"]],
      SF: R.SF ?? ["TBD","TBD"],
    },
    final: {
      left: F.left ?? "TBD",
      right: F.right ?? "TBD",
      champion: F.champion ?? "TBD",
    },
  };
}

function avg(a, b){ return (a + b) / 2; }