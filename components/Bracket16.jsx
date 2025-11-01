import React, { useMemo } from "react";
import s from "../styles/Bracket16.module.css";

/**
 * Absolute-positioned, pixel-precise 16-team bracket with SVG wires.
 * This version adds a small overlap (OVERLAP_PX) where QF rails meet the SF stubs,
 * guaranteeing visible connection even under scaling/AA.
 */
export default function Bracket16({ data }) {
  const D = normalizeData(data);

  // ---------- Geometry ----------
  const G = useMemo(() => {
    const colW  = 150;
    const gap   = 34;
    const slotH = 38;
    const stub  = 14; // length of the small “stub” at box edges
    const wire  = 2;

    const innerGapR16 = 12;
    const innerGapQF  = 30;
    const innerGapSF  = 20;

    const X = (i) => i * (colW + gap);

    const titleBand = 28;
    const headerPad = 64;
    const topPad    = titleBand + headerPad;

    const pairBlockR16 = slotH * 2 + innerGapR16;
    const r16Space     = 26;

    const r16Centers = Array.from({ length: 4 }, (_, i) =>
      topPad + (pairBlockR16 / 2) + i * (pairBlockR16 + r16Space)
    );

    const qfCenters = [0,1].map(i => avg(r16Centers[2*i], r16Centers[2*i+1]));
    const sfCenter  = avg(qfCenters[0], qfCenters[1]);
    const finalY    = sfCenter;

    const stageW    = X(6) + colW;
    const lastBot   = r16Centers[3] + (pairBlockR16 / 2);
    const stageH    = Math.ceil(lastBot + 100);

    const finalW      = 84;
    const finalMidGap = 22;
    const centerX     = X(3) + colW / 2;

    const champOffset = 52;
    const winnerAbove = 36;
    const champTop    = finalY - slotH - champOffset;
    const winnerTop   = champTop - winnerAbove;

    return {
      colW, gap, slotH, stub, wire,
      innerGapR16, innerGapQF, innerGapSF,
      X, r16Centers, qfCenters, sfCenter, finalY,
      stageW, stageH,
      finalW, finalMidGap, centerX,
      champTop, winnerTop,
    };
  }, []);

  const OVERLAP_PX = 2; // <- NEW: force-join rails & stubs

  const slotTop = (pairY, innerGap) => pairY - (innerGap / 2) - G.slotH;
  const slotBot = (pairY, innerGap) => pairY + (innerGap / 2);
  const midTop  = (pairY, innerGap) => pairY - (innerGap / 2 + G.slotH / 2);
  const midBot  = (pairY, innerGap) => pairY + (innerGap / 2 + G.slotH / 2);

  // ---------- Boxes ----------
  const boxes = [];

  // Left R16
  for (let i=0;i<4;i++){
    const y = G.r16Centers[i];
    boxes.push(slotBox(G.X(0), slotTop(y, G.innerGapR16),  (data?.left?.R16 ?? [])[i]?.[0] ?? D.left.R16[i][0]));
    boxes.push(slotBox(G.X(0), slotBot(y, G.innerGapR16),  (data?.left?.R16 ?? [])[i]?.[1] ?? D.left.R16[i][1]));
  }
  // Left QF
  for (let i=0;i<2;i++){
    const y = G.qfCenters[i];
    boxes.push(slotBox(G.X(1), slotTop(y, G.innerGapQF), D.left.QF[i][0]));
    boxes.push(slotBox(G.X(1), slotBot(y, G.innerGapQF), D.left.QF[i][1]));
  }
  // Left SF
  boxes.push(slotBox(G.X(2), slotTop(G.sfCenter, G.innerGapSF), D.left.SF[0]));
  boxes.push(slotBox(G.X(2), slotBot(G.sfCenter, G.innerGapSF), D.left.SF[1]));

  // Right R16
  for (let i=0;i<4;i++){
    const y = G.r16Centers[i];
    boxes.push(slotBox(G.X(6), slotTop(y, G.innerGapR16),  (data?.right?.R16 ?? [])[i]?.[0] ?? D.right.R16[i][0]));
    boxes.push(slotBox(G.X(6), slotBot(y, G.innerGapR16),  (data?.right?.R16 ?? [])[i]?.[1] ?? D.right.R16[i][1]));
  }
  // Right QF
  for (let i=0;i<2;i++){
    const y = G.qfCenters[i];
    boxes.push(slotBox(G.X(5), slotTop(y, G.innerGapQF), D.right.QF[i][0]));
    boxes.push(slotBox(G.X(5), slotBot(y, G.innerGapQF), D.right.QF[i][1]));
  }
  // Right SF
  boxes.push(slotBox(G.X(4), slotTop(G.sfCenter, G.innerGapSF), D.right.SF[0]));
  boxes.push(slotBox(G.X(4), slotBot(G.sfCenter, G.innerGapSF), D.right.SF[1]));

  // Finalists
  const finalLeftX  = G.X(3) + G.colW/2 - G.finalMidGap/2 - G.finalW;
  const finalRightX = G.X(3) + G.colW/2 + G.finalMidGap/2;
  const finalTop    = G.finalY - G.slotH/2;
  const finalLeft   = finalBox(finalLeftX,  finalTop, D.final.left);
  const finalRight  = finalBox(finalRightX, finalTop, D.final.right);

  // ---------- Wires ----------
  const paths = [];
  const H = (x1,y,x2) => <path key={`h-${x1}-${y}-${x2}`} d={`M ${x1} ${y} H ${x2}`} />;
  const V = (x,y1,y2) => <path key={`v-${x}-${y1}-${y2}`} d={`M ${x} ${y1} V ${y2}`} />;

  // Left helpers
  function joinPairToMid_L(xSrcRight, xDstStop, pairCenter, srcInnerGap, yDstMid){
    const yTop = pairCenter - (srcInnerGap/2 + G.slotH/2);
    const yBot = pairCenter + (srcInnerGap/2 + G.slotH/2);
    const xJoin = xSrcRight + G.stub;

    // top/bot stubs from QF boxes
    paths.push(H(xSrcRight, yTop, xJoin));
    paths.push(H(xSrcRight, yBot, xJoin));
    // vertical collector
    paths.push(V(xJoin, yTop, yBot));
    // horizontal rail to (just before) SF stub with overlap
    paths.push(H(xJoin, yDstMid, xDstStop + OVERLAP_PX));
  }
  // Right helpers
  function joinPairToMid_R(xSrcLeft, xDstStop, pairCenter, srcInnerGap, yDstMid){
    const yTop = pairCenter - (srcInnerGap/2 + G.slotH/2);
    const yBot = pairCenter + (srcInnerGap/2 + G.slotH/2);
    const xJoin = xSrcLeft - G.stub;

    paths.push(H(xSrcLeft, yTop, xJoin));
    paths.push(H(xSrcLeft, yBot, xJoin));
    paths.push(V(xJoin, yTop, yBot));
    paths.push(H(xJoin, yDstMid, xDstStop - OVERLAP_PX));
  }

  // R16 -> QF (left)
  joinPairToMid_L(G.X(0)+G.colW, G.X(1), G.r16Centers[0], G.innerGapR16, midTop(G.qfCenters[0], G.innerGapQF));
  joinPairToMid_L(G.X(0)+G.colW, G.X(1), G.r16Centers[1], G.innerGapR16, midBot(G.qfCenters[0], G.innerGapQF));
  joinPairToMid_L(G.X(0)+G.colW, G.X(1), G.r16Centers[2], G.innerGapR16, midTop(G.qfCenters[1], G.innerGapQF));
  joinPairToMid_L(G.X(0)+G.colW, G.X(1), G.r16Centers[3], G.innerGapR16, midBot(G.qfCenters[1], G.innerGapQF));

  // QF -> SF (left)
  const sfLeftEdgeX = G.X(2);
  const leftStubStart = sfLeftEdgeX - G.stub - OVERLAP_PX; // extend backward for overlap
  joinPairToMid_L(G.X(1)+G.colW, leftStubStart, G.qfCenters[0], G.innerGapQF, midTop(G.sfCenter, G.innerGapSF));
  joinPairToMid_L(G.X(1)+G.colW, leftStubStart, G.qfCenters[1], G.innerGapQF, midBot(G.sfCenter, G.innerGapSF));
  // two explicit stubs into SF box (overlapping the rails)
  paths.push(H(leftStubStart, midTop(G.sfCenter, G.innerGapSF), sfLeftEdgeX));
  paths.push(H(leftStubStart, midBot(G.sfCenter, G.innerGapSF), sfLeftEdgeX));

  // SF -> Final (left)
  paths.push(H(G.X(2)+G.colW, G.sfCenter, finalLeftX));

  // R16 -> QF (right)
  joinPairToMid_R(G.X(6), G.X(5)+G.colW, G.r16Centers[0], G.innerGapR16, midTop(G.qfCenters[0], G.innerGapQF));
  joinPairToMid_R(G.X(6), G.X(5)+G.colW, G.r16Centers[1], G.innerGapR16, midBot(G.qfCenters[0], G.innerGapQF));
  joinPairToMid_R(G.X(6), G.X(5)+G.colW, G.r16Centers[2], G.innerGapR16, midTop(G.qfCenters[1], G.innerGapQF));
  joinPairToMid_R(G.X(6), G.X(5)+G.colW, G.r16Centers[3], G.innerGapR16, midBot(G.qfCenters[1], G.innerGapQF));

  // QF -> SF (right)
  const sfRightEdgeX = G.X(4) + G.colW;
  const rightStubEnd = sfRightEdgeX + G.stub + OVERLAP_PX; // extend forward for overlap
  joinPairToMid_R(G.X(5), rightStubEnd, G.qfCenters[0], G.innerGapQF, midTop(G.sfCenter, G.innerGapSF));
  joinPairToMid_R(G.X(5), rightStubEnd, G.qfCenters[1], G.innerGapQF, midBot(G.sfCenter, G.innerGapSF));
  // two explicit stubs from SF box (overlapping the rails)
  paths.push(H(sfRightEdgeX, midTop(G.sfCenter, G.innerGapSF), rightStubEnd));
  paths.push(H(sfRightEdgeX, midBot(G.sfCenter, G.innerGapSF), rightStubEnd));

  // SF -> Final (right)
  paths.push(H(G.X(4), G.sfCenter, finalRightX + G.finalW));

  // finalists mid-bar
  paths.push(H(finalLeftX + G.finalW, G.finalY, finalRightX));

  // ---------- Render ----------
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
        <div className={s.titles}>
          <span className={s.title}>Round of 16</span>
          <span className={s.title}>Quarterfinals</span>
          <span className={s.title}>Semifinals</span>
          <span className={s.title}>Final</span>
          <span className={s.title}>Semifinals</span>
          <span className={s.title}>Quarterfinals</span>
          <span className={s.title}>Round of 16</span>
        </div>

        <div className={s.winnerLabel} style={{ top: G.winnerTop }}>WINNER</div>
        <div className={s.champ} style={{ top: G.champTop }}>{D.final.champion}</div>

        {/* wires under boxes */}
        <svg className={s.wires} width={G.stageW} height={G.stageH}>
          <g stroke="#2a2f36" strokeWidth={G.wire} strokeLinecap="square" fill="none">
            {paths}
          </g>
        </svg>

        {boxes}
        {finalLeft}
        {finalRight}
      </div>
    </div>
  );

  // ---------- Box helpers ----------
  function slotBox(x,y,text){
    return <div key={`${x}-${y}-${text}`} className={s.slot} style={{ left:x, top:y }}>{text}</div>;
  }
  function finalBox(x,y,text){
    return <div key={`f-${x}-${y}-${text}`} className={`${s.slot} ${s.finalSlot}`} style={{ left:x, top:y }}>{text}</div>;
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
function avg(a,b){ return (a+b)/2; }