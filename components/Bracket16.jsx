// components/Bracket16.jsx
import React, { useMemo } from "react";
import s from "../styles/Bracket16.module.css";

/**
 * Geometry-first bracket:
 *  - Every box is absolutely positioned from computed (x,y).
 *  - All connectors are drawn in one SVG using the exact same coordinates.
 *  - Final center is mathematically tied to the Semifinal feeders (no drift).
 */
export default function Bracket16({ data }) {
  const D = normalizeData(data);

  // --- TUNABLE GEOMETRY (one source of truth) ---
  const G = useMemo(() => {
    const colW        = 150;  // px, width of normal slots
    const gap         = 34;   // px, wider column spacing for cleaner look
    const slotH       = 38;   // px, slot height
    const slotGap     = 12;   // px, gap between the two slots in a pair
    const stub        = 14;   // px, short horizontal from box edge
    const wire        = 2;    // px, line thickness

    // "pair block" height (two slots + gap)
    const pairBlock   = slotH * 2 + slotGap;

    // Vertical rhythms (perfect centering across rounds)
    const r16Space    = 26;   // vertical air between R16 pairs
    const qfSpace     = pairBlock + r16Space;
    const sfSpace     = pairBlock + qfSpace;

    // Column X positions (0..6)
    const X           = (i) => i * (colW + gap);

    // Titles band + header padding (moves whole bracket down)
    const titleBand   = 28;
    const headerPad   = 64;   // moved everything down further under navbar
    const topPad      = titleBand + headerPad;

    // R16 pair centers (left/right share this sequence)
    const r16Centers  = Array.from({ length: 4 }, (_, i) =>
      topPad + (pairBlock / 2) + i * (pairBlock + r16Space)
    );

    // QF centers = midpoints of their two R16 feeders (exactly centered)
    const qfCenters   = [0, 1].map(i => avg(r16Centers[2*i], r16Centers[2*i+1]));

    // SF center = midpoint of QF feeders
    const sfCenter    = avg(qfCenters[0], qfCenters[1]);

    // Final center is the same Y (keeps perfect alignment)
    const finalY      = sfCenter;

    // Stage size
    const stageW      = X(6) + colW;
    const lastBottom  = r16Centers[3] + pairBlock / 2;
    const bottomPad   = 100;   // extra breathing room at bottom
    const stageH      = Math.ceil(lastBottom + bottomPad);

    // Finalist layout
    const finalW      = 84;                 // mini boxes width
    const finalMidGap = 22;                 // wider gap between tiny finals
    const centerX     = X(3) + colW / 2;    // midline of center column

    // Champion pill placement: lock to just above finals
    // Pill top sits some distance above the finals' top edge.
    const champTop    = finalY - slotH - 48;   // move this number to raise/lower pill
    const winnerTop   = champTop + 38;         // label under the pill

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
  // LEFT: QF (col 1) — exactly centered between each R16 pair
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

  // CENTER: two small finalist boxes (more mid-gap)
  const finalLeftX  = G.centerX - G.finalMidGap/2 - G.finalW;
  const finalRightX = G.centerX + G.finalMidGap/2;
  const finalTop    = G.finalY - slotH / 2;
  const finalLeft   = miniBox(finalLeftX, finalTop, D.final.left);
  const finalRight  = miniBox(finalRightX, finalTop, D.final.right);

  // --- Build all connector paths (SVG) ---------------------------------------
  const paths = [];

  const joinLeftToRight = (x1, x2, yTop, yBot) => {
    const xStubEnd   = x1 + stub;
    const xCollector = (x1 + x2) / 2;
    paths.push(h(x1, yTop, xStubEnd)); paths.push(h(x1, yBot, xStubEnd));
    paths.push(h(xStubEnd, yTop, xCollector)); paths.push(h(xStubEnd, yBot, xCollector));
    paths.push(v(xCollector, yTop, yBot));
    paths.push(h(xCollector, yTop, x2)); paths.push(h(xCollector, yBot, x2));
  };
  const joinRightToLeft = (x1, x2, yTop, yBot) => {
    const xStubEnd   = x1 - stub;
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
    joinLeftToRight(X(0)+G.colW, X(1), yTop, yBot);
  }
  // QF -> SF (left)
  {
    const yTop = G.qfCenters[0] - (slotGap/2 + slotH/2);
    const yBot = G.qfCenters[1] + (slotGap/2 + slotH/2);
    joinLeftToRight(X(1)+G.colW, X(2), yTop, yBot);
  }
  // SF -> Final left mini box
  paths.push(h(X(2)+G.colW, G.sfCenter, finalLeftX));

  // R16 -> QF (right)
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
        {/* Round titles (grid mirrors columns/gaps exactly) */}
        <div className={s.titles}>
          <span className={s.title}>Round of 16</span>
          <span className={s.title}>Quarterfinals</span>
          <span className={s.title}>Semifinals</span>
          <span className={s.title}>Winner</span>
          <span className={s.title}>Semifinals</span>
          <span className={s.title}>Quarterfinals</span>
          <span className={s.title}>Round of 16</span>
        </div>

        {/* Champ pill & WINNER label anchored to finals */}
        <div className={s.champ} style={{ top: G.champTop }}>TBD</div>
        <div className={s.winnerLabel} style={{ top: G.winnerTop }}>WINNER</div>

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
  function h(x1, y, x2) { return <path key={`h-${x1}-${y}-${x2}`} d={`M ${x1} ${y} H ${x2}`} />; }
  function v(x, y1, y2) { return <path key={`v-${x}-${y1}-${y2}`} d={`M ${x} ${y1} V ${y2}`} />; }
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