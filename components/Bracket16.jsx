import React, { useMemo } from "react";
import s from "../styles/Bracket16.module.css";

export default function Bracket16({ data }) {
  const D = normalizeData(data);

  // ---------- Geometry (Compact & V-Drop Layout) ----------
  const G = useMemo(() => {
    // 1. Compact Columns to fit 1000-1200px screens
    const colW  = 130; 
    const gap   = 24;
    const slotH = 36;
    const wire  = 2;

    const innerGapR16 = 10;
    const innerGapQF  = 30;
    const innerGapSF  = 20; // Tight vertical spacing

    // Horizontal Scale
    const X = (i) => i * (colW + gap);

    const titleBand = 30;
    const headerPad = 40;
    const topPad    = titleBand + headerPad;

    const pairBlockR16 = slotH * 2 + innerGapR16;
    const r16Space     = 16;

    const r16Centers = Array.from({ length: 4 }, (_, i) =>
      topPad + (pairBlockR16 / 2) + i * (pairBlockR16 + r16Space)
    );

    const qfCenters = [0,1].map(i => avg(r16Centers[2*i], r16Centers[2*i+1]));
    const sfCenter  = avg(qfCenters[0], qfCenters[1]);
    
    // --- THE FIX: V-Drop Layout ---
    // Push the Final Match DOWN significantly to clear space for the Winner box
    const finalY    = sfCenter + 70; 

    // Center Calculations
    const centerX     = X(3) + colW/2;
    
    // Finals Match Box
    const finalW      = 140; 
    const finalMidGap = 20;
    const finalLeftX  = centerX - (finalMidGap/2) - finalW;
    const finalRightX = centerX + (finalMidGap/2);

    const stageW    = X(6) + colW;
    const lastBot   = r16Centers[3] + (pairBlockR16 / 2);
    // Add extra height for the dropped final
    const stageH    = Math.ceil(lastBot + 140); 

    // Champion Position
    // Place it well above the final match
    const champOffset = 80;  
    const winnerAbove = 25;  
    const champTop    = finalY - slotH - champOffset;
    const winnerTop   = champTop - winnerAbove;

    return {
      colW, gap, slotH, wire,
      innerGapR16, innerGapQF, innerGapSF,
      X, r16Centers, qfCenters, sfCenter, finalY,
      stageW, stageH,
      finalW, finalMidGap, centerX,
      finalLeftX, finalRightX,
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

  // Left Side
  for (let i=0;i<4;i++){
    const y = G.r16Centers[i];
    boxes.push(slotBox(G.X(0), slotTop(y, G.innerGapR16),  D.left.R16[i][0]));
    boxes.push(slotBox(G.X(0), slotBot(y, G.innerGapR16),  D.left.R16[i][1]));
  }
  for (let i=0;i<2;i++){
    const y = G.qfCenters[i];
    boxes.push(slotBox(G.X(1), slotTop(y, G.innerGapQF), D.left.QF[i][0]));
    boxes.push(slotBox(G.X(1), slotBot(y, G.innerGapQF), D.left.QF[i][1]));
  }
  boxes.push(slotBox(G.X(2), slotTop(G.sfCenter, G.innerGapSF), D.left.SF[0]));
  boxes.push(slotBox(G.X(2), slotBot(G.sfCenter, G.innerGapSF), D.left.SF[1]));

  // Right Side
  for (let i=0;i<4;i++){
    const y = G.r16Centers[i];
    boxes.push(slotBox(G.X(6), slotTop(y, G.innerGapR16),  D.right.R16[i][0]));
    boxes.push(slotBox(G.X(6), slotBot(y, G.innerGapR16),  D.right.R16[i][1]));
  }
  for (let i=0;i<2;i++){
    const y = G.qfCenters[i];
    boxes.push(slotBox(G.X(5), slotTop(y, G.innerGapQF), D.right.QF[i][0]));
    boxes.push(slotBox(G.X(5), slotBot(y, G.innerGapQF), D.right.QF[i][1]));
  }
  boxes.push(slotBox(G.X(4), slotTop(G.sfCenter, G.innerGapSF), D.right.SF[0]));
  boxes.push(slotBox(G.X(4), slotBot(G.sfCenter, G.innerGapSF), D.right.SF[1]));

  // Finalists (Dropped Position)
  const finalTop    = G.finalY - G.slotH/2;
  const finalLeft   = finalBox(G.finalLeftX,  finalTop, D.final.left);
  const finalRight  = finalBox(G.finalRightX, finalTop, D.final.right);

  // ---------- Wires ----------
  const P = [];
  const polyH_V_H = (x1, y1, xm, y2, x2) => `M ${x1} ${y1} H ${xm} V ${y2} H ${x2}`;
  const H = (x1,y,x2) => `M ${x1} ${y} H ${x2}`;
  const V = (x, y1, y2) => `M ${x} ${y1} V ${y2}`;

  // Left Wires
  function r16ToQf_L(pairY, targetPairY){
    const xR16 = G.X(0)+G.colW;
    const xQF  = G.X(1);
    const xm   = (xR16 + xQF) / 2;
    P.push(polyH_V_H(xR16, centerTop(pairY, G.innerGapR16), xm, centerTop(targetPairY, G.innerGapQF), xQF));
    P.push(polyH_V_H(xR16, centerBot(pairY, G.innerGapR16), xm, centerBot(targetPairY, G.innerGapQF), xQF));
  }
  [0,1,2,3].forEach(i => r16ToQf_L(G.r16Centers[i], G.qfCenters[Math.floor(i/2)]));

  function qfToSf_L(){
    const xQF = G.X(1)+G.colW;
    const xSF = G.X(2);
    const xmTop = (xQF + xSF) / 2 - 6;
    const xmBot = (xQF + xSF) / 2 + 6;
    P.push(polyH_V_H(xQF, centerTop(G.qfCenters[0], G.innerGapQF), xmTop, centerTop(G.sfCenter, G.innerGapSF), xSF));
    P.push(polyH_V_H(xQF, centerBot(G.qfCenters[0], G.innerGapQF), xmTop, centerTop(G.sfCenter, G.innerGapSF), xSF));
    P.push(polyH_V_H(xQF, centerTop(G.qfCenters[1], G.innerGapQF), xmBot, centerBot(G.sfCenter, G.innerGapSF), xSF));
    P.push(polyH_V_H(xQF, centerBot(G.qfCenters[1], G.innerGapQF), xmBot, centerBot(G.sfCenter, G.innerGapSF), xSF));
  }
  qfToSf_L();

  // Right Wires
  function r16ToQf_R(pairY, targetPairY){
    const xR16 = G.X(6);
    const xQF  = G.X(5)+G.colW;
    const xm   = (xR16 + xQF) / 2;
    P.push(polyH_V_H(xR16, centerTop(pairY, G.innerGapR16), xm, centerTop(targetPairY, G.innerGapQF), xQF));
    P.push(polyH_V_H(xR16, centerBot(pairY, G.innerGapR16), xm, centerBot(targetPairY, G.innerGapQF), xQF));
  }
  [0,1,2,3].forEach(i => r16ToQf_R(G.r16Centers[i], G.qfCenters[Math.floor(i/2)]));

  function qfToSf_R(){
    const xQF = G.X(5);
    const xSF = G.X(4)+G.colW;
    const xmTop = (xQF + xSF) / 2 + 6;
    const xmBot = (xQF + xSF) / 2 - 6;
    P.push(polyH_V_H(xQF, centerTop(G.qfCenters[0], G.innerGapQF), xmTop, centerTop(G.sfCenter, G.innerGapSF), xSF));
    P.push(polyH_V_H(xQF, centerBot(G.qfCenters[0], G.innerGapQF), xmTop, centerTop(G.sfCenter, G.innerGapSF), xSF));
    P.push(polyH_V_H(xQF, centerTop(G.qfCenters[1], G.innerGapQF), xmBot, centerBot(G.sfCenter, G.innerGapSF), xSF));
    P.push(polyH_V_H(xQF, centerBot(G.qfCenters[1], G.innerGapQF), xmBot, centerBot(G.sfCenter, G.innerGapSF), xSF));
  }
  qfToSf_R();

  // SF -> Final Connectors (Elbow Down deep)
  const sfLeftX  = G.X(2) + G.colW;
  const sfRightX = G.X(4);
  
  const dropMidL = (sfLeftX + G.finalLeftX) / 2;
  const dropMidR = (sfRightX + (G.finalRightX + G.finalW)) / 2;

  P.push(`M ${sfLeftX} ${G.sfCenter} H ${dropMidL} V ${G.finalY} H ${G.finalLeftX}`);
  P.push(`M ${sfRightX} ${G.sfCenter} H ${dropMidR} V ${G.finalY} H ${G.finalRightX + G.finalW}`);
  
  // Final Bridge
  P.push(H(G.finalLeftX + G.finalW, G.finalY, G.finalRightX));
  
  // Winner Vertical (Up to Champion, clearing the Final Match box)
  // Starting from middle of final bridge, go UP to champ box bottom
  P.push(V(G.centerX, G.finalY, G.champTop + G.slotH + 12)); // 12px pad into the champ box shadow

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
          <span className={s.title} style={{left:G.X(0), width:G.colW}}>R16</span>
          <span className={s.title} style={{left:G.X(1), width:G.colW}}>QF</span>
          <span className={s.title} style={{left:G.X(2), width:G.colW}}>SF</span>
          
          {/* Center "Final" Title logic: Center horizontally between SF columns */}
          <span className={s.title} style={{left:G.centerX - 50, width:100}}>FINAL</span>
          
          <span className={s.title} style={{left:G.X(4), width:G.colW}}>SF</span>
          <span className={s.title} style={{left:G.X(5), width:G.colW}}>QF</span>
          <span className={s.title} style={{left:G.X(6), width:G.colW}}>R16</span>
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