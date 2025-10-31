// pages/valorant/bracket.js
import React, { useEffect, useState } from "react";
import styles from "../../styles/Valorant.module.css";

/**
 * Brand-new bracket UI (16-player single elimination).
 * CSS-only layout with an auto-scaling stage so everything fits on one screen.
 * Default seeding:
 *   Left  R16: [1–2], [3–4], [5–6], [7–8]
 *   Right R16: [9–10], [11–12], [13–14], [15–16]
 */

export default function BracketPage() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/api/whoami", { credentials: "same-origin" });
        const data = await res.json();
        if (!ignore) {
          setLoggedIn(!!data.loggedIn);
          setLoading(false);
        }
      } catch {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // ---- Demo seeds (replace with DB later) ----
  const data = {
    left: {
      R16: [
        ["Seed 1", "Seed 2"],
        ["Seed 3", "Seed 4"],
        ["Seed 5", "Seed 6"],
        ["Seed 7", "Seed 8"],
      ],
    },
    right: {
      R16: [
        ["Seed 9", "Seed 10"],
        ["Seed 11", "Seed 12"],
        ["Seed 13", "Seed 14"],
        ["Seed 15", "Seed 16"],
      ],
    },
    final: { left: "TBD", right: "TBD", champion: "TBD" },
  };

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* ===== Page Header ===== */}
        <section className="heroBar">
          <div className="title">CHAMPIONSHIP BRACKET — 16 PLAYERS</div>
          <div className="sub">Single Elimination • Seeds auto-assigned</div>
        </section>

        {/* ===== Login Gate (simple) ===== */}
        {loading ? (
          <p className="muted">Checking your session…</p>
        ) : !loggedIn ? (
          <div className="gate">
            <div>Log in to view your bracket placement.</div>
            <a
              className="btnDiscord"
              href={`/api/auth/discord?next=${encodeURIComponent("/valorant/bracket")}`}
            >
              Log in with Discord
            </a>
          </div>
        ) : null}

        {/* ===== Bracket Stage ===== */}
        <section className="bracketCard">
          <Bracket16 data={data} />
        </section>

        <style jsx>{`
          .heroBar {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-bottom: 14px;
          }
          .title {
            color: #e7ecf5;
            font-weight: 900;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            font-size: 0.95rem;
          }
          .sub {
            color: #97a3b6;
            font-size: 0.85rem;
          }
          .muted {
            color: #9aa6bb;
            margin-top: 6px;
          }
          .gate {
            display: flex;
            align-items: center;
            gap: 12px;
            background: #0d1117;
            border: 1px solid #273247;
            border-radius: 10px;
            padding: 10px 12px;
            color: #c9d4e6;
            margin-bottom: 10px;
          }
          .btnDiscord {
            background: #5865f2;
            color: #fff;
            text-decoration: none;
            padding: 8px 10px;
            border-radius: 8px;
            font-weight: 800;
          }
          .bracketCard {
            background: radial-gradient(1200px 380px at 50% -20%, rgba(255,70,85,0.06), transparent),
              #11161e;
            border: 1px solid #2a3546;
            border-radius: 14px;
            padding: 10px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
          }
        `}</style>
      </div>
    </div>
  );
}

/* ======================= BRACKET COMPONENT ======================= */

