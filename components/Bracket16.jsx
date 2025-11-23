import React, { useMemo } from "react";
import s from "../styles/Bracket16.module.css";

export default function Bracket16({ data }) {
  const D = normalizeData(data);

  // ---------- Geometry ----------
  const G = useMemo(() => {
    const colW  = 140; 
    const gap   = 50;  // Wider gaps for the clean tree look
    const slotH = 42;
    
    // Horizontal Positions
    // Left Side: 0, 1, 2, 3(Root)
    const X = (i) => 40 + i * (colW + gap); // Add left padding

    const pairBlockR16 = slotH * 2 + 20; // 20px gap between pair
    const r16Space     = 30; // 30px gap between matches

    const topPad = 60;

    // R16 Centers
    const r16Centers = Array.from({ length: 4 }, (_, i) =>
      topPad + (pairBlockR16 / 2) + i * (pairBlockR16 + r16Space)
    );

    // Recursive midpoints
    const qfCenters = [0,1].map(i => avg(r16Centers[2*i], r16Centers[2*i+1]));
    const sfCenter  = avg(qfCenters[0], qfCenters[1]);
    const rootY     = sfCenter;

    // Stage Dimensions
    const totalCols = 7; // L-R16, L-QF, L-SF, ROOT, R-SF, R-QF, R-R16
    const stageW    = 40 * 2 + (colW * 7) + (gap * 6);
    const lastBot   = r16Centers[3] + (pairBlockR16 / 2);
    const stageH    = Math.ceil(lastBot + 60);

    const centerX   = stageW / 2;

    // X Coordinates for Columns
    const xL_R16 = X(0);
    const xL_QF  = X(1);
    const xL_SF  = X(2);
    const xRoot  = centerX;
    
    // Mirrored Right Side
    const xR_SF  = stageW - X(2) - colW;
    const xR_QF  = stageW - X(1) - colW;
    const xR_R16 = stageW - X(0) - colW;

    return {
      colW, gap, slotH,
      r16Centers, qfCenters, sfCenter, rootY,
      xL_R16, xL_QF, xL_SF,
      xR_R16, xR_QF, xR_SF,
      stageW, stageH, centerX
    };
  }, []);

  // helpers
  const slotTop = (cy) => cy - G.slotH/2;
  // Inner gap for pairs
  const pairGap = 20; 
  
  // Boxes
  const boxes = [];
  const P = []; // Paths

  // --- LEFT SIDE ---
  // R16
  for(let i=0; i<4; i++) {
    const cy = G.r16Centers[i];
    // Top seed (Blue)
    boxes.push(slotBox(G.xL_R16, cy - G.slotH/2 - pairGap/2, D.left.R16[i][0], false));
    // Bot seed (Pink)
    boxes.push(slotBox(G.xL_R16, cy + G.slotH/2 + pairGap/2, D.left.R16[i][1], true));
    
    // Wire to QF
    const targetY = G.qfCenters[Math.floor(i/2)];
    // Connector: Fork style
    // From R16 Top Right -> Mid -> QF Target
    P.push(drawForkLeft(G.xL_R16 + G.colW, cy - pairGap/2 - G.slotH/2, cy + pairGap/2 + G.slotH/2, G.xL_QF, targetY));
  }

  // QF
  for(let i=0; i<2; i++) {
    const cy = G.qfCenters[i];
    // For intermediate nodes, we usually stick to Blue unless specified. 
    // Let's alternate pairs for visual variety.
    const isPink = i % 2 !== 0; 
    boxes.push(slotBox(G.xL_QF, cy, D.left.QF[i][0] || "Winner", isPink));
    
    // Wire to SF
    const targetY = G.sfCenter; // Only 1 SF on left
    // Only draw if it's the correct pair feeding it
    // QF0 and QF1 feed SF0
    if (i === 0) {
       P.push(drawForkLeft(G.xL_QF + G.colW, G.qfCenters[0], G.qfCenters[1], G.xL_SF, targetY));
    }
  }

  // SF
  boxes.push(slotBox(G.xL_SF, G.sfCenter, D.left.SF[0] || "L-Finalist", false));
  // Wire SF -> Root
  P.push(`M ${G.xL_SF + G.colW} ${G.sfCenter} H ${G.centerX - 90}`); // 90 = half root width

  // --- RIGHT SIDE ---
  // R16
  for(let i=0; i<4; i++) {
    const cy = G.r16Centers[i];
    boxes.push(slotBox(G.xR_R16, cy - G.slotH/2 - pairGap/2, D.right.R16[i][0], false));
    boxes.push(slotBox(G.xR_R16, cy + G.slotH/2 + pairGap/2, D.right.R16[i][1], true));
    
    // Wire to QF (Mirrored)
    const targetY = G.qfCenters[Math.floor(i/2)];
    P.push(drawForkRight(G.xR_R16, cy - pairGap/2 - G.slotH/2, cy + pairGap/2 + G.slotH/2, G.xR_QF + G.colW, targetY));
  }

  // QF
  for(let i=0; i<2; i++) {
    const cy = G.qfCenters[i];
    const isPink = i % 2 !== 0;
    boxes.push(slotBox(G.xR_QF, cy, D.right.QF[i][0] || "Winner", isPink));
    
    if (i === 0) {
       P.push(drawForkRight(G.xR_QF, G.qfCenters[0], G.qfCenters[1], G.xR_SF + G.colW, G.sfCenter));
    }
  }

  // SF
  boxes.push(slotBox(G.xR_SF, G.sfCenter, D.right.SF[0] || "R-Finalist", true));
  // Wire SF -> Root
  P.push(`M ${G.xR_SF} ${G.sfCenter} H ${G.centerX + 90}`);

  // --- Helpers ---
  function slotBox(x, y, text, isPink) {
    // Center Y to Top Y
    const top = y - G.slotH/2;
    return (
      <div 
        key={`${x}-${y}`} 
        className={`${s.slot} ${isPink ? s.pink : ''}`} 
        style={{ left: x, top: top }}
      >
        {text}
      </div>
    );
  }

  // Fork Path: Connects two source Ys (y1, y2) at xSrc to one target Y (yT) at xDst
  //      |
  // -----|
  //      |-----
  // -----|
  //      |
  function drawForkLeft(xSrc, y1, y2, xDst, yT) {
    const xMid = (xSrc + xDst) / 2;
    return `
      M ${xSrc} ${y1} H ${xMid} V ${y2} H ${xSrc}
      M ${xMid} ${yT} H ${xDst}
    `;
  }

  function drawForkRight(xSrcRightEdge, y1, y2, xDstLeftEdge, yT) {
    const xMid = (xSrcRightEdge + xDstLeftEdge) / 2;
    return `
      M ${xSrcRightEdge} ${y1} H ${xMid} V ${y2} H ${xSrcRightEdge}
      M ${xMid} ${yT} H ${xDstLeftEdge}
    `;
  }

  return (
    <div className={s.viewport}>
      <div className={s.stage} style={{ width: G.stageW, height: G.stageH }}>
        {/* Root Node */}
        <div className={s.champ} style={{ top: G.rootY - 25 }}>
          {D.final.champion || "Grand Champion"}
        </div>

        <svg className={s.wires} width={G.stageW} height={G.stageH}>
          <g>{P.map((d, i) => <path key={i} d={d} />)}</g>
        </svg>

        {boxes}
      </div>
    </div>
  );
}

function normalizeData(data) {
  const L = data?.left ?? {};
  const R = data?.right ?? {};
  const F = data?.final ?? {};
  return {
    left: {
      R16: L.R16 ?? Array(4).fill(["Sample text","Sample text"]),
      QF: L.QF ?? Array(2).fill(["Sample text"]), // 1 winner per match
      SF: L.SF ?? ["Sample text"],
    },
    right: {
      R16: R.R16 ?? Array(4).fill(["Sample text","Sample text"]),
      QF: R.QF ?? Array(2).fill(["Sample text"]),
      SF: R.SF ?? ["Sample text"],
    },
    final: {
      champion: F.champion || "Sample text",
    },
  };
}
const avg = (a,b)=> (a+b)/2;