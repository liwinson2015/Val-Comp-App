// pages/valorant/bracket.js
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

// ===== SERVER-SIDE HELPERS FOR RANKING =====
function computeLosersFromMatches(matches = []) {
  const losers = [];
  (matches || []).forEach((m) => {
    if (!m || !m.winnerId) return;
    if (!m.player1Id || !m.player2Id) return;
    const loser = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
    losers.push(loser);
  });
  return losers;
}

function uniqIds(arr = []) {
  const set = new Set();
  (arr || []).forEach((id) => {
    if (id) set.add(id.toString());
  });
  return Array.from(set);
}

function computeRankingFromBracket(bracket) {
  if (!bracket) {
    return {
      first: null,
      second: null,
      third: null,
      fourth: null,
      fiveToSix: [],
      sevenToEight: [],
      nineToTwelve: [],
      thirteenToSixteen: [],
    };
  }

  const losersRounds = bracket.losersRounds || [];

  const findLRMatches = (roundNum) =>
    (
      losersRounds.find(
        (r) => r.roundNumber === roundNum && r.type === "losers"
      ) || { matches: [] }
    ).matches || [];

  // Raw losers by round (may contain duplicates, we’ll clean later)
  const lb1Losers = computeLosersFromMatches(findLRMatches(1)); // 13–16
  const lb2Losers = computeLosersFromMatches(findLRMatches(2)); // 9–12
  const lb3aLosers = computeLosersFromMatches(findLRMatches(3)); // 7–8
  const lb3bLosers = computeLosersFromMatches(findLRMatches(4)); // 5–6
  const lb4Losers = computeLosersFromMatches(findLRMatches(5)); // 4th

  const losersFinal = bracket.losersFinal || null;
  const grandFinal = bracket.grandFinal || null;

  // --- 1 & 2: Grand final decides first and second ---
  let firstCandidate = null;
  let secondCandidate = null;
  if (
    grandFinal &&
    grandFinal.winnerId &&
    grandFinal.player1Id &&
    grandFinal.player2Id
  ) {
    firstCandidate = grandFinal.winnerId;
    secondCandidate =
      grandFinal.winnerId === grandFinal.player1Id
        ? grandFinal.player2Id
        : grandFinal.player1Id;
  }

  // --- 3: Losers final loser is 3rd ---
  let thirdCandidate = null;
  if (
    losersFinal &&
    losersFinal.winnerId &&
    losersFinal.player1Id &&
    losersFinal.player2Id
  ) {
    thirdCandidate =
      losersFinal.winnerId === losersFinal.player1Id
        ? losersFinal.player2Id
        : losersFinal.player1Id;
  }

  // --- 4: LB Round 4 (roundNumber 5) loser is 4th ---
  let fourthCandidate = null;
  if (lb4Losers.length > 0) {
    fourthCandidate = lb4Losers[0] || null;
  }

  // --- 5–6, 7–8, 9–12, 13–16 from losers of LB rounds ---
  // We’ll assign with priority and make sure no one appears twice.
  const assigned = new Set();

  const pickSingle = (id) => {
    if (!id) return null;
    const key = id.toString();
    if (assigned.has(key)) return null;
    assigned.add(key);
    return id;
  };

  const pickMany = (list, maxCount) => {
    const result = [];
    for (const id of list || []) {
      if (!id) continue;
      const key = id.toString();
      if (assigned.has(key)) continue;
      assigned.add(key);
      result.push(id);
      if (maxCount && result.length >= maxCount) break;
    }
    return result;
  };

  // Priority: best → worst.
  const first = pickSingle(firstCandidate);
  const second = pickSingle(secondCandidate);
  const third = pickSingle(thirdCandidate);
  const fourth = pickSingle(fourthCandidate);

  // 5–6: losers of LB Round 3B (roundNumber 4)
  const fiveToSix = pickMany(lb3bLosers, 2);

  // 7–8: losers of LB Round 3A (roundNumber 3)
  const sevenToEight = pickMany(lb3aLosers, 2);

  // 9–12: losers of LB Round 2 (roundNumber 2)
  const nineToTwelve = pickMany(lb2Losers, 4);

  // 13–16: losers of LB Round 1 (roundNumber 1)
  const thirteenToSixteen = pickMany(lb1Losers, 4);

  return {
    first,
    second,
    third,
    fourth,
    fiveToSix,
    sevenToEight,
    nineToTwelve,
    thirteenToSixteen,
  };
}


