import React, { useEffect, useState } from "react";
// Import the CSS Module from your styles folder
import styles from "../../../styles/BracketsAdmin.module.css";

import { getCurrentPlayerFromReq } from "../../../lib/getCurrentPlayer";
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";
import Tournament from "../../../models/Tournament";

// ---------- SERVER SIDE (UNCHANGED) ----------
export async function getServerSideProps({ req, params }) {
  const player = await getCurrentPlayerFromReq(req);

  if (!player) {
    const encoded = encodeURIComponent(
      `/admin/brackets/${params.tournamentId}`
    );
    return {
      redirect: {
        destination: `/api/auth/discord?next=${encoded}`,
        permanent: false,
      },
    };
  }

  if (!player.isAdmin) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  await connectToDatabase();

  const rawId = params.tournamentId;
  const tournamentId = decodeURIComponent(rawId);

  const players = await Player.find({
    "registeredFor.tournamentId": tournamentId,
  }).lean();

  const playerRows = players.map((p) => {
    const reg = (p.registeredFor || []).find(
      (r) => r.tournamentId === tournamentId
    );

    return {
      _id: p._id.toString(),
      username: p.username || "",
      discordId: p.discordId || "",
      ign: reg?.ign || "",
      rank: reg?.rank || "",
      registeredAt: reg?.createdAt
        ? new Date(reg.createdAt).toISOString()
        : null,
    };
  });

  const t = await Tournament.findOne({ tournamentId }).lean();
  const isPublished = !!t?.bracket?.isPublished;

  return {
    props: {
      tournamentId,
      players: playerRows,
      isPublished,
    },
  };
}

// ---------- HELPER FUNCTIONS (UNCHANGED) ----------
function computeLosersFromMatches(matches) {
  const losers = [];
  (matches || []).forEach((m) => {
    if (!m.winnerId) return;
    if (!m.player1Id || !m.player2Id) return;
    const loser = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
    losers.push(loser);
  });
  return losers;
}

function computeWinnersFromMatches(matches) {
  const winners = [];
  (matches || []).forEach((m) => {
    if (m.winnerId) winners.push(m.winnerId);
  });
  return winners;
}

function buildPairsFromIds(ids) {
  const pairs = [];
  for (let i = 0; i < ids.length; i += 2) {
    const p1 = ids[i] || null;
    const p2 = ids[i + 1] || null;
    if (!p1 && !p2) continue;
    pairs.push({ player1Id: p1, player2Id: p2, winnerId: null });
  }
  return pairs;
}

// ---------- MAIN PAGE COMPONENT ----------
export default function BracketAdminPage({
  tournamentId,
  players,
  isPublished,
}) {
  return (
    <div className={styles["admin-container"]}>
      {/* Header & Publish Actions */}
      <header className={styles["header-section"]}>
        <div className={styles["header-content"]}>
          <h1>Bracket Editor</h1>
          <div className={styles["header-description"]}>
            Tournament ID: <strong>{tournamentId}</strong>
            <br />
            Adjust seeds, set winners, and build the losers bracket.
            <br />
            <span
              className={`${styles["status-badge"]} ${
                isPublished
                  ? styles["status-published"]
                  : styles["status-draft"]
              }`}
            >
              {isPublished ? "● Live (Published)" : "○ Draft (Hidden)"}
            </span>
          </div>
        </div>

        <div className={styles["action-bar"]}>
          {/* UNPUBLISH */}
          <form
            method="POST"
            action={`/api/admin/brackets/${encodeURIComponent(
              tournamentId
            )}/publish?state=unpublish`}
          >
            <button
              type="submit"
              className={`${styles["btn"]} ${styles["btn-danger"]}`}
            >
              Unpublish
            </button>
          </form>

          {/* PUBLISH */}
          <form
            method="POST"
            action={`/api/admin/brackets/${encodeURIComponent(
              tournamentId
            )}/publish?state=publish`}
          >
            <button
              type="submit"
              className={`${styles["btn"]} ${styles["btn-success"]}`}
            >
              📢 Publish Bracket
            </button>
          </form>
        </div>
      </header>

      <BracketEditor tournamentId={tournamentId} players={players} />
    </div>
  );
}

