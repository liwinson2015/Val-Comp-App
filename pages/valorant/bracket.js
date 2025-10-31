// pages/valorant/bracket.js
import React from "react";

/**
 * Basic bracket data shape. Replace with live data later.
 * Each match has: id, round, slot, players [{ seed, name, score }], status.
 * Rounds: "R16", "QF", "SF", "GF"
 */
const initialBracket = {
  R16: [
    { id: "r16-1", round: "R16", slot: 1, status: "upcoming", players: [{ seed: 1, name: "Player 1", score: null }, { seed: 16, name: "Player 16", score: null }] },
    { id: "r16-2", round: "R16", slot: 2, status: "upcoming", players: [{ seed: 8, name: "Player 8", score: null }, { seed: 9, name: "Player 9", score: null }] },
    { id: "r16-3", round: "R16", slot: 3, status: "upcoming", players: [{ seed: 4, name: "Player 4", score: null }, { seed: 13, name: "Player 13", score: null }] },
    { id: "r16-4", round: "R16", slot: 4, status: "upcoming", players: [{ seed: 5, name: "Player 5", score: null }, { seed: 12, name: "Player 12", score: null }] },
    { id: "r16-5", round: "R16", slot: 5, status: "upcoming", players: [{ seed: 2, name: "Player 2", score: null }, { seed: 15, name: "Player 15", score: null }] },
    { id: "r16-6", round: "R16", slot: 6, status: "upcoming", players: [{ seed: 7, name: "Player 7", score: null }, { seed: 10, name: "Player 10", score: null }] },
    { id: "r16-7", round: "R16", slot: 7, status: "upcoming", players: [{ seed: 3, name: "Player 3", score: null }, { seed: 14, name: "Player 14", score: null }] },
    { id: "r16-8", round: "R16", slot: 8, status: "upcoming", players: [{ seed: 6, name: "Player 6", score: null }, { seed: 11, name: "Player 11", score: null }] },
  ],
  QF: [
    { id: "qf-1", round: "QF", slot: 1, status: "upcoming", players: [{ seed: null, name: "W of R16-1", score: null }, { seed: null, name: "W of R16-2", score: null }] },
    { id: "qf-2", round: "QF", slot: 2, status: "upcoming", players: [{ seed: null, name: "W of R16-3", score: null }, { seed: null, name: "W of R16-4", score: null }] },
    { id: "qf-3", round: "QF", slot: 3, status: "upcoming", players: [{ seed: null, name: "W of R16-5", score: null }, { seed: null, name: "W of R16-6", score: null }] },
    { id: "qf-4", round: "QF", slot: 4, status: "upcoming", players: [{ seed: null, name: "W of R16-7", score: null }, { seed: null, name: "W of R16-8", score: null }] },
  ],
  SF: [
    { id: "sf-1", round: "SF", slot: 1, status: "upcoming", players: [{ seed: null, name: "W of QF-1", score: null }, { seed: null, name: "W of QF-2", score: null }] },
    { id: "sf-2", round: "SF", slot: 2, status: "upcoming", players: [{ seed: null, name: "W of QF-3", score: null }, { seed: null, name: "W of QF-4", score: null }] },
  ],
  GF: [
    { id: "gf-1", round: "GF", slot: 1, status: "upcoming", players: [{ seed: null, name: "W of SF-1", score: null }, { seed: null, name: "W of SF-2", score: null }] },
  ],
};

const RoundHeader = ({ title, subtitle }) => (
  <div className="round-header">
    <div className="round-title">{title}</div>
    {subtitle ? <div className="round-sub">{subtitle}</div> : null}
  </div>
);