function Bracket16({ data }) {
  const L = data?.left ?? {};
  const R = data?.right ?? {};
  const F = data?.final ?? {};

  const leftR16 = L.R16 ?? seqPairs(1, 8);
  const rightR16 = R.R16 ?? seqPairs(9, 16);

  return (
    <div className="viewport">
      <div className="stage">
        <div className="grid">
          {/* LEFT */}
          <Round title="Round of 16">
            {leftR16.map((p, i) => (
              <Match key={`L16-${i}`} a={p[0]} b={p[1]} />
            ))}
          </Round>
          <Round title="Quarterfinals">
            {[0, 1].map((i) => (
              <Match key={`LQF-${i}`} a="TBD" b="TBD" />
            ))}
          </Round>
          <Round title="Semifinals">
            <Match a="TBD" b="TBD" />
          </Round>

          {/* FINAL */}
          <Final title="Grand Final" left={F.left ?? "TBD"} right={F.right ?? "TBD"} champ={F.champion ?? "TBD"} />

          {/* RIGHT */}
          <Round title="Semifinals" right>
            <Match a="TBD" b="TBD" />
          </Round>
          <Round title="Quarterfinals" right>
            {[0, 1].map((i) => (
              <Match key={`RQF-${i}`} a="TBD" b="TBD" />
            ))}
          </Round>
          <Round title="Round of 16" right>
            {rightR16.map((p, i) => (
              <Match key={`R16-${i}`} a={p[0]} b={p[1]} />
            ))}
          </Round>
        </div>
      </div>

      {/* ===== Bracket CSS (self-contained) ===== */}
      <style jsx>{`
        /* 
          We design on a roomy "stage" (W×H), then scale the whole
          thing to fit your viewport (no scroll, no overlap).
          Tweak --topSpace if your navbar is taller.
        */
        .viewport {
          --colw: 210px;     /* card column width */
          --gap: 26px;       /* gap between columns */
          --pairH: 90px;     /* match card height */
          --r16Space: 26px;  /* vertical rhythm spacers */
          --qfSpace: 96px;
          --sfSpace: 208px;

          --stageW: calc(var(--colw) * 7 + var(--gap) * 6);
          --stageH: 740px;

          --topSpace: 140px;
          --fitW: calc(100vw / var(--stageW));
          --fitH: calc((100vh - var(--topSpace)) / var(--stageH));
          --scale: min(1, var(--fitW), var(--fitH));

          width: 100%;
          height: calc(100vh - var(--topSpace));
          display: grid;
          place-items: center;
          overflow: hidden;
        }
        .stage {
          width: var(--stageW);
          height: var(--stageH);
          transform: scale(var(--scale));
          transform-origin: top center;
        }
        .grid {
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-columns: repeat(7, var(--colw));
          gap: var(--gap);
          align-items: start;
        }

        /* Round column */
        .round {
          position: relative;
        }
        .roundTitle {
          color: #d7deea;
          font-weight: 900;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .stack {
          position: relative;
          display: grid;
        }
        .r16 :global(.matchWrap) { margin: calc(var(--r16Space)/2) 0; }
        .qf  :global(.matchWrap) { margin: calc(var(--qfSpace)/2) 0; }
        .sf  :global(.matchWrap) { margin: calc(var(--sfSpace)/2) 0; }

        /* “wire” to next column */
        .round:not(.final) :global(.matchWrap)::after {
          content: "";
          position: absolute;
          top: 50%;
          right: calc(var(--gap) * -1);
          transform: translateY(-50%);
          height: 2px;
          width: var(--gap);
          background: rgba(255, 107, 129, 0.95);
          border-radius: 1px;
        }
        .right .stack :global(.matchWrap)::after {
          left: calc(var(--gap) * -1);
          right: auto;
          transform: translateY(-50%) scaleX(-1);
        }

        /* Match card */
        .matchWrap {
          position: relative;
          height: var(--pairH);
          display: grid;
          align-items: center;
        }
        .match {
          width: 100%;
          background: #0f151d;
          border: 3px solid #293446;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 28px rgba(0,0,0,0.35);
          transition: border-color .15s ease, box-shadow .15s ease, transform .08s ease;
        }
        .match:hover {
          border-color: #ff4655;
          box-shadow: 0 0 0 3px rgba(255,70,85,.18), 0 16px 36px rgba(255,70,85,.12);
          transform: translateY(-1px);
        }
        .row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 14px;
          border-top: 1px solid #1b2430;
        }
        .row:first-child { border-top: none; }
        .name {
          color: #e7ecf5;
          font-weight: 700;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Final block (your requested shape) */
        .final {
          position: relative;
        }
        .finalHeader {
          color: #d7deea;
          font-weight: 900;
          font-size: 12px;
          letter-spacing: .08em;
          text-transform: uppercase;
          margin-bottom: 8px;
          text-align: center;
        }
        .champWrap {
          display: grid;
          place-items: center;
          margin-bottom: 8px;
        }
        .champ {
          min-width: var(--colw);
          background: #0f151d;
          border: 3px solid #293446;
          border-radius: 12px;
          padding: 12px 16px;
          color: #e7ecf5;
          font-weight: 900;
          letter-spacing: .04em;
          box-shadow: 0 10px 28px rgba(0,0,0,.35);
        }
        .stem {
          width: 3px;
          height: 20px;
          background: #ff6b81;
          border-radius: 2px;
          margin: 0 auto 10px auto;
        }
        .finalRow {
          display: grid;
          grid-template-columns: 1fr 20px 1fr;
          align-items: center;
          gap: 10px;
        }
        .finalBox {
          background: #0f151d;
          border: 3px solid #293446;
          border-radius: 12px;
          padding: 12px 16px;
          color: #e7ecf5;
          font-weight: 800;
          text-align: center;
          box-shadow: 0 10px 28px rgba(0,0,0,.35);
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .finalBox:hover {
          border-color: #ff4655;
          box-shadow: 0 0 0 3px rgba(255,70,85,.18), 0 16px 36px rgba(255,70,85,.12);
        }
        .midbar {
          height: 3px;
          width: 100%;
          background: #ff6b81;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

/* ----- Small presentational pieces ----- */
function Round({ title, right, children }) {
  // classNames to control spacing & connector direction
  // first/last columns get .r16; next get .qf; middle get .sf
  const cls =
    title === "Round of 16"
      ? "round r16" + (right ? " right" : "")
      : title === "Quarterfinals"
      ? "round qf" + (right ? " right" : "")
      : "round sf" + (right ? " right" : "");

  return (
    <div className={cls}>
      <div className="roundTitle">{title}</div>
      <div className="stack">{children}</div>
    </div>
  );
}

function Match({ a = "TBD", b = "TBD" }) {
  return (
    <div className="matchWrap">
      <div className="match">
        <div className="row"><div className="name">{label(a)}</div></div>
        <div className="row"><div className="name">{label(b)}</div></div>
      </div>
    </div>
  );
}

function Final({ title, left, right, champ }) {
  return (
    <div className="final">
      <div className="finalHeader">{title}</div>
      <div className="champWrap">
        <div className="champ">{label(champ)}</div>
      </div>
      <div className="stem" />
      <div className="finalRow">
        <div className="finalBox">{label(left)}</div>
        <div className="midbar" />
        <div className="finalBox">{label(right)}</div>
      </div>
    </div>
  );
}

/* ----- Helpers ----- */
function seqPairs(start, end) {
  const out = [];
  for (let s = start; s <= end; s += 2) out.push([`Seed ${s}`, `Seed ${s + 1}`]);
  return out;
}
function label(x) {
  if (x == null) return "TBD";
  const s = String(x).trim();
  if (!s) return "TBD";
  if (/^\d+$/.test(s)) return `Seed ${s}`;
  return s;
}
