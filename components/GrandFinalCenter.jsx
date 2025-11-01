// components/GrandFinalCenter.jsx
import React from "react";
import s from "../styles/GrandFinalCenter.module.css";

/** Inline trophy icon (no external packages) */
function TrophyIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M19 5h2a1 1 0 0 1 1 1c0 3.31-2.69 6-6 6h-.28A5.98 5.98 0 0 1 13 14.72V17h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-2.28A5.98 5.98 0 0 1 8.28 12H8c-3.31 0-6-2.69-6-6a1 1 0 0 1 1-1h2V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2Zm-2 0V4H7v1a1 1 0 0 1-1 1H4.08A4 4 0 0 0 8 9h.28A6.01 6.01 0 0 1 12 6c.89 0 1.74.2 2.5.56A6 6 0 0 1 15.72 9H16a4 4 0 0 0 3.92-3H18a1 1 0 0 1-1-1Z"
      />
    </svg>
  );
}

/**
 * Centered Grand Final strip between Winners/Losers.
 * Includes a trophy icon above the champion box.
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
            <TrophyIcon className={s.trophyIcon} />
          </div>
          <div className={s.title}>GRAND FINAL</div>
          <div className={s.gfBox}>{champion}</div>
          <div className={s.reset}>Reset match if LB side wins first set</div>
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
