// pages/tournaments/[tournamentId]/bracket.js
import React from "react";
import mongoose from "mongoose";
import styles from "../../../styles/Rankings.module.css";
import Bracket16 from "../../../components/Bracket16";
import LosersBracket16 from "../../../components/LosersBracket16";
import GrandFinalCenter from "../../../components/GrandFinalCenter";

import { connectToDatabase } from "../../../lib/mongodb";
import Tournament from "../../../models/Tournament";
import Player from "../../../models/Player";

// ===== HELPERS (ELIMINATION TYPE) =====

// Try to read an explicit elimination type from the Tournament doc.
// Return "single", "double", or null if not sure.
function resolveEliminationTypeFromDoc(doc) {
  const meta = doc.meta || {};

  const rawSource =
    doc.bracketStyle || // 👈 your main field
    doc.elimination ||
    meta.bracketStyle ||
    meta.BracketStyle ||
    meta.elimination ||
    meta.Elimination ||
    meta.bracketType ||
    meta.BracketType ||
    meta.format ||
    meta.Format ||
    "";

  const raw = rawSource.toString().toLowerCase().trim();

  if (raw.includes("single")) return "single";
  if (raw.includes("double")) return "double";

  // Unknown / not set, let the bracket structure inference handle it
  return null;
}

// If doc doesn't say, try to infer based on presence of losers rounds/finals.
function inferEliminationFromStructure(bracket) {
  if (!bracket) return null;
  const hasLosersRounds =
    Array.isArray(bracket.losersRounds) && bracket.losersRounds.length > 0;
  const hasLosersFinal = !!bracket.losersFinal;
  const hasGrandFinal = !!bracket.grandFinal;

  if (hasLosersRounds || hasLosersFinal || hasGrandFinal) return "double";
  return "single";
}

// ===== SERVER SIDE: load published bracket + players =====
export async function getServerSideProps({ params }) {
  await connectToDatabase();

  const { tournamentId } = params;

  const t = await Tournament.findOne({ tournamentId }).lean();

  if (!t || !t.bracket || !t.bracket.isPublished) {
    return {
      props: {
        tournamentId,
        published: false,
        bracket: null,
        players: [],
        eliminationType: "double",
      },
    };
  }

  const rawBracket = t.bracket;

  // Collect all playerIds
  const idSet = new Set();

  (rawBracket.rounds || []).forEach((r) => {
    (r.matches || []).forEach((m) => {
      if (m.player1Id) idSet.add(m.player1Id.toString());
      if (m.player2Id) idSet.add(m.player2Id.toString());
      if (m.winnerId) idSet.add(m.winnerId.toString());
    });
  });

  (rawBracket.losersRounds || []).forEach((r) => {
    (r.matches || []).forEach((m) => {
      if (m.player1Id) idSet.add(m.player1Id.toString());
      if (m.player2Id) idSet.add(m.player2Id.toString());
      if (m.winnerId) idSet.add(m.winnerId.toString());
    });
  });

  ["winnersFinal", "losersFinal", "grandFinal"].forEach((key) => {
    const fin = rawBracket[key];
    if (fin) {
      if (fin.player1Id) idSet.add(fin.player1Id.toString());
      if (fin.player2Id) idSet.add(fin.player2Id.toString());
      if (fin.winnerId) idSet.add(fin.winnerId.toString());
    }
  });

  const ids = Array.from(idSet);
  let playerDocs = [];
  if (ids.length > 0) {
    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
    playerDocs = await Player.find({ _id: { $in: objectIds } }).lean();
  }

  // ⭐ Look in both registeredFor (ongoing) and tournamentHistory (ended)
  const players = playerDocs.map((p) => {
    const activeReg = (p.registeredFor || []).find(
      (r) => r.tournamentId === tournamentId
    );
    const historyReg = (p.tournamentHistory || []).find(
      (r) => r.tournamentId === tournamentId
    );
    const reg = activeReg || historyReg || null;

    return {
      _id: p._id.toString(),
      username: p.username || "",
      ign: reg?.ign || "", // IGN used for this tournament
    };
  });

  // Normalized bracket we send to client
  const bracket = JSON.parse(
    JSON.stringify({
      rounds: rawBracket.rounds || [],
      losersRounds: rawBracket.losersRounds || [],
      winnersFinal: rawBracket.winnersFinal || null,
      losersFinal: rawBracket.losersFinal || null,
      grandFinal: rawBracket.grandFinal || null,
    })
  );

  // Figure out "single" vs "double"
  const eliminationDirect = resolveEliminationTypeFromDoc(t);
  const eliminationFromStructure = inferEliminationFromStructure(bracket);
  const finalEliminationType =
    eliminationDirect || eliminationFromStructure || "double";

  return {
    props: {
      tournamentId,
      published: true,
      bracket,
      players,
      eliminationType: finalEliminationType,
    },
  };
}

