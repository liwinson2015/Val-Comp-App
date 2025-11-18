// pages/admin/players.js
import React, { useMemo, useState, useEffect } from "react";
import { connectToDatabase } from "../../lib/mongodb";
import { getCurrentPlayerFromReq } from "../../lib/getCurrentPlayer";
import Player from "../../models/Player";
import { tournamentsById as catalog } from "../../lib/tournaments";
import styles from "../../styles/Valorant.module.css";

// ---------- SERVER SIDE ----------
export async function getServerSideProps({ req }) {
  const admin = await getCurrentPlayerFromReq(req);

  // Require login
  if (!admin) {
    const encoded = encodeURIComponent(`/admin/players`);
    return {
      redirect: {
        destination: `/api/auth/discord?next=${encoded}`,
        permanent: false,
      },
    };
  }

  // Require admin
  if (!admin.isAdmin) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  await connectToDatabase();

  const rawPlayers = await Player.find({}).lean();

  // Build simple tournament list from catalog
  const tournaments = Object.entries(catalog).map(([id, t]) => ({
    id,
    name: t.name || t.title || t.displayName || id,
    game: t.game || "",
    mode: t.mode || "",
  }));

  const players = rawPlayers.map((p) => {
    // ---------- build avatar URL (Discord CDN) ----------
    const avatarHash = p.avatar || p.discordAvatar || p.avatarUrl || null;

    let avatarUrl = null;
    if (avatarHash && p.discordId) {
      avatarUrl = `https://cdn.discordapp.com/avatars/${p.discordId}/${avatarHash}.png?size=128`;
    } else if (
      typeof p.avatarUrl === "string" &&
      p.avatarUrl.startsWith("http")
    ) {
      avatarUrl = p.avatarUrl;
    }

    // ---------- normalize registrations & keep meaningful extras ----------
    const registeredFor = (p.registeredFor || []).map((r) => {
      const known = [
        "id",
        "tournamentId",
        "tournamentName",
        "name",
        "game",
        "mode",
        "date",
        "placement",
        "result",
        "status",
        "_id",
        "createdAt",
        "__v",
        // treat these as first-class, not extras
        "ign",
        "fullIgn",
        "rank",
      ];

      const extras = {};
      Object.keys(r || {}).forEach((key) => {
        if (!known.includes(key)) {
          extras[key] = r[key];
        }
      });

      return {
        id: r.id || r.tournamentId || "",
        tournamentId: r.tournamentId || "",
        name: r.name || r.tournamentName || "",
        game: r.game || "",
        mode: r.mode || "",
        date: r.date ? String(r.date) : "",
        placement: r.placement ?? null,
        result: r.result || r.status || "",
        ign: r.ign || "",
        fullIgn: r.fullIgn || "",
        rank: r.rank || "",
        extras,
      };
    });

    const discordName =
      p.discordTag || p.username || p.displayName || p.globalName || "";

    return {
      id: String(p._id),
      discordId: p.discordId || "",
      discordName,
      avatarUrl,
      ign: p.ign || "",
      riotId: p.riotId || "",
      isAdmin: !!p.isAdmin,
      createdAt: p.createdAt ? String(p.createdAt) : "",
      mmr: p.mmr || null,
      rank: p.rank || "",
      adminNotes: p.adminNotes || "",
      registeredFor,
    };
  });

  return {
    props: {
      players,
      tournaments,
    },
  };
}

