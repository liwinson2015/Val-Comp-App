// pages/admin/players.js
import React, { useMemo, useState, useEffect } from "react";
import { connectToDatabase } from "../../lib/mongodb";
import { getCurrentPlayerFromReq } from "../../lib/getCurrentPlayer";
import Player from "../../models/Player";
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

  const players = rawPlayers.map((p) => {
    // ---------- build avatar URL (Discord CDN) ----------
    const avatarHash =
      p.avatar ||
      p.discordAvatar ||
      p.avatarUrl ||
      null;

    let avatarUrl = null;
    if (avatarHash && p.discordId) {
      avatarUrl = `https://cdn.discordapp.com/avatars/${p.discordId}/${avatarHash}.png?size=128`;
    } else if (typeof p.avatarUrl === "string" && p.avatarUrl.startsWith("http")) {
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
        extras,
      };
    });

    const discordName =
      p.discordTag ||
      p.username ||
      p.displayName ||
      p.globalName ||
      "";

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
      registeredFor,
    };
  });

  return {
    props: {
      players,
    },
  };
}

// ---------- CLIENT SIDE ----------
export default function AdminPlayersPage({ players }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(players[0]?.id || null);

  const filteredPlayers = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return players;

    return players.filter((p) => {
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
  }, [players, query]);

  const selectedPlayer =
    filteredPlayers.find((p) => p.id === selectedId) || filteredPlayers[0] || null;

  // If filter removed the previously selected player, update selection
  useEffect(() => {
    if (!selectedPlayer && filteredPlayers.length > 0) {
      setSelectedId(filteredPlayers[0].id);
    }
  }, [selectedPlayer, filteredPlayers]);

  return (
    <div className={styles.container} style={{ padding: "2rem 1rem", color: "#e5e7eb" }}>
      <h1 className={styles.pageTitle}>Admin · Players</h1>

      <div
        style={{
          margin: "1rem 0 1.5rem",
          display: "flex",
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
            flex: 1,
            padding: "0.55rem 0.8rem",
            borderRadius: "6px",
            border: "1px solid #4b5563",
            background: "#020617",
            color: "#f9fafb",
            fontSize: "0.9rem",
          }}
        />
        <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>
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
                      {/* intentionally empty: different games have different fields */}
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
                      <div>Discord ID: {selectedPlayer.discordId || "—"}</div>
                      {selectedPlayer.rank && <div>Rank: {selectedPlayer.rank}</div>}
                      {selectedPlayer.mmr != null && <div>MMR: {selectedPlayer.mmr}</div>}
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
                      {new Date(selectedPlayer.createdAt).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
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
                              marginBottom: extraEntries.length > 0 ? "0.35rem" : 0,
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
                            <div style={{ color: "#9ca3af" }}>{formattedDate}</div>
                            <div style={{ color: "#fbbf24" }}>
                              {resultPieces.length > 0
                                ? resultPieces.join(" · ")
                                : "—"}
                            </div>
                          </div>

                          {/* Extra responses */}
                          {extraEntries.length > 0 && (
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
                              <dl
                                style={{
                                  margin: 0,
                                  display: "grid",
                                  gridTemplateColumns: "110px minmax(0, 1fr)",
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
                            </div>
                          )}
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
