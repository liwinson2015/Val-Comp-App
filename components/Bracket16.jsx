import React, { useMemo } from "react";
import s from "../styles/Bracket16.module.css";

/**
 * Pixel-precise 16-team bracket with "Esports" styling.
 */
export default function Bracket16({ data }) {
  const D = normalizeData(data);

  // ---------- Geometry (Calculations) ----------
  const G = useMemo(() => {
    const colW  = 150;
    const gap   = 40; 
    const slotH = 38;
    const wire  = 2;

    const innerGapR16 = 12;
    const innerGapQF  = 30; 
    const innerGapSF  = 22;

    const X = (i) => i * (colW + gap);

    // Vertical Spacing Layout
    const titleBand = 30;
    const headerPad = 64;
    const topPad    = titleBand + headerPad;
    const pairBlockR16 = slotH * 2 + innerGapR16;
    const r16Space     = 26;

    const r16Centers = Array.from({ length: 4 }, (_, i) =>
      topPad + (pairBlockR16 / 2) + i * (pairBlockR16 + r16Space)
    );

    // Calculate subsequent round centers based on previous rounds
    const qfCenters = [0,1].map(i => avg(r16Centers[2*i], r16Centers[2*i+1]));
    const sfCenter  = avg(qfCenters[0], qfCenters[1]);
    const finalY    = sfCenter;

    const stageW    = X(6) + colW;
    const lastBot   = r16Centers[3] + (pairBlockR16 / 2);
    const stageH    = Math.ceil(lastBot + 80);

    const finalW      = 84;
    const finalMidGap = 22;
    
    // Winner Label positioning
    const champOffset = 55;  
    const winnerAbove = 25;  
    const champTop    = finalY - slotH - champOffset;
    const winnerTop   = champTop - winnerAbove;

    return {
      colW, gap, slotH, wire,
      innerGapR16, innerGapQF, innerGapSF,
      X, r16Centers, qfCenters, sfCenter, finalY,
      stageW, stageH,
      finalW, finalMidGap,
      champTop, winnerTop,
    };
  }, []);

  // ---------- Box Helpers ----------
  const slotTop = (pairY, innerGap) => pairY - (innerGap / 2) - G.slotH;
  const slotBot = (pairY, innerGap) => pairY + (innerGap / 2);
  const centerTop = (pairY, innerGap) => pairY - (innerGap / 2) - (G.slotH / 2);
  const centerBot = (pairY, innerGap) => pairY + (innerGap / 2) + (G.slotH / 2);

  // ---------- Boxes ----------
  const boxes = [];

  // 1. LEFT SIDE
  // R16
  for (let i=0;i<4;i++){
    const y = G.r16Centers[i];
    const match = (data?.left?.R16 ?? [])[i];
    boxes.push(slotBox(G.X(0), slotTop(y, G.innerGapR16), match?.[0] ?? D.left.R16[i][0]));
    boxes.push(slotBox(G.X(0), slotBot(y, G.innerGapR16), match?.[1] ?? D.left.R16[i][1]));
  }
  // QF
  for (let i=0;i<2;i++){
    const y = G.qfCenters[i];
    boxes.push(slotBox(G.X(1), slotTop(y, G.innerGapQF), D.left.QF[i][0]));
    boxes.push(slotBox(G.X(1), slotBot(y, G.innerGapQF), D.left.QF[i][1]));
  }
  // SF
  boxes.push(slotBox(G.X(2), slotTop(G.sfCenter, G.innerGapSF), D.left.SF[0]));
  boxes.push(slotBox(G.X(2), slotBot(G.sfCenter, G.innerGapSF), D.left.SF[1]));

  // 2. RIGHT SIDE
  // R16
  for (let i=0;i<4;i++){
    const y = G.r16Centers[i];
    const match = (data?.right?.R16 ?? [])[i];
    boxes.push(slotBox(G.X(6), slotTop(y, G.innerGapR16), match?.[0] ?? D.right.R16[i][0]));
    boxes.push(slotBox(G.X(6), slotBot(y, G.innerGapR16), match?.[1] ?? D.right.R16[i][1]));
  }
  // QF
  for (let i=0;i<2;i++){
    const y = G.qfCenters[i];
    boxes.push(slotBox(G.X(5), slotTop(y, G.innerGapQF), D.right.QF[i][0]));
    boxes.push(slotBox(G.X(5), slotBot(y, G.innerGapQF), D.right.QF[i][1]));
  }
  // SF
  boxes.push(slotBox(G.X(4), slotTop(G.sfCenter, G.innerGapSF), D.right.SF[0]));
  boxes.push(slotBox(G.X(4), slotBot(G.sfCenter, G.innerGapSF), D.right.SF[1]));

  // 3. FINALS (Center)
  const finalLeftX  = G.X(3) + G.colW/2 - G.finalMidGap/2 - G.finalW;
  const finalRightX = G.X(3) + G.colW/2 + G.finalMidGap/2;
  const finalTop    = G.finalY - G.slotH/2;
  const finalLeft   = finalBox(finalLeftX,  finalTop, D.final.left);
  const finalRight  = finalBox(finalRightX, finalTop, D.final.right);

  // ---------- Wires (SVG Pathing) ----------
  const P = [];
  const H = (x1,y,x2) => `M ${x1} ${y} H ${x2}`;
  const polyH_V_H = (x1, y1, xm, y2, x2) => `M ${x1} ${y1} H ${xm} V ${y2} H ${x2}`;

  // Helper to generate wires for standard rounds
  const generateWires = (sourceCenters, targetCenters, xSrc, xDst, innerGapSrc, innerGapDst) => {
    sourceCenters.forEach((srcY, i) => {
        const targetY = targetCenters[Math.floor(i/2)];
        const yTopSrc = centerTop(srcY, innerGapSrc);
        const yBotSrc = centerBot(srcY, innerGapSrc);
        
        // Logic: The target is always a pair, so we need to map Top Source to Top Target leg, etc.
        // But in your bracket logic, R16 Top/Bot feed into QF Top/Bot.
        // This specific logic connects the visual center of the slots.
        
        // Connect Source Top Slot to Mid
        const xm = (xSrc + xDst) / 2;
        // Connect Source Bot Slot to Mid
        
        // QF Target Top/Bot Y calculation:
        const yDst = (i % 2 === 0) 
          ? centerTop(targetY, innerGapDst) 
          : centerBot(targetY, innerGapDst);

        // Determine which slot of the source pair we are drawing (actually we draw both in the loop? 
        // No, your loop iterates centers. A center contains 2 slots.
        
        // Re-implementing your specific logic cleanly:
        P.push(polyH_V_H(xSrc, yTopSrc, xm, yDst, xDst));
        P.push(polyH_V_H(xSrc, yBotSrc, xm, yDst, xDst));
    });
  }

  // Manually keeping your robust wire logic to ensure no breakage:
  function r16ToQf_L(pairY, targetPairY){
    const xR16 = G.X(0)+G.colW, xQF = G.X(1);
    const xm = (xR16 + xQF) / 2;
    P.push(polyH_V_H(xR16, centerTop(pairY, G.innerGapR16), xm, centerTop(targetPairY, G.innerGapQF), xQF));
    P.push(polyH_V_H(xR16, centerBot(pairY, G.innerGapR16), xm, centerBot(targetPairY, G.innerGapQF), xQF));
  }
  // Loop execution for wires
  r16ToQf_L(G.r16Centers[0], G.qfCenters[0]);
  r16ToQf_L(G.r16Centers[1], G.qfCenters[0]);
  r16ToQf_L(G.r16Centers[2], G.qfCenters[1]);
  r16ToQf_L(G.r16Centers[3], G.qfCenters[1]);

  function r16ToQf_R(pairY, targetPairY){
    const xR16 = G.X(6), xQF = G.X(5)+G.colW;
    const xm = (xR16 + xQF) / 2;
    P.push(polyH_V_H(xR16, centerTop(pairY, G.innerGapR16), xm, centerTop(targetPairY, G.innerGapQF), xQF));
    P.push(polyH_V_H(xR16, centerBot(pairY, G.innerGapR16), xm, centerBot(targetPairY, G.innerGapQF), xQF));
  }
  r16ToQf_R(G.r16Centers[0], G.qfCenters[0]);
  r16ToQf_R(G.r16Centers[1], G.qfCenters[0]);
  r16ToQf_R(G.r16Centers[2], G.qfCenters[1]);
  r16ToQf_R(G.r16Centers[3], G.qfCenters[1]);

  // QF -> SF (Polyline logic retained for pixel perfection)
  (function qfToSfLeft(){
    const xQFRight = G.X(1) + G.colW, xSFLeft = G.X(2);
    const xmTop = (xQFRight + xSFLeft)/2 - 4, xmBot = (xQFRight + xSFLeft)/2 + 4;
    const ySfTop = centerTop(G.sfCenter, G.innerGapSF), ySfBot = centerBot(G.sfCenter, G.innerGapSF);
    
    [[0, xmTop, ySfTop], [1, xmBot, ySfBot]].forEach(([i, xm, yDst]) => {
       P.push(polyH_V_H(xQFRight, centerTop(G.qfCenters[i], G.innerGapQF), xm, yDst, xSFLeft));
       P.push(polyH_V_H(xQFRight, centerBot(G.qfCenters[i], G.innerGapQF), xm, yDst, xSFLeft));
    });
  })();

  (function qfToSfRight(){
    const xQFLeft = G.X(5), xSFRight = G.X(4) + G.colW;
    const xmTop = (xQFLeft + xSFRight)/2 + 4, xmBot = (xQFLeft + xSFRight)/2 - 4;
    const ySfTop = centerTop(G.sfCenter, G.innerGapSF), ySfBot = centerBot(G.sfCenter, G.innerGapSF);

    [[0, xmTop, ySfTop], [1, xmBot, ySfBot]].forEach(([i, xm, yDst]) => {
      P.push(polyH_V_H(xQFLeft, centerTop(G.qfCenters[i], G.innerGapQF), xm, yDst, xSFRight));
      P.push(polyH_V_H(xQFLeft, centerBot(G.qfCenters[i], G.innerGapQF), xm, yDst, xSFRight));
   });
  })();

  // SF -> Final
  P.push(H(G.X(2)+G.colW, G.sfCenter, finalLeftX));
  P.push(H(G.X(4),        G.sfCenter, finalRightX + G.finalW));
  P.push(H(finalLeftX + G.finalW, G.finalY, finalRightX));

  // ---------- Render ----------
  return (
    <div className={s.viewport}>
      <div className={s.stage}
        style={{
          width: `${G.stageW}px`,
          height: `${G.stageH}px`,
          "--slotH": `${G.slotH}px`,
          "--colw": `${G.colW}px`,
          "--gap": `${G.gap}px`,
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

        <svg className={s.wires} width={G.stageW} height={G.stageH}>
          <g stroke="#4a5a6a" strokeWidth={G.wire} strokeLinecap="square" fill="none">
            {P.map((d, i) => <path key={i} d={d} />)}
          </g>
        </svg>

        {boxes}
        {finalLeft}
        {finalRight}
      </div>
    </div>
  );

  // --- Rendering Helpers ---
  function slotBox(x, y, text){
    const isTBD = text === "TBD";
    const classNames = `${s.slot} ${isTBD ? s.slotEmpty : ''}`;
    return <div key={`${x}-${y}-${text}`} className={classNames} style={{ left:x, top:y }}>{text}</div>;
  }
  
  function finalBox(x, y, text){
    const isTBD = text === "TBD";
    const classNames = `${s.slot} ${s.finalSlot} ${isTBD ? s.slotEmpty : ''}`;
    return <div key={`f-${x}-${y}-${text}`} className={classNames} style={{ left:x, top:y, width: G.finalW }}>{text}</div>;
  }
}

// (Data Normalize function remains exactly the same as your original code)
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