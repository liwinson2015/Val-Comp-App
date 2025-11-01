// components/GrandFinalCenter.jsx
import React from "react";
import { Trophy } from "lucide-react"; // ✅ uses lucide-react (already in your stack)
import s from "../styles/GrandFinalCenter.module.css";

/**
 * Shared Grand Final strip, centered between Winners and Losers.
 * Trophy icon above the champion to mark the overall winner.
 */
export default function GrandFinalCenter({
  wbChampion = "WB Champion",
  lbChampion = "LB Champion",
  champion = "TBD",
}) {
  return (
    <div className={s.wrap}>
      <div className={s.row}>
        {/* LEFT (WB side) */}
        <div className={`${s.source} ${s.left}`}>
          <div className={s.slot}>{wbChampion}</div>
          <div className={`${s.arm} ${s.armLeft}`} />
        </div>

        {/* CENTER — GRAND FINAL */}
        <div className={s.center}>
          <div className={s.trophyWrap}>
            <Trophy className={s.trophyIcon} />
          </div>
          <div className={s.title}>GRAND FINAL</div>
          <div className={s.gfBox}>{champion}</div>
          <div className={s.reset}>Reset if LB side wins first set</div>
        </div>

        {/* RIGHT (LB side) */}
        <div className={`${s.source} ${s.right}`}>
          <div className={`${s.arm} ${s.armRight}`} />
          <div className={s.slot}>{lbChampion}</div>
        </div>
      </div>
    </div>
  );
}
