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

      const contRect = containerRef.current.getBoundingClientRect();
      const leftRect = leftSlotRef.current.getBoundingClientRect();
      const rightRect = rightSlotRef.current.getBoundingClientRect();
      const centerRect = centerBoxRef.current.getBoundingClientRect();

      // --- CONFIGURATION ---
      const offY = 100;        // Offset to align SVG coord system
      const riseHeight = 60;   // Initial UP from the slot
      const finalReach = 130;  // <--- INCREASED: Final UP reach to Winners Bracket

      // --- ICE LINE (Upper) ---
      const x1_ice = leftRect.left + leftRect.width / 2 - contRect.left;
      const y1_ice = leftRect.top - contRect.top; 
      const x2_ice = centerRect.left + centerRect.width / 2 - contRect.left;
      
      const icePath = `
        M ${x1_ice} ${y1_ice + offY} 
        L ${x1_ice} ${y1_ice + offY - riseHeight} 
        L ${x2_ice} ${y1_ice + offY - riseHeight}
        L ${x2_ice} ${y1_ice + offY - riseHeight - finalReach}
      `;

      // --- FIRE LINE (Lower) ---
      // (Keeping logic ready for when you uncomment it)
      const x1_fire = rightRect.left + rightRect.width / 2 - contRect.left;
      const y1_fire = rightRect.bottom - contRect.top;
      const x2_fire = centerRect.left + centerRect.width / 2 - contRect.left;
      const dropHeight = 60;
      const finalDrop = 130; // Symmetrical drop for bottom

      const firePath = `
        M ${x1_fire} ${y1_fire + offY}
        L ${x1_fire} ${y1_fire + offY + dropHeight}
        L ${x2_fire} ${y1_fire + offY + dropHeight}
        L ${x2_fire} ${y1_fire + offY + dropHeight + finalDrop}
      `;

      setPaths({ ice: icePath, fire: firePath });
    };

    updateLines();
    window.addEventListener("resize", updateLines);
    return () => window.removeEventListener("resize", updateLines);
  }, []);

  return (
    <div className={s.wrap}>
      <div className={s.row} ref={containerRef}>
        
        <svg className={s.svgOverlay}>
          <path 
            d={paths.ice} 
            stroke="#00c6ff" 
            strokeWidth="2" 
            fill="none" 
            filter="drop-shadow(0 0 5px #00c6ff)"
          />
          {/* Uncomment to enable Fire line */}
          {/* <path 
            d={paths.fire} 
            stroke="#ff4b1f" 
            strokeWidth="2" 
            fill="none" 
            filter="drop-shadow(0 0 5px #ff4b1f)"
          />
          */}
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