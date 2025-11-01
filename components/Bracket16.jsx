// components/Bracket16.jsx
import React from "react";
import s from "../styles/Bracket16.module.css";

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

          {/* CENTER */}
          <Final
            left={F.left ?? "TBD"}
            right={F.right ?? "TBD"}
            champion={F.champion ?? "TBD"}
          />

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

function Final({ left = "TBD", right = "TBD", champion = "TBD" }) {
  return (
    <div className={s.finalCol}>
      <div className={s.winner}>WINNER</div>

      <div className={s.champWrap}>
        <div className={s.champBox} title={champion}>
          <span className={s.champText}>{champion}</span>
        </div>
      </div>

      <div className={s.stem} aria-hidden="true" />

      {/* Absolutely centered; matches SF arms exactly */}
      <div className={s.finalRowWrap}>
        <div className={s.finalRow}>
          <div className={s.finalSlot} title={left}>
            <span className={s.finalText}>{left}</span>
          </div>
          <div className={s.midbar} aria-hidden="true" />
          <div className={s.finalSlot} title={right}>
            <span className={s.finalText}>{right}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
