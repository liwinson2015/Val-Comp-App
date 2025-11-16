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

  // Load tournament to get publish status
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

// ---------- HELPERS (client-side) ----------
function computeLosersFromMatches(matches) {
  const losers = [];
  (matches || []).forEach((m) => {
    if (!m.winnerId) return;
    if (!m.player1Id || !m.player2Id) return; // ignore BYEs
    const loser = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
    losers.push(loser);
  });
  return losers;
}

// Turn an array of ids into LB match objects
function buildPairsFromIds(ids) {
  const pairs = [];
  for (let i = 0; i < ids.length; i += 2) {
    const p1 = ids[i] || null;
    const p2 = ids[i + 1] || null;
    if (!p1 && !p2) continue;
    pairs.push({ player1Id: p1, player2Id: p2 });
  }
  return pairs;
}

// ---------- CLIENT SIDE BRACKET (EDITABLE) ----------
function BracketEditor({ tournamentId, players }) {
  const [loading, setLoading] = useState(true);

  const [matches, setMatches] = useState([]); // Round 1 (includes winnerId)
  const [lbMatches, setLbMatches] = useState([]); // LB Round 1

  const [qfMatches, setQfMatches] = useState([]); // Round 2 (Quarterfinals)
  const [lbMatches2, setLbMatches2] = useState([]); // LB Round 2

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [randomizing, setRandomizing] = useState(false);

  // lookup: playerId -> "IGN (username)" (for admin view)
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

  // Load current saved bracket (rounds + losers rounds) from API
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
        }

        if (bracket && Array.isArray(bracket.losersRounds)) {
          const lrs = bracket.losersRounds || [];

          const lb1 =
            lrs.find(
              (r) => r.roundNumber === 1 && r.type === "losers"
            ) || lrs[0];
          if (lb1 && Array.isArray(lb1.matches)) {
            setLbMatches(
              lb1.matches.map((m) => ({
                player1Id: m.player1Id || null,
                player2Id: m.player2Id || null,
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
              }))
            );
          }
        }
      } catch (err) {
        console.error("Failed to load bracket", err);
        setMatches([]);
        setQfMatches([]);
        setLbMatches([]);
        setLbMatches2([]);
      } finally {
        setLoading(false);
      }
    }

    loadBracket();
  }, [tournamentId]);

  function handleChangeMatch(index, field, value) {
    setMatches((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value || null };

      // If winner no longer matches either player, clear it
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

  // Mark winner for a match in Round 1
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

  // Mark winner for a match in Round 2 (QF)
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

  async function handleRandomize() {
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
        setLbMatches([]);
        setQfMatches([]);
        setLbMatches2([]);
        setSaveMessage("Random layout generated (not saved yet).");
      }
    } catch (err) {
      console.error("Randomize error", err);
      setSaveMessage("Error generating random layout.");
    } finally {
      setRandomizing(false);
    }
  }

  // Build QF from Round 1 winners
  function handleBuildQF() {
    const winners = [];
    (matches || []).forEach((m) => {
      if (m.winnerId) winners.push(m.winnerId);
    });

    if (winners.length < 2) {
      setSaveMessage(
        "You need at least 2 winners in Round 1 before building Quarterfinals."
      );
      return;
    }

    const pairs = buildPairsFromIds(winners).slice(0, 4); // up to 4 QF matches
    const qf = pairs.map((p) => ({
      player1Id: p.player1Id || null,
      player2Id: p.player2Id || null,
      winnerId: null,
    }));

    setQfMatches(qf);
    setLbMatches2([]);
    setSaveMessage(
      "Quarterfinals built from Round 1 winners. You can adjust them manually."
    );
  }

  // 🔥 Save R1, QF (R2), LB1, LB2
  async function handleSave() {
    setSaving(true);
    setSaveMessage("");
    try {
      // LB Round 1 from losers of R1
      const losersR1 = computeLosersFromMatches(matches);
      const effectiveLbR1 =
        lbMatches.length > 0 ? lbMatches : buildPairsFromIds(losersR1);

      // LB Round 2 from losers of QF
      const losersR2 = computeLosersFromMatches(qfMatches);
      const effectiveLbR2 =
        lbMatches2.length > 0 ? lbMatches2 : buildPairsFromIds(losersR2);

      const res = await fetch(
        `/api/admin/brackets/${encodeURIComponent(tournamentId)}/save`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matches, // Round 1
            matches2: qfMatches, // Round 2 (QF)
            lbMatches: effectiveLbR1, // LB Round 1
            lbMatches2: effectiveLbR2, // LB Round 2
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSaveMessage(err.error || "Failed to save bracket.");
      } else {
        setSaveMessage(
          "Saved: Round 1, Quarterfinals, and Losers R1 & R2 to the database."
        );
      }
    } catch (err) {
      console.error("Save error", err);
      setSaveMessage("Error saving bracket.");
    } finally {
      setSaving(false);
    }
  }

  // Add a player to the first available empty slot (Round 1 only)
  function handleAddPlayerToBracket(playerId) {
    setMatches((prev) => {
      const copy = prev.map((m) => ({ ...m }));

      const alreadyPlaced = copy.some(
        (m) => m.player1Id === playerId || m.player2Id === playerId
      );
      if (alreadyPlaced) {
        setSaveMessage("That player is already placed in the Round 1 bracket.");
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

  // Randomize LB Round 1 from losers of R1
  function handleRandomizeLB1() {
    const losers = computeLosersFromMatches(matches);
    if (losers.length < 2) {
      setSaveMessage(
        "You need at least 2 completed Round 1 matches (with winners) to randomize LB Round 1."
      );
      return;
    }

    const shuffled = [...losers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const pairs = buildPairsFromIds(shuffled);
    setLbMatches(pairs);
    setSaveMessage(
      "Losers Bracket Round 1 randomized. You can manually adjust the pairs below."
    );
  }

  // Randomize LB Round 2 from losers of QF
  function handleRandomizeLB2() {
    const losers = computeLosersFromMatches(qfMatches);
    if (losers.length < 2) {
      setSaveMessage(
        "You need at least 2 completed Quarterfinal matches (with winners) to randomize LB Round 2."
      );
      return;
    }

    const shuffled = [...losers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const pairs = buildPairsFromIds(shuffled);
    setLbMatches2(pairs);
    setSaveMessage(
      "Losers Bracket Round 2 randomized. You can manually adjust the pairs below."
    );
  }

  // Manually edit LB Round 1 slot
  function handleChangeLbMatch1(index, slot, value) {
    setLbMatches((prev) => {
      let base = prev;

      if (base.length === 0) {
        const losers = computeLosersFromMatches(matches);
        base = buildPairsFromIds(losers);
      }

      const copy = base.map((m) => ({ ...m }));
      if (!copy[index]) return copy;
      copy[index][slot] = value || null;
      return copy;
    });
  }

  // Manually edit LB Round 2 slot
  function handleChangeLbMatch2(index, slot, value) {
    setLbMatches2((prev) => {
      let base = prev;

      if (base.length === 0) {
        const losers = computeLosersFromMatches(qfMatches);
        base = buildPairsFromIds(losers);
      }

      const copy = base.map((m) => ({ ...m }));
      if (!copy[index]) return copy;
      copy[index][slot] = value || null;
      return copy;
    });
  }

  if (loading) return <p>Loading bracket...</p>;

  // --- Count placements + find unused & duplicates in Round 1 only ---
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

  // losers & LB matches
  const losersR1 = computeLosersFromMatches(matches);
  const winnersChosenR1 = losersR1.length;

  const effectiveLbMatches1 =
    lbMatches.length > 0 ? lbMatches : buildPairsFromIds(losersR1);

  // options for LB1 dropdowns: only players who actually lost in R1
  const uniqueLoserIdsR1 = Array.from(new Set(losersR1));
  const loserOptionsR1 = uniqueLoserIdsR1.map((id) => ({
    value: id,
    label: idToLabel[id] || "TBD",
  }));

  // LB Round 2
  const losersR2 = computeLosersFromMatches(qfMatches);
  const winnersChosenR2 = losersR2.length;

  const effectiveLbMatches2 =
    lbMatches2.length > 0 ? lbMatches2 : buildPairsFromIds(losersR2);

  const uniqueLoserIdsR2 = Array.from(new Set(losersR2));
  const loserOptionsR2 = uniqueLoserIdsR2.map((id) => ({
    value: id,
    label: idToLabel[id] || "TBD",
  }));

  function labelFromId(id) {
    if (!id) return "TBD";
    return idToLabel[id] || "TBD";
  }

  return (
    <div style={{ marginTop: 20 }}>
      <p style={{ color: "#bbb", marginBottom: 12 }}>
        This is your editable double-elimination bracket. You can randomize as a
        starting point, then manually adjust any slot. Mark winners in each
        round to build the losers bracket. Nothing is saved until you click
        &quot;Save bracket&quot;.
      </p>

      {/* Top controls + usage summary */}
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
          onClick={handleRandomize}
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
          {randomizing ? "Randomizing..." : "🔀 Randomize Round 1 from registrations"}
        </button>

        <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
          Placed in Round 1: {usedCount} / {totalCount} players
        </span>

        <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
          R1 winners chosen: {winnersChosenR1}
        </span>

        <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
          QF winners chosen: {winnersChosenR2}
        </span>
      </div>

      {/* Unplaced players list with + buttons (Round 1 only) */}
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
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
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

      {/* Duplicate players list (Round 1 only) */}
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
            No duplicates detected in Round 1. Each player appears at most once.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
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

      {(!matches || matches.length === 0) && (
        <p style={{ color: "#9ca3af", marginBottom: 16 }}>
          No Round 1 bracket yet. Click &quot;Randomize Round 1 from
          registrations&quot; to create a layout, then adjust and save.
        </p>
      )}

      {/* ===== ROUND 1 (WINNERS) ===== */}
      {matches && matches.length > 0 && (
        <>
          <h3
            style={{
              marginTop: 10,
              marginBottom: 8,
              fontSize: "1.2rem",
              color: "#e5e7eb",
            }}
          >
            Round 1 — Seeds
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {matches.map((m, i) => {
              const p1Dup =
                m.player1Id && placedCount[m.player1Id] > 1 ? true : false;
              const p2Dup =
                m.player2Id && placedCount[m.player2Id] > 1 ? true : false;

              const isWinnerP1 = m.winnerId && m.winnerId === m.player1Id;
              const isWinnerP2 = m.winnerId && m.winnerId === m.player2Id;

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
                      <option value="">(BYE / empty)</option>
                      {allOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Winner picker */}
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

          {/* ===== LOSERS BRACKET ROUND 1 ===== */}
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
                🎲 Randomize LB Round 1
              </button>
            </div>

            <p
              style={{
                fontSize: "0.8rem",
                color: "#9ca3af",
                marginBottom: 10,
              }}
            >
              The loser of each completed Round 1 match is collected into a pool.
              You can randomize that pool into LB R1, then manually adjust any
              matchup below.
            </p>

            {effectiveLbMatches1.length === 0 ? (
              <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
                No losers yet. Mark winners in Round 1 to build the LB pool.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {effectiveLbMatches1.map((pair, idx) => (
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
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ===== ROUND 2 (QUARTERFINALS) ===== */}
          <h3
            style={{
              marginTop: 32,
              marginBottom: 8,
              fontSize: "1.2rem",
              color: "#e5e7eb",
            }}
          >
            Round 2 — Quarterfinals
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
              This takes all Round 1 winners in order and pairs them into QF
              matches.
            </span>
          </div>

          {qfMatches.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
              No Quarterfinals yet. Click &quot;Build Quarterfinals from Round 1
              winners&quot; after you&apos;ve marked winners in Round 1, or fill them
              manually.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {qfMatches.map((m, i) => {
                const isWinnerP1 = m.winnerId && m.winnerId === m.player1Id;
                const isWinnerP2 = m.winnerId && m.winnerId === m.player2Id;

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
                      Quarterfinal Match {i + 1}
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

                    {/* Winner picker QF */}
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

          {/* ===== LOSERS BRACKET ROUND 2 ===== */}
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
                onClick={handleRandomizeLB2}
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
                🎲 Randomize LB Round 2
              </button>
            </div>

            <p
              style={{
                fontSize: "0.8rem",
                color: "#9ca3af",
                marginBottom: 10,
              }}
            >
              The losers of each completed Quarterfinal match are collected into
              the LB Round 2 pool. Randomize or manually adjust matchups here.
            </p>

            {effectiveLbMatches2.length === 0 ? (
              <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
                No QF losers yet. Mark QF winners first.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {effectiveLbMatches2.map((pair, idx) => (
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
                        {loserOptionsR2.map((opt) => (
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
                        {loserOptionsR2.map((opt) => (
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
              : "💾 Save R1 + QF + Losers R1 & R2 to DB"}
          </button>
        </>
      )}

      {saveMessage && (
        <p style={{ marginTop: 8, fontSize: "0.9rem", color: "#a5b4fc" }}>
          {saveMessage}
        </p>
      )}
    </div>
  );
}

// ---------- MAIN PAGE ----------
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

      {/* Publish status + buttons */}
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

      {/* Editable bracket section */}
      <hr style={{ margin: "40px 0", borderColor: "#333" }} />
      <h2 style={{ fontSize: "1.4rem", marginBottom: 12 }}>
        Bracket Editor — Winners R1 / QF + Losers R1 / R2
      </h2>
      <BracketEditor tournamentId={tournamentId} players={players} />
    </div>
  );
}
