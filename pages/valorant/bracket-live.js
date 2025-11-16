// pages/valorant/bracket-live.js
import React from "react";
import mongoose from "mongoose";
import styles from "../../styles/Valorant.module.css";
import Bracket16 from "../../components/Bracket16";
import LosersBracket16 from "../../components/LosersBracket16";
import GrandFinalCenter from "../../components/GrandFinalCenter";

import { connectToDatabase } from "../../lib/mongodb";
import Tournament from "../../models/Tournament";
import Player from "../../models/Player";

// Tournament id used in admin (/admin/brackets/[id])
const TID = "VALO-SOLO-SKIRMISH-1";

// ===== SERVER SIDE: load published bracket + players =====
export async function getServerSideProps() {
  await connectToDatabase();

  const tournamentId = TID;

  const t = await Tournament.findOne({ tournamentId }).lean();

  if (!t || !t.bracket || !t.bracket.isPublished) {
    return {
      props: {
        tournamentId,
        published: false,
        bracket: null,
        players: [],
      },
    };
  }

  const bracket = t.bracket;
  const idSet = new Set();

  (bracket.rounds || []).forEach((r) => {
    (r.matches || []).forEach((m) => {
      if (m.player1Id) idSet.add(m.player1Id);
      if (m.player2Id) idSet.add(m.player2Id);
      if (m.winnerId) idSet.add(m.winnerId);
    });
  });

  const ids = Array.from(idSet);
  let playerDocs = [];
  if (ids.length > 0) {
    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
    playerDocs = await Player.find({ _id: { $in: objectIds } }).lean();
  }

  // Build a lookup of id -> IGN/username (for this tournament)
  const players = playerDocs.map((p) => {
    // Find this tournament's registration, if present
    const reg = (p.registeredFor || []).find(
      (r) => r.tournamentId === tournamentId
    );

    return {
      _id: p._id.toString(),
      username: p.username || "",
      ign: reg?.ign || "",
    };
  });

  return {
    props: {
      tournamentId,
      published: true,
      bracket: JSON.parse(
        JSON.stringify({
          rounds: bracket.rounds || [],
        })
      ),
      players,
    },
  };
}

// ===== HELPER: label from id =====
function buildIdToLabel(players) {
  const idToLabel = {};
  for (const p of players || []) {
    const base = p.ign || p.username || "Unknown";
    const extra = p.username && p.ign ? ` (${p.username})` : "";
    idToLabel[p._id] = `${base}${extra}`;
  }
  return idToLabel;
}