// ---------- BRACKET EDITOR ----------
function BracketEditor({ tournamentId, players }) {
  const emptyFinalMatch = { player1Id: null, player2Id: null, winnerId: null };

  const [loading, setLoading] = useState(true);

  // Winners
  const [matches, setMatches] = useState([]); // R1
  const [qfMatches, setQfMatches] = useState([]); // R2 (QF)
  const [sfMatches, setSfMatches] = useState([]); // R3 (SF)

  // Losers
  const [lbMatches1, setLbMatches1] = useState([]); // LB R1
  const [lbMatches2, setLbMatches2] = useState([]); // LB R2
  const [lbMatches3a, setLbMatches3a] = useState([]); // LB R3A
  const [lbMatches3b, setLbMatches3b] = useState([]); // LB R3B
  const [lbMatches4, setLbMatches4] = useState([]); // LB R4

  // Finals
  const [wbFinalMatches, setWbFinalMatches] = useState([emptyFinalMatch]);
  const [lbFinalMatches, setLbFinalMatches] = useState([emptyFinalMatch]);
  const [grandFinalMatches, setGrandFinalMatches] =
    useState([emptyFinalMatch]);

  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [randomizing, setRandomizing] = useState(false);

  // label map
  const idToLabel = {};
  for (const p of players || []) {
    const base = p.ign || p.username || "Unknown";
    const extra = p.username && p.ign ? ` (${p.username})` : "";
    idToLabel[p._id] = `${base}${extra}`;
  }
  const allOptions = players.map((p) => ({
    value: p._id,
    label: idToLabel[p._id],
  }));

  // ===== Load existing bracket on mount =====
  useEffect(() => {
    async function loadBracket() {
      try {
        const res = await fetch(
          `/api/admin/brackets/${encodeURIComponent(tournamentId)}/get`
        );
        const data = await res.json();
        const bracket = data.bracket || null;

        // winners
        if (!bracket || !Array.isArray(bracket.rounds)) {
          setMatches([]);
          setQfMatches([]);
          setSfMatches([]);
        } else {
          const rounds = bracket.rounds || [];

          const r1 =
            rounds.find((r) => r.roundNumber === 1 && r.type === "winners") ||
            rounds[0];
          setMatches(
            (r1?.matches || []).map((m) => ({
              player1Id: m.player1Id || null,
              player2Id: m.player2Id || null,
              winnerId: m.winnerId || null,
            }))
          );

          const r2 = rounds.find(
            (r) => r.roundNumber === 2 && r.type === "winners"
          );
          setQfMatches(
            (r2?.matches || []).map((m) => ({
              player1Id: m.player1Id || null,
              player2Id: m.player2Id || null,
              winnerId: m.winnerId || null,
            }))
          );

          const r3 = rounds.find(
            (r) => r.roundNumber === 3 && r.type === "winners"
          );
          setSfMatches(
            (r3?.matches || []).map((m) => ({
              player1Id: m.player1Id || null,
              player2Id: m.player2Id || null,
              winnerId: m.winnerId || null,
            }))
          );
        }

        // losers
        if (bracket && Array.isArray(bracket.losersRounds)) {
          const lrs = bracket.losersRounds || [];

          const lb1 =
            lrs.find((r) => r.roundNumber === 1 && r.type === "losers") ||
            lrs[0];
          setLbMatches1(
            (lb1?.matches || []).map((m) => ({
              player1Id: m.player1Id || null,
              player2Id: m.player2Id || null,
              winnerId: m.winnerId || null,
            }))
          );

          const lb2 = lrs.find(
            (r) => r.roundNumber === 2 && r.type === "losers"
          );
          setLbMatches2(
            (lb2?.matches || []).map((m) => ({
              player1Id: m.player1Id || null,
              player2Id: m.player2Id || null,
              winnerId: m.winnerId || null,
            }))
          );

          const lb3 = lrs.find(
            (r) => r.roundNumber === 3 && r.type === "losers"
          );
          setLbMatches3a(
            (lb3?.matches || []).map((m) => ({
              player1Id: m.player1Id || null,
              player2Id: m.player2Id || null,
              winnerId: m.winnerId || null,
            }))
          );

          const lb4 = lrs.find(
            (r) => r.roundNumber === 4 && r.type === "losers"
          );
          setLbMatches3b(
            (lb4?.matches || []).map((m) => ({
              player1Id: m.player1Id || null,
              player2Id: m.player2Id || null,
              winnerId: m.winnerId || null,
            }))
          );

          const lb5 = lrs.find(
            (r) => r.roundNumber === 5 && r.type === "losers"
          );
          setLbMatches4(
            (lb5?.matches || []).map((m) => ({
              player1Id: m.player1Id || null,
              player2Id: m.player2Id || null,
              winnerId: m.winnerId || null,
            }))
          );
        } else {
          setLbMatches1([]);
          setLbMatches2([]);
          setLbMatches3a([]);
          setLbMatches3b([]);
          setLbMatches4([]);
        }

        // winners final
        if (bracket && bracket.winnersFinal) {
          const wf = bracket.winnersFinal;
          setWbFinalMatches([
            {
              player1Id: wf.player1Id || null,
              player2Id: wf.player2Id || null,
              winnerId: wf.winnerId || null,
            },
          ]);
        } else {
          setWbFinalMatches([emptyFinalMatch]);
        }

        // losers final
        if (bracket && bracket.losersFinal) {
          const lf = bracket.losersFinal;
          setLbFinalMatches([
            {
              player1Id: lf.player1Id || null,
              player2Id: lf.player2Id || null,
              winnerId: lf.winnerId || null,
            },
          ]);
        } else {
          setLbFinalMatches([emptyFinalMatch]);
        }

        // grand final
        if (bracket && bracket.grandFinal) {
          const gf = bracket.grandFinal;
          setGrandFinalMatches([
            {
              player1Id: gf.player1Id || null,
              player2Id: gf.player2Id || null,
              winnerId: gf.winnerId || null,
            },
          ]);
        } else {
          setGrandFinalMatches([emptyFinalMatch]);
        }
      } catch (err) {
        console.error("Failed to load bracket", err);
        setMatches([]);
        setQfMatches([]);
        setSfMatches([]);
        setLbMatches1([]);
        setLbMatches2([]);
        setLbMatches3a([]);
        setLbMatches3b([]);
        setLbMatches4([]);
        setWbFinalMatches([emptyFinalMatch]);
        setLbFinalMatches([emptyFinalMatch]);
        setGrandFinalMatches([emptyFinalMatch]);
      } finally {
        setLoading(false);
      }
    }

    loadBracket();
  }, [tournamentId]);

  // ===== AUTO-BUILD =====
  useEffect(() => {
    const winnersSF = computeWinnersFromMatches(sfMatches);
    if (winnersSF.length < 2) return;

    setWbFinalMatches((prev) => {
      const current = prev && prev[0] ? prev[0] : emptyFinalMatch;
      if (current.player1Id || current.player2Id) {
        return prev;
      }
      return [
        {
          player1Id: winnersSF[0],
          player2Id: winnersSF[1],
          winnerId:
            current.winnerId &&
            (current.winnerId === winnersSF[0] ||
              current.winnerId === winnersSF[1])
              ? current.winnerId
              : null,
        },
      ];
    });
  }, [sfMatches]);

  function labelFromId(id) {
    if (!id) return "TBD";
    return idToLabel[id] || "TBD";
  }

  // ===== Round 1 Logic =====
  function handleChangeMatch(index, field, value) {
    setMatches((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      copy[index] = { ...copy[index], [field]: value || null };

      const m = copy[index];
      if (
        (field === "player1Id" || field === "player2Id") &&
        m.winnerId &&
        m.winnerId !== m.player1Id &&
        m.winnerId !== m.player2Id
      ) {
        m.winnerId = null;
      }

      return copy;
    });
  }

  function handleSetWinnerR1(index, which) {
    setMatches((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      const m = copy[index];

      if (which === "p1") {
        if (!m.player1Id) return prev;
        m.winnerId = m.player1Id;
      } else if (which === "p2") {
        if (!m.player2Id) return prev;
        m.winnerId = m.player2Id;
      }

      return copy;
    });
  }

  async function handleRandomizeR1() {
    setRandomizing(true);
    setSaveMessage("");
    try {
      const res = await fetch(
        `/api/admin/brackets/${encodeURIComponent(tournamentId)}/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setSaveMessage(data.error || "Failed to randomize bracket.");
      } else {
        const fresh = (data.matches || []).map((m) => ({
          ...m,
          winnerId: null,
        }));
        setMatches(fresh);
        setQfMatches([]);
        setSfMatches([]);
        setLbMatches1([]);
        setLbMatches2([]);
        setLbMatches3a([]);
        setLbMatches3b([]);
        setLbMatches4([]);
        setWbFinalMatches([emptyFinalMatch]);
        setLbFinalMatches([emptyFinalMatch]);
        setGrandFinalMatches([emptyFinalMatch]);
        setSaveMessage(
          "Random Round 1 generated (not saved yet). Set winners and save when ready."
        );
      }
    } catch (err) {
      console.error("Randomize error", err);
      setSaveMessage("Error generating random layout.");
    } finally {
      setRandomizing(false);
    }
  }

  function handleAddPlayerToBracket(playerId) {
    setMatches((prev) => {
      const copy = prev.map((m) => ({ ...m }));

      const alreadyPlaced = copy.some(
        (m) => m.player1Id === playerId || m.player2Id === playerId
      );
      if (alreadyPlaced) {
        setSaveMessage("That player is already placed in Round 1.");
        return copy;
      }

      for (let m of copy) {
        if (!m.player1Id) {
          m.player1Id = playerId;
          setSaveMessage("Player added to the next available Round 1 slot.");
          return copy;
        }
        if (!m.player2Id) {
          m.player2Id = playerId;
          setSaveMessage("Player added to the next available Round 1 slot.");
          return copy;
        }
      }

      setSaveMessage("No empty Round 1 slots left.");
      return copy;
    });
  }

  // used + duplicates
  const usedIds = new Set();
  const placedCount = {};
  matches.forEach((m) => {
    if (m.player1Id) {
      usedIds.add(m.player1Id);
      placedCount[m.player1Id] = (placedCount[m.player1Id] || 0) + 1;
    }
    if (m.player2Id) {
      usedIds.add(m.player2Id);
      placedCount[m.player2Id] = (placedCount[m.player2Id] || 0) + 1;
    }
  });
  const duplicatedIds = new Set(
    Object.keys(placedCount).filter((id) => placedCount[id] > 1)
  );
  const unusedPlayers = players.filter((p) => !usedIds.has(p._id));
  const duplicatePlayers = players.filter((p) => duplicatedIds.has(p._id));
  const usedCount = usedIds.size;
  const totalCount = players.length;

  const losersR1 = computeLosersFromMatches(matches);
  const winnersChosenR1 = losersR1.length;

  // ===== LB Round 1 =====
  function handleRandomizeLB1() {
    if (winnersChosenR1 === 0) {
      setSaveMessage(
        "Set some Round 1 winners first before building LB Round 1."
      );
      return;
    }
    const shuffled = [...losersR1];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const pairs = buildPairsFromIds(shuffled);
    setLbMatches1(pairs);
    setSaveMessage(
      "Losers Bracket Round 1 built from Round 1 losers. You can adjust and set winners."
    );
  }

  function handleChangeLbMatch1(index, slot, value) {
    setLbMatches1((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      if (!copy[index]) return copy;
      copy[index][slot] = value || null;
      const m = copy[index];
      if (
        m.winnerId &&
        m.winnerId !== m.player1Id &&
        m.winnerId !== m.player2Id
      ) {
        m.winnerId = null;
      }
      return copy;
    });
  }

  function handleSetWinnerLB1(index, which) {
    setLbMatches1((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      const m = copy[index];
      if (which === "p1") {
        if (!m.player1Id) return prev;
        m.winnerId = m.player1Id;
      } else if (which === "p2") {
        if (!m.player2Id) return prev;
        m.winnerId = m.player2Id;
      }
      return copy;
    });
  }

  // ===== Winners Round 2 (QF) =====
  function handleBuildQF() {
    if (!matches.length) {
      setSaveMessage("You need Round 1 matches before building Quarterfinals.");
      return;
    }
    const totalR1 = matches.length;
    const numQF = Math.ceil(totalR1 / 2);
    const nextQF = [];

    for (let i = 0; i < numQF; i++) {
      const r1IndexA = i * 2;
      const r1IndexB = i * 2 + 1;
      const mA = matches[r1IndexA] || {};
      const mB = matches[r1IndexB] || {};
      const r1WinnerA = mA.winnerId || null;
      const r1WinnerB = mB.winnerId || null;
      const existing = qfMatches[i] || {
        player1Id: null,
        player2Id: null,
        winnerId: null,
      };
      const player1Id = r1WinnerA || existing.player1Id || null;
      const player2Id = r1WinnerB || existing.player2Id || null;
      let winnerId = existing.winnerId;
      if (winnerId && winnerId !== player1Id && winnerId !== player2Id) {
        winnerId = null;
      }
      nextQF.push({ player1Id, player2Id, winnerId });
    }

    setQfMatches(nextQF);
    setSfMatches([]);
    setLbMatches2([]);
    setLbMatches3a([]);
    setLbMatches3b([]);
    setLbMatches4([]);
    setWbFinalMatches([emptyFinalMatch]);
    setLbFinalMatches([emptyFinalMatch]);
    setGrandFinalMatches([emptyFinalMatch]);
    setSaveMessage(
      "Quarterfinals built from Round 1 winners with fixed slots."
    );
  }

  function handleChangeQFMatch(index, field, value) {
    setQfMatches((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      copy[index] = { ...copy[index], [field]: value || null };
      const m = copy[index];
      if (
        (field === "player1Id" || field === "player2Id") &&
        m.winnerId &&
        m.winnerId !== m.player1Id &&
        m.winnerId !== m.player2Id
      ) {
        m.winnerId = null;
      }
      return copy;
    });
  }

  function handleSetWinnerQF(index, which) {
    setQfMatches((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      const m = copy[index];
      if (which === "p1") {
        if (!m.player1Id) return prev;
        m.winnerId = m.player1Id;
      } else if (which === "p2") {
        if (!m.player2Id) return prev;
        m.winnerId = m.player2Id;
      }
      return copy;
    });
  }

  const losersR2 = computeLosersFromMatches(qfMatches);

  // ===== LB Round 2 =====
  function handleBuildLB2() {
    const totalLB1 = lbMatches1.length;
    const totalQF = qfMatches.length;
    const numLB2 = Math.max(totalLB1, totalQF);
    if (!numLB2) {
      setSaveMessage(
        "You need LB Round 1 and Quarterfinals before building LB Round 2."
      );
      return;
    }
    const nextLB2 = [];
    for (let i = 0; i < numLB2; i++) {
      const lb1 = lbMatches1[i] || {};
      const qf = qfMatches[i] || {};
      const lbWinner = lb1.winnerId || null;
      let qfLoser = null;
      if (qf.winnerId && qf.player1Id && qf.player2Id) {
        qfLoser = qf.winnerId === qf.player1Id ? qf.player2Id : qf.player1Id;
      }
      const existing = lbMatches2[i] || {
        player1Id: null,
        player2Id: null,
        winnerId: null,
      };
      const player1Id = lbWinner || existing.player1Id || null;
      const player2Id = qfLoser || existing.player2Id || null;
      let winnerId = existing.winnerId;
      if (winnerId && winnerId !== player1Id && winnerId !== player2Id) {
        winnerId = null;
      }
      nextLB2.push({ player1Id, player2Id, winnerId });
    }
    setLbMatches2(nextLB2);
    setLbMatches3a([]);
    setLbMatches3b([]);
    setLbMatches4([]);
    setLbFinalMatches([emptyFinalMatch]);
    setGrandFinalMatches([emptyFinalMatch]);
    setSaveMessage("Losers Bracket Round 2 built.");
  }

  function handleChangeLbMatch2(index, slot, value) {
    setLbMatches2((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      if (!copy[index]) return copy;
      copy[index][slot] = value || null;
      const m = copy[index];
      if (
        m.winnerId &&
        m.winnerId !== m.player1Id &&
        m.winnerId !== m.player2Id
      ) {
        m.winnerId = null;
      }
      return copy;
    });
  }

  function handleSetWinnerLB2(index, which) {
    setLbMatches2((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      const m = copy[index];
      if (which === "p1") {
        if (!m.player1Id) return prev;
        m.winnerId = m.player1Id;
      } else if (which === "p2") {
        if (!m.player2Id) return prev;
        m.winnerId = m.player2Id;
      }
      return copy;
    });
  }

  // ===== Winners Round 3 (SF) =====
  function handleBuildSF() {
    if (!qfMatches.length) {
      setSaveMessage(
        "You need Quarterfinal matches before building Semifinals."
      );
      return;
    }
    const totalQF = qfMatches.length;
    const numSF = Math.ceil(totalQF / 2);
    const nextSF = [];
    for (let i = 0; i < numSF; i++) {
      const qfIndexA = i * 2;
      const qfIndexB = i * 2 + 1;
      const qa = qfMatches[qfIndexA] || {};
      const qb = qfMatches[qfIndexB] || {};
      const winnerA = qa.winnerId || null;
      const winnerB = qb.winnerId || null;
      const existing = sfMatches[i] || {
        player1Id: null,
        player2Id: null,
        winnerId: null,
      };
      const player1Id = winnerA || existing.player1Id || null;
      const player2Id = winnerB || existing.player2Id || null;
      let winnerId = existing.winnerId;
      if (winnerId && winnerId !== player1Id && winnerId !== player2Id) {
        winnerId = null;
      }
      nextSF.push({ player1Id, player2Id, winnerId });
    }
    setSfMatches(nextSF);
    setLbMatches3a([]);
    setLbMatches3b([]);
    setLbMatches4([]);
    setWbFinalMatches([emptyFinalMatch]);
    setLbFinalMatches([emptyFinalMatch]);
    setGrandFinalMatches([emptyFinalMatch]);
    setSaveMessage("Semifinals built from Quarterfinal winners.");
  }

  function handleChangeSFMatch(index, field, value) {
    setSfMatches((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      copy[index] = { ...copy[index], [field]: value || null };
      const m = copy[index];
      if (
        (field === "player1Id" || field === "player2Id") &&
        m.winnerId &&
        m.winnerId !== m.player1Id &&
        m.winnerId !== m.player2Id
      ) {
        m.winnerId = null;
      }
      return copy;
    });
  }

  function handleSetWinnerSF(index, which) {
    setSfMatches((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      const m = copy[index];
      if (which === "p1") {
        if (!m.player1Id) return prev;
        m.winnerId = m.player1Id;
      } else if (which === "p2") {
        if (!m.player2Id) return prev;
        m.winnerId = m.player2Id;
      }
      return copy;
    });
  }

  // ===== LB Round 3A =====
  function handleBuildLB3A() {
    if (!lbMatches2.length) {
      setSaveMessage(
        "You need LB Round 2 matches before building LB Round 3A."
      );
      return;
    }
    const totalLB2 = lbMatches2.length;
    const numLB3A = Math.ceil(totalLB2 / 2);
    const nextLB3A = [];
    for (let i = 0; i < numLB3A; i++) {
      const lb2IndexA = i * 2;
      const lb2IndexB = i * 2 + 1;
      const mA = lbMatches2[lb2IndexA] || {};
      const mB = lbMatches2[lb2IndexB] || {};
      const winnerA = mA.winnerId || null;
      const winnerB = mB.winnerId || null;
      const existing = lbMatches3a[i] || {
        player1Id: null,
        player2Id: null,
        winnerId: null,
      };
      const player1Id = winnerA || existing.player1Id || null;
      const player2Id = winnerB || existing.player2Id || null;
      let winnerId = existing.winnerId;
      if (winnerId && winnerId !== player1Id && winnerId !== player2Id) {
        winnerId = null;
      }
      nextLB3A.push({ player1Id, player2Id, winnerId });
    }
    setLbMatches3a(nextLB3A);
    setLbMatches3b([]);
    setLbMatches4([]);
    setLbFinalMatches([emptyFinalMatch]);
    setGrandFinalMatches([emptyFinalMatch]);
    setSaveMessage("Losers Bracket Round 3A built.");
  }

  function handleChangeLbMatch3A(index, slot, value) {
    setLbMatches3a((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      if (!copy[index]) return copy;
      copy[index][slot] = value || null;
      const m = copy[index];
      if (
        m.winnerId &&
        m.winnerId !== m.player1Id &&
        m.winnerId !== m.player2Id
      ) {
        m.winnerId = null;
      }
      return copy;
    });
  }

  function handleSetWinnerLB3A(index, which) {
    setLbMatches3a((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      const m = copy[index];
      if (which === "p1") {
        if (!m.player1Id) return prev;
        m.winnerId = m.player1Id;
      } else if (which === "p2") {
        if (!m.player2Id) return prev;
        m.winnerId = m.player2Id;
      }
      return copy;
    });
  }

  const lb3aWinners = computeWinnersFromMatches(lbMatches3a);

  // ===== LB Round 3B =====
  function handleBuildLB3B() {
    if (!lbMatches3a.length) {
      setSaveMessage(
        "Set winners for LB Round 3A before building LB Round 3B."
      );
      return;
    }
    if (!sfMatches.length) {
      setSaveMessage(
        "Set Winners Semifinals results so losers can drop into LB Round 3B."
      );
      return;
    }
    const numLB3B = Math.max(lbMatches3a.length, sfMatches.length);
    const nextLB3B = [];
    for (let i = 0; i < numLB3B; i++) {
      const lb3A = lbMatches3a[i] || {};
      const sf = sfMatches[i] || {};
      const lb3AWinner = lb3A.winnerId || null;
      let sfLoser = null;
      if (sf.winnerId && sf.player1Id && sf.player2Id) {
        sfLoser = sf.winnerId === sf.player1Id ? sf.player2Id : sf.player1Id;
      }
      const existing = lbMatches3b[i] || {
        player1Id: null,
        player2Id: null,
        winnerId: null,
      };
      const player1Id = lb3AWinner || existing.player1Id || null;
      const player2Id = sfLoser || existing.player2Id || null;
      let winnerId = existing.winnerId;
      if (winnerId && winnerId !== player1Id && winnerId !== player2Id) {
        winnerId = null;
      }
      nextLB3B.push({ player1Id, player2Id, winnerId });
    }
    setLbMatches3b(nextLB3B);
    setLbMatches4([]);
    setLbFinalMatches([emptyFinalMatch]);
    setGrandFinalMatches([emptyFinalMatch]);
    setSaveMessage("Losers Bracket Round 3B built.");
  }

  function handleChangeLbMatch3B(index, slot, value) {
    setLbMatches3b((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      if (!copy[index]) return copy;
      copy[index][slot] = value || null;
      const m = copy[index];
      if (
        m.winnerId &&
        m.winnerId !== m.player1Id &&
        m.winnerId !== m.player2Id
      ) {
        m.winnerId = null;
      }
      return copy;
    });
  }

  function handleSetWinnerLB3B(index, which) {
    setLbMatches3b((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      const m = copy[index];
      if (which === "p1") {
        if (!m.player1Id) return prev;
        m.winnerId = m.player1Id;
      } else if (which === "p2") {
        if (!m.player2Id) return prev;
        m.winnerId = m.player2Id;
      }
      return copy;
    });
  }

  const lb3bWinners = computeWinnersFromMatches(lbMatches3b);

  // ===== LB Round 4 =====
  function handleBuildLB4() {
    if (!lbMatches3b.length) {
      setSaveMessage(
        "You need winners from LB Round 3B to build LB Round 4."
      );
      return;
    }
    const totalLB3B = lbMatches3b.length;
    const numLB4 = Math.ceil(totalLB3B / 2);
    const nextLB4 = [];
    for (let i = 0; i < numLB4; i++) {
      const indexA = i * 2;
      const indexB = i * 2 + 1;
      const mA = lbMatches3b[indexA] || {};
      const mB = lbMatches3b[indexB] || {};
      const winnerA = mA.winnerId || null;
      const winnerB = mB.winnerId || null;
      const existing = lbMatches4[i] || {
        player1Id: null,
        player2Id: null,
        winnerId: null,
      };
      const player1Id = winnerA || existing.player1Id || null;
      const player2Id = winnerB || existing.player2Id || null;
      let winnerId = existing.winnerId;
      if (winnerId && winnerId !== player1Id && winnerId !== player2Id) {
        winnerId = null;
      }
      nextLB4.push({ player1Id, player2Id, winnerId });
    }
    setLbMatches4(nextLB4);
    setLbFinalMatches([emptyFinalMatch]);
    setGrandFinalMatches([emptyFinalMatch]);
    setSaveMessage("Losers Bracket Round 4 built.");
  }

  function handleChangeLbMatch4(index, slot, value) {
    setLbMatches4((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      if (!copy[index]) return copy;
      copy[index][slot] = value || null;
      const m = copy[index];
      if (
        m.winnerId &&
        m.winnerId !== m.player1Id &&
        m.winnerId !== m.player2Id
      ) {
        m.winnerId = null;
      }
      return copy;
    });
  }

  function handleSetWinnerLB4(index, which) {
    setLbMatches4((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      const m = copy[index];
      if (which === "p1") {
        if (!m.player1Id) return prev;
        m.winnerId = m.player1Id;
      } else if (which === "p2") {
        if (!m.player2Id) return prev;
        m.winnerId = m.player2Id;
      }
      return copy;
    });
  }

  // ===== Winners Final =====
  function handleChangeWbFinal(index, field, value) {
    setWbFinalMatches((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      copy[index] = { ...copy[index], [field]: value || null };
      const m = copy[index];
      if (
        (field === "player1Id" || field === "player2Id") &&
        m.winnerId &&
        m.winnerId !== m.player1Id &&
        m.winnerId !== m.player2Id
      ) {
        m.winnerId = null;
      }
      return copy;
    });
  }

  function handleSetWinnerWbFinal(index, which) {
    setWbFinalMatches((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      const m = copy[index];

      if (which === "p1") {
        if (!m.player1Id) return prev;
        m.winnerId = m.player1Id;
      } else if (which === "p2") {
        if (!m.player2Id) return prev;
        m.winnerId = m.player2Id;
      }

      const winnerId = m.winnerId || null;
      let loserId = null;
      if (m.player1Id && m.player2Id && winnerId) {
        loserId = winnerId === m.player1Id ? m.player2Id : m.player1Id;
      }

      // Auto-fill Losers Final and Grand Final slot 1
      if (winnerId || loserId) {
        const lb4Winners = computeWinnersFromMatches(lbMatches4);
        const lb4Winner = lb4Winners[0] || null;
        if (lb4Winner || loserId) {
          setLbFinalMatches((prevLB) => {
            const next = prevLB.map((mm) => ({ ...mm }));
            if (!next[0]) {
              next[0] = { player1Id: null, player2Id: null, winnerId: null };
            }
            const lf = next[0];
            if (!lf.player1Id && lb4Winner) lf.player1Id = lb4Winner;
            if (!lf.player2Id && loserId) lf.player2Id = loserId;
            if (
              lf.winnerId &&
              lf.winnerId !== lf.player1Id &&
              lf.winnerId !== lf.player2Id
            ) {
              lf.winnerId = null;
            }
            return next;
          });
        }
        if (winnerId) {
          setGrandFinalMatches((prevGF) => {
            const next = prevGF.map((mm) => ({ ...mm }));
            if (!next[0]) {
              next[0] = { player1Id: null, player2Id: null, winnerId: null };
            }
            const gf = next[0];
            if (!gf.player1Id) {
              gf.player1Id = winnerId;
            }
            if (
              gf.winnerId &&
              gf.winnerId !== gf.player1Id &&
              gf.winnerId !== gf.player2Id
            ) {
              gf.winnerId = null;
            }
            return next;
          });
        }
      }
      return copy;
    });
  }

  // ===== Losers Final =====
  function handleChangeLbFinal(index, field, value) {
    setLbFinalMatches((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      copy[index] = { ...copy[index], [field]: value || null };
      const m = copy[index];
      if (
        (field === "player1Id" || field === "player2Id") &&
        m.winnerId &&
        m.winnerId !== m.player1Id &&
        m.winnerId !== m.player2Id
      ) {
        m.winnerId = null;
      }
      return copy;
    });
  }

  function handleSetWinnerLbFinal(index, which) {
    setLbFinalMatches((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      const m = copy[index];

      if (which === "p1") {
        if (!m.player1Id) return prev;
        m.winnerId = m.player1Id;
      } else if (which === "p2") {
        if (!m.player2Id) return prev;
        m.winnerId = m.player2Id;
      }

      const winnerId = m.winnerId || null;
      if (winnerId) {
        setGrandFinalMatches((prevGF) => {
          const next = prevGF.map((mm) => ({ ...mm }));
          if (!next[0]) {
            next[0] = { player1Id: null, player2Id: null, winnerId: null };
          }
          const gf = next[0];
          if (!gf.player2Id) {
            gf.player2Id = winnerId;
          }
          if (
            gf.winnerId &&
            gf.winnerId !== gf.player1Id &&
            gf.winnerId !== gf.player2Id
          ) {
            gf.winnerId = null;
          }
          return next;
        });
      }
      return copy;
    });
  }

  // ===== Grand Final =====
  function handleChangeGrandFinal(index, field, value) {
    setGrandFinalMatches((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      copy[index] = { ...copy[index], [field]: value || null };
      const m = copy[index];
      if (
        (field === "player1Id" || field === "player2Id") &&
        m.winnerId &&
        m.winnerId !== m.player1Id &&
        m.winnerId !== m.player2Id
      ) {
        m.winnerId = null;
      }
      return copy;
    });
  }

  function handleSetWinnerGrandFinal(index, which) {
    setGrandFinalMatches((prev) => {
      const copy = prev.map((m) => ({ ...m }));
      const m = copy[index];
      if (which === "p1") {
        if (!m.player1Id) return prev;
        m.winnerId = m.player1Id;
      } else if (which === "p2") {
        if (!m.player2Id) return prev;
        m.winnerId = m.player2Id;
      }
      return copy;
    });
  }

  // ===== Ranking =====
  function computeRanking() {
    const ranking = {
      first: null,
      second: null,
      third: null,
      fourth: null,
      fiveToSix: [],
      sevenToEight: [],
      nineToTwelve: [],
      thirteenToSixteen: [],
    };

    const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));
    ranking.thirteenToSixteen = uniq(computeLosersFromMatches(lbMatches1));
    ranking.nineToTwelve = uniq(computeLosersFromMatches(lbMatches2));
    ranking.sevenToEight = uniq(computeLosersFromMatches(lbMatches3a));
    ranking.fiveToSix = uniq(computeLosersFromMatches(lbMatches3b));

    if (lbMatches4 && lbMatches4[0]) {
      const m = lbMatches4[0];
      if (m.winnerId && m.player1Id && m.player2Id) {
        ranking.fourth =
          m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
      }
    }
    if (lbFinalMatches && lbFinalMatches[0]) {
      const m = lbFinalMatches[0];
      if (m.winnerId && m.player1Id && m.player2Id) {
        ranking.third =
          m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
      }
    }
    if (grandFinalMatches && grandFinalMatches[0]) {
      const m = grandFinalMatches[0];
      if (m.winnerId && m.player1Id && m.player2Id) {
        ranking.first = m.winnerId;
        ranking.second =
          m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
      }
    }
    return ranking;
  }

  // ===== Save =====
  async function handleSave() {
    setSaving(true);
    setSaveMessage("");
    try {
      const ranking = computeRanking();
      const res = await fetch(
        `/api/admin/brackets/${encodeURIComponent(tournamentId)}/save`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matches,
            matches2: qfMatches,
            matches3: sfMatches,
            lbMatches: lbMatches1,
            lbMatches2: lbMatches2,
            lbMatches3: lbMatches3a,
            lbMatches4: lbMatches3b,
            lbMatches5: lbMatches4,
            winnersFinal: wbFinalMatches,
            lbFinal: lbFinalMatches,
            grandFinal: grandFinalMatches,
            ranking,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSaveMessage(err.error || "Failed to save bracket.");
      } else {
        setSaveMessage("Successfully saved all rounds and ranking.");
      }
    } catch (err) {
      console.error("Save error", err);
      setSaveMessage("Error saving bracket.");
    } finally {
      setSaving(false);
    }
  }

  // ===== Reset =====
  async function handleReset() {
    if (
      !window.confirm(
        "Are you sure you want to RESET the entire bracket? This cannot be undone."
      )
    ) {
      return;
    }
    setResetting(true);
    setSaveMessage("");
    try {
      const res = await fetch(
        `/api/admin/brackets/${encodeURIComponent(tournamentId)}/reset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSaveMessage(data.error || "Failed to reset bracket.");
      } else {
        setMatches([]);
        setQfMatches([]);
        setSfMatches([]);
        setLbMatches1([]);
        setLbMatches2([]);
        setLbMatches3a([]);
        setLbMatches3b([]);
        setLbMatches4([]);
        setWbFinalMatches([emptyFinalMatch]);
        setLbFinalMatches([emptyFinalMatch]);
        setGrandFinalMatches([emptyFinalMatch]);
        setSaveMessage("Bracket has been reset.");
      }
    } catch (err) {
      console.error("Reset error", err);
      setSaveMessage("Error resetting bracket.");
    } finally {
      setResetting(false);
    }
  }

  if (loading)
    return <div className={styles["admin-container"]}>Loading bracket…</div>;

  const losersR2Count = losersR2.length;
  const lb2WinnerCount = computeWinnersFromMatches(lbMatches2).length;
  const sfWinnerCount = computeWinnersFromMatches(sfMatches).length;
  const lb3aWinnerCount = lb3aWinners.length;
  const lb3bWinnerCount = lb3bWinners.length;

  return (
    <div className={styles["bracket-editor-wrapper"]}>
      {/* TOP TOOLBAR */}
      <div className={styles["toolbar"]}>
        <button
          type="button"
          onClick={handleRandomizeR1}
          disabled={randomizing || players.length < 2}
          className={`${styles["btn"]} ${styles["btn-primary"]}`}
        >
          {randomizing ? "Randomizing..." : "🔀 Randomize R1"}
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={resetting}
          className={`${styles["btn"]} ${styles["btn-danger"]}`}
        >
          {resetting ? "Resetting..." : "🧹 Reset Bracket"}
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`${styles["btn"]} ${styles["btn-success"]}`}
        >
          {saving ? "Saving..." : "💾 Save Changes"}
        </button>

        <div className={styles["stats-grid"]}>
          <div className={styles["stat-pill"]}>
            Placed: {usedCount}/{totalCount}
          </div>
          <div className={styles["stat-pill"]}>
            R1 Winners: {winnersChosenR1}
          </div>
          <div className={styles["stat-pill"]}>
            LB2 Winners: {lb2WinnerCount}
          </div>
        </div>
      </div>

      {/* UNPLACED PLAYERS */}
      <div className={styles["player-pool"]}>
        <div className={styles["pool-title"]}>Unplaced Players (Round 1)</div>
        {unusedPlayers.length === 0 ? (
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            All players placed.
          </span>
        ) : (
          <div className={styles["tag-cloud"]}>
            {unusedPlayers.map((p) => (
              <div key={p._id} className={styles["player-tag"]}>
                <span>{p.ign || p.username || "Unknown"}</span>
                <button
                  type="button"
                  onClick={() => handleAddPlayerToBracket(p._id)}
                  className={styles["add-btn"]}
                >
                  +
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DUPLICATES ALERT */}
      {duplicatePlayers.length > 0 && (
        <div className={`${styles["alert-box"]} ${styles["alert-danger"]}`}>
          <strong>Warning:</strong> The following players are placed multiple
          times:{" "}
          {duplicatePlayers.map(
            (p) => `${p.ign || p.username} (x${placedCount[p._id]}), `
          )}
        </div>
      )}

      {/* WINNERS BRACKET */}
      <RoundBlock
        title="Winners Round 1"
        matches={matches}
        onChange={handleChangeMatch}
        onSetWinner={handleSetWinnerR1}
        allOptions={allOptions}
        labelFromId={labelFromId}
        showDupWarning
        placedCount={placedCount}
      />

      <button
        type="button"
        onClick={handleBuildQF}
        className={`${styles["btn"]} ${styles["btn-block"]} ${styles["btn-ghost"]} ${styles["btn-sm"]}`}
      >
        ▼ Build Quarterfinals from R1 winners
      </button>
      <RoundBlock
        title="Winners Quarterfinals"
        matches={qfMatches}
        onChange={handleChangeQFMatch}
        onSetWinner={handleSetWinnerQF}
        allOptions={allOptions}
        labelFromId={labelFromId}
      />

      <button
        type="button"
        onClick={handleBuildSF}
        className={`${styles["btn"]} ${styles["btn-block"]} ${styles["btn-ghost"]} ${styles["btn-sm"]}`}
      >
        ▼ Build Semifinals from QF winners
      </button>
      <RoundBlock
        title="Winners Semifinals"
        matches={sfMatches}
        onChange={handleChangeSFMatch}
        onSetWinner={handleSetWinnerSF}
        allOptions={allOptions}
        labelFromId={labelFromId}
      />

      <RoundBlock
        title="Winners Final"
        matches={wbFinalMatches}
        onChange={handleChangeWbFinal}
        onSetWinner={handleSetWinnerWbFinal}
        allOptions={allOptions}
        labelFromId={labelFromId}
      />

      {/* LOSERS BRACKET */}
      <div
        style={{
          margin: "60px 0 20px 0",
          borderBottom: "1px solid var(--border)",
        }}
      ></div>
      <h2
        style={{
          fontSize: "1.5rem",
          marginBottom: "20px",
          color: "#94a3b8",
        }}
      >
        Losers Bracket
      </h2>

      <button
        type="button"
        onClick={handleRandomizeLB1}
        className={`${styles["btn"]} ${styles["btn-block"]} ${styles["btn-ghost"]} ${styles["btn-sm"]}`}
      >
        ▼ Build LB Round 1 from R1 losers
      </button>
      <RoundBlock
        title="Losers Round 1"
        matches={lbMatches1}
        onChange={handleChangeLbMatch1}
        onSetWinner={handleSetWinnerLB1}
        allOptions={allOptions}
        labelFromId={labelFromId}
      />

      <button
        type="button"
        onClick={handleBuildLB2}
        className={`${styles["btn"]} ${styles["btn-block"]} ${styles["btn-ghost"]} ${styles["btn-sm"]}`}
      >
        ▼ Build LB Round 2 (LB1 winners vs QF losers)
      </button>
      <RoundBlock
        title="Losers Round 2"
        matches={lbMatches2}
        onChange={handleChangeLbMatch2}
        onSetWinner={handleSetWinnerLB2}
        allOptions={allOptions}
        labelFromId={labelFromId}
      />

      <button
        type="button"
        onClick={handleBuildLB3A}
        className={`${styles["btn"]} ${styles["btn-block"]} ${styles["btn-ghost"]} ${styles["btn-sm"]}`}
      >
        ▼ Build LB Round 3A (LB2 winners vs LB2 winners)
      </button>
      <RoundBlock
        title="Losers Round 3A"
        matches={lbMatches3a}
        onChange={handleChangeLbMatch3A}
        onSetWinner={handleSetWinnerLB3A}
        allOptions={allOptions}
        labelFromId={labelFromId}
      />

      <button
        type="button"
        onClick={handleBuildLB3B}
        className={`${styles["btn"]} ${styles["btn-block"]} ${styles["btn-ghost"]} ${styles["btn-sm"]}`}
      >
        ▼ Build LB Round 3B (LB3A winners vs SF losers)
      </button>
      <RoundBlock
        title="Losers Round 3B"
        matches={lbMatches3b}
        onChange={handleChangeLbMatch3B}
        onSetWinner={handleSetWinnerLB3B}
        allOptions={allOptions}
        labelFromId={labelFromId}
      />

      <button
        type="button"
        onClick={handleBuildLB4}
        className={`${styles["btn"]} ${styles["btn-block"]} ${styles["btn-ghost"]} ${styles["btn-sm"]}`}
      >
        ▼ Build LB Round 4 (LB3B winners vs LB3B winners)
      </button>
      <RoundBlock
        title="Losers Round 4"
        matches={lbMatches4}
        onChange={handleChangeLbMatch4}
        onSetWinner={handleSetWinnerLB4}
        allOptions={allOptions}
        labelFromId={labelFromId}
      />

      <RoundBlock
        title="Losers Final"
        matches={lbFinalMatches}
        onChange={handleChangeLbFinal}
        onSetWinner={handleSetWinnerLbFinal}
        allOptions={allOptions}
        labelFromId={labelFromId}
      />

      {/* GRAND FINAL */}
      <div
        style={{
          margin: "60px 0 20px 0",
          borderBottom: "1px solid var(--border)",
        }}
      ></div>
      <h2
        style={{
          fontSize: "1.5rem",
          marginBottom: "20px",
          color: "#fbbf24",
        }}
      >
        Championship
      </h2>

      <RoundBlock
        title="Grand Final"
        matches={grandFinalMatches}
        onChange={handleChangeGrandFinal}
        onSetWinner={handleSetWinnerGrandFinal}
        allOptions={allOptions}
        labelFromId={labelFromId}
      />

      {/* FLOATING SAVE BAR (If message exists or saving) */}
      {(saveMessage || saving) && (
        <div className={styles["save-bar"]}>
          <span className={styles["save-msg"]}>{saveMessage}</span>
          {saving && <span>Processing...</span>}
        </div>
      )}
    </div>
  );
}

// ---------- REUSABLE COMPONENT ----------
function RoundBlock({
  title,
  matches,
  onChange,
  onSetWinner,
  allOptions,
  labelFromId,
  showDupWarning = false,
  placedCount = {},
}) {
  if (!matches || matches.length === 0) return null;

  return (
    <div className={styles["round-section"]}>
      <h3 className={styles["round-title"]}>{title}</h3>
      <div className={styles["match-list"]}>
        {matches.map((m, i) => {
          const isWinnerP1 = m.winnerId === m.player1Id && !!m.player1Id;
          const isWinnerP2 = m.winnerId === m.player2Id && !!m.player2Id;
          const p1Dup =
            showDupWarning &&
            m.player1Id &&
            placedCount[m.player1Id] > 1;
          const p2Dup =
            showDupWarning &&
            m.player2Id &&
            placedCount[m.player2Id] > 1;

          return (
            <div key={i} className={styles["match-card"]}>
              <div className={styles["match-header"]}>
                <span>Match {i + 1}</span>
                {(p1Dup || p2Dup) && (
                  <span className={styles["dup-warning"]}>⚠ Duplicate</span>
                )}
              </div>

              {/* Player 1 Row */}
              <div className={styles["match-row"]}>
                <select
                  value={m.player1Id || ""}
                  onChange={(e) =>
                    onChange(i, "player1Id", e.target.value || null)
                  }
                  className={`${styles["form-select"]} ${
                    p1Dup ? styles["error"] : ""
                  }`}
                >
                  <option value="">-- Empty --</option>
                  {allOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onSetWinner(i, "p1")}
                  disabled={!m.player1Id}
                  className={`${styles["winner-btn"]} ${
                    isWinnerP1 ? styles["active"] : ""
                  }`}
                >
                  Win
                </button>
              </div>

              {/* Player 2 Row */}
              <div className={styles["match-row"]}>
                <select
                  value={m.player2Id || ""}
                  onChange={(e) =>
                    onChange(i, "player2Id", e.target.value || null)
                  }
                  className={`${styles["form-select"]} ${
                    p2Dup ? styles["error"] : ""
                  }`}
                >
                  <option value="">-- Empty --</option>
                  {allOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onSetWinner(i, "p2")}
                  disabled={!m.player2Id}
                  className={`${styles["winner-btn"]} ${
                    isWinnerP2 ? styles["active"] : ""
                  }`}
                >
                  Win
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}