// components/GrandFinalCenter.jsx
import React from "react";
import s from "../styles/GrandFinalCenter.module.css";

/**
 * Single shared Grand Final strip, centered between Winners and Losers.
 * Left connector = WB Champion, Right connector = LB Champion.
 */
export default function GrandFinalCenter({
  wbChampion = "WB Champion",
  lbChampion = "LB Champion",
  champion = "TBD",      // eventual overall champion display (optional)
}) {
  return (
    <div className={s.wrap}>
      <div className={s.row}>
        <div className={`${s.source} ${s.left}`}>
          <div className={s.slot}>{wbChampion}</div>
          <div className={`${s.arm} ${s.armLeft}`} />
        </div>

        <div className={s.center}>
          <div className={s.title}>GRAND FINAL</div>
          <div className={s.gfBox}>{champion}</div>
          <div className={s.reset}>Reset if LB side wins first set</div>
        </div>

        <div className={`${s.source} ${s.right}`}>
          <div className={`${s.arm} ${s.armRight}`} />
          <div className={s.slot}>{lbChampion}</div>
        </div>
      </div>
    </div>
  );
}
