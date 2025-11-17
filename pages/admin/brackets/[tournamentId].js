// pages/admin/brackets/[tournamentId].js
import React, { useEffect, useState } from "react";
import { getCurrentPlayerFromReq } from "../../../lib/getCurrentPlayer";
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";
import Tournament from "../../../models/Tournament";

// ---------- SERVER SIDE ----------
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

// ---------- HELPER FUNCTIONS ----------
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
    <div style={{ padding: "30px 20px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.6rem", marginBottom: 8, color: "#e5e7eb" }}>
        Admin Bracket Editor — {tournamentId}
      </h1>

      <p style={{ color: "#9ca3af", marginBottom: 8 }}>
        Only you (admin) can see this page. Adjust seeds, set winners, and
        build the losers bracket. Then hit <strong>Save</strong>. When
        you&apos;re happy, use the buttons below to publish or hide the
        public bracket.
      </p>

      <p style={{ color: "#d1d5db", marginBottom: 10 }}>
        Current publish status:{" "}
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 9999,
            background: isPublished ? "#22c55e33" : "#f59e0b33",
            color: isPublished ? "#bbf7d0" : "#fed7aa",
            fontSize: "0.85rem",
          }}
        >
          {isPublished ? "Published (public bracket live)" : "Draft (not live)"}
        </span>
      </p>

      {/* === PUBLISH / UNPUBLISH BUTTONS === */}
      <div
        style={{
          marginBottom: 20,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* PUBLISH = state=publish */}
        <form
          method="POST"
          action={`/api/admin/brackets/${encodeURIComponent(
            tournamentId
          )}/publish?state=publish`}
        >
          <button
            type="submit"
            style={{
              background: "#10b981",
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: 600,
            }}
          >
            📢 Publish bracket (make live)
          </button>
        </form>

        {/* UNPUBLISH = state=unpublish */}
        <form
          method="POST"
          action={`/api/admin/brackets/${encodeURIComponent(
            tournamentId
          )}/publish?state=unpublish`}
        >
          <button
            type="submit"
            style={{
              background: "#ef4444",
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: 600,
            }}
          >
            ❌ Unpublish (hide)
          </button>
        </form>
      </div>

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

  // label map (IGN (username))
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
            rounds.find(
              (r) => r.roundNumber === 1 && r.type === "winners"
            ) || rounds[0];
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
            lrs.find(
              (r) => r.roundNumber === 1 && r.type === "losers"
            ) || lrs[0];
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

        // winners final (WB Final)
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

        // losers final (LB Final)
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

  // ===== AUTO-BUILD: Winners Final from Winners Semifinals =====
  useEffect(() => {
    const winnersSF = computeWinnersFromMatches(sfMatches);
    if (winnersSF.length < 2) return;

    setWbFinalMatches((prev) => {
      const current = prev && prev[0] ? prev[0] : emptyFinalMatch;

      // If admin already filled WB Final, don't overwrite
      if (current.player1Id || current.player2Id) {
        return prev;
      }

      return [
        {
          player1Id: winnersSF[0],
          player2Id: winnersSF[1],
          // keep winner if still consistent, else clear
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

  // ===== Shared helpers =====
  function labelFromId(id) {
    if (!id) return "TBD";
    return idToLabel[id] || "TBD";
  }

  // ===== Round 1 (winners) =====
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

  // add player into next empty R1 slot
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

  // used + duplicates (R1)
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
  const winnersR1 = computeWinnersFromMatches(matches);

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

  // ===== Winners Round 2 (QF) – FIXED SLOTS =====
  function handleBuildQF() {
    if (!matches.length) {
      setSaveMessage("You need Round 1 matches before building Quarterfinals.");
      return;
    }

    // Fixed mapping by index:
    // R1[0] + R1[1] → QF[0]
    // R1[2] + R1[3] → QF[1]
    // R1[4] + R1[5] → QF[2]
    // R1[6] + R1[7] → QF[3]
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

      // Preserve any manual edits where possible
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

    // Downstream depends on QF → clear it
    setSfMatches([]);
    setLbMatches2([]);
    setLbMatches3a([]);
    setLbMatches3b([]);
    setLbMatches4([]);
    setWbFinalMatches([emptyFinalMatch]);
    setLbFinalMatches([emptyFinalMatch]);
    setGrandFinalMatches([emptyFinalMatch]);

    setSaveMessage(
      "Quarterfinals built from Round 1 winners with fixed slots. Unfinished R1 matches leave empty QF slots."
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
  const winnersR2 = computeWinnersFromMatches(qfMatches);

  // ===== LB Round 2 (LB1 winners vs QF losers, FIXED BY INDEX) =====
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

      // Loser of this specific QF match (same index i)
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

    setSaveMessage(
      "Losers Bracket Round 2 built: each LB1 winner faces the aligned QF loser (fixed slots)."
    );
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

  // ===== Winners Round 3 (SF) – FIXED SLOTS =====
  function handleBuildSF() {
    if (!qfMatches.length) {
      setSaveMessage(
        "You need Quarterfinal matches before building Semifinals."
      );
      return;
    }

    // Fixed mapping:
    // QF[0] + QF[1] winners → SF[0]
    // QF[2] + QF[3] winners → SF[1]
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

    setSaveMessage(
      "Semifinals built from Quarterfinal winners with fixed slots. Unfinished QF matches leave empty SF slots."
    );
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

  const sfLosers = computeLosersFromMatches(sfMatches);

  // ===== LB Round 3A (LB2 winners vs each other, FIXED BY INDEX) =====
  function handleBuildLB3A() {
    if (!lbMatches2.length) {
      setSaveMessage(
        "You need LB Round 2 matches before building LB Round 3A."
      );
      return;
    }

    // Fixed mapping:
    // LB2[0] + LB2[1] winners → LB3A[0]
    // LB2[2] + LB2[3] winners → LB3A[1]
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

    setSaveMessage(
      "Losers Bracket Round 3A built from LB Round 2 winners with fixed slots."
    );
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

  // ===== LB Round 3B (LB3A winners vs SF losers, FIXED BY INDEX) =====
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

    // Fixed mapping:
    // LB3A[0] winner vs SF[0] loser → LB3B[0]
    // LB3A[1] winner vs SF[1] loser → LB3B[1]
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

    setSaveMessage(
      "Losers Bracket Round 3B built: each LB3A winner faces the aligned SF loser (fixed slots)."
    );
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

  // ===== LB Round 4 (LB3B winners vs each other, FIXED BY INDEX) =====
  function handleBuildLB4() {
    if (!lbMatches3b.length) {
      setSaveMessage(
        "You need winners from LB Round 3B to build LB Round 4."
      );
      return;
    }

    // Fixed mapping:
    // LB3B[0] + LB3B[1] winners → LB4[0]
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

    setSaveMessage(
      "Losers Bracket Round 4 built from LB3B winners with fixed slots."
    );
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

  // ===== Winners Final (WB Final) =====
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

      // Auto-fill Losers Final (LB Final) and Grand Final slot 1
      if (winnerId || loserId) {
        const lb4Winners = computeWinnersFromMatches(lbMatches4);
        const lb4Winner = lb4Winners[0] || null;

        // Auto-fill LB Final vs LB4 winner
        if (lb4Winner || loserId) {
          setLbFinalMatches((prevLB) => {
            const next = prevLB.map((mm) => ({ ...mm }));
            if (!next[0]) {
              next[0] = { player1Id: null, player2Id: null, winnerId: null };
            }
            const lf = next[0];

            // Only fill empty slots so admin can still override manually
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

        // Auto-fill Grand Final slot 1 with Winners Final winner
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

      // Auto-fill Grand Final slot 2 with Losers Final winner
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
  // ===== Ranking computation (1st–16th) =====
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

    // 13–16: LB Round 1 losers
    ranking.thirteenToSixteen = uniq(computeLosersFromMatches(lbMatches1));

    // 9–12: LB Round 2 losers
    ranking.nineToTwelve = uniq(computeLosersFromMatches(lbMatches2));

    // 7–8: LB Round 3A losers
    ranking.sevenToEight = uniq(computeLosersFromMatches(lbMatches3a));

    // 5–6: LB Round 3B losers
    ranking.fiveToSix = uniq(computeLosersFromMatches(lbMatches3b));

    // 4th: loser of LB Round 4 (single match)
    if (lbMatches4 && lbMatches4[0]) {
      const m = lbMatches4[0];
      if (m.winnerId && m.player1Id && m.player2Id) {
        ranking.fourth =
          m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
      }
    }

    // 3rd: loser of Losers Final (LB Final, single match)
    if (lbFinalMatches && lbFinalMatches[0]) {
      const m = lbFinalMatches[0];
      if (m.winnerId && m.player1Id && m.player2Id) {
        ranking.third =
          m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
      }
    }

    // 1st / 2nd: Grand Final winner & loser (single match)
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

  // ===== Save all =====
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
            matches, // winners R1
            matches2: qfMatches, // winners QF
            matches3: sfMatches, // winners SF
            lbMatches: lbMatches1, // LB R1
            lbMatches2: lbMatches2, // LB R2
            lbMatches3: lbMatches3a, // LB R3A
            lbMatches4: lbMatches3b, // LB R3B
            lbMatches5: lbMatches4, // LB R4
            winnersFinal: wbFinalMatches, // WB Final
            lbFinal: lbFinalMatches, // LB Final
            grandFinal: grandFinalMatches, // Grand Final
            ranking, // 1st–16th placements
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSaveMessage(err.error || "Failed to save bracket.");
      } else {
        setSaveMessage(
          "Saved: Winners R1/QF/SF, Losers R1–R4, Winners Final, Losers Final, Grand Final, and ranking 1st–16th."
        );
      }
    } catch (err) {
      console.error("Save error", err);
      setSaveMessage("Error saving bracket.");
    } finally {
      setSaving(false);
    }
  }

  // ===== RESET all (use reset API) =====
  async function handleReset() {
    if (
      !window.confirm(
        "Are you sure you want to RESET the entire bracket for this tournament? This will clear all rounds, finals, and results from the database. This cannot be undone."
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
        // Clear all local state back to fresh / empty
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

        setSaveMessage(
          "Bracket has been reset. All winners/losers and rounds are cleared in the database."
        );
      }
    } catch (err) {
      console.error("Reset error", err);
      setSaveMessage("Error resetting bracket.");
    } finally {
      setResetting(false);
    }
  }

  if (loading) return <p style={{ color: "#e5e7eb" }}>Loading bracket…</p>;

  const losersR2Count = losersR2.length;
  const lb2WinnerCount = computeWinnersFromMatches(lbMatches2).length;
  const sfWinnerCount = computeWinnersFromMatches(sfMatches).length;
  const lb3aWinnerCount = lb3aWinners.length;
  const lb3bWinnerCount = lb3bWinners.length;

  return (
    <div style={{ marginTop: 10 }}>
      {/* Top stats / actions */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <button
          type="button"
          onClick={handleRandomizeR1}
          disabled={randomizing || players.length < 2}
          style={{
            background: randomizing ? "#1d4ed8" : "#2563eb",
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            color: "white",
            cursor:
              randomizing || players.length < 2 ? "not-allowed" : "pointer",
            fontSize: "0.9rem",
            fontWeight: 600,
          }}
        >
          {randomizing
            ? "Randomizing..."
            : "🔀 Randomize Round 1 from registrations"}
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={resetting}
          style={{
            background: resetting ? "#7f1d1d" : "#b91c1c",
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            color: "white",
            cursor: resetting ? "wait" : "pointer",
            fontSize: "0.9rem",
            fontWeight: 600,
          }}
        >
          {resetting ? "Resetting..." : "🧹 Reset entire bracket"}
        </button>

        <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
          Placed in R1: {usedCount} / {totalCount}
        </span>
        <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
          R1 winners: {winnersChosenR1}
        </span>
        <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
          QF losers: {losersR2Count}
        </span>
        <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
          LB2 winners: {lb2WinnerCount}
        </span>
        <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
          SF winners: {sfWinnerCount}
        </span>
        <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
          LB3A winners: {lb3aWinnerCount}
        </span>
        <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
          LB3B winners: {lb3bWinnerCount}
        </span>
      </div>

      {/* Unplaced + duplicates */}
      <div
        style={{
          marginBottom: 10,
          padding: "10px 12px",
          borderRadius: 8,
          background: "#020617",
          border: "1px solid #1f2937",
        }}
      >
        <div
          style={{
            fontSize: "0.9rem",
            fontWeight: 600,
            color: "#e5e7eb",
            marginBottom: 6,
          }}
        >
          Players not placed in Round 1:
        </div>
        {unusedPlayers.length === 0 ? (
          <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
            All registered players are placed in Round 1.
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {unusedPlayers.map((p) => (
              <div
                key={p._id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 8px",
                  borderRadius: 9999,
                  background: "#0f172a",
                  border: "1px solid #1f2937",
                  fontSize: "0.8rem",
                  color: "#e5e7eb",
                }}
              >
                <span>{p.ign || p.username || "Unknown"}</span>
                <button
                  type="button"
                  onClick={() => handleAddPlayerToBracket(p._id)}
                  style={{
                    border: "none",
                    borderRadius: "9999px",
                    width: 20,
                    height: 20,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    background: "#22c55e",
                    color: "#0b1120",
                  }}
                >
                  +
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          marginBottom: 16,
          padding: "10px 12px",
          borderRadius: 8,
          background: "#111827",
          border: duplicatePlayers.length
            ? "1px solid #f97373"
            : "1px solid #1f2937",
        }}
      >
        <div
          style={{
            fontSize: "0.9rem",
            fontWeight: 600,
            color: duplicatePlayers.length ? "#fecaca" : "#e5e7eb",
            marginBottom: 6,
          }}
        >
          Players placed more than once in Round 1:
        </div>
        {duplicatePlayers.length === 0 ? (
          <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
            No duplicates detected.
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {duplicatePlayers.map((p) => (
              <div
                key={p._id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 8px",
                  borderRadius: 9999,
                  background: "#7f1d1d",
                  border: "1px solid #fecaca",
                  fontSize: "0.8rem",
                  color: "#fee2e2",
                }}
              >
                <span>{p.ign || p.username || "Unknown"}</span>
                <span style={{ fontSize: "0.75rem" }}>
                  ×{placedCount[p._id] || 0}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== R1 Winners UI ===== */}
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

      {/* ===== QF (Winners R2) ===== */}
      <button
        type="button"
        onClick={handleBuildQF}
        style={{
          marginTop: 16,
          marginBottom: 8,
          background: "#0ea5e9",
          padding: "6px 10px",
          borderRadius: 6,
          border: "none",
          color: "white",
          fontSize: "0.85rem",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Build Quarterfinals from R1 winners
      </button>
      <RoundBlock
        title="Winners Quarterfinals"
        matches={qfMatches}
        onChange={handleChangeQFMatch}
        onSetWinner={handleSetWinnerQF}
        allOptions={allOptions}
        labelFromId={labelFromId}
      />

      {/* ===== LB R1 ===== */}
      <button
        type="button"
        onClick={handleRandomizeLB1}
        style={{
          marginTop: 18,
          marginBottom: 8,
          background: "#10b981",
          padding: "6px 10px",
          borderRadius: 6,
          border: "none",
          color: "white",
          fontSize: "0.85rem",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Build LB Round 1 from R1 losers
      </button>
      <RoundBlock
        title="Losers Bracket — Round 1"
        matches={lbMatches1}
        onChange={handleChangeLbMatch1}
        onSetWinner={handleSetWinnerLB1}
        allOptions={allOptions}
        labelFromId={labelFromId}
      />

      {/* ===== LB R2 ===== */}
      <button
        type="button"
        onClick={handleBuildLB2}
        style={{
          marginTop: 18,
          marginBottom: 8,
          background: "#0ea5e9",
          padding: "6px 10px",
          borderRadius: 6,
          border: "none",
          color: "white",
          fontSize: "0.85rem",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Build LB Round 2 (LB1 winners vs QF losers)
      </button>
      <RoundBlock
        title="Losers Bracket — Round 2"
        matches={lbMatches2}
        onChange={handleChangeLbMatch2}
        onSetWinner={handleSetWinnerLB2}
        allOptions={allOptions}
        labelFromId={labelFromId}
      />

      {/* ===== SF (Winners R3) ===== */}
      <button
        type="button"
        onClick={handleBuildSF}
        style={{
          marginTop: 18,
          marginBottom: 8,
          background: "#6366f1",
          padding: "6px 10px",
          borderRadius: 6,
          border: "none",
          color: "white",
          fontSize: "0.85rem",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Build Semifinals from QF winners
      </button>
      <RoundBlock
        title="Winners Semifinals"
        matches={sfMatches}
        onChange={handleChangeSFMatch}
        onSetWinner={handleSetWinnerSF}
        allOptions={allOptions}
        labelFromId={labelFromId}
      />

      {/* ===== LB R3A ===== */}
      <button
        type="button"
        onClick={handleBuildLB3A}
        style={{
          marginTop: 18,
          marginBottom: 8,
          background: "#22c55e",
          padding: "6px 10px",
          borderRadius: 6,
          border: "none",
          color: "white",
          fontSize: "0.85rem",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Build LB Round 3A from LB2 winners
      </button>
      <RoundBlock
        title="Losers Bracket — Round 3A"
        matches={lbMatches3a}
        onChange={handleChangeLbMatch3A}
        onSetWinner={handleSetWinnerLB3A}
        allOptions={allOptions}
        labelFromId={labelFromId}
      />

      {/* ===== LB R3B ===== */}
      <button
        type="button"
        onClick={handleBuildLB3B}
        style={{
          marginTop: 18,
          marginBottom: 8,
          background: "#22c55e",
          padding: "6px 10px",
          borderRadius: 6,
          border: "none",
          color: "white",
          fontSize: "0.85rem",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Build LB Round 3B (LB3A winners vs SF losers)
      </button>
      <RoundBlock
        title="Losers Bracket — Round 3B"
        matches={lbMatches3b}
        onChange={handleChangeLbMatch3B}
        onSetWinner={handleSetWinnerLB3B}
        allOptions={allOptions}
        labelFromId={labelFromId}
      />

      {/* ===== LB R4 ===== */}
      <button
        type="button"
        onClick={handleBuildLB4}
        style={{
          marginTop: 18,
          marginBottom: 8,
          background: "#ec4899",
          padding: "6px 10px",
          borderRadius: 6,
          border: "none",
          color: "white",
          fontSize: "0.85rem",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Build LB Round 4 from LB3B winners
      </button>
      <RoundBlock
        title="Losers Bracket — Round 4"
        matches={lbMatches4}
        onChange={handleChangeLbMatch4}
        onSetWinner={handleSetWinnerLB4}
        allOptions={allOptions}
        labelFromId={labelFromId}
      />

      {/* ===== Winners Final ===== */}
      <div style={{ marginTop: 18 }}>
        <h3
          style={{
            fontSize: "1.05rem",
            marginBottom: 6,
            color: "#e5e7eb",
          }}
        >
          Winners Bracket Final
        </h3>
        <RoundBlock
          title="Winners Final"
          matches={wbFinalMatches}
          onChange={handleChangeWbFinal}
          onSetWinner={handleSetWinnerWbFinal}
          allOptions={allOptions}
          labelFromId={labelFromId}
        />
      </div>

      {/* ===== Losers Final ===== */}
      <div style={{ marginTop: 18 }}>
        <h3
          style={{
            fontSize: "1.05rem",
            marginBottom: 6,
            color: "#e5e7eb",
          }}
        >
          Losers Bracket Final
        </h3>
        <RoundBlock
          title="Losers Final"
          matches={lbFinalMatches}
          onChange={handleChangeLbFinal}
          onSetWinner={handleSetWinnerLbFinal}
          allOptions={allOptions}
          labelFromId={labelFromId}
        />
      </div>

      {/* ===== Grand Final ===== */}
      <div style={{ marginTop: 18 }}>
        <h3
          style={{
            fontSize: "1.05rem",
            marginBottom: 6,
            color: "#e5e7eb",
          }}
        >
          Grand Final
        </h3>
        <RoundBlock
          title="Grand Final"
          matches={grandFinalMatches}
          onChange={handleChangeGrandFinal}
          onSetWinner={handleSetWinnerGrandFinal}
          allOptions={allOptions}
          labelFromId={labelFromId}
        />
      </div>

      {/* Save + status */}
      <div style={{ marginTop: 24 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? "#6b7280" : "#16a34a",
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            color: "white",
            cursor: saving ? "wait" : "pointer",
            fontSize: "0.95rem",
            fontWeight: 700,
          }}
        >
          {saving ? "Saving..." : "💾 Save bracket to database"}
        </button>
        {saveMessage && (
          <div
            style={{
              marginTop: 8,
              fontSize: "0.85rem",
              color: "#e5e7eb",
            }}
          >
            {saveMessage}
          </div>
        )}
      </div>
    </div>
  );
}
// ---------- Small reusable block for each round ----------
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
  return (
    <div style={{ marginTop: 16 }}>
      <h3
        style={{
          fontSize: "1.05rem",
          marginBottom: 6,
          color: "#e5e7eb",
        }}
      >
        {title}
      </h3>
      {(!matches || matches.length === 0) && (
        <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
          No matches in this round yet.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
            <div
              key={i}
              style={{
                border: "1px solid #374151",
                borderRadius: 8,
                padding: "8px 10px",
                background: "#020617",
              }}
            >
              {/* Match header */}
              <div
                style={{
                  marginBottom: 4,
                  fontSize: "0.85rem",
                  color: "#9ca3af",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Match {i + 1}</span>
                {(p1Dup || p2Dup) && (
                  <span style={{ color: "#fecaca", fontSize: "0.8rem" }}>
                    ⚠ Duplicate player in this match
                  </span>
                )}
              </div>

              {/* Player selectors */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                {/* Player 1 */}
                <select
                  value={m.player1Id || ""}
                  onChange={(e) =>
                    onChange(i, "player1Id", e.target.value || null)
                  }
                  style={{
                    flex: "1 1 200px",
                    background: "#020617",
                    color: "white",
                    borderRadius: 6,
                    border: p1Dup
                      ? "1px solid #f97373"
                      : "1px solid #374151",
                    padding: "6px 8px",
                    fontSize: "0.9rem",
                  }}
                >
                  <option value="">(empty slot)</option>
                  {allOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
                  vs
                </span>

                {/* Player 2 */}
                <select
                  value={m.player2Id || ""}
                  onChange={(e) =>
                    onChange(i, "player2Id", e.target.value || null)
                  }
                  style={{
                    flex: "1 1 200px",
                    background: "#020617",
                    color: "white",
                    borderRadius: 6,
                    border: p2Dup
                      ? "1px solid #f97373"
                      : "1px solid #374151",
                    padding: "6px 8px",
                    fontSize: "0.9rem",
                  }}
                >
                  <option value="">(empty slot)</option>
                  {allOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Winner buttons */}
              <div
                style={{
                  marginTop: 4,
                  display: "flex",
                  gap: 8,
                  fontSize: "0.8rem",
                }}
              >
                <span style={{ color: "#9ca3af" }}>Winner:</span>

                {/* Winner P1 */}
                <button
                  type="button"
                  onClick={() => onSetWinner(i, "p1")}
                  disabled={!m.player1Id}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 9999,
                    border: "none",
                    cursor: m.player1Id ? "pointer" : "not-allowed",
                    background: isWinnerP1 ? "#22c55e" : "#1f2937",
                    color: isWinnerP1 ? "#0b1120" : "#e5e7eb",
                  }}
                >
                  {m.player1Id ? labelFromId(m.player1Id) : "Player 1"}
                </button>

                {/* Winner P2 */}
                <button
                  type="button"
                  onClick={() => onSetWinner(i, "p2")}
                  disabled={!m.player2Id}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 9999,
                    border: "none",
                    cursor: m.player2Id ? "pointer" : "not-allowed",
                    background: isWinnerP2 ? "#22c55e" : "#1f2937",
                    color: isWinnerP2 ? "#0b1120" : "#e5e7eb",
                  }}
                >
                  {m.player2Id ? labelFromId(m.player2Id) : "Player 2"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