// ===== SERVER SIDE: load published bracket + players =====
export async function getServerSideProps() {
  await connectToDatabase();

  const tournamentId = TID;

  const t = await Tournament.findOne({ tournamentId }).lean();

  // If nothing or not published → show "not published" state
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

  const bracketDoc = t.bracket;

  // Compute ranking either from stored field or live from bracket structure
  const ranking =
    bracketDoc.ranking && Object.keys(bracketDoc.ranking).length
      ? bracketDoc.ranking
      : computeRankingFromBracket(bracketDoc);

  // Collect all playerIds used in winners + losers rounds + finals + ranking
  const idSet = new Set();

  (bracketDoc.rounds || []).forEach((r) => {
    (r.matches || []).forEach((m) => {
      if (m.player1Id) idSet.add(m.player1Id.toString());
      if (m.player2Id) idSet.add(m.player2Id.toString());
      if (m.winnerId) idSet.add(m.winnerId.toString());
    });
  });

  (bracketDoc.losersRounds || []).forEach((r) => {
    (r.matches || []).forEach((m) => {
      if (m.player1Id) idSet.add(m.player1Id.toString());
      if (m.player2Id) idSet.add(m.player2Id.toString());
      if (m.winnerId) idSet.add(m.winnerId.toString());
    });
  });

  // Finals player IDs
  ["winnersFinal", "losersFinal", "grandFinal"].forEach((key) => {
    const fin = bracketDoc[key];
    if (fin) {
      if (fin.player1Id) idSet.add(fin.player1Id.toString());
      if (fin.player2Id) idSet.add(fin.player2Id.toString());
      if (fin.winnerId) idSet.add(fin.winnerId.toString());
    }
  });

  // Ranking player IDs (1st–16th)
  if (ranking) {
    const maybeAdd = (id) => {
      if (id) idSet.add(id.toString());
    };
    maybeAdd(ranking.first);
    maybeAdd(ranking.second);
    maybeAdd(ranking.third);
    maybeAdd(ranking.fourth);

    (ranking.fiveToSix || []).forEach((id) => maybeAdd(id));
    (ranking.sevenToEight || []).forEach((id) => maybeAdd(id));
    (ranking.nineToTwelve || []).forEach((id) => maybeAdd(id));
    (ranking.thirteenToSixteen || []).forEach((id) => maybeAdd(id));
  }

  const ids = Array.from(idSet);
  let playerDocs = [];
  if (ids.length > 0) {
    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
    playerDocs = await Player.find({ _id: { $in: objectIds } }).lean();
  }

  // Build a lookup array of players; pull IGN for this specific tournament
  const players = playerDocs.map((p) => {
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
          rounds: bracketDoc.rounds || [],
          losersRounds: bracketDoc.losersRounds || [],
          winnersFinal: bracketDoc.winnersFinal || null,
          losersFinal: bracketDoc.losersFinal || null,
          grandFinal: bracketDoc.grandFinal || null,
          ranking: ranking || null,
        })
      ),
      players,
    },
  };
}

// ===== HELPER: label from id (IGN only in public UI) =====
function buildIdToLabel(players) {
  const idToLabel = {};
  for (const p of players || []) {
    // Public bracket should show IGN only; fall back to username, then "Unknown"
    idToLabel[p._id] = p.ign || p.username || "Unknown";
  }
  return idToLabel;
}

