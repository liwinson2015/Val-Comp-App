import React, { useMemo, useRef, useEffect, useState } from "react";
import s from "../styles/Bracket16.module.css";

export default function Bracket16({ data }) {
  const D = normalizeData(data);
  const containerRef = useRef(null);
  const [width, setWidth] = useState(1200);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        // Allow full stretch up to 2000px
        const available = containerRef.current.clientWidth;
        setWidth(Math.max(1000, available));
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ---------- Geometry ----------
  const G = useMemo(() => {
    // We prioritize card width over gap width for readability
    const numCols = 7;
    // Give the center column (finals) double weight in width calculation
    // Actually, center is gap + col? No, structure is:
    // [Col] gap [Col] gap [Col] gap [Finals-Center] gap [Col] ...
    
    // Let's try a fixed generous width calculation
    let idealColW = Math.floor((width - 200) / 8); 
    const colW = Math.max(160, Math.min(idealColW, 240)); // Min 160px, Max 240px
    
    // Calculate gap
    const totalColsW = colW * 7;
    const remainingSpace = width - totalColsW;
    const gap = Math.max(20, Math.floor(remainingSpace / 8));

    const slotH = 44; // Match CSS var
    const wire  = 2;

    const innerGapR16 = 16;
    const innerGapQF  = 40;
    const innerGapSF  = 30;

    const X = (i) => (colW + gap) * i + (gap); // Start with full gap offset

    const titleBand = 40;
    const headerPad = 60;
    const topPad    = titleBand + headerPad;

    const pairBlockR16 = slotH * 2 + innerGapR16;
    const r16Space     = 24;

    const r16Centers = Array.from({ length: 4 }, (_, i) =>
      topPad + (pairBlockR16 / 2) + i * (pairBlockR16 + r16Space)
    );

    const qfCenters = [0,1].map(i => avg(r16Centers[2*i], r16Centers[2*i+1]));
    const sfCenter  = avg(qfCenters[0], qfCenters[1]);
    const finalY    = sfCenter;

    // Absolute Center X
    const absoluteCenter = width / 2;

    const stageW    = width; 
    const lastBot   = r16Centers[3] + (pairBlockR16 / 2);
    const stageH    = Math.ceil(lastBot + 120);

    // FIX: Make finals box wider!
    const finalW      = Math.max(180, colW); 
    const finalMidGap = 20;

    const champOffset = 80;  
    const winnerAbove = 30;  
    const champTop    = finalY - slotH - champOffset;
    const winnerTop   = champTop - winnerAbove;

    return {
      colW, gap, slotH, wire,
      innerGapR16, innerGapQF, innerGapSF,
      X, r16Centers, qfCenters, sfCenter, finalY,
      stageW, stageH,
      finalW, finalMidGap, absoluteCenter,
      champTop, winnerTop,
    };
  }, [width]);

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

  // Right Side (Mirrored X from absolute center)
  // We mirror indices: 6 -> 0 position relative to right edge
  const XR = (i) => width - (G.X(i) + G.colW); 

  for (let i=0;i<4;i++){
    const y = G.r16Centers[i];
    boxes.push(slotBox(XR(0), slotTop(y, G.innerGapR16),  D.right.R16[i][0]));
    boxes.push(slotBox(XR(0), slotBot(y, G.innerGapR16),  D.right.R16[i][1]));
  }
  for (let i=0;i<2;i++){
    const y = G.qfCenters[i];
    boxes.push(slotBox(XR(1), slotTop(y, G.innerGapQF), D.right.QF[i][0]));
    boxes.push(slotBox(XR(1), slotBot(y, G.innerGapQF), D.right.QF[i][1]));
  }
  boxes.push(slotBox(XR(2), slotTop(G.sfCenter, G.innerGapSF), D.right.SF[0]));
  boxes.push(slotBox(XR(2), slotBot(G.sfCenter, G.innerGapSF), D.right.SF[1]));

  // Finalists (Centered)
  const finalLeftX  = G.absoluteCenter - G.finalMidGap/2 - G.finalW;
  const finalRightX = G.absoluteCenter + G.finalMidGap/2;
  const finalTop    = G.finalY - G.slotH/2;
  
  // Note: We pass width explicitly to the final box style now
  const finalLeft   = finalBox(finalLeftX,  finalTop, D.final.left);
  const finalRight  = finalBox(finalRightX, finalTop, D.final.right);

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
    const xmTop = (xQF + xSF) / 2 - 10;
    const xmBot = (xQF + xSF) / 2 + 10;
    
    P.push(polyH_V_H(xQF, centerTop(G.qfCenters[0], G.innerGapQF), xmTop, centerTop(G.sfCenter, G.innerGapSF), xSF));
    P.push(polyH_V_H(xQF, centerBot(G.qfCenters[0], G.innerGapQF), xmTop, centerTop(G.sfCenter, G.innerGapSF), xSF));
    P.push(polyH_V_H(xQF, centerTop(G.qfCenters[1], G.innerGapQF), xmBot, centerBot(G.sfCenter, G.innerGapSF), xSF));
    P.push(polyH_V_H(xQF, centerBot(G.qfCenters[1], G.innerGapQF), xmBot, centerBot(G.sfCenter, G.innerGapSF), xSF));
  }
  qfToSf_L();

  // Right Wires
  function r16ToQf_R(pairY, targetPairY){
    const xR16 = XR(0);
    const xQF  = XR(1)+G.colW;
    const xm   = (xR16 + xQF) / 2;
    P.push(polyH_V_H(xR16, centerTop(pairY, G.innerGapR16), xm, centerTop(targetPairY, G.innerGapQF), xQF));
    P.push(polyH_V_H(xR16, centerBot(pairY, G.innerGapR16), xm, centerBot(targetPairY, G.innerGapQF), xQF));
  }
  [0,1,2,3].forEach(i => r16ToQf_R(G.r16Centers[i], G.qfCenters[Math.floor(i/2)]));

  function qfToSf_R(){
    const xQF = XR(1);
    const xSF = XR(2)+G.colW;
    const xmTop = (xQF + xSF) / 2 + 10;
    const xmBot = (xQF + xSF) / 2 - 10;

    P.push(polyH_V_H(xQF, centerTop(G.qfCenters[0], G.innerGapQF), xmTop, centerTop(G.sfCenter, G.innerGapSF), xSF));
    P.push(polyH_V_H(xQF, centerBot(G.qfCenters[0], G.innerGapQF), xmTop, centerTop(G.sfCenter, G.innerGapSF), xSF));
    P.push(polyH_V_H(xQF, centerTop(G.qfCenters[1], G.innerGapQF), xmBot, centerBot(G.sfCenter, G.innerGapSF), xSF));
    P.push(polyH_V_H(xQF, centerBot(G.qfCenters[1], G.innerGapQF), xmBot, centerBot(G.sfCenter, G.innerGapSF), xSF));
  }
  qfToSf_R();

  // SF -> Final
  P.push(H(G.X(2)+G.colW, G.sfCenter, finalLeftX));
  P.push(H(XR(2), G.sfCenter, finalRightX + G.finalW));
  
  // Final Bridge & Winner Vertical
  P.push(H(finalLeftX + G.finalW, G.finalY, finalRightX));
  P.push(V(G.absoluteCenter, G.finalY, G.champTop + G.slotH + 10));

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
          <span className={s.title} style={{left:G.X(0), width:G.colW}}>Round of 16</span>
          <span className={s.title} style={{left:G.X(1), width:G.colW}}>Quarterfinals</span>
          <span className={s.title} style={{left:G.X(2), width:G.colW}}>Semifinals</span>
          {/* Final Title Centered */}
          <span className={s.title} style={{left:G.absoluteCenter - G.colW/2, width:G.colW}}>Final</span>
          <span className={s.title} style={{left:XR(2), width:G.colW}}>Semifinals</span>
          <span className={s.title} style={{left:XR(1), width:G.colW}}>Quarterfinals</span>
          <span className={s.title} style={{left:XR(0), width:G.colW}}>Round of 16</span>
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
    // Explicit width for finals to prevent cutoff
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