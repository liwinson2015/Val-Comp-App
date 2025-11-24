// components/GrandFinalCenter.jsx
import React from "react";
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
  return (
    <div className={s.wrap}>
      <div className={s.row}>
        
        {/* LEFT (WB side) - Ice Theme */}
        <div className={`${s.source} ${s.left}`}>
          <div className={s.slotWrapper}>
             {/* The Line Structure: UP then RIGHT */}
             <div className={s.lineUp} />
             
             <div className={`${s.sideLabel} ${s.iceLabel}`}>UPPER BRACKET WINNER</div>
             <div className={`${s.slot} ${s.ice}`}>{wbChampion}</div>
          </div>
          <div className={`${s.arm} ${s.armLeft}`} />
        </div>

        {/* CENTER */}
        <div className={s.center}>
          <div className={s.trophyWrap}>
            <TrophyIcon className={s.trophyIcon} />
          </div>
          <div className={s.title}>GRAND FINAL CHAMPION</div>
          <div className={s.gfBox}>{champion}</div>
        </div>

        {/* RIGHT (LB side) - Fire Theme */}
        <div className={`${s.source} ${s.right}`}>
          <div className={`${s.arm} ${s.armRight}`} />
          
          <div className={s.slotWrapper}>
             {/* The Line Structure: DOWN then LEFT */}
             <div className={s.lineDown} />
             
             <div className={`${s.slot} ${s.fire}`}>{lbChampion}</div>
             <div className={`${s.sideLabel} ${s.fireLabel}`}>LOWER BRACKET WINNER</div>
          </div>
        </div>

      </div>
    </div>
  );
}