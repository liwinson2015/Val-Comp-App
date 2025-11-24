// components/GrandFinalCenter.jsx
import React, { useEffect, useRef, useState } from "react";
import s from "../styles/GrandFinalCenter.module.css";

function TrophyIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="50%" stopColor="#FFC300" />
          <stop offset="100%" stopColor="#E6AC00" />
        </linearGradient>
      </defs>
      <path d="M16 8h32v8a16 16 0 0 1-32 0V8z" fill="url(#grad)" stroke="#b38600" strokeWidth="2" />
      <path d="M14 10c-4 0-6 4-6 9 0 5 2 9 8 9v-4c-3 0-4-2-4-5 0-3 1-5 4-5V10zM50 10c4 0 6 4 6 9 0 5-2 9-8 9v-4c3 0 4-2 4-5 0-3-1-5-4-5V10z" fill="url(#grad)" stroke="#b38600" strokeWidth="1.5" />
      <rect x="28" y="24" width="8" height="12" fill="url(#grad)" />
      <rect x="20" y="36" width="24" height="8" rx="1" fill="url(#grad)" stroke="#b38600" strokeWidth="1.5" />
      <circle cx="32" cy="12" r="2" fill="white" opacity="0.8" />
      <circle cx="25" cy="16" r="1.2" fill="white" opacity="0.7" />
      <circle cx="39" cy="16" r="1.2" fill="white" opacity="0.7" />
    </svg>
  );
}

export default function GrandFinalCenter({
  wbChampion = "WB Champion",
  lbChampion = "LB Champion",
  champion = "TBD",
}) {
  const containerRef = useRef(null);
  const leftSlotRef = useRef(null);
  const rightSlotRef = useRef(null);
  const centerBoxRef = useRef(null);

  const [paths, setPaths] = useState({ ice: "", fire: "" });

  useEffect(() => {
    const updateLines = () => {
      if (!containerRef.current || !leftSlotRef.current || !rightSlotRef.current || !centerBoxRef.current) return;

      // 1. Get our local coordinates
      const contRect = containerRef.current.getBoundingClientRect();
      const leftRect = leftSlotRef.current.getBoundingClientRect();
      const rightRect = rightSlotRef.current.getBoundingClientRect();
      const centerRect = centerBoxRef.current.getBoundingClientRect();

      const offY = 100; // Matches the SVG top: -100px in CSS

      // 2. Find External Targets (Winners Bracket Final & Losers Bracket Final)
      const wbTarget = document.getElementById("wb-final-target");
      const lbTarget = document.getElementById("lb-final-target");

      // --- ICE LINE (Upper) ---
      const x1_ice = leftRect.left + leftRect.width / 2 - contRect.left;
      const y1_ice = leftRect.top - contRect.top; 
      const x2_ice = centerRect.left + centerRect.width / 2 - contRect.left;
      
      // DYNAMIC: Calculate exact distance to the Winners Bracket Final Box
      let iceRise = 60; // Default fallback
      let iceTotalHeight = 130; // Default fallback

      if (wbTarget) {
        const wbRect = wbTarget.getBoundingClientRect();
        // The line needs to go from (y1_ice) UP to (wbRect.bottom + gap)
        // distance = currentY - targetY
        const gap = 30; // Gap between line and box
        iceTotalHeight = (leftRect.top - wbRect.bottom) - gap;
        
        // Ensure the horizontal bar is reasonably positioned (e.g. 1/3 of the way up)
        iceRise = Math.max(40, iceTotalHeight * 0.3);
      }

      const icePath = `
        M ${x1_ice} ${y1_ice + offY} 
        L ${x1_ice} ${y1_ice + offY - iceRise} 
        L ${x2_ice} ${y1_ice + offY - iceRise}
        L ${x2_ice} ${y1_ice + offY - iceTotalHeight}
      `;

      // --- FIRE LINE (Lower) ---
      const x1_fire = rightRect.left + rightRect.width / 2 - contRect.left;
      const y1_fire = rightRect.bottom - contRect.top;
      const x2_fire = centerRect.left + centerRect.width / 2 - contRect.left;
      
      // DYNAMIC: Calculate exact distance to the Losers Bracket Final Box
      let fireDrop = 60;
      let fireTotalHeight = 130;

      if (lbTarget) {
        const lbRect = lbTarget.getBoundingClientRect();
        // The line needs to go from (y1_fire) DOWN to (lbRect.top - gap)
        const gap = 30; 
        fireTotalHeight = (lbRect.top - rightRect.bottom) - gap;
        fireDrop = Math.max(40, fireTotalHeight * 0.3);
      }

      const firePath = `
        M ${x1_fire} ${y1_fire + offY}
        L ${x1_fire} ${y1_fire + offY + fireDrop}
        L ${x2_fire} ${y1_fire + offY + fireDrop}
        L ${x2_fire} ${y1_fire + offY + fireTotalHeight}
      `;

      setPaths({ ice: icePath, fire: firePath });
    };

    // Run on mount, resize, and scroll (to handle dynamic layout shifts)
    updateLines();
    window.addEventListener("resize", updateLines);
    // Optional: Add a small delay to ensure DOM is fully painted before measuring
    setTimeout(updateLines, 100); 
    
    return () => window.removeEventListener("resize", updateLines);
  }, []);

  return (
    <div className={s.wrap}>
      <div className={s.row} ref={containerRef}>
        
        <svg className={s.svgOverlay}>
          {/* ICE (Upper) */}
          <path 
            d={paths.ice} 
            stroke="#00c6ff" 
            strokeWidth="2" 
            fill="none" 
            filter="drop-shadow(0 0 5px #00c6ff)"
          />
          {/* FIRE (Lower) - Now enabled since we have dynamic targeting */}
          <path 
            d={paths.fire} 
            stroke="#ff4b1f" 
            strokeWidth="2" 
            fill="none" 
            filter="drop-shadow(0 0 5px #ff4b1f)"
          />
        </svg>

        <div className={`${s.source} ${s.left}`}>
          <div className={s.slotWrapper}>
             <div className={`${s.sideLabel} ${s.iceLabel}`}>UPPER BRACKET WINNER</div>
             <div className={`${s.slot} ${s.ice}`} ref={leftSlotRef}>{wbChampion}</div>
          </div>
          <div className={`${s.arm} ${s.armLeft}`} />
        </div>

        <div className={s.center} ref={centerBoxRef}>
          <div className={s.trophyWrap}>
            <TrophyIcon className={s.trophyIcon} />
          </div>
          <div className={s.title}>GRAND FINAL CHAMPION</div>
          <div className={s.gfBox}>{champion}</div>
        </div>

        <div className={`${s.source} ${s.right}`}>
          <div className={`${s.arm} ${s.armRight}`} />
          <div className={s.slotWrapper}>
             <div className={`${s.slot} ${s.fire}`} ref={rightSlotRef}>{lbChampion}</div>
             <div className={`${s.sideLabel} ${s.fireLabel}`}>LOWER BRACKET WINNER</div>
          </div>
        </div>

      </div>
    </div>
  );
}