// ---------- CLIENT SIDE ----------
export default function AdminPlayersPage({ players, tournaments }) {
  const [playersState, setPlayersState] = useState(players || []);
  const [query, setQuery] = useState("");
  const [tournamentFilter, setTournamentFilter] = useState("all");
  const [onlyNeverRegistered, setOnlyNeverRegistered] = useState(false);

  const [selectedId, setSelectedId] = useState(
    () => (players && players[0]?.id) || null
  );

  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesMessage, setNotesMessage] = useState("");

  // Compute filtered players based on filters + search
  const filteredPlayers = useMemo(() => {
    const q = query.toLowerCase().trim();

    return playersState.filter((p) => {
      // Filter: never registered
      if (onlyNeverRegistered && (p.registeredFor || []).length > 0) {
        return false;
      }

      // Filter: registered for tournament X
      if (tournamentFilter !== "all") {
        const hasTournament = (p.registeredFor || []).some(
          (r) =>
            r.tournamentId === tournamentFilter || r.id === tournamentFilter
        );
        if (!hasTournament) return false;
      }

      // Text search
      if (!q) return true;

      const haystack = [
        p.discordName,
        p.riotId,
        p.ign,
        p.discordId,
        p.rank,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [playersState, query, tournamentFilter, onlyNeverRegistered]);

  const selectedPlayer =
    filteredPlayers.find((p) => p.id === selectedId) ||
    filteredPlayers[0] ||
    null;

  // If filter removed the previously selected player, update selection
  useEffect(() => {
    if (!selectedPlayer && filteredPlayers.length > 0) {
      setSelectedId(filteredPlayers[0].id);
    }
  }, [selectedPlayer, filteredPlayers]);

  // Sync notesDraft when selected player changes
  useEffect(() => {
    if (selectedPlayer) {
      setNotesDraft(selectedPlayer.adminNotes || "");
      setNotesMessage("");
    }
  }, [selectedPlayer]);

  async function handleSaveNotes() {
    if (!selectedPlayer) return;
    setSavingNotes(true);
    setNotesMessage("");

    try {
      const res = await fetch("/api/admin/update-player-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: selectedPlayer.id,
          notes: notesDraft,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Failed to save notes:", text);
        setNotesMessage("Error saving notes.");
      } else {
        // Update local state
        setPlayersState((prev) =>
          prev.map((p) =>
            p.id === selectedPlayer.id ? { ...p, adminNotes: notesDraft } : p
          )
        );
        setNotesMessage("Saved.");
      }
    } catch (err) {
      console.error("Error saving notes:", err);
      setNotesMessage("Error saving notes.");
    } finally {
      setSavingNotes(false);
      setTimeout(() => setNotesMessage(""), 2000);
    }
  }

  // 🔸 NEW: save ign / fullIgn / rank for a single registration
  async function handleSaveRegistration(e, playerId, reg) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const ign = formData.get("ign") || "";
    const fullIgn = formData.get("fullIgn") || "";
    const rank = formData.get("rank") || "";

    try {
      const res = await fetch("/api/admin/update-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          tournamentId: reg.tournamentId,
          ign,
          fullIgn,
          rank,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Failed to save registration:", text);
        alert("Error saving registration: " + text);
        return;
      }

      // simplest: reload so data & extras stay in sync
      window.location.reload();
    } catch (err) {
      console.error("Error saving registration:", err);
      alert("Network error saving registration.");
    }
  }

  return (
    <div
      className={styles.container}
      style={{ padding: "2rem 1rem", color: "#e5e7eb" }}
    >
      <h1 className={styles.pageTitle}>Admin · Players</h1>

      {/* Search + filters row */}
      <div
        style={{
          margin: "1rem 0 1.5rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="Search by Discord name, Riot ID, IGN, or Discord ID"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: "1 1 220px",
            minWidth: "220px",
            padding: "0.55rem 0.8rem",
            borderRadius: "6px",
            border: "1px solid #4b5563",
            background: "#020617",
            color: "#f9fafb",
            fontSize: "0.9rem",
          }}
        />

        {/* Tournament filter */}
        <select
          value={tournamentFilter}
          onChange={(e) => setTournamentFilter(e.target.value)}
          style={{
            flex: "0 0 220px",
            padding: "0.55rem 0.7rem",
            borderRadius: "6px",
            border: "1px solid #4b5563",
            background: "#020617",
            color: "#f9fafb",
            fontSize: "0.85rem",
          }}
        >
          <option value="all">All tournaments</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.id})
            </option>
          ))}
        </select>

        {/* Never-registered filter */}
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.8rem",
            color: "#d1d5db",
          }}
        >
          <input
            type="checkbox"
            checked={onlyNeverRegistered}
            onChange={(e) => setOnlyNeverRegistered(e.target.checked)}
            style={{ accentColor: "#f97316" }}
          />
          <span>Only players who never registered</span>
        </label>

        <span style={{ fontSize: "0.85rem", opacity: 0.8, marginLeft: "auto" }}>
          {filteredPlayers.length} players
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.9fr)",
          gap: "1.25rem",
        }}
      >
        {/* LEFT: PLAYER LIST */}
        <div
          style={{
            border: "1px solid #1f2937",
            borderRadius: "10px",
            overflow: "hidden",
            background: "#020617",
          }}
        >
          <div
            style={{
              padding: "0.6rem 0.8rem",
              borderBottom: "1px solid #1f2937",
              fontSize: "0.85rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              opacity: 0.9,
            }}
          >
            Players
          </div>
          <div style={{ maxHeight: "440px", overflowY: "auto" }}>
            {filteredPlayers.length === 0 && (
              <div style={{ padding: "0.8rem", fontSize: "0.9rem" }}>
                No players found.
              </div>
            )}

            {filteredPlayers.map((p) => {
              const isActive = p.id === selectedId;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    borderBottom: "1px solid #111827",
                    padding: "0.55rem 0.8rem",
                    cursor: "pointer",
                    background: isActive ? "#111827" : "#020617",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.65rem",
                    color: "#e5e7eb",
                  }}
                >
                  {/* small avatar */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "999px",
                      overflow: "hidden",
                      flexShrink: 0,
                      background: "#1f2937",
                    }}
                  >
                    {p.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.avatarUrl}
                        alt={p.discordName || "avatar"}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.8rem",
                          color: "#9ca3af",
                        }}
                      >
                        ?
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span style={{ fontSize: "0.95rem", fontWeight: 500 }}>
                        {p.discordName || "(no Discord name)"}
                      </span>
                      {p.isAdmin && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            textTransform: "uppercase",
                            border: "1px solid #facc15",
                            padding: "0.1rem 0.35rem",
                            borderRadius: "4px",
                            color: "#facc15",
                          }}
                        >
                          Admin
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "#9ca3af",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.4rem",
                        marginTop: "0.1rem",
                      }}
                    >
                      {p.riotId && <span>Riot: {p.riotId}</span>}
                      {p.ign && <span>IGN: {p.ign}</span>}
                      {p.rank && <span>Rank: {p.rank}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: PLAYER DETAIL */}
        <div
          style={{
            border: "1px solid #1f2937",
            borderRadius: "10px",
            padding: "1rem",
            background: "#020617",
            minHeight: "280px",
            color: "#e5e7eb",
          }}
        >
          {!selectedPlayer ? (
            <div>No player selected.</div>
          ) : (
            <>
              {/* Profile header (name + big avatar) */}
              <div
                style={{
                  marginBottom: "0.9rem",
                  display: "flex",
                  gap: "1rem",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "24px",
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "#1f2937",
                  }}
                >
                  {selectedPlayer.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedPlayer.avatarUrl}
                      alt={selectedPlayer.discordName || "avatar"}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.2rem",
                        color: "#9ca3af",
                      }}
                    >
                      ?
                    </div>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                    }}
                  >
                    <div>
                      <h2 style={{ margin: 0, fontSize: "1.15rem" }}>
                        {selectedPlayer.discordName || "(No Discord name)"}
                      </h2>
                      {selectedPlayer.riotId && (
                        <div style={{ fontSize: "0.9rem", color: "#d1d5db" }}>
                          Riot ID: {selectedPlayer.riotId}
                        </div>
                      )}
                      {selectedPlayer.ign && (
                        <div style={{ fontSize: "0.9rem", color: "#d1d5db" }}>
                          IGN: {selectedPlayer.ign}
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        textAlign: "right",
                        fontSize: "0.85rem",
                        color: "#9ca3af",
                      }}
                    >
                      <div>
                        Discord ID: {selectedPlayer.discordId || "—"}
                      </div>
                      {selectedPlayer.rank && (
                        <div>Rank: {selectedPlayer.rank}</div>
                      )}
                      {selectedPlayer.mmr != null && (
                        <div>MMR: {selectedPlayer.mmr}</div>
                      )}
                    </div>
                  </div>

                  {selectedPlayer.createdAt && (
                    <div
                      style={{
                        marginTop: "0.45rem",
                        fontSize: "0.85rem",
                        color: "#9ca3af",
                      }}
                    >
                      Joined:{" "}
                      {new Date(selectedPlayer.createdAt).toLocaleString(
                        "en-US",
                        {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Admin notes */}
              <div
                style={{
                  marginTop: "0.5rem",
                  borderTop: "1px solid #1f2937",
                  paddingTop: "0.7rem",
                  marginBottom: "0.75rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.85rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#9ca3af",
                    marginBottom: "0.35rem",
                  }}
                >
                  Admin Notes
                </div>
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  rows={3}
                  placeholder="Internal notes for this player (no-shows, behavior, etc.)"
                  style={{
                    width: "100%",
                    resize: "vertical",
                    minHeight: "70px",
                    background: "#020617",
                    borderRadius: "6px",
                    border: "1px solid #4b5563",
                    padding: "0.5rem 0.6rem",
                    color: "#e5e7eb",
                    fontSize: "0.85rem",
                    fontFamily: "inherit",
                  }}
                />
                <div
                  style={{
                    marginTop: "0.4rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    style={{
                      padding: "0.35rem 0.7rem",
                      fontSize: "0.8rem",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: savingNotes ? "#4b5563" : "#f97316",
                      color: "#111827",
                      fontWeight: 600,
                      cursor: savingNotes ? "wait" : "pointer",
                    }}
                  >
                    {savingNotes ? "Saving…" : "Save notes"}
                  </button>
                  {notesMessage && (
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color:
                          notesMessage === "Saved." ? "#22c55e" : "#f97316",
                      }}
                    >
                      {notesMessage}
                    </span>
                  )}
                </div>
              </div>

              {/* Registrations */}
              <div
                style={{
                  marginTop: "0.5rem",
                  borderTop: "1px solid #1f2937",
                  paddingTop: "0.7rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.85rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#9ca3af",
                    marginBottom: "0.4rem",
                  }}
                >
                  Registrations ({selectedPlayer.registeredFor.length})
                </div>

                {selectedPlayer.registeredFor.length === 0 && (
                  <div style={{ fontSize: "0.9rem", color: "#d1d5db" }}>
                    This player has not registered for any tournaments.
                  </div>
                )}

                {selectedPlayer.registeredFor.length > 0 && (
                  <div
                    style={{
                      maxHeight: "340px",
                      overflowY: "auto",
                      borderRadius: "8px",
                      border: "1px solid #111827",
                      background: "#030712",
                    }}
                  >
                    {selectedPlayer.registeredFor.map((reg, idx) => {
                      let formattedDate = "—";
                      if (reg.date) {
                        const d = new Date(reg.date);
                        if (!isNaN(d.getTime())) {
                          formattedDate = d.toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          });
                        } else {
                          formattedDate = reg.date;
                        }
                      }

                      const resultPieces = [];
                      if (reg.placement != null) {
                        resultPieces.push(`#${reg.placement}`);
                      }
                      if (reg.result) {
                        resultPieces.push(reg.result);
                      }

                      const extraEntries = Object.entries(reg.extras || {});

                      return (
                        <div
                          key={reg.id || reg.tournamentId || idx}
                          style={{
                            padding: "0.7rem 0.8rem",
                            borderBottom:
                              idx === selectedPlayer.registeredFor.length - 1
                                ? "none"
                                : "1px solid #111827",
                            fontSize: "0.85rem",
                            color: "#e5e7eb",
                          }}
                        >
                          {/* Main info */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "0.75rem",
                              marginBottom: "0.4rem",
                              flexWrap: "wrap",
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600 }}>
                                {reg.name || reg.tournamentId || "—"}
                              </div>
                              <div style={{ color: "#9ca3af" }}>
                                ID: {reg.tournamentId || reg.id || "—"}
                              </div>
                            </div>
                            <div style={{ color: "#d1d5db" }}>
                              {reg.game || "—"}
                              {reg.mode ? ` · ${reg.mode}` : ""}
                            </div>
                            <div style={{ color: "#9ca3af" }}>
                              {formattedDate}
                            </div>
                            <div style={{ color: "#fbbf24" }}>
                              {resultPieces.length > 0
                                ? resultPieces.join(" · ")
                                : "—"}
                            </div>
                          </div>

                          {/* Editable Registration Responses: ign → fullIgn → rank */}
                          <div
                            style={{
                              marginTop: "0.15rem",
                              padding: "0.45rem 0.5rem",
                              borderRadius: "6px",
                              background: "#111827",
                            }}
                          >
                            <div
                              style={{
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                fontSize: "0.75rem",
                                color: "#9ca3af",
                                marginBottom: "0.25rem",
                              }}
                            >
                              Registration Responses
                            </div>

                            <form
                              onSubmit={(e) =>
                                handleSaveRegistration(
                                  e,
                                  selectedPlayer.id,
                                  reg
                                )
                              }
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "110px minmax(0, 1fr)",
                                rowGap: "0.2rem",
                                columnGap: "0.5rem",
                                fontSize: "0.8rem",
                                marginBottom:
                                  extraEntries.length > 0 ? "0.4rem" : 0,
                              }}
                            >
                              {/* ign */}
                              <div
                                style={{
                                  display: "contents",
                                }}
                              >
                                <div
                                  style={{
                                    fontWeight: 500,
                                    color: "#d1d5db",
                                  }}
                                >
                                  ign:
                                </div>
                                <input
                                  name="ign"
                                  defaultValue={reg.ign || ""}
                                  style={{
                                    backgroundColor: "#020617",
                                    borderRadius: "0.35rem",
                                    border: "1px solid #374151",
                                    color: "white",
                                    fontSize: "0.8rem",
                                    padding: "0.2rem 0.4rem",
                                  }}
                                />
                              </div>

                              {/* fullIgn */}
                              <div style={{ display: "contents" }}>
                                <div
                                  style={{
                                    fontWeight: 500,
                                    color: "#d1d5db",
                                  }}
                                >
                                  fullIgn:
                                </div>
                                <input
                                  name="fullIgn"
                                  defaultValue={reg.fullIgn || ""}
                                  style={{
                                    backgroundColor: "#020617",
                                    borderRadius: "0.35rem",
                                    border: "1px solid #374151",
                                    color: "white",
                                    fontSize: "0.8rem",
                                    padding: "0.2rem 0.4rem",
                                  }}
                                />
                              </div>

                              {/* rank */}
                              <div style={{ display: "contents" }}>
                                <div
                                  style={{
                                    fontWeight: 500,
                                    color: "#d1d5db",
                                  }}
                                >
                                  rank:
                                </div>
                                <input
                                  name="rank"
                                  defaultValue={reg.rank || ""}
                                  style={{
                                    backgroundColor: "#020617",
                                    borderRadius: "0.35rem",
                                    border: "1px solid #374151",
                                    color: "white",
                                    fontSize: "0.8rem",
                                    padding: "0.2rem 0.4rem",
                                  }}
                                />
                              </div>

                              <div
                                style={{
                                  gridColumn: "1 / span 2",
                                  display: "flex",
                                  justifyContent: "flex-end",
                                  marginTop: "0.25rem",
                                }}
                              >
                                <button
                                  type="submit"
                                  style={{
                                    fontSize: "0.75rem",
                                    padding: "0.25rem 0.7rem",
                                    borderRadius: "0.4rem",
                                    border: "none",
                                    backgroundColor: "#f97316",
                                    color: "#111827",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  Save registration
                                </button>
                              </div>
                            </form>

                            {/* any extra fields beyond ign/fullIgn/rank */}
                            {extraEntries.length > 0 && (
                              <dl
                                style={{
                                  margin: 0,
                                  display: "grid",
                                  gridTemplateColumns:
                                    "110px minmax(0, 1fr)",
                                  rowGap: "0.12rem",
                                  columnGap: "0.5rem",
                                  fontSize: "0.8rem",
                                }}
                              >
                                {extraEntries.map(([key, value]) => (
                                  <React.Fragment key={key}>
                                    <dt
                                      style={{
                                        fontWeight: 500,
                                        color: "#d1d5db",
                                      }}
                                    >
                                      {key}:
                                    </dt>
                                    <dd
                                      style={{
                                        margin: 0,
                                        color: "#e5e7eb",
                                      }}
                                    >
                                      {typeof value === "object"
                                        ? JSON.stringify(value)
                                        : String(value)}
                                    </dd>
                                  </React.Fragment>
                                ))}
                              </dl>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
