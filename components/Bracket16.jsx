// components/Bracket16.jsx
import React, { useMemo } from "react";
import s from "../styles/Bracket16.module.css";

export default function Bracket16({ data }) {
  const D = normalizeData(data);

  // ---- geometry -------------------------------------------------------------
  const G = useMemo(() => {
    const colW  = 150;
    const gap   = 34;
    const slotH = 38;
    const stub  = 14;
    const wire  = 2;

    const innerGapR16 = 12;
    const innerGapQF  = 30;  // a bit roomier to read the 4 rails clearly
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

    const qfCenters  = [0,1].map(i => avg(r16Centers[2*i], r16Centers[2*i+1]));
    const sfCenter   = avg(qfCenters[0], qfCenters[1]);
    const finalY     = sfCenter;

    const stageW     = X(6) + colW;
    const lastBottom = r16Centers[3] + (pairBlockR16 / 2);
    const stageH     = Math.ceil(lastBottom + 100);

    const finalW      = 84;
    const finalMidGap = 22;
    const centerX     = X(3) + colW / 2;

    // raise the winner cluster slightly
    const champOffset = 48;  // ↑ move pill higher
    const winnerAbove = 34;  // label above the pill
    const champTop    = finalY - slotH - champOffset;
    const winnerTop   = champTop - winnerAbove;

    return {
      colW, gap, slotH, stub, wire,
      innerGapR16, innerGapQF, innerGapSF,
      X, r16Centers, qfCenters, sfCenter, finalY,
      stageW, stageH,
      finalW, finalMidGap, centerX,
      champTop, winnerTop
    };
  }, []);

  const slotTop = (pairY, innerGap) => pairY - (innerGap / 2) - G.slotH;
  const slotBot = (pairY, innerGap) => pairY + (innerGap / 2);
  const midTop  = (pairY, innerGap) => pairY - (innerGap / 2 + G.slotH / 2);
  const midBot  = (pairY, innerGap) => pairY + (innerGap / 2 + G.slotH / 2);

  // ---- boxes ---------------------------------------------------------------
  const boxes = [];
  // left R16
  for (let i=0;i<4;i++){
    const y = G.r16Centers[i];
    boxes.push(box(G.X(0), slotTop(y, G.innerGapR16),  D.left.R16[i][0]));
    boxes.push(box(G.X(0), slotBot(y, G.innerGapR16),  D.left.R16[i][1]));
  }
  // left QF
  for (let i=0;i<2;i++){
    const y = G.qfCenters[i];
    boxes.push(box(G.X(1), slotTop(y, G.innerGapQF), D.left.QF[i][0]));
    boxes.push(box(G.X(1), slotBot(y, G.innerGapQF), D.left.QF[i][1]));
  }
  // left SF
  boxes.push(box(G.X(2), slotTop(G.sfCenter, G.innerGapSF), D.left.SF[0]));
  boxes.push(box(G.X(2), slotBot(G.sfCenter, G.innerGapSF), D.left.SF[1]));

  // right R16
  for (let i=0;i<4;i++){
    const y = G.r16Centers[i];
    boxes.push(box(G.X(6), slotTop(y, G.innerGapR16),  D.right.R16[i][0]));
    boxes.push(box(G.X(6), slotBot(y, G.innerGapR16),  D.right.R16[i][1]));
  }
  // right QF
  for (let i=0;i<2;i++){
    const y = G.qfCenters[i];
    boxes.push(box(G.X(5), slotTop(y, G.innerGapQF), D.right.QF[i][0]));
    boxes.push(box(G.X(5), slotBot(y, G.innerGapQF), D.right.QF[i][1]));
  }
  // right SF
  boxes.push(box(G.X(4), slotTop(G.sfCenter, G.innerGapSF), D.right.SF[0]));
  boxes.push(box(G.X(4), slotBot(G.sfCenter, G.innerGapSF), D.right.SF[1]));

  // center finalists
  const finalLeftX  = G.centerX - G.finalMidGap/2 - G.finalW;
  const finalRightX = G.centerX + G.finalMidGap/2;
  const finalTop    = G.finalY - G.slotH/2;
  const finalLeft   = miniBox(finalLeftX, finalTop,  D.final.left);
  const finalRight  = miniBox(finalRightX, finalTop, D.final.right);

  // ---- wires (SVG) ---------------------------------------------------------
  const paths = [];

  // helpers
  const h = (x1,y,x2) => <path key={`h-${x1}-${y}-${x2}`} d={`M ${x1} ${y} H ${x2}`} />;
  const v = (x,y1,y2) => <path key={`v-${x}-${y1}-${y2}`} d={`M ${x} ${y1} V ${y2}`} />;
  const poly = (d)    => <path key={`p-${d}`} d={d} />;

  // R16 -> QF (left)
  joinPairToQF_L(G.X(0)+G.colW, G.X(1), G.r16Centers[0], G.innerGapR16, midTop(G.qfCenters[0], G.innerGapQF));
  joinPairToQF_L(G.X(0)+G.colW, G.X(1), G.r16Centers[1], G.innerGapR16, midBot(G.qfCenters[0], G.innerGapQF));
  joinPairToQF_L(G.X(0)+G.colW, G.X(1), G.r16Centers[2], G.innerGapR16, midTop(G.qfCenters[1], G.innerGapQF));
  joinPairToQF_L(G.X(0)+G.colW, G.X(1), G.r16Centers[3], G.innerGapR16, midBot(G.qfCenters[1], G.innerGapQF));

  // QF -> SF (left)  ***QUAD RAILS***
  quadRails_L(
    G.X(1)+G.colW, G.X(2),
    midTop(G.qfCenters[0], G.innerGapQF),  midBot(G.qfCenters[1], G.innerGapQF),
    midTop(G.sfCenter,   G.innerGapSF),    midBot(G.sfCenter,   G.innerGapSF)
  );

  // SF -> Final left
  paths.push(h(G.X(2)+G.colW, G.sfCenter, finalLeftX));

  // R16 -> QF (right)
  joinPairToQF_R(G.X(6), G.X(5)+G.colW, G.r16Centers[0], G.innerGapR16, midTop(G.qfCenters[0], G.innerGapQF));
  joinPairToQF_R(G.X(6), G.X(5)+G.colW, G.r16Centers[1], G.innerGapR16, midBot(G.qfCenters[0], G.innerGapQF));
  joinPairToQF_R(G.X(6), G.X(5)+G.colW, G.r16Centers[2], G.innerGapR16, midTop(G.qfCenters[1], G.innerGapQF));
  joinPairToQF_R(G.X(6), G.X(5)+G.colW, G.r16Centers[3], G.innerGapR16, midBot(G.qfCenters[1], G.innerGapQF));

  // QF -> SF (right) ***QUAD RAILS***
  quadRails_R(
    G.X(5), G.X(4)+G.colW,
    midTop(G.qfCenters[0], G.innerGapQF),  midBot(G.qfCenters[1], G.innerGapQF),
    midTop(G.sfCenter,   G.innerGapSF),    midBot(G.sfCenter,   G.innerGapSF)
  );

  // SF -> Final right
  paths.push(h(G.X(4), G.sfCenter, finalRightX + G.finalW));

  // finalists mid-bar
  paths.push(h(finalLeftX + G.finalW, G.finalY, finalRightX));

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

        <svg className={s.wires} width={G.stageW} height={G.stageH}>
          <g stroke="#2a2f36" strokeWidth={G.wire} strokeLinecap="square" fill="none" shapeRendering="crispEdges">
            {paths}
          </g>
        </svg>

        {boxes}
        {finalLeft}
        {finalRight}
      </div>
    </div>
  );

  // ---- box helpers ----------------------------------------------------------
  function box(x,y,text){
    return <div key={`${x}-${y}-${text}`} className={s.slot} style={{ left:x, top:y }}>{text}</div>;
  }
  function miniBox(x,y,text){
    return <div key={`f-${x}-${y}-${text}`} className={`${s.slot} ${s.finalSlot}`} style={{ left:x, top:y }}>{text}</div>;
  }

  // ---- wire helpers ---------------------------------------------------------
  function joinPairToQF_L(xSrcRight, xDstLeft, pairCenter, srcInnerGap, yDstMid){
    const yTop = pairCenter - (srcInnerGap/2 + G.slotH/2);
    const yBot = pairCenter + (srcInnerGap/2 + G.slotH/2);
    const xJoin = xSrcRight + G.stub;
    paths.push(h(xSrcRight, yTop, xJoin));
    paths.push(h(xSrcRight, yBot, xJoin));
    paths.push(v(xJoin, yTop, yBot));
    paths.push(h(xJoin, yDstMid, xDstLeft));
  }
  function joinPairToQF_R(xSrcLeft, xDstRight, pairCenter, srcInnerGap, yDstMid){
    const yTop = pairCenter - (srcInnerGap/2 + G.slotH/2);
    const yBot = pairCenter + (srcInnerGap/2 + G.slotH/2);
    const xJoin = xSrcLeft - G.stub;
    paths.push(h(xSrcLeft, yTop, xJoin));
    paths.push(h(xSrcLeft, yBot, xJoin));
    paths.push(v(xJoin, yTop, yBot));
    paths.push(h(xJoin, yDstMid, xDstRight));
  }

  // ***** QUAD RAILS (two lines into each SF slot) *****
  // We route each rail as: stub → xMid → (vertical adjust) → across to SF
  function quadRails_L(xQFRight, xSFLeft, yQFT, yQFB, ySFT, ySFB){
    const xStubEnd = xQFRight + G.stub;
    const xMid     = (xQFRight + xSFLeft) / 2;
    const railGap  = 7; // vertical separation so you clearly see 4 rails

    // Top QF → Top SF (two rails)
    paths.push(poly(`M ${xQFRight} ${yQFT} H ${xStubEnd} H ${xMid} V ${ySFT - railGap} H ${xSFLeft}`));
    paths.push(poly(`M ${xQFRight} ${yQFT} H ${xStubEnd} H ${xMid} V ${ySFT + railGap} H ${xSFLeft}`));

    // Bottom QF → Bottom SF (two rails)
    paths.push(poly(`M ${xQFRight} ${yQFB} H ${xStubEnd} H ${xMid} V ${ySFB - railGap} H ${xSFLeft}`));
    paths.push(poly(`M ${xQFRight} ${yQFB} H ${xStubEnd} H ${xMid} V ${ySFB + railGap} H ${xSFLeft}`));
  }

  function quadRails_R(xQFLeft, xSFRight, yQFT, yQFB, ySFT, ySFB){
    const xStubEnd = xQFLeft - G.stub;
    const xMid     = (xQFLeft + xSFRight) / 2;
    const railGap  = 7;

    // Top QF → Top SF (two rails)
    paths.push(poly(`M ${xQFLeft} ${yQFT} H ${xStubEnd} H ${xMid} V ${ySFT - railGap} H ${xSFRight}`));
    paths.push(poly(`M ${xQFLeft} ${yQFT} H ${xStubEnd} H ${xMid} V ${ySFT + railGap} H ${xSFRight}`));

    // Bottom QF → Bottom SF (two rails)
    paths.push(poly(`M ${xQFLeft} ${yQFB} H ${xStubEnd} H ${xMid} V ${ySFB - railGap} H ${xSFRight}`));
    paths.push(poly(`M ${xQFLeft} ${yQFB} H ${xStubEnd} H ${xMid} V ${ySFB + railGap} H ${xSFRight}`));
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