// ===== HELPER =====
function buildIdToLabel(players) {
  const idToLabel = {};
  for (const p of players || []) {
    idToLabel[p._id] = p.ign || p.username || "Unknown";
  }
  return idToLabel;
}

export default function BracketPage({
  tournamentId,
  published,
  bracket,
  players,
  eliminationType = "double",
}) {
  const capacity = 16; // still a 16-player bracket layout
  const registered = players.length;
  const remaining = Math.max(capacity - registered, 0);
  const slotsText = `${registered} / ${capacity}`;
  const statusText =
    registered >= capacity ? "Full — waitlist" : `Open — ${remaining} left`;

  const isDoubleElim = eliminationType === "double";
  const isSingleElim = eliminationType === "single";

  if (!published) {
    return (
      <div className={styles.shell}>
        <div className={styles.contentWrap}>
          <div className={styles.infoCard}>
            <h2 className={styles.tournamentTitle}>Bracket Pending</h2>
            <p style={{ color: "#8b9bb4" }}>
              This bracket is currently being generated by admins.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const idToLabel = buildIdToLabel(players);
  const getLabel = (id) => (id ? idToLabel[id] || "TBD" : "TBD");

  const padNames = (arr, targetLen) => {
    const out = [...(arr || [])];
    while (out.length < targetLen) out.push("TBD");
    return out;
  };

  // Generic helper: losers from a list of matches
  const getLoserNamesFromMatches = (matches) =>
    (matches || [])
      .filter((m) => m.winnerId)
      .map((m) =>
        getLabel(
          m.winnerId === m.player1Id ? m.player2Id : m.player1Id
        )
      );

  // --- MAPPINGS ---
  const rounds = bracket?.rounds || [];
  const r1Matches =
    (rounds.find((r) => r.roundNumber === 1 && r.type === "winners") || {})
      .matches || [];
  const r2Matches =
    (rounds.find((r) => r.roundNumber === 2 && r.type === "winners") || {})
      .matches || [];
  const r3Matches =
    (rounds.find((r) => r.roundNumber === 3 && r.type === "winners") || {})
      .matches || [];

  const leftR16 = [],
    rightR16 = [];
  r1Matches.forEach((m, index) => {
    const pair = [getLabel(m.player1Id), getLabel(m.player2Id)];
    index < 4 ? leftR16.push(pair) : rightR16.push(pair);
  });
  while (leftR16.length < 4) leftR16.push(["TBD", "TBD"]);
  while (rightR16.length < 4) rightR16.push(["TBD", "TBD"]);

  const leftQF = [],
    rightQF = [];
  r2Matches.forEach((m, index) => {
    const pair = [getLabel(m.player1Id), getLabel(m.player2Id)];
    index < 2 ? leftQF.push(pair) : rightQF.push(pair);
  });
  while (leftQF.length < 2) leftQF.push(["TBD", "TBD"]);
  while (rightQF.length < 2) rightQF.push(["TBD", "TBD"]);

  let leftSF = ["TBD", "TBD"],
    rightSF = ["TBD", "TBD"];
  if (r3Matches[0])
    leftSF = [
      getLabel(r3Matches[0].player1Id),
      getLabel(r3Matches[0].player2Id),
    ];
  if (r3Matches[1])
    rightSF = [
      getLabel(r3Matches[1].player1Id),
      getLabel(r3Matches[1].player2Id),
    ];

  const winnersFinal = bracket?.winnersFinal || null;
  let finalLeft = "TBD",
    finalRight = "TBD",
    finalChamp = "TBD";
  if (winnersFinal) {
    if (winnersFinal.player1Id) finalLeft = getLabel(winnersFinal.player1Id);
    if (winnersFinal.player2Id) finalRight = getLabel(winnersFinal.player2Id);
    if (winnersFinal.winnerId) finalChamp = getLabel(winnersFinal.winnerId);
  }

  const bracketData = {
    left: { R16: leftR16, QF: leftQF, SF: leftSF },
    right: { R16: rightR16, QF: rightQF, SF: rightSF },
    final: { left: finalLeft, right: finalRight, champion: finalChamp },
  };

  // ===== LOSERS DATA (double elim) =====
  const losersRounds = bracket?.losersRounds || [];
  const getLbRound = (n) =>
    (losersRounds.find((r) => r.roundNumber === n && r.type === "losers") || {
      matches: [],
    }).matches;
  const lb_r1 = padNames(
    (getLbRound(1) || []).map((m) => [
      getLabel(m.player1Id),
      getLabel(m.player2Id),
    ]),
    4
  );
  const lb_r2 = padNames(
    (getLbRound(2) || []).map((m) => [
      getLabel(m.player1Id),
      getLabel(m.player2Id),
    ]),
    4
  );
  const lb_r3a = padNames(
    (getLbRound(3) || []).map((m) => [
      getLabel(m.player1Id),
      getLabel(m.player2Id),
    ]),
    2
  );
  const lb_r3b = padNames(
    (getLbRound(4) || []).map((m) => [
      getLabel(m.player1Id),
      getLabel(m.player2Id),
    ]),
    2
  );
  const lb_r4 = padNames(
    (getLbRound(5) || []).map((m) => [
      getLabel(m.player1Id),
      getLabel(m.player2Id),
    ]),
    1
  );

  const losersFinal = bracket?.losersFinal || null;
  const lb_final =
    losersFinal && (losersFinal.player1Id || losersFinal.player2Id)
      ? [getLabel(losersFinal.player1Id), getLabel(losersFinal.player2Id)]
      : ["TBD", "TBD"];
  const lb_winner = losersFinal?.winnerId
    ? getLabel(losersFinal.winnerId)
    : "TBD";

  const grandFinal = bracket?.grandFinal || null;
  const wbFinalWinner = winnersFinal?.winnerId
    ? getLabel(winnersFinal.winnerId)
    : "TBD";
  const lbFinalWinner = lb_winner;
  const grandChampion = grandFinal?.winnerId
    ? getLabel(grandFinal.winnerId)
    : "TBD";

  // ===== RANKING LOGIC =====

  let placements;

  if (isDoubleElim) {
    // ---- DOUBLE ELIM (original logic) ----
    const getLoserNames = (matches) => getLoserNamesFromMatches(matches);

    placements = {
      first: grandFinal?.winnerId ? getLabel(grandFinal.winnerId) : "TBD",
      second: grandFinal?.winnerId
        ? getLabel(
            grandFinal.winnerId === grandFinal.player1Id
              ? grandFinal.player2Id
              : grandFinal.player1Id
          )
        : "TBD",
      third: losersFinal?.winnerId
        ? getLabel(
            losersFinal.winnerId === losersFinal.player1Id
              ? losersFinal.player2Id
              : losersFinal.player1Id
          )
        : "TBD",
      fourth: getLoserNames(getLbRound(5))[0] || "TBD",
      fifthToSixth: padNames(getLoserNames(getLbRound(4)), 2),
      seventhToEighth: padNames(getLoserNames(getLbRound(3)), 2),
      ninthToTwelfth: padNames(getLoserNames(getLbRound(2)), 4),
      thirteenthToSixteenth: padNames(getLoserNames(getLbRound(1)), 4),
    };
  } else {
    // ---- SINGLE ELIM ----
    // mapping: R1 losers → 9–16, R2 losers → 5–8, R3 losers → 3–4, final loser → 2, winner → 1
    const r1Losers = padNames(getLoserNamesFromMatches(r1Matches), 8);
    const r2Losers = padNames(getLoserNamesFromMatches(r2Matches), 4);
    const r3Losers = padNames(getLoserNamesFromMatches(r3Matches), 2);

    const singleChampion = winnersFinal?.winnerId
      ? getLabel(winnersFinal.winnerId)
      : "TBD";
    const singleSecond = winnersFinal?.winnerId
      ? getLabel(
          winnersFinal.winnerId === winnersFinal.player1Id
            ? winnersFinal.player2Id
            : winnersFinal.player1Id
        )
      : "TBD";

    placements = {
      first: singleChampion,
      second: singleSecond,
      thirdToFourth: r3Losers, // length 2
      fifthToEighth: r2Losers, // length 4
      ninthToSixteenth: r1Losers, // length 8
    };
  }

  return (
    <div className={styles.shell}>
      {/* ===== HEADER + RANKINGS ===== */}
      <div className={styles.contentWrap}>
        <div className={styles.headerGrid}>
          {/* LEFT: Info Card */}
          <div className={styles.infoCard}>
            <h2 className={styles.tournamentTitle}>Championship Bracket</h2>
            <div className={styles.tournamentSubtitle}>
              {/* e.g. // 16 PLAYERS • SINGLE ELIMINATION */}
              {`// 16 PLAYERS • ${
                isSingleElim ? "SINGLE ELIMINATION" : "DOUBLE ELIMINATION"
              }`}
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Registration</span>
                <span className={styles.statValue}>{slotsText}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Status</span>
                <span
                  className={`${styles.statValue} ${styles.statValueHighlight}`}
                >
                  LIVE
                </span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Stream</span>
                <span className={styles.statValue}>5TQ_TV</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Format</span>
                <span className={styles.statValue}>
                  {isSingleElim ? "Single Elimination" : "Double Elimination"}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: Rankings */}
          <div className={styles.rankingContainer}>
            <div className={styles.rankingHeader}>
              <span>Place</span>
              <span>Player</span>
            </div>

            {isDoubleElim ? (
              <>
                <div className={styles.rankRow}>
                  <div className={`${styles.rankBadge} ${styles.gold}`}>
                    1st
                  </div>
                  <div className={styles.rankName}>{placements.first}</div>
                </div>
                <div className={styles.rankRow}>
                  <div className={`${styles.rankBadge} ${styles.silver}`}>
                    2nd
                  </div>
                  <div className={styles.rankName}>{placements.second}</div>
                </div>
                <div className={styles.rankRow}>
                  <div className={`${styles.rankBadge} ${styles.bronze}`}>
                    3rd
                  </div>
                  <div className={styles.rankName}>{placements.third}</div>
                </div>
                <div className={styles.rankRow}>
                  <div className={styles.rankBadge}>4th</div>
                  <div className={styles.rankName}>{placements.fourth}</div>
                </div>
                <div className={styles.rankRow}>
                  <div className={styles.rankBadge}>5-6</div>
                  <div className={styles.rankName}>
                    {placements.fifthToSixth.join(" • ")}
                  </div>
                </div>
                <div className={styles.rankRow}>
                  <div className={styles.rankBadge}>7-8</div>
                  <div className={styles.rankName}>
                    {placements.seventhToEighth.join(" • ")}
                  </div>
                </div>
                <div className={styles.rankRow}>
                  <div className={styles.rankBadge}>9-12</div>
                  <div className={styles.rankName}>
                    {placements.ninthToTwelfth.join(" • ")}
                  </div>
                </div>
                <div className={styles.rankRow}>
                  <div className={styles.rankBadge}>13-16</div>
                  <div className={styles.rankName}>
                    {placements.thirteenthToSixteenth.join(" • ")}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className={styles.rankRow}>
                  <div className={`${styles.rankBadge} ${styles.gold}`}>
                    1st
                  </div>
                  <div className={styles.rankName}>{placements.first}</div>
                </div>
                <div className={styles.rankRow}>
                  <div className={`${styles.rankBadge} ${styles.silver}`}>
                    2nd
                  </div>
                  <div className={styles.rankName}>{placements.second}</div>
                </div>
                <div className={styles.rankRow}>
                  <div className={styles.rankBadge}>3-4</div>
                  <div className={styles.rankName}>
                    {placements.thirdToFourth.join(" • ")}
                  </div>
                </div>
                <div className={styles.rankRow}>
                  <div className={styles.rankBadge}>5-8</div>
                  <div className={styles.rankName}>
                    {placements.fifthToEighth.join(" • ")}
                  </div>
                </div>
                <div className={styles.rankRow}>
                  <div className={styles.rankBadge}>9-16</div>
                  <div className={styles.rankName}>
                    {placements.ninthToSixteenth.join(" • ")}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ===== 1. WINNERS BRACKET (TOP) ===== */}
      <Bracket16 data={bracketData} />

      {/* ===== 2 & 3 ONLY FOR DOUBLE ELIM ===== */}
      {isDoubleElim && (
        <>
          {/* GRAND FINAL (CENTER) */}
          <GrandFinalCenter
            wbChampion={wbFinalWinner}
            lbChampion={lbFinalWinner}
            champion={grandChampion}
          />

          {/* LOSERS BRACKET (BOTTOM) */}
          <LosersBracket16
            r1={lb_r1}
            r2={lb_r2}
            r3a={lb_r3a}
            r3b={lb_r3b}
            r4={lb_r4}
            lbFinal={lb_final}
            lbWinner={lb_winner}
          />
        </>
      )}
    </div>
  );
}