export default function BracketPage({
  tournamentId,
  published,
  bracket,
  players,
}) {
  // ===== HEADER REG INFO PLACEHOLDERS =====
  const capacity = 16;
  const registered = players.length;
  const remaining = Math.max(capacity - registered, 0);
  const slotsText = `${registered} / ${capacity}`;
  const statusText =
    registered >= capacity ? "Full — waitlist" : `Open — ${remaining} left`;

  if (!published) {
    // Not published yet — simple message so you don't expose drafts
    return (
      <div className={styles.shell}>
        <div className={styles.contentWrap}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Bracket for {tournamentId}</h2>
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
  const getLabel = (id) => (id ? idToLabel[id] || "TBD" : "TBD");

  // Small helper for lists in ranking UI
  const mapList = (arr, targetLen) => {
    const out = (arr || []).map((id) => getLabel(id));
    while (out.length < targetLen) out.push("TBD");
    return out;
  };

  // ===== WINNERS BRACKET MAPPING (R16, QF, SF) =====
  const rounds = bracket?.rounds || [];

  const r1 =
    rounds.find((r) => r.roundNumber === 1 && r.type === "winners") ||
    rounds[0] ||
    { matches: [] };
  const r2 =
    rounds.find((r) => r.roundNumber === 2 && r.type === "winners") || {
      matches: [],
    };
  const r3 =
    rounds.find((r) => r.roundNumber === 3 && r.type === "winners") || {
      matches: [],
    };

  const r1Matches = r1.matches || [];
  const r2Matches = r2.matches || [];
  const r3Matches = r3.matches || [];

  // Round of 16: up to 8 matches → 4 left, 4 right
  const leftR16 = [];
  const rightR16 = [];
  r1Matches.forEach((m, index) => {
    const pair = [getLabel(m.player1Id), getLabel(m.player2Id)];
    if (index < 4) leftR16.push(pair);
    else rightR16.push(pair);
  });
  while (leftR16.length < 4) leftR16.push(["TBD", "TBD"]);
  while (rightR16.length < 4) rightR16.push(["TBD", "TBD"]);

  // Quarterfinals: up to 4 matches → 2 left, 2 right
  const leftQF = [];
  const rightQF = [];
  r2Matches.forEach((m, index) => {
    const pair = [getLabel(m.player1Id), getLabel(m.player2Id)];
    if (index < 2) leftQF.push(pair);
    else rightQF.push(pair);
  });
  while (leftQF.length < 2) leftQF.push(["TBD", "TBD"]);
  while (rightQF.length < 2) rightQF.push(["TBD", "TBD"]);

  // Semifinals: usually 2 matches → one left, one right
  let leftSF = ["TBD", "TBD"];
  let rightSF = ["TBD", "TBD"];
  if (r3Matches[0]) {
    leftSF = [
      getLabel(r3Matches[0].player1Id),
      getLabel(r3Matches[0].player2Id),
    ];
  }
  if (r3Matches[1]) {
    rightSF = [
      getLabel(r3Matches[1].player1Id),
      getLabel(r3Matches[1].player2Id),
    ];
  }

  // Winners Final from bracket.winnersFinal
  const winnersFinal = bracket?.winnersFinal || null;

  let finalLeft = "TBD";
  let finalRight = "TBD";
  let finalChamp = "TBD";

  if (winnersFinal) {
    if (winnersFinal.player1Id || winnersFinal.player2Id) {
      finalLeft = getLabel(winnersFinal.player1Id);
      finalRight = getLabel(winnersFinal.player2Id);
    }
    if (winnersFinal.winnerId) {
      finalChamp = getLabel(winnersFinal.winnerId);
    }
  }

  const bracketData = {
    left: { R16: leftR16, QF: leftQF, SF: leftSF },
    right: { R16: rightR16, QF: rightQF, SF: rightSF },
    final: { left: finalLeft, right: finalRight, champion: finalChamp },
  };

  // ===== LOSERS BRACKET MAPPING (LB R1–R4) =====
  const losersRounds = bracket?.losersRounds || [];

  const lb1 =
    losersRounds.find((r) => r.roundNumber === 1 && r.type === "losers") ||
    losersRounds[0] ||
    { matches: [] };
  const lb2 =
    losersRounds.find((r) => r.roundNumber === 2 && r.type === "losers") || {
      matches: [],
    };
  const lb3 =
    losersRounds.find((r) => r.roundNumber === 3 && r.type === "losers") || {
      matches: [],
    };
  const lb4 =
    losersRounds.find((r) => r.roundNumber === 4 && r.type === "losers") || {
      matches: [],
    };
  const lb5 =
    losersRounds.find((r) => r.roundNumber === 5 && r.type === "losers") || {
      matches: [],
    };

  const lb_r1 = (lb1.matches || []).map((m) => [
    getLabel(m.player1Id),
    getLabel(m.player2Id),
  ]);
  const lb_r2 = (lb2.matches || []).map((m) => [
    getLabel(m.player1Id),
    getLabel(m.player2Id),
  ]);
  const lb_r3a = (lb3.matches || []).map((m) => [
    getLabel(m.player1Id),
    getLabel(m.player2Id),
  ]);
  const lb_r3b = (lb4.matches || []).map((m) => [
    getLabel(m.player1Id),
    getLabel(m.player2Id),
  ]);
  const lb_r4 = (lb5.matches || []).map((m) => [
    getLabel(m.player1Id),
    getLabel(m.player2Id),
  ]);

  // Pad to shapes expected by LosersBracket16
  while (lb_r1.length < 4) lb_r1.push(["TBD", "TBD"]);
  while (lb_r2.length < 4) lb_r2.push(["TBD", "TBD"]);
  while (lb_r3a.length < 2) lb_r3a.push(["TBD", "TBD"]);
  while (lb_r3b.length < 2) lb_r3b.push(["TBD", "TBD"]);
  while (lb_r4.length < 1) lb_r4.push(["TBD", "TBD"]);

  // LB Final + LB winner
  const losersFinal = bracket?.losersFinal || null;

  const lb_final =
    losersFinal && (losersFinal.player1Id || losersFinal.player2Id)
      ? [getLabel(losersFinal.player1Id), getLabel(losersFinal.player2Id)]
      : ["TBD", "TBD"];

  const lb_winner =
    losersFinal && losersFinal.winnerId
      ? getLabel(losersFinal.winnerId)
      : "TBD";

  // ===== RANKING (1st–16th) FROM BRACKET.RANKING (already computed server-side) =====
  const rankingData = bracket?.ranking || null;

  const placements = {
    first: rankingData ? getLabel(rankingData.first) : "TBD",
    second: rankingData ? getLabel(rankingData.second) : "TBD",
    third: rankingData ? getLabel(rankingData.third) : "TBD",
    fourth: rankingData ? getLabel(rankingData.fourth) : "TBD",
    fifthToSixth: rankingData
      ? mapList(rankingData.fiveToSix || [], 2)
      : ["TBD", "TBD"],
    seventhToEighth: rankingData
      ? mapList(rankingData.sevenToEight || [], 2)
      : ["TBD", "TBD"],
    ninthToTwelfth: rankingData
      ? mapList(rankingData.nineToTwelve || [], 4)
      : ["TBD", "TBD", "TBD", "TBD"],
    thirteenthToSixteenth: rankingData
      ? mapList(rankingData.thirteenToSixteen || [], 4)
      : ["TBD", "TBD", "TBD", "TBD"],
  };

  const grandFinal = bracket?.grandFinal || null;

  const wbFinalWinner =
    winnersFinal && winnersFinal.winnerId
      ? getLabel(winnersFinal.winnerId)
      : "TBD";

  const lbFinalWinner = lb_winner;

  const grandChampion =
    grandFinal && grandFinal.winnerId
      ? getLabel(grandFinal.winnerId)
      : "TBD";

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

        {/* ===== Grand Final banner on top ===== */}
        <GrandFinalCenter
          wbChampion={wbFinalWinner}
          lbChampion={lbFinalWinner}
          champion={grandChampion}
        />

        {/* ===== Winners Bracket (LIVE) ===== */}
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

        {/* ===== Losers Bracket (LB R1–R4 + LB Final) ===== */}
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
