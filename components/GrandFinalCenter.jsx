// components/GrandFinalCenter.jsx
import React from "react";
import s from "../styles/GrandFinalCenter.module.css";

export default function GrandFinalCenter({ wbChampion, lbChampion, champion }) {
  // Determine if the Grand Champion matches one of the contenders
  const isWbWinner = champion === wbChampion && champion !== "TBD";
  const isLbWinner = champion === lbChampion && champion !== "TBD";

  return (
    <div className={s.container}>
      {/* The Vertical "Beam" Lines are handled in CSS via ::before/::after */}
      
      <div className={s.header}>GRAND FINAL</div>
      
      <div className={s.matchWrapper}>
        <div className={s.matchCard}>
          
          {/* Top Slot: Winners Bracket Champion */}
          <div className={`${s.team} ${isWbWinner ? s.winnerRow : ""}`}>
            <span className={s.label}>WB:</span>
            <span className={s.name}>{wbChampion || "TBD"}</span>
          </div>

          {/* VS Divider */}
          <div className={s.vs}>VS</div>

          {/* Bottom Slot: Losers Bracket Champion */}
          <div className={`${s.team} ${isLbWinner ? s.winnerRow : ""}`}>
            <span className={s.label}>LB:</span>
            <span className={s.name}>{lbChampion || "TBD"}</span>
          </div>

        </div>
      </div>

      {/* Optional: Ultimate Winner Display below */}
      {champion && champion !== "TBD" && (
         <div className={s.championDisplay}>
            <div className={s.crownIcon}>👑</div>
            <div className={s.champName}>{champion}</div>
         </div>
      )}
    </div>
  );
}