export default function BracketLivePage({
  tournamentId,
  published,
  bracket,
  players,
}) {
  // ===== HEADER REG INFO PLACEHOLDERS (you can wire real data later) =====
  const capacity = 16;
  const registered = players.length;
  const remaining = Math.max(capacity - registered, 0);
  const slotsText = `${registered} / ${capacity}`;
  const statusText = registered >= capacity
    ? "Full — waitlist"
    : `Open — ${remaining} left`;

  if (!published) {
    // Not published yet — simple message so you don't expose drafts
    return (
      <div className={styles.shell}>
        <div className={styles.contentWrap}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>
              Bracket for {tournamentId}
            </h2>
            <p style={{ color: "#cbd5f5" }}>
              This bracket has not been published yet. Use the admin page to
              publish once it is ready.
            </p>
          </section>
        </div>
      </div>
    );
  }

  const idToLabel = buildIdToLabel(players);

  function getLabel(id) {
    if (!id) return "TBD";
    return idToLabel[id] || "TBD";
  }

  // ===== MAP GENERIC ROUND DATA -> YOUR Bracket16 DATA SHAPE =====
  const rounds = bracket?.rounds || [];
  const round1 =
    rounds.find((r) => r.roundNumber === 1) || rounds[0] || { matches: [] };
  const r1Matches = round1.matches || [];

  // We expect up to 8 matches in Round of 16.
  // Left side = first 4 matches; Right side = last 4.
  const leftR16 = [];
  const rightR16 = [];

  r1Matches.forEach((m, index) => {
    const pair = [getLabel(m.player1Id), getLabel(m.player2Id)];
    if (index < 4) {
      leftR16.push(pair);
    } else {
      rightR16.push(pair);
    }
  });

  // If fewer than 4 matches per side, pad with TBDs so Bracket16 doesn't break
  while (leftR16.length < 4) {
    leftR16.push(["TBD", "TBD"]);
  }
  while (rightR16.length < 4) {
    rightR16.push(["TBD", "TBD"]);
  }

  // For now, we keep later rounds MANUAL/PLACEHOLDERS.
  // You can update these once you have winner-advancing logic wired up.
  const leftQF = [
    ["TBD", "TBD"],
    ["TBD", "TBD"],
  ];
  const rightQF = [
    ["TBD", "TBD"],
    ["TBD", "TBD"],
  ];
  const leftSF = ["TBD", "TBD"];
  const rightSF = ["TBD", "TBD"];
  const finalLeft = "TBD";
  const finalRight = "TBD";
  const finalChamp = "TBD";

  const bracketData = {
    left: { R16: leftR16, QF: leftQF, SF: leftSF },
    right: { R16: rightR16, QF: rightQF, SF: rightSF },
    final: { left: finalLeft, right: finalRight, champion: finalChamp },
  };

  // Losers bracket & placements are STILL MANUAL here,
  // since we haven't modeled double-elim drops in the backend yet.
  // You can copy your existing values or leave as minimal placeholders.
  const lb_r1 = [
    ["TBD", "TBD"],
    ["TBD", "TBD"],
    ["TBD", "TBD"],
    ["TBD", "TBD"],
  ];
  const lb_r2 = [
    ["TBD", "TBD"],
    ["TBD", "TBD"],
    ["TBD", "TBD"],
    ["TBD", "TBD"],
  ];
  const lb_r3a = [
    ["TBD", "TBD"],
    ["TBD", "TBD"],
  ];
  const lb_r3b = [
    ["TBD", "TBD"],
    ["TBD", "TBD"],
  ];
  const lb_r4 = [["TBD", "TBD"]];
  const lb_final = ["TBD", "TBD"];
  const lb_winner = "TBD";

  const placements = {
    first: "TBD",
    second: "TBD",
    third: "TBD",
    fourth: "TBD",
    fifthToSixth: ["TBD", "TBD"],
    seventhToEighth: ["TBD", "TBD"],
    ninthToTwelfth: ["TBD", "TBD", "TBD", "TBD"],
    thirteenthToSixteenth: ["TBD", "TBD", "TBD", "TBD"],
  };

  const wbFinalWinner = "TBD";
  const lbFinalWinner = "TBD";
  const grandChampion = "TBD";

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* ===== Split header (Info + Ranking) ===== */}
        <section className={styles.card}>
          <div className="splitGrid">
            {/* LEFT: info */}
            <div className="col">
              <div className={styles.cardHeaderRow}>
                <h2 className={styles.cardTitle}>
                  CHAMPIONSHIP BRACKET — 16 PLAYERS
                </h2>
              </div>
              <p style={{ color: "#97a3b6", marginTop: 0 }}>
                Double Elimination • Seeds from admin bracket
              </p>

              <div className={styles.detailGrid}>
                <div className={styles.detailLabel}>SLOTS</div>
                <div className={styles.detailValueHighlight}>{slotsText}</div>

                <div className={styles.detailLabel}>STATUS</div>
                <div className={styles.detailValue}>{statusText}</div>

                <div className={styles.detailLabel}>STREAM</div>
                <div className={styles.detailValue}>5TQ</div>
              </div>
            </div>

            {/* RIGHT: ranking */}
            <div className="col">
              <div className="rankHeader">Ranking</div>

              <div className="rankRows">
                <div className="rankRow">
                  <div className="rankBadge gold">1st</div>
                  <div className="rankNames">{placements.first}</div>
                </div>

                <div className="rankRow">
                  <div className="rankBadge silver">2nd</div>
                  <div className="rankNames">{placements.second}</div>
                </div>

                <div className="rankRow">
                  <div className="rankBadge bronze">3rd</div>
                  <div className="rankNames">{placements.third}</div>
                </div>

                <div className="rankRow">
                  <div className="rankBadge">4th</div>
                  <div className="rankNames">{placements.fourth}</div>
                </div>

                <div className="rankRow">
                  <div className="rankBadge">5–6</div>
                  <div className="rankNames">
                    {placements.fifthToSixth.join(" • ")}
                  </div>
                </div>

                <div className="rankRow">
                  <div className="rankBadge">7–8</div>
                  <div className="rankNames">
                    {placements.seventhToEighth.join(" • ")}
                  </div>
                </div>

                <div className="rankRow">
                  <div className="rankBadge">9–12</div>
                  <div className="rankNames">
                    {placements.ninthToTwelfth.join(" • ")}
                  </div>
                </div>

                <div className="rankRow">
                  <div className="rankBadge">13–16</div>
                  <div className="rankNames">
                    {placements.thirteenthToSixteenth.join(" • ")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <style jsx>{`
            .splitGrid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 24px;
              align-items: start;
            }
            @media (max-width: 980px) {
              .splitGrid {
                grid-template-columns: 1fr;
              }
            }
            .col {
              min-width: 0;
            }

            .rankHeader {
              color: #dfe6f3;
              font-weight: 900;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              font-size: 12px;
              margin-bottom: 10px;
              opacity: 0.9;
            }
            .rankRows {
              display: grid;
              gap: 10px;
            }
            .rankRow {
              display: grid;
              grid-template-columns: 80px 1fr;
              align-items: center;
              gap: 12px;
              background: #0d1117;
              border: 1px solid #273247;
              border-radius: 10px;
              padding: 10px 12px;
            }
            .rankBadge {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
              padding: 6px 10px;
              font-weight: 800;
              font-size: 12px;
              letter-spacing: 0.04em;
              color: #0b0e13;
              background: #e6edf8;
            }
            .rankBadge.gold {
              background: #ffe08a;
            }
            .rankBadge.silver {
              background: #d7dde7;
            }
            .rankBadge.bronze {
              background: #f0b68a;
            }
            .rankNames {
              color: #c9d4e6;
              font-weight: 700;
              font-size: 14px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          `}</style>
        </section>

        {/* ===== Winners Bracket (LIVE ROUND OF 16) ===== */}
        <section className={`${styles.card} fullBleed`}>
          <Bracket16 data={bracketData} />

          <style jsx>{`
            .fullBleed {
              width: 100vw;
              margin-left: calc(50% - 50vw);
              margin-right: calc(50% - 50vw);
              overflow: visible;
              background: #0b0e13;
              padding: 2rem 0 1rem;
            }
          `}</style>
        </section>

        {/* ===== Center Grand Final banner (still manual for now) ===== */}
        <GrandFinalCenter
          wbChampion={wbFinalWinner}
          lbChampion={lbFinalWinner}
          champion={grandChampion}
        />

        {/* ===== Losers Bracket (manual placeholders) ===== */}
        <section className={`${styles.card} fullBleed`}>
          <LosersBracket16
            r1={lb_r1}
            r2={lb_r2}
            r3a={lb_r3a}
            r3b={lb_r3b}
            r4={lb_r4}
            lbFinal={lb_final}
            lbWinner={lb_winner}
          />
          <style jsx>{`
            .fullBleed {
              width: 100vw;
              margin-left: calc(50% - 50vw);
              margin-right: calc(50% - 50vw);
              overflow: visible;
              background: #0b0e13;
              padding: 1rem 0 2rem;
            }
          `}</style>
        </section>
      </div>
    </div>
  );
}
