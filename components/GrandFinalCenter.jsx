// testcomponents/GrandFinalCenter.jsx
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
      if (!containerRef.current || !leftSlotRef.current || !rightSlotRef.current) return;

      // 1. Establish the "Zero Point" of our SVG
      // The SVG is positioned at top: -500px relative to the container.
      // So SVG Y=0 is actually (Container Top - 500px) on the page.
      const contRect = containerRef.current.getBoundingClientRect();
      const svgOriginY = contRect.top - 500; 
      const svgOriginX = contRect.left;

      // 2. Find Targets
      const wbTarget = document.getElementById("wb-final-target");
      const lbTarget = document.getElementById("lb-final-target");

      const labelGap = 40; // Space to clear the "WINNER" text

      // ============================================================
      // ICE LINE (Upper)
      // ============================================================
      const leftRect = leftSlotRef.current.getBoundingClientRect();
      
      // START: Top-Center of the Left Slot
      const startX_ice = leftRect.left + leftRect.width / 2 - svgOriginX;
      const startY_ice = (leftRect.top - svgOriginY) - labelGap;

      let icePath = "";

      if (wbTarget) {
        const targetRect = wbTarget.getBoundingClientRect();
        
        // END: Bottom-Center of the Winners Bracket Final Box
        const endX_ice = targetRect.left + targetRect.width / 2 - svgOriginX;
        const endY_ice = targetRect.bottom - svgOriginY + 20; // +20px buffer

        // MIDPOINT: Halfway between Start and End vertically
        const midY_ice = startY_ice - ((startY_ice - endY_ice) / 2);

        // Draw Stepped Line: Start -> Up to Mid -> Right to Target X -> Up to Target
        icePath = `
          M ${startX_ice} ${startY_ice}
          L ${startX_ice} ${midY_ice}
          L ${endX_ice} ${midY_ice}
          L ${endX_ice} ${endY_ice}
        `;
      } else {
        // Fallback if target not found (draw a short stub up)
        icePath = `M ${startX_ice} ${startY_ice} L ${startX_ice} ${startY_ice - 100}`;
      }

      // ============================================================
      // FIRE LINE (Lower)
      // ============================================================
      const rightRect = rightSlotRef.current.getBoundingClientRect();

      // START: Bottom-Center of the Right Slot
      const startX_fire = rightRect.left + rightRect.width / 2 - svgOriginX;
      const startY_fire = (rightRect.bottom - svgOriginY) + labelGap;

      let firePath = "";

      if (lbTarget) {
        const targetRect = lbTarget.getBoundingClientRect();

        // END: Top-Center of the Losers Bracket Final Box
        const endX_fire = targetRect.left + targetRect.width / 2 - svgOriginX;
        const endY_fire = targetRect.top - svgOriginY - 60; // -60px buffer to clear "WINNER" text

        // MIDPOINT
        const midY_fire = startY_fire + ((endY_fire - startY_fire) / 2);

        // Draw Stepped Line: Start -> Down to Mid -> Right to Target X -> Down to Target
        firePath = `
          M ${startX_fire} ${startY_fire}
          L ${startX_fire} ${midY_fire}
          L ${endX_fire} ${midY_fire}
          L ${endX_fire} ${endY_fire}
        `;
      } else {
        // Fallback
        firePath = `M ${startX_fire} ${startY_fire} L ${startX_fire} ${startY_fire + 100}`;
      }

      setPaths({ ice: icePath, fire: firePath });
    };

    updateLines();
    window.addEventListener("resize", updateLines);
    setTimeout(updateLines, 500); // Wait for layout
    
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

        {/* LEFT (WB side) */}
        <div className={`${s.source} ${s.left}`}>
          <div className={s.slotWrapper}>
             <div className={`${s.sideLabel} ${s.iceLabel}`}>UPPER BRACKET WINNER</div>
             <div className={`${s.slot} ${s.ice}`} ref={leftSlotRef}>{wbChampion}</div>
          </div>
          <div className={`${s.arm} ${s.armLeft}`} />
        </div>

        {/* CENTER */}
        <div className={s.center} ref={centerBoxRef}>
          <div className={s.trophyWrap}>
            <TrophyIcon className={s.trophyIcon} />
          </div>
          <div className={s.title}>GRAND FINAL CHAMPION</div>
          <div className={s.gfBox}>{champion}</div>
        </div>

        {/* RIGHT (LB side) */}
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