const MatchCard = ({ match }) => {
  const live = match.status === "live";
  const done = match.status === "done";

  return (
    <div className={`match ${live ? "live" : ""} ${done ? "done" : ""}`}>
      {live && <div className="badge-live">LIVE</div>}
      <div className="players">
        {match.players.map((p, i) => (
          <div key={i} className="row">
            <div className={`seed ${p?.seed ? "" : "ghost"}`}>{p?.seed ?? "—"}</div>
            <div className="name" title={p?.name || ""}>
              {p?.name || "TBD"}
            </div>
            <div className={`score ${p?.score != null ? "" : "ghost"}`}>
              {p?.score ?? "–"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RoundColumn = ({ title, subtitle, matches, connector }) => (
  <div className={`round ${connector ? "with-connector" : ""}`}>
    <RoundHeader title={title} subtitle={subtitle} />
    <div className="round-body">
      {matches.map((m) => (
        <div key={m.id} className="slot">
          <MatchCard match={m} />
          {/* Connector stub for visual continuity */}
          {connector && <div className="connector" aria-hidden="true" />}
        </div>
      ))}
    </div>
  </div>
);

export default function BracketPage() {
  const data = initialBracket;

  return (
    <div className="shell">
      <div className="content">
        <header className="hero">
          <div className="badge">VALORANT • 16-Player Bracket</div>
          <h1 className="title">Solo Skirmish — Championship Bracket</h1>
          <p className="sub">Single Elimination • BO1 (example) • Times TBD</p>
        </header>

        <section className="bracket">
          <RoundColumn
            title="Round of 16"
            subtitle="16 → 8"
            matches={data.R16}
            connector
          />
          <RoundColumn
            title="Quarterfinals"
            subtitle="8 → 4"
            matches={data.QF}
            connector
          />
          <RoundColumn
            title="Semifinals"
            subtitle="4 → 2"
            matches={data.SF}
            connector
          />
          <RoundColumn
            title="Grand Final"
            subtitle="Champion"
            matches={data.GF}
            connector={false}
          />
        </section>
      </div>

      {/* styled-jsx keeps styles local to this page */}
      <style jsx>{`
        .shell {
          min-height: 100vh;
          background: radial-gradient(1200px 600px at 15% -10%, #1a2330 0%, #0f1720 45%, #0b1118 100%);
          color: #e6e6e6;
          padding: 32px 16px 64px;
        }
        .content {
          max-width: 1200px;
          margin: 0 auto;
        }
        .hero {
          margin-bottom: 24px;
        }
        .badge {
          display: inline-block;
          font-size: 12px;
          letter-spacing: 0.08em;
          padding: 6px 10px;
          border: 1px solid #2b3442;
          border-radius: 999px;
          color: #9fb3c8;
          background: rgba(20, 28, 39, 0.6);
        }
        .title {
          margin: 10px 0 6px;
          font-size: 28px;
          line-height: 1.2;
          font-weight: 800;
        }
        .sub {
          margin: 0;
          color: #9fb3c8;
          font-size: 14px;
        }

        .bracket {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          align-items: start;
        }

        .round {
          position: relative;
        }
        .round-header {
          margin-bottom: 12px;
        }
        .round-title {
          font-weight: 700;
          font-size: 16px;
          letter-spacing: 0.02em;
        }
        .round-sub {
          color: #8fa2b6;
          font-size: 12px;
          margin-top: 2px;
        }
        .round-body {
          display: grid;
          gap: 16px;
        }

        .slot {
          position: relative;
        }

        .match {
          position: relative;
          background: linear-gradient(180deg, #151d27, #111821);
          border: 1px solid #263244;
          border-radius: 12px;
          padding: 10px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        }
        .match.live {
          border-color: #ff4655;
          box-shadow: 0 0 0 1px rgba(255, 70, 85, 0.25), 0 10px 28px rgba(255, 70, 85, 0.08);
        }
        .badge-live {
          position: absolute;
          top: -10px;
          right: 10px;
          background: #ff4655;
          color: white;
          font-size: 10px;
          padding: 3px 6px;
          border-radius: 6px;
          letter-spacing: 0.08em;
          font-weight: 800;
        }
        .match.done {
          opacity: 0.95;
        }

        .players {
          display: grid;
          gap: 6px;
        }
        .row {
          display: grid;
          grid-template-columns: 28px 1fr 28px;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.02);
        }
        .row:hover {
          background: rgba(255, 255, 255, 0.04);
        }
        .seed {
          width: 28px;
          height: 24px;
          display: grid;
          place-items: center;
          font-weight: 700;
          font-size: 12px;
          color: #9fb3c8;
          border: 1px solid #2a3444;
          border-radius: 6px;
        }
        .seed.ghost {
          opacity: 0.45;
        }
        .name {
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .score {
          width: 28px;
          height: 24px;
          display: grid;
          place-items: center;
          font-weight: 800;
          border: 1px solid #273243;
          border-radius: 6px;
          color: #e6e6e6;
          background: #0d1520;
        }
        .score.ghost {
          opacity: 0.45;
        }

        /* simple “connector” stub for visual flow */
        .with-connector .connector {
          position: relative;
          height: 24px;
        }
        .with-connector .connector::before {
          content: "";
          position: absolute;
          top: 12px;
          left: -10px;
          right: -10px;
          height: 1px;
          background: #2a3444;
          opacity: 0.7;
        }

        /* Mobile stacking */
        @media (max-width: 980px) {
          .bracket {
            grid-template-columns: 1fr;
          }
          .round-body {
            grid-template-columns: 1fr;
          }
          .with-connector .connector::before {
            left: 0;
            right: 0;
          }
        }
      `}</style>
    </div>
  );
}
