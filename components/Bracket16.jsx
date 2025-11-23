import React, { useMemo, useRef, useEffect, useState } from "react";
import s from "../styles/Bracket16.module.css";

export default function Bracket16({ data }) {
  const D = normalizeData(data);
  const containerRef = useRef(null);
  
  const [width, setWidth] = useState(1400);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const available = containerRef.current.clientWidth - 40;
        setWidth(Math.max(1000, available));
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ---------- Geometry ----------
  const G = useMemo(() => {
    const slotH = 48;
    // Increase the center "Champion" zone width significantly to prevent side overlap
    const finalW = 220; 
    const finalMidGap = 24;
    // Reserve generous space for the center column
    const centerReserved = (finalW * 2) + finalMidGap + 100; // +100 extra buffer

    const remainingForCols = width - centerReserved;
    const unit = remainingForCols / (6 * 4 + 8); 
    const colW = Math.max(140, Math.min(Math.floor(unit * 4), 280));
    
    const usedByCols = (colW * 6) + centerReserved;
    const gap = Math.floor((width - usedByCols) / 6);

    const wire = 2;
    const innerGapR16 = 14;
    const innerGapQF  = 44;
    const innerGapSF  = 32;

    const X = (i) => (colW + gap) * i + (gap);

    const titleBand = 40;
    const headerPad = 60;
    const topPad = titleBand + headerPad;

    const pairBlockR16 = slotH * 2 + innerGapR16;
    const r16Space = 24;

    const r16Centers = Array.from({ length: 4 }, (_, i) =>
      topPad + (pairBlockR16 / 2) + i * (pairBlockR16 + r16Space)
    );

    const qfCenters = [0,1].map(i => avg(r16Centers[2*i], r16Centers[2*i+1]));
    const sfCenter  = avg(qfCenters[0], qfCenters[1]);
    
    // FIX: Push the Final Match DOWN. 
    // Previously it was at sfCenter (same height as Semis). 
    // Let's push it down by 40px to clear the wires.
    const finalY = sfCenter + 40;

    const centerX = width / 2;
    
    const finalLeftX = centerX - (finalMidGap/2) - finalW;
    const finalRightX = centerX + (finalMidGap/2);
    
    const xSF_L = finalLeftX - gap - colW;
    const xQF_L = xSF_L - gap - colW;
    const xR16_L = xQF_L - gap - colW;
    
    const xSF_R = finalRightX + gap;
    const xQF_R = xSF_R + gap + colW;
    const xR16_R = xQF_R + gap + colW;

    const stageW = width;
    const lastBot = r16Centers[3] + (pairBlockR16 / 2);
    const stageH = Math.ceil(lastBot + 150);

    // FIX: Increase space between Champion Box and Final Match
    const champOffset = 100; // Was 80
    const winnerAbove = 40;  // Was 30
    const champTop    = finalY - slotH - champOffset;
    const winnerTop   = champTop - winnerAbove;

    return {
      colW, gap, slotH, wire,
      innerGapR16, innerGapQF, innerGapSF,
      r16Centers, qfCenters, sfCenter, finalY,
      xR16_L, xQF_L, xSF_L,
      xR16_R, xQF_R, xSF_R,
      finalLeftX, finalRightX, finalW,
      stageW, stageH, centerX,
      champTop, winnerTop,
    };
  }, [width]);

  // Helpers
  const slotTop = (pairY, innerGap) => pairY - (innerGap / 2) - G.slotH;
  const slotBot = (pairY, innerGap) => pairY + (innerGap / 2);
  const centerTop = (pairY, innerGap) => pairY - (innerGap / 2) - (G.slotH / 2);
  const centerBot = (pairY, innerGap) => pairY + (innerGap / 2) + (G.slotH / 2);

  // ---------- Boxes ----------
  const boxes = [];

  // Left Side
  for (let i=0;i<4;i++){
    const y = G.r16Centers[i];
    boxes.push(slotBox(G.xR16_L, slotTop(y, G.innerGapR16),  D.left.R16[i][0]));
    boxes.push(slotBox(G.xR16_L, slotBot(y, G.innerGapR16),  D.left.R16[i][1]));
  }
  for (let i=0;i<2;i++){
    const y = G.qfCenters[i];
    boxes.push(slotBox(G.xQF_L, slotTop(y, G.innerGapQF), D.left.QF[i][0]));
    boxes.push(slotBox(G.xQF_L, slotBot(y, G.innerGapQF), D.left.QF[i][1]));
  }
  boxes.push(slotBox(G.xSF_L, slotTop(G.sfCenter, G.innerGapSF), D.left.SF[0]));
  boxes.push(slotBox(G.xSF_L, slotBot(G.sfCenter, G.innerGapSF), D.left.SF[1]));

  // Right Side
  for (let i=0;i<4;i++){
    const y = G.r16Centers[i];
    boxes.push(slotBox(G.xR16_R, slotTop(y, G.innerGapR16),  D.right.R16[i][0]));
    boxes.push(slotBox(G.xR16_R, slotBot(y, G.innerGapR16),  D.right.R16[i][1]));
  }
  for (let i=0;i<2;i++){
    const y = G.qfCenters[i];
    boxes.push(slotBox(G.xQF_R, slotTop(y, G.innerGapQF), D.right.QF[i][0]));
    boxes.push(slotBox(G.xQF_R, slotBot(y, G.innerGapQF), D.right.QF[i][1]));
  }
  boxes.push(slotBox(G.xSF_R, slotTop(G.sfCenter, G.innerGapSF), D.right.SF[0]));
  boxes.push(slotBox(G.xSF_R, slotBot(G.sfCenter, G.innerGapSF), D.right.SF[1]));

  // Finalists
  const finalTop = G.finalY - G.slotH/2;
  const finalLeft = finalBox(G.finalLeftX,  finalTop, D.final.left);
  const finalRight = finalBox(G.finalRightX, finalTop, D.final.right);

  // ---------- Wires ----------
  const P = [];
  const polyH_V_H = (x1, y1, xm, y2, x2) => `M ${x1} ${y1} H ${xm} V ${y2} H ${x2}`;
  const H = (x1,y,x2) => `M ${x1} ${y} H ${x2}`;
  const V = (x, y1, y2) => `M ${x} ${y1} V ${y2}`;
  const polyV_H_V = (x1, y1, ym, x2, y2) => `M ${x1} ${y1} V ${ym} H ${x2} V ${y2}`; // Vertical connector

  // Left Wires
  function r16ToQf_L(pairY, targetPairY){
    const xR16 = G.xR16_L + G.colW;
    const xQF  = G.xQF_L;
    const xm   = (xR16 + xQF) / 2;
    P.push(polyH_V_H(xR16, centerTop(pairY, G.innerGapR16), xm, centerTop(targetPairY, G.innerGapQF), xQF));
    P.push(polyH_V_H(xR16, centerBot(pairY, G.innerGapR16), xm, centerBot(targetPairY, G.innerGapQF), xQF));
  }
  [0,1,2,3].forEach(i => r16ToQf_L(G.r16Centers[i], G.qfCenters[Math.floor(i/2)]));

  function qfToSf_L(){
    const xQF = G.xQF_L + G.colW;
    const xSF = G.xSF_L;
    const xmTop = (xQF + xSF) / 2 - 8;
    const xmBot = (xQF + xSF) / 2 + 8;
    P.push(polyH_V_H(xQF, centerTop(G.qfCenters[0], G.innerGapQF), xmTop, centerTop(G.sfCenter, G.innerGapSF), xSF));
    P.push(polyH_V_H(xQF, centerBot(G.qfCenters[0], G.innerGapQF), xmTop, centerTop(G.sfCenter, G.innerGapSF), xSF));
    P.push(polyH_V_H(xQF, centerTop(G.qfCenters[1], G.innerGapQF), xmBot, centerBot(G.sfCenter, G.innerGapSF), xSF));
    P.push(polyH_V_H(xQF, centerBot(G.qfCenters[1], G.innerGapQF), xmBot, centerBot(G.sfCenter, G.innerGapSF), xSF));
  }
  qfToSf_L();

  // Right Wires
  function r16ToQf_R(pairY, targetPairY){
    const xR16 = G.xR16_R;
    const xQF  = G.xQF_R + G.colW;
    const xm   = (xR16 + xQF) / 2;
    P.push(polyH_V_H(xR16, centerTop(pairY, G.innerGapR16), xm, centerTop(targetPairY, G.innerGapQF), xQF));
    P.push(polyH_V_H(xR16, centerBot(pairY, G.innerGapR16), xm, centerBot(targetPairY, G.innerGapQF), xQF));
  }
  [0,1,2,3].forEach(i => r16ToQf_R(G.r16Centers[i], G.qfCenters[Math.floor(i/2)]));

  function qfToSf_R(){
    const xQF = G.xQF_R;
    const xSF = G.xSF_R + G.colW;
    const xmTop = (xQF + xSF) / 2 + 8;
    const xmBot = (xQF + xSF) / 2 - 8;
    P.push(polyH_V_H(xQF, centerTop(G.qfCenters[0], G.innerGapQF), xmTop, centerTop(G.sfCenter, G.innerGapSF), xSF));
    P.push(polyH_V_H(xQF, centerBot(G.qfCenters[0], G.innerGapQF), xmTop, centerTop(G.sfCenter, G.innerGapSF), xSF));
    P.push(polyH_V_H(xQF, centerTop(G.qfCenters[1], G.innerGapQF), xmBot, centerBot(G.sfCenter, G.innerGapSF), xSF));
    P.push(polyH_V_H(xQF, centerBot(G.qfCenters[1], G.innerGapQF), xmBot, centerBot(G.sfCenter, G.innerGapSF), xSF));
  }
  qfToSf_R();

  // SF -> Final Connectors (Elbow down to new lower Final Y)
  // We use a polyline to go: SF Edge -> Horizontal -> Vertical Down -> Horizontal -> Final Box
  const sfLeftX = G.xSF_L + G.colW;
  const sfRightX = G.xSF_R;
  // Midpoint for the drop
  const dropMidL = (sfLeftX + G.finalLeftX) / 2;
  const dropMidR = (sfRightX + (G.finalRightX + G.finalW)) / 2;

  // Left SF to Final
  P.push(`M ${sfLeftX} ${G.sfCenter} H ${dropMidL} V ${G.finalY} H ${G.finalLeftX}`);
  // Right SF to Final
  P.push(`M ${sfRightX} ${G.sfCenter} H ${dropMidR} V ${G.finalY} H ${G.finalRightX + G.finalW}`);
  
  // Final Bridge
  P.push(H(G.finalLeftX + G.finalW, G.finalY, G.finalRightX));
  // Winner Vertical (Up to Champion)
  P.push(V(G.centerX, G.finalY, G.champTop + G.slotH + 20));

  return (
    <div className={s.viewport} ref={containerRef}>
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
          <span className={s.title} style={{left:G.xR16_L, width:G.colW}}>R16</span>
          <span className={s.title} style={{left:G.xQF_L, width:G.colW}}>QF</span>
          <span className={s.title} style={{left:G.xSF_L, width:G.colW}}>SF</span>
          <span className={s.title} style={{left:G.centerX - 50, width:100}}>FINAL</span>
          <span className={s.title} style={{left:G.xSF_R, width:G.colW}}>SF</span>
          <span className={s.title} style={{left:G.xQF_R, width:G.colW}}>QF</span>
          <span className={s.title} style={{left:G.xR16_R, width:G.colW}}>R16</span>
        </div>

        <div className={s.winnerLabel} style={{ top: G.winnerTop }}>WINNER</div>
        <div className={s.champ} style={{ top: G.champTop }}>{D.final.champion}</div>

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