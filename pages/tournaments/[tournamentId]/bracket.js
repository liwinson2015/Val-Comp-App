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

// ---------- HELPERS FOR GAME / MODE / ELIM TYPE ----------

function resolveGameCodeFromDoc(doc) {
  const meta = doc.meta || {};
  const raw = (
    doc.game ||
    meta.game ||
    meta.Game ||
    ""
  )
    .toString()
    .toLowerCase()
    .trim();

  if (raw === "valorant") return "VALORANT";
  if (raw === "hok" || raw === "honorofkings" || raw === "honor_of_kings")
    return "HOK";
  if (raw === "tft" || raw === "teamfighttactics" || raw === "teamfight_tactics")
    return "TFT";

  // fallback for older data
  return "VALORANT";
}

function resolveModeKeyFromDoc(doc) {
  const meta = doc.meta || {};
  const raw = (
    doc.mode ||
    meta.mode ||
    meta.Mode ||
    ""
  )
    .toString()
    .toLowerCase()
    .trim();

  if (!raw) return "1v1"; // default for old Valorant 1v1 brackets
  return raw;
}

function resolveEliminationTypeFromDoc(doc) {
  const meta = doc.meta || {};
  const raw = (
    doc.elimination ||
    meta.elimination ||
    meta.Elimination ||
    meta.bracketType ||
    meta.BracketType ||
    meta.format ||
    meta.Format ||
    ""
  )
    .toString()
    .toLowerCase()
    .trim();

  if (raw.includes("single")) return "single";
  if (raw.includes("double")) return "double";

  // default: keep current behavior as double elim
  return "double";
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
        gameCode: null,
        gameKey: null,
        modeKey: null,
        eliminationType: "double",
        bracketSupported: false,
      },
    };
  }

  const bracket = t.bracket;

  // --- GAME / MODE / ELIM TYPE ---
  const gameCode = resolveGameCodeFromDoc(t); // "VALORANT" | "HOK" | "TFT"
  let gameKey = "valorant";
  if (gameCode === "TFT") gameKey = "tft";
  if (gameCode === "HOK") gameKey = "hok";

  const modeKey = resolveModeKeyFromDoc(t); // e.g. "1v1", "2v2", "5v5", "solo", "doubleup"
  const eliminationType = resolveEliminationTypeFromDoc(t); // "single" | "double"

  // Only use this bracket layout for:
  // - Valorant: 1v1, 2v2, 5v5
  // - HoK: 5v5
  const mk = (modeKey || "").toLowerCase();
  let bracketSupported = false;
  if (gameKey === "valorant") {
    if (mk.includes("1v1") || mk.includes("2v2") || mk.includes("5v5")) {
      bracketSupported = true;
    }
  } else if (gameKey === "hok") {
    if (mk.includes("5v5")) {
      bracketSupported = true;
    }
  } else {
    // TFT and anything else: not yet using this visual layout
    bracketSupported = false;
  }

  // Collect all playerIds involved in bracket
  const idSet = new Set();

  (bracket.rounds || []).forEach((r) => {
    (r.matches || []).forEach((m) => {
      if (m.player1Id) idSet.add(m.player1Id.toString());
      if (m.player2Id) idSet.add(m.player2Id.toString());
      if (m.winnerId) idSet.add(m.winnerId.toString());
    });
  });

  (bracket.losersRounds || []).forEach((r) => {
    (r.matches || []).forEach((m) => {
      if (m.player1Id) idSet.add(m.player1Id.toString());
      if (m.player2Id) idSet.add(m.player2Id.toString());
      if (m.winnerId) idSet.add(m.winnerId.toString());
    });
  });

  ["winnersFinal", "losersFinal", "grandFinal"].forEach((key) => {
    const fin = bracket[key];
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

  return {
    props: {
      tournamentId,
      published: true,
      bracket: JSON.parse(
        JSON.stringify({
          rounds: bracket.rounds || [],
          losersRounds: bracket.losersRounds || [],
          winnersFinal: bracket.winnersFinal || null,
          losersFinal: bracket.losersFinal || null,
          grandFinal: bracket.grandFinal || null,
        })
      ),
      players,
      gameCode,
      gameKey,
      modeKey,
      eliminationType,
      bracketSupported,
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
  gameCode,
  gameKey,
  modeKey,
  eliminationType,
  bracketSupported,
}) {
  const capacity = 16; // still a 16-player bracket layout
  const registered = players.length;
  const remaining = Math.max(capacity - registered, 0);
  const slotsText = `${registered} / ${capacity}`;
  const statusText =
    registered >= capacity ? "Full — waitlist" : `Open — ${remaining} left`;

  const elimLabel =
    eliminationType === "single"
      ? "Single Elimination"
      : "Double Elimination";

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

  // --- MAPPINGS (WINNERS BRACKET) ---
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

  // --- LOSERS BRACKET MAPPING ---
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

  // For the champion, fall back to winnersFinal if there is no separate grand final
  const effectiveFinal = grandFinal || winnersFinal || null;

  const wbFinalWinner = winnersFinal?.winnerId
    ? getLabel(winnersFinal.winnerId)
    : "TBD";
  const lbFinalWinner = lb_winner;
  const grandChampion = effectiveFinal?.winnerId
    ? getLabel(effectiveFinal.winnerId)
    : "TBD";

  // --- RANKING LOGIC ---
  const getLoserNames = (matches) => {
    return (matches || [])
      .filter((m) => m.winnerId)
      .map((m) =>
        getLabel(m.winnerId === m.player1Id ? m.player2Id : m.player1Id)
      );
  };

  const placements = {
    // 1st / 2nd from "effective" final (grandFinal if present, else winnersFinal)
    first: effectiveFinal?.winnerId
      ? getLabel(effectiveFinal.winnerId)
      : "TBD",
    second: effectiveFinal?.winnerId
      ? getLabel(
          effectiveFinal.winnerId === effectiveFinal.player1Id
            ? effectiveFinal.player2Id
            : effectiveFinal.player1Id
        )
      : "TBD",
    // Below still uses losers-side logic (best for double elim);
    // for single-elim these may remain "TBD" which is fine for now.
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

  return (
    <div className={styles.shell}>
      {/* ===== HEADER + RANKINGS ===== */}
      <div className={styles.contentWrap}>
        <div className={styles.headerGrid}>
          {/* LEFT: Info Card */}
          <div className={styles.infoCard}>
            <h2 className={styles.tournamentTitle}>Championship Bracket</h2>
            <div className={styles.tournamentSubtitle}>
              {/* Example: // VALORANT 1v1 • DOUBLE ELIMINATION */}
              {/* We keep the old comment-style look but make it dynamic */}
              {`// ${gameCode || "GAME"} ${modeKey?.toUpperCase() || ""} • ${elimLabel.toUpperCase()}`}
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
                <span className={styles.statValue}>{elimLabel}</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Rankings (still shown for both single & double; 
              for single some rows may stay TBD until we customize it later) */}
          <div className={styles.rankingContainer}>
            <div className={styles.rankingHeader}>
              <span>Place</span>
              <span>Player</span>
            </div>

            <div className={styles.rankRow}>
              <div className={`${styles.rankBadge} ${styles.gold}`}>1st</div>
              <div className={styles.rankName}>{placements.first}</div>
            </div>
            <div className={styles.rankRow}>
              <div className={`${styles.rankBadge} ${styles.silver}`}>2nd</div>
              <div className={styles.rankName}>{placements.second}</div>
            </div>
            <div className={styles.rankRow}>
              <div className={`${styles.rankBadge} ${styles.bronze}`}>3rd</div>
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
          </div>
        </div>
      </div>

      {/* ===== BRACKET RENDERING ===== */}

      {!bracketSupported ? (
        // For TFT or any unsupported game/mode combo
        <div className={styles.contentWrap}>
          <div className={styles.infoCard}>
            <h2 className={styles.tournamentTitle}>
              Bracket view coming soon
            </h2>
            <p style={{ color: "#8b9bb4" }}>
              Visual brackets for this game / mode aren&apos;t configured yet.
              Results are still being tracked internally.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 1. WINNERS BRACKET (always used for supported combos) */}
          <Bracket16 data={bracketData} />

          {/* 2 & 3 only for DOUBLE ELIMINATION */}
          {eliminationType === "double" && (
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
        </>
      )}
    </div>
  );
}
