import React, { useMemo } from "react";
import s from "../styles/Bracket16.module.css";

/**
 * Pixel-precise 16-team bracket using absolute boxes + SVG wires.
 * STABLE VERSION: Fixed widths, no dynamic resizing.
 */
export default function Bracket16({ data }) {
  const D = normalizeData(data);

  // ---------- Geometry (Fixed) ----------
  const G = useMemo(() => {
    const colW  = 150;
    const gap   = 40;
    const slotH = 38;
    const wire  = 2;

    const innerGapR16 = 12;
    const innerGapQF  = 30; 
    const innerGapSF  = 22;

    const X = (i) => i * (colW + gap);

    const titleBand = 30;
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
    const stageH    = Math.ceil(lastBot + 120);

    const finalW      = 100; // Fixed width for final box
    const finalMidGap = 22;
    const centerX     = X(3) + colW / 2;

    const champOffset = 60;  
    const winnerAbove = 30;  
    const champTop    = finalY - slotH - champOffset;
    const winnerTop   = champTop - winnerAbove;

    return {
      colW, gap, slotH, wire,
      innerGapR16, innerGapQF, innerGapSF,
      X, r16Centers, qfCenters, sfCenter, finalY,
      stageW, stageH,
      finalW, finalMidGap, centerX,
      champTop, winnerTop,
    };
  }, []);

  // helpers
  const slotTop = (pairY, innerGap) => pairY - (innerGap / 2) - G.slotH;
  const slotBot = (pairY, innerGap) => pairY + (innerGap / 2);
  const centerTop = (pairY, innerGap) => pairY - (innerGap / 2) - (G.slotH / 2);
  const centerBot = (pairY, innerGap) => pairY + (innerGap / 2) + (G.slotH / 2);

  // ---------- Boxes ----------
  const boxes = [];

  // Left R16
  for (let i=0;i<4;i++){
    const y = G.r16Centers[i];
    boxes.push(slotBox(G.X(0), slotTop(y, G.innerGapR16),  D.left.R16[i][0]));
    boxes.push(slotBox(G.X(0), slotBot(y, G.innerGapR16),  D.left.R16[i][1]));
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
    boxes.push(slotBox(G.X(6), slotTop(y, G.innerGapR16),  D.right.R16[i][0]));
    boxes.push(slotBox(G.X(6), slotBot(y, G.innerGapR16),  D.right.R16[i][1]));
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

  // Finalists (center)
  const finalLeftX  = G.X(3) + G.colW/2 - G.finalMidGap/2 - G.finalW;
  const finalRightX = G.X(3) + G.colW/2 + G.finalMidGap/2;
  const finalTop    = G.finalY - G.slotH/2;
  const finalLeft   = finalBox(finalLeftX,  finalTop, D.final.left);
  const finalRight  = finalBox(finalRightX, finalTop, D.final.right);

  // ---------- Wires ----------
  const P = [];
  const H = (x1,y,x2) => `M ${x1} ${y} H ${x2}`;
  const V = (x,y1,y2) => `M ${x} ${y1} V ${y2}`;
  const polyH_V_H = (x1, y1, xm, y2, x2) => `M ${x1} ${y1} H ${xm} V ${y2} H ${x2}`;

  function r16ToQf_L(pairY, targetPairY){
    const xR16 = G.X(0)+G.colW;
    const xQF  = G.X(1);
    const yTopSrc = centerTop(pairY, G.innerGapR16);
    const yBotSrc = centerBot(pairY, G.innerGapR16);
    const yTopDst = centerTop(targetPairY, G.innerGapQF);
    const yBotDst = centerBot(targetPairY, G.innerGapQF);
    const xm = (xR16 + xQF) / 2;
    P.push(polyH_V_H(xR16, yTopSrc, xm, yTopDst, xQF));
    P.push(polyH_V_H(xR16, yBotSrc, xm, yBotDst, xQF));
  }
  r16ToQf_L(G.r16Centers[0], G.qfCenters[0]);
  r16ToQf_L(G.r16Centers[1], G.qfCenters[0]);
  r16ToQf_L(G.r16Centers[2], G.qfCenters[1]);
  r16ToQf_L(G.r16Centers[3], G.qfCenters[1]);

  function r16ToQf_R(pairY, targetPairY){
    const xR16 = G.X(6);
    const xQF  = G.X(5)+G.colW;
    const yTopSrc = centerTop(pairY, G.innerGapR16);
    const yBotSrc = centerBot(pairY, G.innerGapR16);
    const yTopDst = centerTop(targetPairY, G.innerGapQF);
    const yBotDst = centerBot(targetPairY, G.innerGapQF);
    const xm = (xR16 + xQF) / 2;
    P.push(polyH_V_H(xR16, yTopSrc, xm, yTopDst, xQF));
    P.push(polyH_V_H(xR16, yBotSrc, xm, yBotDst, xQF));
  }
  r16ToQf_R(G.r16Centers[0], G.qfCenters[0]);
  r16ToQf_R(G.r16Centers[1], G.qfCenters[0]);
  r16ToQf_R(G.r16Centers[2], G.qfCenters[1]);
  r16ToQf_R(G.r16Centers[3], G.qfCenters[1]);

  // QF -> SF
  (function qfToSfLeft(){
    const xQFRight = G.X(1) + G.colW;
    const xSFLeft  = G.X(2);
    const xmTop    = (xQFRight + xSFLeft) / 2 - 4;
    const xmBot    = (xQFRight + xSFLeft) / 2 + 4;
    const qf1 = G.qfCenters[0];
    const yQf1Top = centerTop(qf1, G.innerGapQF);
    const yQf1Bot = centerBot(qf1, G.innerGapQF);
    const ySfTop  = centerTop(G.sfCenter, G.innerGapSF);
    P.push(polyH_V_H(xQFRight, yQf1Top, xmTop, ySfTop, xSFLeft));
    P.push(polyH_V_H(xQFRight, yQf1Bot, xmTop, ySfTop, xSFLeft));
    const qf2 = G.qfCenters[1];
    const yQf2Top = centerTop(qf2, G.innerGapQF);
    const yQf2Bot = centerBot(qf2, G.innerGapQF);
    const ySfBot  = centerBot(G.sfCenter, G.innerGapSF);
    P.push(polyH_V_H(xQFRight, yQf2Top, xmBot, ySfBot, xSFLeft));
    P.push(polyH_V_H(xQFRight, yQf2Bot, xmBot, ySfBot, xSFLeft));
  })();

  (function qfToSfRight(){
    const xQFLeft   = G.X(5);
    const xSFRight  = G.X(4) + G.colW;
    const xmTop     = (xQFLeft + xSFRight) / 2 + 4;
    const xmBot     = (xQFLeft + xSFRight) / 2 - 4;
    const qf1 = G.qfCenters[0];
    const yQf1Top = centerTop(qf1, G.innerGapQF);
    const yQf1Bot = centerBot(qf1, G.innerGapQF);
    const ySfTop  = centerTop(G.sfCenter, G.innerGapSF);
    P.push(polyH_V_H(xQFLeft, yQf1Top, xmTop, ySfTop, xSFRight));
    P.push(polyH_V_H(xQFLeft, yQf1Bot, xmTop, ySfTop, xSFRight));
    const qf2 = G.qfCenters[1];
    const yQf2Top = centerTop(qf2, G.innerGapQF);
    const yQf2Bot = centerBot(qf2, G.innerGapQF);
    const ySfBot  = centerBot(G.sfCenter, G.innerGapSF);
    P.push(polyH_V_H(xQFLeft, yQf2Top, xmBot, ySfBot, xSFRight));
    P.push(polyH_V_H(xQFLeft, yQf2Bot, xmBot, ySfBot, xSFRight));
  })();

  P.push(H(G.X(2)+G.colW, G.sfCenter, finalLeftX));
  P.push(H(G.X(4),        G.sfCenter, finalRightX + G.finalW));
  P.push(H(finalLeftX + G.finalW, G.finalY, finalRightX));

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
          <span className={s.title} style={{left:G.X(0)}}>Round of 16</span>
          <span className={s.title} style={{left:G.X(1)}}>Quarterfinals</span>
          <span className={s.title} style={{left:G.X(2)}}>Semifinals</span>
          <span className={s.title} style={{left:G.X(3), width: G.colW}}>Final</span>
          <span className={s.title} style={{left:G.X(4)}}>Semifinals</span>
          <span className={s.title} style={{left:G.X(5)}}>Quarterfinals</span>
          <span className={s.title} style={{left:G.X(6)}}>Round of 16</span>
        </div>

        <div className={s.winnerLabel} style={{ top: G.winnerTop }}>WINNER</div>
        <div className={s.champ} style={{ top: G.champTop }}>{D.final.champion}</div>

        {/* wires */}
        <svg className={s.wires} width={G.stageW} height={G.stageH}>
          <g stroke="#2a2f36" strokeWidth={G.wire} strokeLinecap="square" fill="none">
            {P.map((d, i) => <path key={i} d={d} />)}
          </g>
        </svg>

        {boxes}
        {finalLeft}
        {finalRight}
      </div>
    </div>
  );

  function slotBox(x,y,text){
    return <div key={`${x}-${y}-${text}`} className={s.slot} style={{ left:x, top:y }}>{text}</div>;
  }
  function finalBox(x,y,text){
    // finalSlot class adds gold accent
    return <div key={`f-${x}-${y}-${text}`} className={`${s.slot} ${s.finalSlot}`} style={{ left:x, top:y, width: G.finalW }}>{text}</div>;
  }
}

function normalizeData(data) {
  const L = data?.left ?? {};
  const R = data?.right ?? {};
  const F = data?.final ?? {};
  return {
    left: {
      R16: L.R16 ?? Array(4).fill(["TBD","TBD"]),
      QF: L.QF ?? Array(2).fill(["TBD","TBD"]),
      SF: L.SF ?? ["TBD","TBD"],
    },
    right: {
      R16: R.R16 ?? Array(4).fill(["TBD","TBD"]),
      QF: R.QF ?? Array(2).fill(["TBD","TBD"]),
      SF: R.SF ?? ["TBD","TBD"],
    },
    final: {
      left: F.left ?? "TBD",
      right: F.right ?? "TBD",
      champion: F.champion ?? "TBD",
    },
  };
}
const avg = (a,b)=> (a+b)/2;