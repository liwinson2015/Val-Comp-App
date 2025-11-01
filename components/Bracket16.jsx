// components/Bracket16.jsx
import React, { useLayoutEffect, useRef, useState } from "react";
import s from "../styles/Bracket16.module.css";

/**
 * Pixel-perfect centering:
 * - We measure the actual centerY of the LEFT Semifinal pair's top slot.
 * - We measure the Final row's own top-slot center offset inside its wrapper.
 * - Then we set the wrapper's absolute `top` so the two centers match exactly.
 * This eliminates any drift from fonts, rounding, or CSS transforms.
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

  // Refs for measurement
  const stageRef = useRef(null);
  const sfLeftPairRef = useRef(null);    // LEFT Semifinal pair (the one with two TBDs)
  const finalStackRef = useRef(null);    // the center stack container
  const finalWrapRef = useRef(null);     // the absolutely-positioned wrapper we will move
  const finalTopSlotRef = useRef(null);  // top finalist slot inside the final row

  const [finalTop, setFinalTop] = useState(0); // computed absolute top in px

  // Measure and align the Final row to the Semifinal feeder centers
  useLayoutEffect(() => {
    const recalc = () => {
      if (
        !stageRef.current ||
        !sfLeftPairRef.current ||
        !finalStackRef.current ||
        !finalWrapRef.current ||
        !finalTopSlotRef.current
      ) return;

      // 1) Target: centerY of LEFT SF top slot (true screen position)
      const sfTopEl = sfLeftPairRef.current.querySelector(`.${s.slotTop}`) || sfLeftPairRef.current.children?.[0];
      if (!sfTopEl) return;

      const sfTopRect = sfTopEl.getBoundingClientRect();
      const targetCenterY = sfTopRect.top + sfTopRect.height / 2;

      // 2) We position finalWrap *inside* finalStack (position:relative).
      //    Compute the target Y relative to finalStack's top.
      const stackRect = finalStackRef.current.getBoundingClientRect();
      const targetYInStack = targetCenterY - stackRect.top;

      // 3) Compute our own top-slot center offset from finalWrap's TOP
      //    (with finalWrap currently at whatever top; we'll normalize by measuring its rect now)
      const wrapRect = finalWrapRef.current.getBoundingClientRect();
      const topSlotRect = finalTopSlotRef.current.getBoundingClientRect();
      const ownTopSlotCenterFromWrapTop =
        (topSlotRect.top + topSlotRect.height / 2) - wrapRect.top;

      // 4) Absolute top to place the wrap so that its top-slot center == SF top center
      const desiredTop = Math.round(targetYInStack - ownTopSlotCenterFromWrapTop);

      // Only update if changed (avoid layout thrash)
      setFinalTop((prev) => (prev !== desiredTop ? desiredTop : prev));
    };

    // Recalc when fonts settle (prevents post-load nudge)
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(recalc);
    }

    // Recalc on resize
    const onResize = () => recalc();
    window.addEventListener("resize", onResize);

    // Recalc when the stage size changes (more robust than window resize alone)
    const ro = new ResizeObserver(recalc);
    if (stageRef.current) ro.observe(stageRef.current);

    // Initial
    recalc();

    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, [data]); // also re-run if bracket data changes

  return (
    <div className={s.viewport}>
      <div className={s.stage} ref={stageRef}>
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
            {/* The pair we measure against */}
            <Pair top="TBD" bot="TBD" refEl={sfLeftPairRef} />
          </Round>

          {/* CENTER (Final) — we hard-position the wrapper to the measured Y */}
          <div className={`${s.round} ${s.finalCol}`}>
            <div className={s.roundTitle}>Winner</div>

            {/* absolute champion overlay that never shifts the baseline */}
            <div className={s.champOverlay}>
              <div className={s.champBox} title={F.champion ?? "TBD"}>
                <span className={s.champText}>{F.champion ?? "TBD"}</span>
              </div>
              <div className={s.stem} aria-hidden="true" />
            </div>

            <div className={s.finalStack} ref={finalStackRef}>
              <div
                ref={finalWrapRef}
                className={s.finalRowWrap}
                style={{ top: `${finalTop}px`, transform: "none" }} // override any CSS centering
              >
                <div className={s.finalRow}>
                  <div className={s.finalSlot} ref={finalTopSlotRef} title={F.left ?? "TBD"}>
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

/**
 * Pair: two stacked slots.
 * If `refEl` is provided, we attach it to the root so the parent can measure centers.
 */
function Pair({ top = "TBD", bot = "TBD", side, refEl }) {
  return (
    <div ref={refEl} className={`${s.pair} ${side ? s.sideRight : ""}`}>
      <div className={`${s.slot} ${s.slotTop}`} title={top}>
        <span className={s.label}>{top}</span>
      </div>
      <div className={`${s.slot} ${s.slotBot}`} title={bot}>
        <span className={s.label}>{bot}</span>
      </div>
    </div>
  );
}