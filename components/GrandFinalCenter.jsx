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

      // 1. Get our local coordinates (The Grand Final Area)
      const contRect = containerRef.current.getBoundingClientRect();
      const leftRect = leftSlotRef.current.getBoundingClientRect();
      const rightRect = rightSlotRef.current.getBoundingClientRect();
      const centerRect = centerBoxRef.current.getBoundingClientRect();

      const offY = 100;      // Matches CSS top: -100px
      const labelGap = 40;   // Space for "UPPER BRACKET WINNER" labels
      const riseHeight = 60; // The initial vertical stem
      
      // 2. Find the External Targets (The actual bracket boxes)
      const wbTarget = document.getElementById("wb-final-target");
      const lbTarget = document.getElementById("lb-final-target");

      // ============================================================
      // ICE LINE (Upper Bracket) -> Going UP
      // ============================================================
      
      // Start X: Center of Left Slot
      const x1_ice = leftRect.left + leftRect.width / 2 - contRect.left;
      // Start Y: Top of Left Slot (minus space for text label)
      const y1_ice = (leftRect.top - contRect.top) - labelGap; 
      
      const x2_ice = centerRect.left + centerRect.width / 2 - contRect.left;
      
      let iceTotalHeight = 130;
      let iceRise = riseHeight;

      if (wbTarget) {
        const wbRect = wbTarget.getBoundingClientRect();
        
        // MATH: Distance = (My Top) - (Target Bottom) - (Buffer)
        const gap = 20; 
        iceTotalHeight = (leftRect.top - labelGap - wbRect.bottom) - gap;
        
        // If screens are small, adjust the curve start
        iceRise = Math.min(60, iceTotalHeight * 0.4);
      }

      const icePath = `
        M ${x1_ice} ${y1_ice + offY} 
        L ${x1_ice} ${y1_ice + offY - iceRise} 
        L ${x2_ice} ${y1_ice + offY - iceRise}
        L ${x2_ice} ${y1_ice + offY - iceTotalHeight}
      `;

      // ============================================================
      // FIRE LINE (Lower Bracket) -> Going DOWN
      // ============================================================

      // Start X: Center of Right Slot
      const x1_fire = rightRect.left + rightRect.width / 2 - contRect.left;
      // Start Y: Bottom of Right Slot (plus space for text label)
      const y1_fire = (rightRect.bottom - contRect.top) + labelGap;
      
      let targetX_fire = x1_fire + 200; // Default fallback if no target
      let fireTotalHeight = 100;        // Default fallback
      let fireDrop = riseHeight;

      if (lbTarget) {
        const lbRect = lbTarget.getBoundingClientRect();
        
        // 1. CALCULATE TARGET X
        // Find the EXACT center of the "LB Champion" box on the far right
        targetX_fire = lbRect.left + lbRect.width / 2 - contRect.left;

        // 2. CALCULATE TARGET Y
        // Find the distance from my bottom to the target's top
        const textHeight = 40; // Height of "WINNER" text
        const buffer = 20;     // Extra breathing room
        const gap = textHeight + buffer; 
        
        // MATH: Distance = (Target Top) - (My Bottom) - (Gap)
        fireTotalHeight = (lbRect.top - contRect.top) - y1_fire - gap;
        
        // Ensure the initial drop down isn't larger than the total distance available
        fireDrop = Math.min(60, fireTotalHeight * 0.5);
      }

      const firePath = `
        M ${x1_fire} ${y1_fire + offY}
        L ${x1_fire} ${y1_fire + offY + fireDrop}
        L ${targetX_fire} ${y1_fire + offY + fireDrop}
        L ${targetX_fire} ${y1_fire + offY + fireTotalHeight}
      `;

      setPaths({ ice: icePath, fire: firePath });
    };

    updateLines();
    window.addEventListener("resize", updateLines);
    setTimeout(updateLines, 100); // Double check after DOM settles
    
    return () => window.removeEventListener("resize", updateLines);
  }, []);

  return (
    <div className={s.wrap}>
      <div className={s.row} ref={containerRef}>
        
        <svg className={s.svgOverlay}>
          <defs>
            <linearGradient id="iceLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0055ff" />
              <stop offset="100%" stopColor="#00eaff" />
            </linearGradient>
            <filter id="iceGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>

            <linearGradient id="fireLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff0055" />
              <stop offset="100%" stopColor="#ff7b00" />
            </linearGradient>
            <filter id="fireGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          <path 
            d={paths.ice} 
            stroke="url(#iceLineGrad)" 
            strokeWidth="3" 
            strokeLinecap="round" 
            fill="none" 
            strokeLinejoin="round"
            filter="url(#iceGlow)" 
            opacity="0.9"
          />
          
          <path 
            d={paths.fire} 
            stroke="url(#fireLineGrad)" 
            strokeWidth="3" 
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none" 
            filter="url(#fireGlow)"
            opacity="0.9"
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