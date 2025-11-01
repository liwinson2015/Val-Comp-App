// components/Bracket16.jsx
import React from "react";
import s from "../styles/Bracket16.module.css";

/**
 * 16-player single-elimination bracket (no transform scaling).
 * Geometry is shared between CSS and this markup; center column stack height
 * exactly matches the Semifinals columns to guarantee perfect vertical alignment.
 */
export default function Bracket16({ data }) {
  const L = data?.left ?? {};
  const R = data?.right ?? {};
  const F = data?.final ?? {};

  const leftR16 =
    L.R16 ?? [
      ["Seed 1", "Seed 2"],
      ["Seed 3", "Seed 4"],
      ["Seed 5", "Seed 6"],
      ["Seed 7", "Seed 8"],
    ];
  const rightR16 =
    R.R16 ?? [
      ["Seed 9", "Seed 10"],
      ["Seed 11", "Seed 12"],
      ["Seed 13", "Seed 14"],
      ["Seed 15", "Seed 16"],
    ];

  return (
    <div className={s.viewport}>
      <div className={s.stage}>
        <div className={s.grid}>
          {/* LEFT */}
          <Round title="Round of 16" tier="r16">
            {leftR16.map((m, i) => (
              <Pair key={`L16-${i}`} top={m[0]} bot={m[1]} />
            ))}
          </Round>

          <Round title="Quarterfinals" tier="qf">
            {[0, 1].map((i) => (
              <Pair key={`LQF-${i}`} top="TBD" bot="TBD" />
            ))}
          </Round>

          <Round title="Semifinals" tier="sf">
            <Pair top="TBD" bot="TBD" />
          </Round>

          {/* CENTER (Final) — stack height equals Semifinals stack height */}
          <div className={`${s.round} ${s.finalCol}`}>
            <div className={s.roundTitle}>Winner</div>

            {/* Absolute champion overlay (doesn't affect baseline) */}
            <div className={s.champOverlay}>
              <div className={s.champBox} title={F.champion ?? "TBD"}>
                <span className={s.champText}>{F.champion ?? "TBD"}</span>
              </div>
              <div className={s.stem} aria-hidden="true" />
            </div>

            {/* The stack with identical height to Semifinals, final centered within */}
            <div className={s.finalStack}>
              <div className={s.finalRowWrap}>
                <div className={s.finalRow}>
                  <div className={s.finalSlot} title={F.left ?? "TBD"}>
                    <span className={s.finalText}>{F.left ?? "TBD"}</span>
                  </div>
                  <div className={s.midbar} aria-hidden="true" />
                  <div className={s.finalSlot} title={F.right ?? "TBD"}>
                    <span className={s.finalText}>{F.right ?? "TBD"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <Round title="Semifinals" tier="sf" side="right">
            <Pair top="TBD" bot="TBD" side="right" />
          </Round>

          <Round title="Quarterfinals" tier="qf" side="right">
            {[0, 1].map((i) => (
              <Pair key={`RQF-${i}`} top="TBD" bot="TBD" side="right" />
            ))}
          </Round>

          <Round title="Round of 16" tier="r16" side="right">
            {rightR16.map((m, i) => (
              <Pair key={`R16-${i}`} top={m[0]} bot={m[1]} side="right" />
            ))}
          </Round>
        </div>
      </div>
    </div>
  );
}

/* ----- Building blocks ----- */

function Round({ title, tier, side, children }) {
  return (
    <div className={`${s.round} ${s[tier]} ${side ? s.right : ""}`}>
      <div className={s.roundTitle}>{title}</div>
      <div className={s.stack}>{children}</div>
    </div>
  );
}

/** Two independent square slots with stubs & connector arms via CSS */
function Pair({ top = "TBD", bot = "TBD", side }) {
  return (
    <div className={`${s.pair} ${side ? s.sideRight : ""}`}>
      <div className={`${s.slot} ${s.slotTop}`} title={top}>
        <span className={s.label}>{top}</span>
      </div>
      <div className={`${s.slot} ${s.slotBot}`} title={bot}>
        <span className={s.label}>{bot}</span>
      </div>
    </div>
  );
}