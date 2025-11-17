// pages/admin/brackets/[tournamentId].js
import React, { useEffect, useState } from "react";
import { getCurrentPlayerFromReq } from "../../../lib/getCurrentPlayer";
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";
import Tournament from "../../../models/Tournament";

// ---------- SERVER SIDE ----------
export async function getServerSideProps({ req, params }) {
  const player = await getCurrentPlayerFromReq(req);

  // Not logged in → go login, then back here
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

  // Not admin → back to home
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

  // Find all players who have a registration for this tournamentId
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

// ---------- HELPERS ----------
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

// ---------- CLIENT SIDE EDITOR ----------
function BracketEditor({ tournamentId, players }) {
  const [loading, setLoading] = useState(true);

  const [matches, setMatches] = useState([]);      // Winners Round 1
  const [qfMatches, setQfMatches] = useState([]);  // Winners Round 2 (QF)
  const [sfMatches, setSfMatches] = useState([]);  // Winners Round 3 (Semifinals)

  const [lbMatches1, setLbMatches1] = useState([]);  // LB R1
  const [lbMatches2, setLbMatches2] = useState([]);  // LB R2
  const [lbMatches3a, setLbMatches3a] = useState([]); // LB R3A
  const [lbMatches3b, setLbMatches3b] = useState([]); // LB R3B

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [randomizing, setRandomizing] = useState(false);

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

  // Load existing bracket from API
  useEffect(() => {
    async function loadBracket() {
      try {
        const res = await fetch(
          `/api/admin/brackets/${encodeURIComponent(tournamentId)}/get`
        );
        const data = await res.json();
        const bracket = data.bracket || null;

        if (!bracket || !Array.isArray(bracket.rounds)) {
          setMatches([]);
          setQfMatches([]);
          setSfMatches([]);
        } else {
          const rounds = bracket.rounds || [];

          const round1 =
            rounds.find(
              (r) => r.roundNumber === 1 && r.type === "winners"
            ) || rounds[0];
          setMatches(round1?.matches || []);

          const round2 =
            rounds.find(
              (r) => r.roundNumber === 2 && r.type === "winners"
            ) || null;
          setQfMatches(round2?.matches || []);

          const round3 =
            rounds.find(
              (r) => r.roundNumber === 3 && r.type === "winners"
            ) || null;
          setSfMatches(round3?.matches || []);
        }

        if (bracket && Array.isArray(bracket.losersRounds)) {
          const lrs = bracket.losersRounds || [];

          const lb1 =
            lrs.find(
              (r) => r.roundNumber === 1 && r.type === "losers"
            ) || lrs[0];
          if (lb1 && Array.isArray(lb1.matches)) {
            setLbMatches1(
              lb1.matches.map((m) => ({
                player1Id: m.player1Id || null,
                player2Id: m.player2Id || null,
                winnerId: m.winnerId || null,
              }))
            );
          }

          const lb2 =
            lrs.find(
              (r) => r.roundNumber === 2 && r.type === "losers"
            ) || null;
          if (lb2 && Array.isArray(lb2.matches)) {
            setLbMatches2(
              lb2.matches.map((m) => ({
                player1Id: m.player1Id || null,
                player2Id: m.player2Id || null,
                winnerId: m.winnerId || null,
              }))
            );
          }

          const lb3 =
            lrs.find(
              (r) => r.roundNumber === 3 && r.type === "losers"
            ) || null;
          if (lb3 && Array.isArray(lb3.matches)) {
            setLbMatches3a(
              lb3.matches.map((m) => ({
                player1Id: m.player1Id || null,
                player2Id: m.player2Id || null,
                winnerId: m.winnerId || null,
              }))
            );
          }

          const lb4 =
            lrs.find(
              (r) => r.roundNumber === 4 && r.type === "losers"
            ) || null;
          if (lb4 && Array.isArray(lb4.matches)) {
            setLbMatches3b(
              lb4.matches.map((m) => ({
                player1Id: m.player1Id || null,
                player2Id: m.player2Id || null,
                winnerId: m.winnerId || null,
              }))
            );
          }
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
      } finally {
        setLoading(false);
      }
    }

    loadBracket();
  }, [tournamentId]);

  // ------- Round 1 (winners) -------
  function handleChangeMatch(index, field, value) {
    setMatches((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value || null };

      if (field === "player1Id" || field === "player2Id") {
        const m = copy[index];
        if (
          m.winnerId &&
          m.winnerId !== m.player1Id &&
          m.winnerId !== m.player2Id
        ) {
          m.winnerId = null;
        }
      }
      return copy;
    });
  }

  function handleSetWinnerR1(index, which) {
    setMatches((prev) => {
      const copy = [...prev];
      const m = { ...copy[index] };

      if (which === "p1") {
        if (!m.player1Id) return prev;
        m.winnerId = m.player1Id;
      } else if (which === "p2") {
        if (!m.player2Id) return prev;
        m.winnerId = m.player2Id;
      }

      copy[index] = m;
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
        setLbMatches1([]);
        setLbMatches2([]);
        setLbMatches3a([]);
        setLbMatches3b([]);
        setQfMatches([]);
        setSfMatches([]);
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

  // Add a player to next empty R1 slot
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
          setSaveMessage(
            "Player added to the next available Round 1 slot."
          );
          return copy;
        }
        if (!m.player2Id) {
          m.player2Id = playerId;
          setSaveMessage(
            "Player added to the next available Round 1 slot."
          );
          return copy;
        }
      }

      setSaveMessage("No empty Round 1 slots left.");
      return copy;
    });
  }

  // ------- Duplicates / unplaced (for R1) -------
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

  // ------- LB Round 1 -------
  function handleRandomizeLB1() {
    if (winnersChosenR1 === 0) {
      setSaveMessage(
        "Set some Round 1 winners first before randomizing LB Round 1."
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
      const base = prev.length > 0 ? prev : [];
      const copy = base.map((m) => ({ ...m }));
      if (!copy[index]) return copy;
      copy[index][slot] = value || null;

      // If winner no longer matches either slot, clear winner
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
      const copy = [...prev];
      const m = { ...copy[index] };

      if (which === "p1") {
        if (!m.player1Id) return prev;
        m.winnerId = m.player1Id;
      } else if (which === "p2") {
        if (!m.player2Id) return prev;
        m.winnerId = m.player2Id;
      }

      copy[index] = m;
      return copy;
    });
  }

  const uniqueLoserIdsR1 = Array.from(new Set(losersR1));
  const loserOptionsR1 = uniqueLoserIdsR1.map((id) => ({
    value: id,
    label: idToLabel[id] || "TBD",
  }));

  // ------- Winners Round 2 (QF) -------
  function handleChangeQFMatch(index, field, value) {
    setQfMatches((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value || null };

      if (field === "player1Id" || field === "player2Id") {
        const m = copy[index];
        if (
          m.winnerId &&
          m.winnerId !== m.player1Id &&
          m.winnerId !== m.player2Id
        ) {
          m.winnerId = null;
        }
      }

      return copy;
    });
  }

  function handleSetWinnerQF(index, which) {
    setQfMatches((prev) => {
      const copy = [...prev];
      const m = { ...copy[index] };

      if (which === "p1") {
        if (!m.player1Id) return prev;
        m.winnerId = m.player1Id;
      } else if (which === "p2") {
        if (!m.player2Id) return prev;
        m.winnerId = m.player2Id;
      }

      copy[index] = m;
      return copy;
    });
  }

  function handleBuildQF() {
    const winners = computeWinnersFromMatches(matches);
    if (winners.length < 2) {
      setSaveMessage(
        "You need at least 2 Round 1 winners before building Quarterfinals."
      );
      return;
    }

    const pairs = buildPairsFromIds(winners).slice(0, 4);
    const qf = pairs.map((p) => ({
      player1Id: p.player1Id || null,
      player2Id: p.player2Id || null,
      winnerId: null,
    }));
    setQfMatches(qf);
    setSfMatches([]);
    setLbMatches2([]);
    setLbMatches3a([]);
    setLbMatches3b([]);
    setSaveMessage(
      "Quarterfinals built from Round 1 winners. Adjust and set winners."
    );
  }

  const losersR2 = computeLosersFromMatches(qfMatches);
  const winnersChosenR2 = losersR2.length;

  // ------- LB Round 2 (LB R1 winners vs QF losers) -------
  function handleBuildLB2() {
    if (lbMatches1.length === 0) {
      setSaveMessage(
        "Build LB Round 1 and set its winners before building LB Round 2."
      );
      return;
    }

    const lbWinners = computeWinnersFromMatches(lbMatches1);
    if (lbWinners.length === 0) {
      setSaveMessage(
        "Set winners for LB Round 1 before building LB Round 2."
      );
      return;
    }

    if (losersR2.length === 0) {
      setSaveMessage(
        "Set Quarterfinal winners so we know who drops into LB Round 2."
      );
      return;
    }

    const maxLen = Math.max(lbWinners.length, losersR2.length);
    const pairs = [];
    for (let i = 0; i < maxLen; i++) {
      pairs.push({
        player1Id: lbWinners[i] || null,
        player2Id: losersR2[i] || null,
        winnerId: null,
      });
    }

    setLbMatches2(pairs);
    setLbMatches3a([]);
    setLbMatches3b([]);
    setSaveMessage(
      "Losers Bracket Round 2 built: each LB R1 winner vs a QF loser. You can still adjust."
    );
  }

  function handleChangeLbMatch2(index, slot, value) {
    setLbMatches2((prev) => {
      const base = prev.length > 0 ? prev : [];
      const copy = base.map((m) => ({ ...m }));
      if (!copy[index]) return copy;
      copy[index][slot] = value || null;
      return copy;
    });
  }

  // ------- Winners Round 3 (Semifinals) -------
  function handleChangeSFMatch(index, field, value) {
    setSfMatches((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value || null };

      if (field === "player1Id" || field === "player2Id") {
        const m = copy[index];
        if (
          m.winnerId &&
          m.winnerId !== m.player1Id &&
          m.winnerId !== m.player2Id
        ) {
          m.winnerId = null;
        }
      }

      return copy;
    });
  }

  function handleSetWinnerSF(index, which) {
    setSfMatches((prev) => {
      const copy = [...prev];
      const m = { ...copy[index] };

      if (which === "p1") {
        if (!m.player1Id) return prev;
        m.winnerId = m.player1Id;
      } else if (which === "p2") {
        if (!m.player2Id) return prev;
        m.winnerId = m.player2Id;
      }

      copy[index] = m;
      return copy;
    });
  }

  function handleBuildSF() {
    const winnersQF = computeWinnersFromMatches(qfMatches);
    if (winnersQF.length < 2) {
      setSaveMessage(
        "You need Quarterfinal winners before building Semifinals."
      );
      return;
    }

    const pairs = buildPairsFromIds(winnersQF).slice(0, 2); // 2 SF matches max
    const sf = pairs.map((p) => ({
      player1Id: p.player1Id || null,
      player2Id: p.player2Id || null,
      winnerId: null,
    }));
    setSfMatches(sf);
    setLbMatches3a([]);
    setLbMatches3b([]);
    setSaveMessage(
      "Semifinals built from Quarterfinal winners. Adjust and set winners."
    );
  }

  const sfLosers = computeLosersFromMatches(sfMatches);

  // ------- LB Round 3A (LB R2 winners vs each other) -------
  function handleBuildLB3A() {
    if (lbMatches2.length === 0) {
      setSaveMessage(
        "Build LB Round 2 and set its winners before building LB Round 3A."
      );
      return;
    }

    const lb2Winners = computeWinnersFromMatches(lbMatches2);
    if (lb2Winners.length < 2) {
      setSaveMessage(
        "You need winners from LB Round 2 to build LB Round 3A."
      );
      return;
    }

    const pairs = buildPairsFromIds(lb2Winners).slice(0, 2); // up to 2 matches
    const lb3a = pairs.map((p) => ({
      player1Id: p.player1Id || null,
      player2Id: p.player2Id || null,
      winnerId: null,
    }));

    setLbMatches3a(lb3a);
    setLbMatches3b([]);
    setSaveMessage(
      "Losers Bracket Round 3A built from LB Round 2 winners. Set winners to prepare for 3B."
    );
  }

  function handleChangeLbMatch3A(index, slot, value) {
    setLbMatches3a((prev) => {
      const base = prev.length > 0 ? prev : [];
      const copy = base.map((m) => ({ ...m }));
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
      const copy = [...prev];
      const m = { ...copy[index] };

      if (which === "p1") {
        if (!m.player1Id) return prev;
        m.winnerId = m.player1Id;
      } else if (which === "p2") {
        if (!m.player2Id) return prev;
        m.winnerId = m.player2Id;
      }

      copy[index] = m;
      return copy;
    });
  }

  const lb3aWinners = computeWinnersFromMatches(lbMatches3a);

  // ------- LB Round 3B (LB3A winners vs Winners-SF losers) -------
  function handleBuildLB3B() {
    if (lb3aWinners.length === 0) {
      setSaveMessage(
        "Set winners for LB Round 3A before building LB Round 3B."
      );
      return;
    }

    if (sfLosers.length === 0) {
      setSaveMessage(
        "Set winners for Winners Semifinals so losers can drop into LB Round 3B."
      );
      return;
    }

    const maxLen = Math.max(lb3aWinners.length, sfLosers.length);
    const pairs = [];
    for (let i = 0; i < maxLen; i++) {
      pairs.push({
        // usually LB3A winner is the 'lower' bracket side
        player1Id: lb3aWinners[i] || null,
        player2Id: sfLosers[i] || null,
        winnerId: null,
      });
    }

    setLbMatches3b(pairs);
    setSaveMessage(
      "Losers Bracket Round 3B built: LB3A winners vs Winners-SF losers."
    );
  }

  function handleChangeLbMatch3B(index, slot, value) {
    setLbMatches3b((prev) => {
      const base = prev.length > 0 ? prev : [];
      const copy = base.map((m) => ({ ...m }));
      if (!copy[index]) return copy;
      copy[index][slot] = value || null;
      return copy;
    });
  }

  // ------- Save all rounds -------
  async function handleSave() {
    setSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch(
        `/api/admin/brackets/${encodeURIComponent(tournamentId)}/save`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matches,        // Winners R1
            matches2: qfMatches, // Winners QF
            matches3: sfMatches, // Winners Semis
            lbMatches: lbMatches1,   // LB R1
            lbMatches2: lbMatches2,  // LB R2
            lbMatches3: lbMatches3a, // LB R3A
            lbMatches4: lbMatches3b, // LB R3B
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSaveMessage(err.error || "Failed to save bracket.");
      } else {
        setSaveMessage(
          "Saved: Winners R1/QF/SF and Losers R1/R2/R3A/R3B to the database."
        );
      }
    } catch (err) {
      console.error("Save error", err);
      setSaveMessage("Error saving bracket.");
    } finally {
      setSaving(false);
    }
  }

  function labelFromId(id) {
    if (!id) return "TBD";
    return idToLabel[id] || "TBD";
  }

  if (loading) return <p>Loading bracket...</p>;

  // ====== derived counts for status badges ======
  const losersR2Count = losersR2.length;
  const lb2WinnerCount = computeWinnersFromMatches(lbMatches2).length;
  const sfWinnerCount = computeWinnersFromMatches(sfMatches).length;
  const lb3aWinnerCount = lb3aWinners.length;

  // ================== RENDER =====================
  return (
    <div style={{ marginTop: 20 }}>
      <p style={{ color: "#bbb", marginBottom: 12 }}>
        Editable admin bracket. Randomize as a starting point, then manually
        adjust, set winners, and build losers rounds. Nothing is saved until
        you click &quot;Save bracket&quot;.
      </p>

      {/* Top controls */}
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

        <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
          Placed in Round 1: {usedCount} / {totalCount} players
        </span>

        <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
          R1 winners chosen: {winnersChosenR1}
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
      </div>

      {/* Unplaced players (R1) */}
      <div
        style={{
          marginBottom: 12,
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
          Players <span style={{ color: "#93c5fd" }}>not placed</span> in Round
          1:
        </div>

        {unusedPlayers.length === 0 ? (
          <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
            All registered players are currently placed in Round 1.
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
                  title="Add to next empty Round 1 slot"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Duplicate players */}
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
            No duplicates detected in Round 1.
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
                <span
                  style={{
                    fontSize: "0.75rem",
                    opacity: 0.9,
                  }}
                >
                  ×{placedCount[p._id] || 0}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== ROUND 1 (WINNERS) ===== */}
      {matches && matches.length > 0 ? (
        <>
          <h3
            style={{
              marginTop: 10,
              marginBottom: 8,
              fontSize: "1.2rem",
              color: "#e5e7eb",
            }}
          >
            Round 1 — Winners Bracket
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {matches.map((m, i) => {
              const p1Dup =
                m.player1Id && placedCount[m.player1Id] > 1 ? true : false;
              const p2Dup =
                m.player2Id && placedCount[m.player2Id] > 1 ? true : false;
              const isWinnerP1 = m.winnerId === m.player1Id && !!m.player1Id;
              const isWinnerP2 = m.winnerId === m.player2Id && !!m.player2Id;

              return (
                <div
                  key={i}
                  style={{
                    border: "1px solid #333",
                    borderRadius: 8,
                    padding: "10px 12px",
                    background: "#111827",
                  }}
                >
                  <div
                    style={{
                      marginBottom: 6,
                      fontSize: "0.9rem",
                      color: "#9ca3af",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>Match {i + 1}</span>
                    {(p1Dup || p2Dup) && (
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "#fecaca",
                        }}
                      >
                        ⚠ Contains a duplicate Round 1 player
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <select
                      value={m.player1Id || ""}
                      onChange={(e) =>
                        handleChangeMatch(
                          i,
                          "player1Id",
                          e.target.value || null
                        )
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

                    <select
                      value={m.player2Id || ""}
                      onChange={(e) =>
                        handleChangeMatch(
                          i,
                          "player2Id",
                          e.target.value || null
                        )
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

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                      alignItems: "center",
                      fontSize: "0.85rem",
                      color: "#e5e7eb",
                    }}
                  >
                    <span>Winner:</span>
                    <button
                      type="button"
                      disabled={!m.player1Id}
                      onClick={() => handleSetWinnerR1(i, "p1")}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 9999,
                        border: isWinnerP1
                          ? "1px solid #4ade80"
                          : "1px solid #374151",
                        background: isWinnerP1 ? "#064e3b" : "#020617",
                        color: isWinnerP1 ? "#bbf7d0" : "#e5e7eb",
                        cursor: m.player1Id ? "pointer" : "not-allowed",
                      }}
                    >
                      {m.player1Id ? labelFromId(m.player1Id) : "Empty"}
                    </button>

                    <button
                      type="button"
                      disabled={!m.player2Id}
                      onClick={() => handleSetWinnerR1(i, "p2")}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 9999,
                        border: isWinnerP2
                          ? "1px solid #4ade80"
                          : "1px solid #374151",
                        background: isWinnerP2 ? "#064e3b" : "#020617",
                        color: isWinnerP2 ? "#bbf7d0" : "#e5e7eb",
                        cursor: m.player2Id ? "pointer" : "not-allowed",
                      }}
                    >
                      {m.player2Id ? labelFromId(m.player2Id) : "Empty"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p style={{ color: "#9ca3af", marginBottom: 16 }}>
          No Round 1 bracket yet. Click &quot;Randomize Round 1&quot; or
          manually add players into slots.
        </p>
      )}

      {/* ===== LB ROUND 1 ===== */}
      <div
        style={{
          marginTop: 24,
          padding: "10px 12px",
          borderRadius: 8,
          background: "#020617",
          border: "1px solid #1f2937",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 8,
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "#e5e7eb",
            }}
          >
            Losers Bracket — Round 1
          </div>

          <button
            type="button"
            onClick={handleRandomizeLB1}
            style={{
              background: "#f97316",
              padding: "6px 10px",
              borderRadius: 6,
              border: "none",
              color: "white",
              fontSize: "0.85rem",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            🎲 Build / Randomize LB Round 1
          </button>
        </div>

        <p
          style={{
            fontSize: "0.8rem",
            color: "#9ca3af",
            marginBottom: 10,
          }}
        >
          The losers of completed Round 1 matches are collected here. Randomize
          into matchups, then set winners for each LB R1 match.
        </p>

        {lbMatches1.length === 0 ? (
          <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
            No LB Round 1 yet. Click the randomize button after setting R1
            winners.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {lbMatches1.map((pair, idx) => {
              const isWinnerP1 =
                pair.winnerId &&
                pair.winnerId === pair.player1Id &&
                !!pair.player1Id;
              const isWinnerP2 =
                pair.winnerId &&
                pair.winnerId === pair.player2Id &&
                !!pair.player2Id;

              return (
                <div
                  key={idx}
                  style={{
                    padding: "6px 8px",
                    borderRadius: 6,
                    background: "#0b1120",
                    border: "1px solid #111827",
                    fontSize: "0.85rem",
                    color: "#e5e7eb",
                  }}
                >
                  <div
                    style={{
                      marginBottom: 4,
                      fontSize: "0.8rem",
                      color: "#9ca3af",
                    }}
                  >
                    LB R1 Match {idx + 1}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <select
                      value={pair.player1Id || ""}
                      onChange={(e) =>
                        handleChangeLbMatch1(
                          idx,
                          "player1Id",
                          e.target.value || null
                        )
                      }
                      style={{
                        flex: "1 1 200px",
                        background: "#020617",
                        color: "white",
                        borderRadius: 6,
                        border: "1px solid #374151",
                        padding: "6px 8px",
                        fontSize: "0.85rem",
                      }}
                    >
                      <option value="">(TBD)</option>
                      {loserOptionsR1.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: "#9ca3af",
                      }}
                    >
                      vs
                    </span>

                    <select
                      value={pair.player2Id || ""}
                      onChange={(e) =>
                        handleChangeLbMatch1(
                          idx,
                          "player2Id",
                          e.target.value || null
                        )
                      }
                      style={{
                        flex: "1 1 200px",
                        background: "#020617",
                        color: "white",
                        borderRadius: 6,
                        border: "1px solid #374151",
                        padding: "6px 8px",
                        fontSize: "0.85rem",
                      }}
                    >
                      <option value="">(TBD)</option>
                      {loserOptionsR1.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                      alignItems: "center",
                      fontSize: "0.8rem",
                    }}
                  >
                    <span>Winner:</span>
                    <button
                      type="button"
                      disabled={!pair.player1Id}
                      onClick={() => handleSetWinnerLB1(idx, "p1")}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 9999,
                        border: isWinnerP1
                          ? "1px solid #4ade80"
                          : "1px solid #374151",
                        background: isWinnerP1 ? "#064e3b" : "#020617",
                        color: isWinnerP1 ? "#bbf7d0" : "#e5e7eb",
                        cursor: pair.player1Id ? "pointer" : "not-allowed",
                      }}
                    >
                      {pair.player1Id ? labelFromId(pair.player1Id) : "Empty"}
                    </button>

                    <button
                      type="button"
                      disabled={!pair.player2Id}
                      onClick={() => handleSetWinnerLB1(idx, "p2")}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 9999,
                        border: isWinnerP2
                          ? "1px solid #4ade80"
                          : "1px solid #374151",
                        background: isWinnerP2 ? "#064e3b" : "#020617",
                        color: isWinnerP2 ? "#bbf7d0" : "#e5e7eb",
                        cursor: pair.player2Id ? "pointer" : "not-allowed",
                      }}
                    >
                      {pair.player2Id ? labelFromId(pair.player2Id) : "Empty"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== ROUND 2 (QF) ===== */}
      <h3
        style={{
          marginTop: 32,
          marginBottom: 8,
          fontSize: "1.2rem",
          color: "#e5e7eb",
        }}
      >
        Round 2 — Quarterfinals (Winners)
      </h3>

      <div
        style={{
          marginBottom: 10,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={handleBuildQF}
          style={{
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
          🔁 Build Quarterfinals from Round 1 winners
        </button>
        <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
          This pairs Round 1 winners into Quarterfinal matches. You can edit
          slots or set winners.
        </span>
      </div>

      {qfMatches.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
          No Quarterfinals yet. Build them from Round 1 winners or fill manually.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {qfMatches.map((m, i) => {
            const isWinnerP1 =
              m.winnerId && m.winnerId === m.player1Id && !!m.player1Id;
            const isWinnerP2 =
              m.winnerId && m.winnerId === m.player2Id && !!m.player2Id;

            return (
              <div
                key={i}
                style={{
                  border: "1px solid #333",
                  borderRadius: 8,
                  padding: "10px 12px",
                  background: "#111827",
                }}
              >
                <div
                  style={{
                    marginBottom: 6,
                    fontSize: "0.9rem",
                    color: "#9ca3af",
                  }}
                >
                  QF Match {i + 1}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <select
                    value={m.player1Id || ""}
                    onChange={(e) =>
                      handleChangeQFMatch(
                        i,
                        "player1Id",
                        e.target.value || null
                      )
                    }
                    style={{
                      flex: "1 1 200px",
                      background: "#020617",
                      color: "white",
                      borderRadius: 6,
                      border: "1px solid #374151",
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

                  <select
                    value={m.player2Id || ""}
                    onChange={(e) =>
                      handleChangeQFMatch(
                        i,
                        "player2Id",
                        e.target.value || null
                      )
                    }
                    style={{
                      flex: "1 1 200px",
                      background: "#020617",
                      color: "white",
                      borderRadius: 6,
                      border: "1px solid #374151",
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

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    alignItems: "center",
                    fontSize: "0.85rem",
                    color: "#e5e7eb",
                  }}
                >
                  <span>Winner:</span>
                  <button
                    type="button"
                    disabled={!m.player1Id}
                    onClick={() => handleSetWinnerQF(i, "p1")}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 9999,
                      border: isWinnerP1
                        ? "1px solid #4ade80"
                        : "1px solid #374151",
                      background: isWinnerP1 ? "#064e3b" : "#020617",
                      color: isWinnerP1 ? "#bbf7d0" : "#e5e7eb",
                      cursor: m.player1Id ? "pointer" : "not-allowed",
                    }}
                  >
                    {m.player1Id ? labelFromId(m.player1Id) : "Empty"}
                  </button>

                  <button
                    type="button"
                    disabled={!m.player2Id}
                    onClick={() => handleSetWinnerQF(i, "p2")}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 9999,
                      border: isWinnerP2
                        ? "1px solid #4ade80"
                        : "1px solid #374151",
                      background: isWinnerP2 ? "#064e3b" : "#020617",
                      color: isWinnerP2 ? "#bbf7d0" : "#e5e7eb",
                      cursor: m.player2Id ? "pointer" : "not-allowed",
                    }}
                  >
                    {m.player2Id ? labelFromId(m.player2Id) : "Empty"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== LB ROUND 2 ===== */}
      <div
        style={{
          marginTop: 24,
          padding: "10px 12px",
          borderRadius: 8,
          background: "#020617",
          border: "1px solid #1f2937",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 8,
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "#e5e7eb",
            }}
          >
            Losers Bracket — Round 2
          </div>

          <button
            type="button"
            onClick={handleBuildLB2}
            style={{
              background: "#f97316",
              padding: "6px 10px",
              borderRadius: 6,
              border: "none",
              color: "white",
              fontSize: "0.85rem",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            🔁 Build LB Round 2 from LB R1 winners + QF losers
          </button>
        </div>

        <p
          style={{
            fontSize: "0.8rem",
            color: "#9ca3af",
            marginBottom: 10,
          }}
        >
          Each LB R1 winner is paired against a loser from the Quarterfinals.
          You can still adjust these matchups manually.
        </p>

        {lbMatches2.length === 0 ? (
          <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
            No LB Round 2 yet. Build LB R1, set LB R1 winners, and set QF
            winners first.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {lbMatches2.map((pair, idx) => (
              <div
                key={idx}
                style={{
                  padding: "6px 8px",
                  borderRadius: 6,
                  background: "#0b1120",
                  border: "1px solid #111827",
                  fontSize: "0.85rem",
                  color: "#e5e7eb",
                }}
              >
                <div
                  style={{
                    marginBottom: 4,
                    fontSize: "0.8rem",
                    color: "#9ca3af",
                  }}
                >
                  LB R2 Match {idx + 1}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <select
                    value={pair.player1Id || ""}
                    onChange={(e) =>
                      handleChangeLbMatch2(
                        idx,
                        "player1Id",
                        e.target.value || null
                      )
                    }
                    style={{
                      flex: "1 1 200px",
                      background: "#020617",
                      color: "white",
                      borderRadius: 6,
                      border: "1px solid #374151",
                      padding: "6px 8px",
                      fontSize: "0.85rem",
                    }}
                  >
                    <option value="">(TBD)</option>
                    {allOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "#9ca3af",
                    }}
                  >
                    vs
                  </span>

                  <select
                    value={pair.player2Id || ""}
                    onChange={(e) =>
                      handleChangeLbMatch2(
                        idx,
                        "player2Id",
                        e.target.value || null
                      )
                    }
                    style={{
                      flex: "1 1 200px",
                      background: "#020617",
                      color: "white",
                      borderRadius: 6,
                      border: "1px solid #374151",
                      padding: "6px 8px",
                      fontSize: "0.85rem",
                    }}
                  >
                    <option value="">(TBD)</option>
                    {allOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== ROUND 3 (SEMI-FINALS, WINNERS) ===== */}
      <h3
        style={{
          marginTop: 32,
          marginBottom: 8,
          fontSize: "1.2rem",
          color: "#e5e7eb",
        }}
      >
        Round 3 — Semifinals (Winners)
      </h3>

      <div
        style={{
          marginBottom: 10,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={handleBuildSF}
          style={{
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
          🔁 Build Semifinals from QF winners
        </button>
        <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
          This pairs Quarterfinal winners into two Semifinal matches.
        </span>
      </div>

      {sfMatches.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
          No Semifinals yet. Build them from QF winners.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sfMatches.map((m, i) => {
            const isWinnerP1 =
              m.winnerId && m.winnerId === m.player1Id && !!m.player1Id;
            const isWinnerP2 =
              m.winnerId && m.winnerId === m.player2Id && !!m.player2Id;

            return (
              <div
                key={i}
                style={{
                  border: "1px solid #333",
                  borderRadius: 8,
                  padding: "10px 12px",
                  background: "#111827",
                }}
              >
                <div
                  style={{
                    marginBottom: 6,
                    fontSize: "0.9rem",
                    color: "#9ca3af",
                  }}
                >
                  SF Match {i + 1}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <select
                    value={m.player1Id || ""}
                    onChange={(e) =>
                      handleChangeSFMatch(
                        i,
                        "player1Id",
                        e.target.value || null
                      )
                    }
                    style={{
                      flex: "1 1 200px",
                      background: "#020617",
                      color: "white",
                      borderRadius: 6,
                      border: "1px solid #374151",
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

                  <select
                    value={m.player2Id || ""}
                    onChange={(e) =>
                      handleChangeSFMatch(
                        i,
                        "player2Id",
                        e.target.value || null
                      )
                    }
                    style={{
                      flex: "1 1 200px",
                      background: "#020617",
                      color: "white",
                      borderRadius: 6,
                      border: "1px solid #374151",
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

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    alignItems: "center",
                    fontSize: "0.85rem",
                    color: "#e5e7eb",
                  }}
                >
                  <span>Winner:</span>
                  <button
                    type="button"
                    disabled={!m.player1Id}
                    onClick={() => handleSetWinnerSF(i, "p1")}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 9999,
                      border: isWinnerP1
                        ? "1px solid #4ade80"
                        : "1px solid #374151",
                      background: isWinnerP1 ? "#064e3b" : "#020617",
                      color: isWinnerP1 ? "#bbf7d0" : "#e5e7eb",
                      cursor: m.player1Id ? "pointer" : "not-allowed",
                    }}
                  >
                    {m.player1Id ? labelFromId(m.player1Id) : "Empty"}
                  </button>

                  <button
                    type="button"
                    disabled={!m.player2Id}
                    onClick={() => handleSetWinnerSF(i, "p2")}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 9999,
                      border: isWinnerP2
                        ? "1px solid #4ade80"
                        : "1px solid #374151",
                      background: isWinnerP2 ? "#064e3b" : "#020617",
                      color: isWinnerP2 ? "#bbf7d0" : "#e5e7eb",
                      cursor: m.player2Id ? "pointer" : "not-allowed",
                    }}
                  >
                    {m.player2Id ? labelFromId(m.player2Id) : "Empty"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== LB ROUND 3A ===== */}
      <div
        style={{
          marginTop: 24,
          padding: "10px 12px",
          borderRadius: 8,
          background: "#020617",
          border: "1px solid #1f2937",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 8,
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "#e5e7eb",
            }}
          >
            Losers Bracket — Round 3A
          </div>

          <button
            type="button"
            onClick={handleBuildLB3A}
            style={{
              background: "#f97316",
              padding: "6px 10px",
              borderRadius: 6,
              border: "none",
              color: "white",
              fontSize: "0.85rem",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            🔁 Build LB 3A from LB 2 winners
          </button>
        </div>

        <p
          style={{
            fontSize: "0.8rem",
            color: "#9ca3af",
            marginBottom: 10,
          }}
        >
          Winners of LB Round 2 fight each other here to leave 2 players for LB
          Round 3B.
        </p>

        {lbMatches3a.length === 0 ? (
          <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
            No LB Round 3A yet. Build LB 3A after LB2 winners are chosen.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {lbMatches3a.map((pair, idx) => {
              const isWinnerP1 =
                pair.winnerId &&
                pair.winnerId === pair.player1Id &&
                !!pair.player1Id;
              const isWinnerP2 =
                pair.winnerId &&
                pair.winnerId === pair.player2Id &&
                !!pair.player2Id;

              return (
                <div
                  key={idx}
                  style={{
                    padding: "6px 8px",
                    borderRadius: 6,
                    background: "#0b1120",
                    border: "1px solid #111827",
                    fontSize: "0.85rem",
                    color: "#e5e7eb",
                  }}
                >
                  <div
                    style={{
                      marginBottom: 4,
                      fontSize: "0.8rem",
                      color: "#9ca3af",
                    }}
                  >
                    LB R3A Match {idx + 1}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <select
                      value={pair.player1Id || ""}
                      onChange={(e) =>
                        handleChangeLbMatch3A(
                          idx,
                          "player1Id",
                          e.target.value || null
                        )
                      }
                      style={{
                        flex: "1 1 200px",
                        background: "#020617",
                        color: "white",
                        borderRadius: 6,
                        border: "1px solid #374151",
                        padding: "6px 8px",
                        fontSize: "0.85rem",
                      }}
                    >
                      <option value="">(TBD)</option>
                      {allOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: "#9ca3af",
                      }}
                    >
                      vs
                    </span>

                    <select
                      value={pair.player2Id || ""}
                      onChange={(e) =>
                        handleChangeLbMatch3A(
                          idx,
                          "player2Id",
                          e.target.value || null
                        )
                      }
                      style={{
                        flex: "1 1 200px",
                        background: "#020617",
                        color: "white",
                        borderRadius: 6,
                        border: "1px solid #374151",
                        padding: "6px 8px",
                        fontSize: "0.85rem",
                      }}
                    >
                      <option value="">(TBD)</option>
                      {allOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                      alignItems: "center",
                      fontSize: "0.8rem",
                    }}
                  >
                    <span>Winner:</span>
                    <button
                      type="button"
                      disabled={!pair.player1Id}
                      onClick={() => handleSetWinnerLB3A(idx, "p1")}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 9999,
                        border: isWinnerP1
                          ? "1px solid #4ade80"
                          : "1px solid #374151",
                        background: isWinnerP1 ? "#064e3b" : "#020617",
                        color: isWinnerP1 ? "#bbf7d0" : "#e5e7eb",
                        cursor: pair.player1Id ? "pointer" : "not-allowed",
                      }}
                    >
                      {pair.player1Id ? labelFromId(pair.player1Id) : "Empty"}
                    </button>

                    <button
                      type="button"
                      disabled={!pair.player2Id}
                      onClick={() => handleSetWinnerLB3A(idx, "p2")}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 9999,
                        border: isWinnerP2
                          ? "1px solid #4ade80"
                          : "1px solid #374151",
                        background: isWinnerP2 ? "#064e3b" : "#020617",
                        color: isWinnerP2 ? "#bbf7d0" : "#e5e7eb",
                        cursor: pair.player2Id ? "pointer" : "not-allowed",
                      }}
                    >
                      {pair.player2Id ? labelFromId(pair.player2Id) : "Empty"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== LB ROUND 3B ===== */}
      <div
        style={{
          marginTop: 24,
          padding: "10px 12px",
          borderRadius: 8,
          background: "#020617",
          border: "1px solid #1f2937",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 8,
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "#e5e7eb",
            }}
          >
            Losers Bracket — Round 3B
          </div>

          <button
            type="button"
            onClick={handleBuildLB3B}
            style={{
              background: "#f97316",
              padding: "6px 10px",
              borderRadius: 6,
              border: "none",
              color: "white",
              fontSize: "0.85rem",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            🔁 Build LB 3B from LB 3A winners + Winners-SF losers
          </button>
        </div>

        <p
          style={{
            fontSize: "0.8rem",
            color: "#9ca3af",
            marginBottom: 10,
          }}
        >
          Each LB 3A winner is paired against a loser from the Winners
          Semifinals.
        </p>

        {lbMatches3b.length === 0 ? (
          <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
            No LB Round 3B yet. Build LB 3A, set LB 3A winners, and set SF
            winners first.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {lbMatches3b.map((pair, idx) => (
              <div
                key={idx}
                style={{
                  padding: "6px 8px",
                  borderRadius: 6,
                  background: "#0b1120",
                  border: "1px solid #111827",
                  fontSize: "0.85rem",
                  color: "#e5e7eb",
                }}
              >
                <div
                  style={{
                    marginBottom: 4,
                    fontSize: "0.8rem",
                    color: "#9ca3af",
                  }}
                >
                  LB R3B Match {idx + 1}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <select
                    value={pair.player1Id || ""}
                    onChange={(e) =>
                      handleChangeLbMatch3B(
                        idx,
                        "player1Id",
                        e.target.value || null
                      )
                    }
                    style={{
                      flex: "1 1 200px",
                      background: "#020617",
                      color: "white",
                      borderRadius: 6,
                      border: "1px solid #374151",
                      padding: "6px 8px",
                      fontSize: "0.85rem",
                    }}
                  >
                    <option value="">(TBD)</option>
                    {allOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "#9ca3af",
                    }}
                  >
                    vs
                  </span>

                  <select
                    value={pair.player2Id || ""}
                    onChange={(e) =>
                      handleChangeLbMatch3B(
                        idx,
                        "player2Id",
                        e.target.value || null
                      )
                    }
                    style={{
                      flex: "1 1 200px",
                      background: "#020617",
                      color: "white",
                      borderRadius: 6,
                      border: "1px solid #374151",
                      padding: "6px 8px",
                      fontSize: "0.85rem",
                    }}
                  >
                    <option value="">(TBD)</option>
                    {allOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== SAVE BUTTON ===== */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        style={{
          marginTop: 24,
          background: saving ? "#1d4ed8" : "#2563eb",
          padding: "10px 16px",
          borderRadius: 8,
          border: "none",
          color: "white",
          cursor: saving ? "default" : "pointer",
          fontSize: "0.95rem",
          fontWeight: 600,
        }}
      >
        {saving
          ? "Saving..."
          : "💾 Save Winners R1/QF/SF + Losers R1/R2/R3A/R3B"}
      </button>

      {saveMessage && (
        <p style={{ marginTop: 8, fontSize: "0.9rem", color: "#a5b4fc" }}>
          {saveMessage}
        </p>
      )}
    </div>
  );
}

// ---------- MAIN PAGE WRAPPER ----------
export default function TournamentPlayersPage({
  tournamentId,
  players,
  isPublished,
}) {
  return (
    <div style={{ padding: "40px 20px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.6rem", marginBottom: 4 }}>
        Players in {tournamentId}
      </h1>

      {/* Publish status */}
      <div
        style={{
          marginBottom: 16,
          padding: "10px 12px",
          borderRadius: 8,
          background: "#020617",
          border: "1px solid #1f2933",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: "0.9rem" }}>
          Status:{" "}
          <strong
            style={{
              color: isPublished ? "#4ade80" : "#fbbf24",
            }}
          >
            {isPublished ? "Published (visible to players)" : "Draft (hidden)"}
          </strong>
        </span>

        <form
          method="POST"
          action={`/api/admin/brackets/${encodeURIComponent(
            tournamentId
          )}/publish?state=publish`}
        >
          <button
            type="submit"
            style={{
              background: "#16a34a",
              padding: "6px 10px",
              borderRadius: 6,
              border: "none",
              color: "white",
              fontSize: "0.85rem",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ✅ Publish
          </button>
        </form>

        <form
          method="POST"
          action={`/api/admin/brackets/${encodeURIComponent(
            tournamentId
          )}/publish?state=unpublish`}
        >
          <button
            type="submit"
            style={{
              background: "#6b7280",
              padding: "6px 10px",
              borderRadius: 6,
              border: "none",
              color: "white",
              fontSize: "0.85rem",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            🚫 Unpublish
          </button>
        </form>
      </div>

      <p style={{ marginBottom: 16, color: "#ccc" }}>
        This is the full list of players registered for this tournament.
      </p>

      <a
        href="/admin/brackets"
        style={{
          display: "inline-block",
          marginBottom: 20,
          fontSize: "0.9rem",
          color: "#93c5fd",
          textDecoration: "none",
        }}
      >
        ← Back to all tournaments
      </a>

      {players.length === 0 ? (
        <p>No players registered for this tournament.</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: 8,
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  padding: "8px 6px",
                  borderBottom: "1px solid #333",
                }}
              >
                Username
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "8px 6px",
                  borderBottom: "1px solid #333",
                }}
              >
                IGN
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "8px 6px",
                  borderBottom: "1px solid #333",
                }}
              >
                Rank
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "8px 6px",
                  borderBottom: "1px solid #333",
                }}
              >
                Discord ID
              </th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p._id}>
                <td
                  style={{
                    padding: "8px 6px",
                    borderBottom: "1px solid #222",
                  }}
                >
                  {p.username}
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    borderBottom: "1px solid #222",
                  }}
                >
                  {p.ign}
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    borderBottom: "1px solid #222",
                  }}
                >
                  {p.rank}
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    borderBottom: "1px solid #222",
                    fontSize: "0.8rem",
                    color: "#9ca3af",
                  }}
                >
                  {p.discordId}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <hr style={{ margin: "40px 0", borderColor: "#333" }} />
      <h2 style={{ fontSize: "1.4rem", marginBottom: 12 }}>
        Bracket Editor — Winners R1/QF/SF + Losers R1/R2/R3A/R3B
      </h2>
      <BracketEditor tournamentId={tournamentId} players={players} />
    </div>
  );
}
