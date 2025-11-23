import React, { useMemo } from "react";
import s from "./Bracket16.module.css"; // Make sure path matches your project structure

export default function Bracket16({ data }) {
  const D = normalizeData(data);

  // ---------- Geometry (Calculations) ----------
  const G = useMemo(() => {
    // --- Horizontal Config ---
    const colW  = 150;
    const gap   = 50; // Increased gap for better spacing
    const slotH = 38;
    const wire  = 2;

    // --- Vertical Spacing Config ---
    const innerGapR16 = 10;
    const innerGapQF  = 34; 
    const innerGapSF  = 34;

    // X coordinate generator for columns 0 through 6
    const X = (i) => i * (colW + gap);

    // --- Vertical Layout Calculation ---
    const titleBand = 40;
    const headerPad = 50;
    const topPad    = titleBand + headerPad;

    // Height of one R16 matchup block (two slots + gap)
    const pairBlockR16 = slotH * 2 + innerGapR16;
    // Space between matchup blocks
    const r16Space     = 30;

    // Calculate center Y positions for the 4 left R16 matchups
    const r16Centers = Array.from({ length: 4 }, (_, i) =>
      topPad + (pairBlockR16 / 2) + i * (pairBlockR16 + r16Space)
    );

    // Calculate subsequent round centers by averaging previous round centers
    const qfCenters = [0,1].map(i => avg(r16Centers[2*i], r16Centers[2*i+1]));
    const sfCenter  = avg(qfCenters[0], qfCenters[1]);
    const finalY    = sfCenter;

    // Stage dimensions
    const stageW    = X(6) + colW;
    const lastBot   = r16Centers[3] + (pairBlockR16 / 2);
    const stageH    = Math.ceil(lastBot + 100);

    // Final Center Geometry
    const finalW      = 110; // Slightly wider final boxes for long names
    const finalMidGap = 30;  // Gap between the two final boxes
    
    // The exact horizontal center of the stage
    const stageCenterX = stageW / 2;

    // Winner Label & Champion Box positioning relative to the center line (finalY)
    const champOffset = 65;  
    const winnerAbove = 30;  
    const champTop    = finalY - slotH - champOffset;
    const winnerTop   = champTop - winnerAbove;

    return {
      colW, gap, slotH, wire,
      innerGapR16, innerGapQF, innerGapSF,
      X, r16Centers, qfCenters, sfCenter, finalY,
      stageW, stageH, stageCenterX,
      finalW, finalMidGap,
      champTop, winnerTop,
    };
  }, []);

  // ---------- Box Positioning Helpers ----------
  // Calculates the top edge Y position of a slot given its pair's center Y and the gap
  const slotTop = (pairY, innerGap) => pairY - (innerGap / 2) - G.slotH;
  const slotBot = (pairY, innerGap) => pairY + (innerGap / 2);
  
  // Calculates the vertical center Y position of a specific slot
  const centerTop = (pairY, innerGap) => pairY - (innerGap / 2) - (G.slotH / 2);
  const centerBot = (pairY, innerGap) => pairY + (innerGap / 2) + (G.slotH / 2);

  // ---------- Boxes Render ----------
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

  // 3. FINALS (Center - FIXED ALIGNMENT)
  // We calculate positions relative to the exact stage center
  const finalLeftX  = G.stageCenterX - (G.finalMidGap/2) - G.finalW;
  const finalRightX = G.stageCenterX + (G.finalMidGap/2);
  const finalTop    = G.finalY - G.slotH/2;
  
  const finalLeft   = finalBox(finalLeftX,  finalTop, D.final.left);
  const finalRight  = finalBox(finalRightX, finalTop, D.final.right);

  // ---------- Wires (SVG Pathing) ----------
  const P = [];
  // Helpers for SVG path strings
  const H = (x1,y,x2) => `M ${x1} ${y} H ${x2}`; // Horizontal line
  const polyH_V_H = (x1, y1, xm, y2, x2) => `M ${x1} ${y1} H ${xm} V ${y2} H ${x2}`; // Elbow connector

  // R16 -> QF Wires (Left)
  function r16ToQf_L(pairY, targetPairY){
    const xR16 = G.X(0)+G.colW, xQF = G.X(1);
    const xm = (xR16 + xQF) / 2; // Midpoint for the elbow
    P.push(polyH_V_H(xR16, centerTop(pairY, G.innerGapR16), xm, centerTop(targetPairY, G.innerGapQF), xQF));
    P.push(polyH_V_H(xR16, centerBot(pairY, G.innerGapR16), xm, centerBot(targetPairY, G.innerGapQF), xQF));
  }
  r16ToQf_L(G.r16Centers[0], G.qfCenters[0]);
  r16ToQf_L(G.r16Centers[1], G.qfCenters[0]);
  r16ToQf_L(G.r16Centers[2], G.qfCenters[1]);
  r16ToQf_L(G.r16Centers[3], G.qfCenters[1]);

  // R16 -> QF Wires (Right)
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

  // QF -> SF Wires
  // Left side uses slightly offset midpoints to avoid wire overlap
  (function qfToSfLeft(){
    const xQFRight = G.X(1) + G.colW, xSFLeft = G.X(2);
    const xmTop = (xQFRight + xSFLeft)/2 - 6;
    const xmBot = (xQFRight + xSFLeft)/2 + 6;
    
    // Top QF to Top SF leg
    P.push(polyH_V_H(xQFRight, centerTop(G.qfCenters[0], G.innerGapQF), xmTop, centerTop(G.sfCenter, G.innerGapSF), xSFLeft));
    P.push(polyH_V_H(xQFRight, centerBot(G.qfCenters[0], G.innerGapQF), xmTop, centerTop(G.sfCenter, G.innerGapSF), xSFLeft));
    // Bot QF to Bot SF leg
    P.push(polyH_V_H(xQFRight, centerTop(G.qfCenters[1], G.innerGapQF), xmBot, centerBot(G.sfCenter, G.innerGapSF), xSFLeft));
    P.push(polyH_V_H(xQFRight, centerBot(G.qfCenters[1], G.innerGapQF), xmBot, centerBot(G.sfCenter, G.innerGapSF), xSFLeft));
  })();

  // Right side QF -> SF
  (function qfToSfRight(){
    const xQFLeft = G.X(5), xSFRight = G.X(4) + G.colW;
    const xmTop = (xQFLeft + xSFRight)/2 + 6;
    const xmBot = (xQFLeft + xSFRight)/2 - 6;

    P.push(polyH_V_H(xQFLeft, centerTop(G.qfCenters[0], G.innerGapQF), xmTop, centerTop(G.sfCenter, G.innerGapSF), xSFRight));
    P.push(polyH_V_H(xQFLeft, centerBot(G.qfCenters[0], G.innerGapQF), xmTop, centerTop(G.sfCenter, G.innerGapSF), xSFRight));
    P.push(polyH_V_H(xQFLeft, centerTop(G.qfCenters[1], G.innerGapQF), xmBot, centerBot(G.sfCenter, G.innerGapSF), xSFRight));
    P.push(polyH_V_H(xQFLeft, centerBot(G.qfCenters[1], G.innerGapQF), xmBot, centerBot(G.sfCenter, G.innerGapSF), xSFRight));
  })();

  // SF -> Final Wires (FIXED: Straight horizontal lines)
  // Left SF to Left Final Box
  P.push(H(G.X(2)+G.colW, G.sfCenter, finalLeftX));
  // Right SF to Right Final Box
  P.push(H(G.X(4),        G.sfCenter, finalRightX + G.finalW));
  // Connector between Final boxes (under champion)
  P.push(H(finalLeftX + G.finalW, G.finalY, finalRightX));

  // ---------- Render ----------
  return (
    <div className={s.viewport}>
      <div className={s.stage}
        style={{
          width: `${G.stageW}px`,
          height: `${G.stageH}px`,
          // Pass CSS variables for easier styling tweaks
          "--slotH": `${G.slotH}px`,
          "--colw": `${G.colW}px`,
          "--gap": `${G.gap}px`,
        }}
      >
        {/* Round Titles */}
        <div className={s.titles}>
          <span className={s.title} style={{left:G.X(0)}}>Round of 16</span>
          <span className={s.title} style={{left:G.X(1)}}>Quarterfinals</span>
          <span className={s.title} style={{left:G.X(2)}}>Semifinals</span>
          {/* Center title spans the gap */}
          <span className={s.title} style={{left:G.X(3), width: G.colW}}>Final</span>
          <span className={s.title} style={{left:G.X(4)}}>Semifinals</span>
          <span className={s.title} style={{left:G.X(5)}}>Quarterfinals</span>
          <span className={s.title} style={{left:G.X(6)}}>Round of 16</span>
        </div>

        {/* Winner & Champion (Centered via CSS 50% left) */}
        <div className={s.winnerLabel} style={{ top: G.winnerTop }}>WINNER</div>
        <div className={s.champ} style={{ top: G.champTop }}>{D.final.champion}</div>

        {/* SVG Wires Layer */}
        <svg className={s.wires} width={G.stageW} height={G.stageH}>
          {/* Using a group <g> to set common stroke properties */}
          <g stroke="#4a5a6a" strokeWidth={G.wire} strokeLinecap="square" fill="none">
            {P.map((d, i) => <path key={i} d={d} />)}
          </g>
        </svg>

        {/* Render all calculated boxes */}
        {boxes}
        {finalLeft}
        {finalRight}
      </div>
    </div>
  );

  // --- Rendering Helpers ---
  // Renders standard 150px wide slots
  function slotBox(x, y, text){
    const isTBD = text === "TBD" || !text;
    // Add 'slotEmpty' class if TBD for different styling
    const classNames = `${s.slot} ${isTBD ? s.slotEmpty : ''}`;
    return <div key={`${x}-${y}-${text}`} className={classNames} style={{ left:x, top:y }}>{text}</div>;
  }
  
  // Renders the two smaller center slots
  function finalBox(x, y, text){
    const isTBD = text === "TBD" || !text;
    // Add 'finalSlot' class for gold border accent
    const classNames = `${s.slot} ${s.finalSlot} ${isTBD ? s.slotEmpty : ''}`;
    // Override width here since these are narrower than standard slots
    return <div key={`f-${x}-${y}-${text}`} className={classNames} style={{ left:x, top:y, width: G.finalW }}>{text}</div>;
  }
}

// Ensure incoming data has a safe structure to prevent crashes
function normalizeData(data) {
  const L = data?.left ?? {};
  const R = data?.right ?? {};
  const F = data?.final ?? {};
  const filler = ["TBD","TBD"];
  return {
    left: {
      R16: L.R16 ?? Array(4).fill(filler),
      QF: L.QF ?? Array(2).fill(filler),
      SF: L.SF ?? filler,
    },
    right: {
      R16: R.R16 ?? Array(4).fill(filler),
      QF: R.QF ?? Array(2).fill(filler),
      SF: R.SF ?? filler,
    },
    final: {
      left: F.left ?? "TBD",
      right: F.right ?? "TBD",
      champion: F.champion ?? "TBD",
    },
  };
}

// Math helper for averages
const avg = (a,b)=> (a+b)/2;