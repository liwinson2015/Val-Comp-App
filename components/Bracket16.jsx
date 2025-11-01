// components/Bracket16.jsx
import React, { useMemo } from "react";
import s from "../styles/Bracket16.module.css";

/**
 * Geometry-first bracket:
 *  - Every box is absolutely positioned from computed (x,y).
 *  - All connectors are drawn in one SVG using the exact same coordinates.
 *  - Final row Y is mathematically the midpoint of the two Semifinal pairs.
 */
export default function Bracket16({ data }) {
  const D = normalizeData(data);

  // --- TUNABLE GEOMETRY (these numbers drive BOTH boxes & lines) ---
  const G = useMemo(() => {
    const colW   = 150;  // px, width of normal slots
    const gap    = 22;   // px, space between columns
    const slotH  = 38;   // px, slot height
    const slotGap= 12;   // px, gap between the two slots in a pair
    const stub   = 12;   // px, short horizontal from box edge
    const wire   = 2;    // px, line thickness

    // "pair block" height (two slots + gap)
    const pairBlock = slotH * 2 + slotGap;

    // Round spacings (center next round between its two feeders)
    const r16Space = 22;
    const qfSpace  = pairBlock + r16Space; // centers QF between two R16s
    const sfSpace  = pairBlock + qfSpace;  // centers SF between two QFs

    // Column X positions (0..6)
    const X = (i) => i * (colW + gap);

    // Titles band height
    const titleBand = 28;       // room for round labels
    const topPad    = titleBand + 18;

    // R16 pair centers (left/right share the same Y sequence)
    const r16Centers = Array.from({ length: 4 }, (_, i) =>
      topPad + (pairBlock / 2) + i * (pairBlock + r16Space)
    );

    // QF centers = midpoint of their two R16 feeders
    const qfCenters = [0, 1].map(i => avg(r16Centers[2*i], r16Centers[2*i+1]));

    // SF center = midpoint of its two QF feeders (same on both sides)
    const sfCenter = avg(qfCenters[0], qfCenters[1]);

    // Final center Y equals SF centers (left==right by construction)
    const finalY = sfCenter;

    // Stage size
    const stageW = X(6) + colW;
    const lastPairBottom = r16Centers[3] + pairBlock / 2;
    const bottomPad = 40;
    const stageH = Math.ceil(lastPairBottom + bottomPad);

    return {
      colW, gap, slotH, slotGap, stub, wire,
      pairBlock, r16Space, qfSpace, sfSpace,
      X, topPad, r16Centers, qfCenters, sfCenter, finalY,
      stageW, stageH,
      finalW: 84,   // width of mini final boxes
      centerX: (X(3) + colW / 2),  // midline X of the center column
    };
  }, []);

  // Short-hands
  const { X, slotH, slotGap, pairBlock, stub, wire, stageW, stageH } = G;

  // Helpers to compute slot top Y given a pair centerY
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
  // LEFT: QF (col 1)
  for (let i = 0; i < 2; i++) {
    const y = G.qfCenters[i];
    boxes.push(box(X(1), topSlotTop(y), D.left.QF[i][0]));
    boxes.push(box(X(1), botSlotTop(y), D.left.QF[i][1]));
  }
  // LEFT: SF (col 2)
  boxes.push(box(X(2), topSlotTop(G.sfCenter), D.left.SF[0]));
  boxes.push(box(X(2), botSlotTop(G.sfCenter), D.left.SF[1]));

  // RIGHT: mirror indices (col 6,5,4)
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

  // CENTER: two small finalist boxes (left/right of the midline)
  const finalLeftX  = G.centerX - 10 - G.finalW;  // 10px mid-gap
  const finalRightX = G.centerX + 10;
  const finalTop    = G.finalY - slotH / 2;
  const finalLeft   = miniBox(finalLeftX, finalTop, D.final.left);
  const finalRight  = miniBox(finalRightX, finalTop, D.final.right);

  // --- Build all connector paths (SVG) ---------------------------------------
  const paths = [];

  // helper: draw a T-join from two feeders at (x1,yTop),(x1,yBot) to a target column x2
  const joinLeftToRight = (x1, x2, yTop, yBot) => {
    const xStubEnd = x1 + stub;
    const xCollector = (x1 + x2) / 2;  // vertical collector centered in the gap
    // stubs + arms to collector
    paths.push(h(x1, yTop, xStubEnd)); paths.push(h(x1, yBot, xStubEnd));
    paths.push(h(xStubEnd, yTop, xCollector)); paths.push(h(xStubEnd, yBot, xCollector));
    // collector
    paths.push(v(xCollector, yTop, yBot));
    // arms to target column edge
    paths.push(h(xCollector, yTop, x2)); paths.push(h(xCollector, yBot, x2));
  };
  const joinRightToLeft = (x1, x2, yTop, yBot) => {
    const xStubEnd = x1 - stub;
    const xCollector = (x1 + x2) / 2;
    paths.push(h(x1, yTop, xStubEnd)); paths.push(h(x1, yBot, xStubEnd));
    paths.push(h(xStubEnd, yTop, xCollector)); paths.push(h(xStubEnd, yBot, xCollector));
    paths.push(v(xCollector, yTop, yBot));
    paths.push(h(xCollector, yTop, x2)); paths.push(h(xCollector, yBot, x2));
  };

  // R16 -> QF (left)
  for (let i = 0; i < 2; i++) {
    const yTop = G.r16Centers[2*i]   - (slotGap/2 + slotH/2);
    const yBot = G.r16Centers[2*i+1] + (slotGap/2 + slotH/2);
    // connect from right edge of R16 column to left edge of QF column
    joinLeftToRight(X(0)+G.colW, X(1), yTop, yBot);
  }
  // QF -> SF (left)
  {
    const yTop = G.qfCenters[0] - (slotGap/2 + slotH/2);
    const yBot = G.qfCenters[1] + (slotGap/2 + slotH/2);
    joinLeftToRight(X(1)+G.colW, X(2), yTop, yBot);
  }
  // SF -> Final left mini box (center line only)
  paths.push(h(X(2)+G.colW, G.sfCenter, finalLeftX, /*single line*/ true));

  // R16 -> QF (right, mirrored)
  for (let i = 0; i < 2; i++) {
    const yTop = G.r16Centers[2*i]   - (slotGap/2 + slotH/2);
    const yBot = G.r16Centers[2*i+1] + (slotGap/2 + slotH/2);
    joinRightToLeft(X(6), X(5)+G.colW, yTop, yBot);
  }
  // QF -> SF (right)
  {
    const yTop = G.qfCenters[0] - (slotGap/2 + slotH/2);
    const yBot = G.qfCenters[1] + (slotGap/2 + slotH/2);
    joinRightToLeft(X(5), X(4)+G.colW, yTop, yBot);
  }
  // SF -> Final right mini box
  paths.push(h(X(4), G.sfCenter, finalRightX+G.finalW, /*single*/ true));

  // center mid-bar between finalists
  paths.push(h(finalLeftX+G.finalW, G.finalY, finalRightX, true));

  return (
    <div className={s.viewport}>
      <div
        className={s.stage}
        style={{
          width: `${G.stageW}px`,
          height: `${G.stageH}px`,
          /* share numbers with CSS through custom properties */
          "--slotH": `${G.slotH}px`,
          "--colw": `${G.colW}px`,
          "--gap": `${G.gap}px`,
          "--joinW": `${G.wire}px`,
        }}
      >
        {/* Round titles */}
        <div className={s.titles}>
          <span className={s.title} style={{ left: 0 }}>Round of 16</span>
          <span className={s.title}>Quarterfinals</span>
          <span className={s.title}>Semifinals</span>
          <span className={s.title}>Winner</span>
          <span className={s.title}>Semifinals</span>
          <span className={s.title}>Quarterfinals</span>
          <span className={s.title}>Round of 16</span>
        </div>

        {/* Champion pill */}
        <div className={s.champ}>{D.final.champion}</div>

        {/* Lines */}
        <svg className={s.wires} width={stageW} height={stageH}>
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

  // ---------- helpers ----------
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
  function h(x1, y, x2) {
    // horizontal line from (x1,y) to (x2,y)
    return <path key={`h-${x1}-${y}-${x2}`} d={`M ${x1} ${y} H ${x2}`} />;
  }
  function v(x, y1, y2) {
    return <path key={`v-${x}-${y1}-${y2}`} d={`M ${x} ${y1} V ${y2}`} />;
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