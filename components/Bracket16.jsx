// components/Bracket16.jsx
import React, { useMemo } from "react";
import s from "../styles/Bracket16.module.css";

/**
 * Absolute-positioned, math-driven bracket:
 *  - Boxes placed from computed (x,y).
 *  - One SVG draws all connectors using the same coordinates.
 *  - QF pairs are centered between R16 feeders; SF centers QFs; Final centers SFs.
 */
export default function Bracket16({ data }) {
  const D = normalizeData(data);

  // --- TUNABLE GEOMETRY ---
  const G = useMemo(() => {
    const colW        = 150;  // px
    const gap         = 34;   // px column spacing
    const slotH       = 38;   // px slot height
    const stub        = 14;   // px small horizontal stub
    const wire        = 2;    // px line thickness

    // Per-round inner gaps (distance between the two slots in a pair)
    const innerGapR16 = 12;
    const innerGapQF  = 28;   // roomy QF boxes
    const innerGapSF  = 20;

    // R16 vertical rhythm
    const pairBlockR16 = slotH * 2 + innerGapR16;
    const r16Space     = 26;  // space between R16 pairs

    const X            = (i) => i * (colW + gap);

    const titleBand    = 28;
    const headerPad    = 64;  // push under navbar
    const topPad       = titleBand + headerPad;

    // R16 pair centers (left & right share)
    const r16Centers   = Array.from({ length: 4 }, (_, i) =>
      topPad + (pairBlockR16 / 2) + i * (pairBlockR16 + r16Space)
    );

    // QF centers are PURE midpoints between their two R16 matches
    const qfCenters    = [0, 1].map(i => avg(r16Centers[2*i], r16Centers[2*i+1]));

    // SF/Final centers
    const sfCenter     = avg(qfCenters[0], qfCenters[1]);
    const finalY       = sfCenter;

    // Stage size
    const stageW       = X(6) + colW;
    const lastBottom   = r16Centers[3] + (pairBlockR16 / 2);
    const bottomPad    = 100;
    const stageH       = Math.ceil(lastBottom + bottomPad);

    // Finals layout
    const finalW       = 84;
    const finalMidGap  = 22;
    const centerX      = X(3) + colW / 2;

    // Champ pill + WINNER label positions (moved further up)
    const champOffset  = 36;  // ↑ move pill up above final line
    const winnerAbove  = 30;  // ↑ label sits this many px above the pill
    const champTop     = finalY - slotH - champOffset;
    const winnerTop    = champTop - winnerAbove;

    return {
      colW, gap, slotH, stub, wire,
      innerGapR16, innerGapQF, innerGapSF,
      X, r16Centers, qfCenters, sfCenter, finalY,
      stageW, stageH,
      finalW, finalMidGap, centerX,
      champTop, winnerTop
    };
  }, []);

  // --- helpers for slot geometry ---
  const slotTop = (pairY, innerGap) => pairY - (innerGap / 2) - G.slotH;
  const slotBot = (pairY, innerGap) => pairY + (innerGap / 2);

  // Midline of an individual slot
  const midTop  = (pairY, innerGap) => pairY - (innerGap / 2 + G.slotH / 2);
  const midBot  = (pairY, innerGap) => pairY + (innerGap / 2 + G.slotH / 2);

  // --- Build boxes -----------------------------------------------------------
  const boxes = [];

  // LEFT: R16 (col 0)
  for (let i = 0; i < 4; i++) {
    const y = G.r16Centers[i];
    boxes.push(box(G.X(0), slotTop(y, G.innerGapR16),  D.left.R16[i][0]));
    boxes.push(box(G.X(0), slotBot(y, G.innerGapR16),  D.left.R16[i][1]));
  }
  // LEFT: QF (col 1) — larger inner gap but still centered
  for (let i = 0; i < 2; i++) {
    const y = G.qfCenters[i];
    boxes.push(box(G.X(1), slotTop(y, G.innerGapQF), D.left.QF[i][0]));
    boxes.push(box(G.X(1), slotBot(y, G.innerGapQF), D.left.QF[i][1]));
  }
  // LEFT: SF (col 2)
  boxes.push(box(G.X(2), slotTop(G.sfCenter, G.innerGapSF), D.left.SF[0]));
  boxes.push(box(G.X(2), slotBot(G.sfCenter, G.innerGapSF), D.left.SF[1]));

  // RIGHT: mirror (cols 6,5,4)
  for (let i = 0; i < 4; i++) {
    const y = G.r16Centers[i];
    boxes.push(box(G.X(6), slotTop(y, G.innerGapR16),  D.right.R16[i][0]));
    boxes.push(box(G.X(6), slotBot(y, G.innerGapR16),  D.right.R16[i][1]));
  }
  for (let i = 0; i < 2; i++) {
    const y = G.qfCenters[i];
    boxes.push(box(G.X(5), slotTop(y, G.innerGapQF), D.right.QF[i][0]));
    boxes.push(box(G.X(5), slotBot(y, G.innerGapQF), D.right.QF[i][1]));
  }
  boxes.push(box(G.X(4), slotTop(G.sfCenter, G.innerGapSF), D.right.SF[0]));
  boxes.push(box(G.X(4), slotBot(G.sfCenter, G.innerGapSF), D.right.SF[1]));

  // CENTER finalists
  const finalLeftX  = G.centerX - G.finalMidGap/2 - G.finalW;
  const finalRightX = G.centerX + G.finalMidGap/2;
  const finalTop    = G.finalY - G.slotH / 2;
  const finalLeft   = miniBox(finalLeftX, finalTop, D.final.left);
  const finalRight  = miniBox(finalRightX, finalTop, D.final.right);

  // --- Build connectors (SVG) ------------------------------------------------
  const paths = [];

  // R16 -> QF (left): draw from ALL FOUR slots (two per R16 pair)
  // Top half (pairs 0 -> QF0.top, 1 -> QF0.bottom)
  joinPairToQF_L(G.X(0)+G.colW, G.X(1), G.r16Centers[0], G.innerGapR16, midTop(G.qfCenters[0], G.innerGapQF));
  joinPairToQF_L(G.X(0)+G.colW, G.X(1), G.r16Centers[1], G.innerGapR16, midBot(G.qfCenters[0], G.innerGapQF));
  // Bottom half (pairs 2 -> QF1.top, 3 -> QF1.bottom)
  joinPairToQF_L(G.X(0)+G.colW, G.X(1), G.r16Centers[2], G.innerGapR16, midTop(G.qfCenters[1], G.innerGapQF));
  joinPairToQF_L(G.X(0)+G.colW, G.X(1), G.r16Centers[3], G.innerGapR16, midBot(G.qfCenters[1], G.innerGapQF));

  // QF -> SF (left): classic two-to-one collector from QF pair into SF pair
  joinLeftToRight(G.X(1)+G.colW, G.X(2),
    midTop(G.qfCenters[0], G.innerGapQF), midBot(G.qfCenters[1], G.innerGapQF),
    midTop(G.sfCenter, G.innerGapSF),     midBot(G.sfCenter, G.innerGapSF)
  );

  // SF -> Final left
  paths.push(h(G.X(2)+G.colW, G.sfCenter, finalLeftX));

  // R16 -> QF (right): mirror, from ALL FOUR slots
  joinPairToQF_R(G.X(6), G.X(5)+G.colW, G.r16Centers[0], G.innerGapR16, midTop(G.qfCenters[0], G.innerGapQF));
  joinPairToQF_R(G.X(6), G.X(5)+G.colW, G.r16Centers[1], G.innerGapR16, midBot(G.qfCenters[0], G.innerGapQF));
  joinPairToQF_R(G.X(6), G.X(5)+G.colW, G.r16Centers[2], G.innerGapR16, midTop(G.qfCenters[1], G.innerGapQF));
  joinPairToQF_R(G.X(6), G.X(5)+G.colW, G.r16Centers[3], G.innerGapR16, midBot(G.qfCenters[1], G.innerGapQF));

  // QF -> SF (right)
  joinRightToLeft(G.X(5), G.X(4)+G.colW,
    midTop(G.qfCenters[0], G.innerGapQF), midBot(G.qfCenters[1], G.innerGapQF),
    midTop(G.sfCenter, G.innerGapSF),     midBot(G.sfCenter, G.innerGapSF)
  );

  // SF -> Final right
  paths.push(h(G.X(4), G.sfCenter, finalRightX+G.finalW));

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
        {/* Titles */}
        <div className={s.titles}>
          <span className={s.title}>Round of 16</span>
          <span className={s.title}>Quarterfinals</span>
          <span className={s.title}>Semifinals</span>
          <span className={s.title}>Final</span>
          <span className={s.title}>Semifinals</span>
          <span className={s.title}>Quarterfinals</span>
          <span className={s.title}>Round of 16</span>
        </div>

        {/* WINNER (above) + champ pill */}
        <div className={s.winnerLabel} style={{ top: G.winnerTop }}>WINNER</div>
        <div className={s.champ} style={{ top: G.champTop }}>TBD</div>

        {/* Lines */}
        <svg className={s.wires} width={G.stageW} height={G.stageH}>
          <g stroke="#2a2f36" strokeWidth={G.wire} strokeLinecap="square" fill="none" shapeRendering="crispEdges">
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

  // ---- element helpers ----
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

  // ---- path helpers ----
  function h(x1, y, x2) { return <path key={`h-${x1}-${y}-${x2}`} d={`M ${x1} ${y} H ${x2}`} />; }
  function v(x, y1, y2) { return <path key={`v-${x}-${y1}-${y2}`} d={`M ${x} ${y1} V ${y2}`} />; }

  // New: connect a *single R16 pair* to a *single QF slot* (LEFT → RIGHT)
  // Draw two stubs (both R16 slots), a mini vertical join, then one arm to the QF slot midline.
  function joinPairToQF_L(xSrcRight, xDstLeft, pairCenter, srcInnerGap, yDstMid) {
    const yTop = pairCenter - (srcInnerGap / 2 + G.slotH / 2);
    const yBot = pairCenter + (srcInnerGap / 2 + G.slotH / 2);
    const xJoin = xSrcRight + G.stub;
    paths.push(h(xSrcRight, yTop, xJoin));  // top stub
    paths.push(h(xSrcRight, yBot, xJoin));  // bottom stub
    paths.push(v(xJoin, yTop, yBot));       // mini-join
    paths.push(h(xJoin, yDstMid, xDstLeft)); // arm to QF slot
  }

  // Mirror for RIGHT → LEFT
  function joinPairToQF_R(xSrcLeft, xDstRight, pairCenter, srcInnerGap, yDstMid) {
    const yTop = pairCenter - (srcInnerGap / 2 + G.slotH / 2);
    const yBot = pairCenter + (srcInnerGap / 2 + G.slotH / 2);
    const xJoin = xSrcLeft - G.stub;
    paths.push(h(xSrcLeft, yTop, xJoin));   // top stub
    paths.push(h(xSrcLeft, yBot, xJoin));   // bottom stub
    paths.push(v(xJoin, yTop, yBot));       // mini-join
    paths.push(h(xJoin, yDstMid, xDstRight)); // arm to QF slot
  }

  // Classic “two-to-one” collector used for QF -> SF and mirrored on the right
  function joinLeftToRight(x1, x2, ySrcTop, ySrcBot, yDstTop, yDstBot) {
    const xStubEnd   = x1 + G.stub;
    const xCollector = (x1 + x2) / 2;
    paths.push(h(x1, ySrcTop, xStubEnd)); paths.push(h(x1, ySrcBot, xStubEnd));
    paths.push(h(xStubEnd, ySrcTop, xCollector)); paths.push(h(xStubEnd, ySrcBot, xCollector));
    paths.push(v(xCollector, ySrcTop, ySrcBot));
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