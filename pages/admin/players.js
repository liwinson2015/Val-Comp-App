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
    // Normalize registrations AND keep extra fields
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
        extras, // all the extra answers / responses
      };
    });

    return {
      id: String(p._id),
      discordId: p.discordId || "",
      // Try to match what /profile is showing:
      discordTag:
        p.discordTag ||
        p.username ||
        p.displayName ||
        "",

      // Avatar – support a few possible field names
      avatarUrl:
        p.avatarUrl ||
        p.avatar ||
        p.discordAvatar ||
        null,

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
        p.discordTag,
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
    <div className={styles.container} style={{ padding: "2rem 1rem" }}>
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
          placeholder="Search by Discord tag, Riot ID, IGN, or Discord ID"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            borderRadius: "4px",
            border: "1px solid #555",
            background: "#111",
            color: "#f5f5f5",
          }}
        />
        <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>
          {filteredPlayers.length} players
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.7fr)",
          gap: "1.25rem",
        }}
      >
        {/* LEFT: PLAYER LIST */}
        <div
          style={{
            border: "1px solid #333",
            borderRadius: "8px",
            overflow: "hidden",
            background: "#050509",
          }}
        >
          <div
            style={{
              padding: "0.5rem 0.75rem",
              borderBottom: "1px solid #333",
              fontSize: "0.85rem",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              opacity: 0.8,
            }}
          >
            Players
          </div>
          <div style={{ maxHeight: "420px", overflowY: "auto" }}>
            {filteredPlayers.length === 0 && (
              <div style={{ padding: "0.75rem", fontSize: "0.9rem" }}>
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
                    borderBottom: "1px solid #222",
                    padding: "0.6rem 0.75rem",
                    cursor: "pointer",
                    background: isActive ? "#1d2735" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                  }}
                >
                  {/* small avatar */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      overflow: "hidden",
                      flexShrink: 0,
                      background: "#222",
                    }}
                  >
                    {p.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.avatarUrl}
                        alt={p.discordTag || "avatar"}
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
                          fontSize: "0.75rem",
                          opacity: 0.6,
                        }}
                      >
                        ?
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span style={{ fontSize: "0.95rem", fontWeight: 500 }}>
                        {p.discordTag || "(no Discord name)"}
                      </span>
                      {p.isAdmin && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            textTransform: "uppercase",
                            border: "1px solid #f5c842",
                            padding: "0.1rem 0.35rem",
                            borderRadius: "4px",
                          }}
                        >
                          Admin
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        opacity: 0.75,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.4rem",
                      }}
                    >
                      {p.riotId && <span>Riot: {p.riotId}</span>}
                      {p.ign && <span>IGN: {p.ign}</span>}
                      {p.rank && <span>Rank: {p.rank}</span>}
                      {!p.riotId && !p.ign && !p.rank && (
                        <span style={{ opacity: 0.5 }}>(no extra info)</span>
                      )}
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
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "0.85rem 0.9rem",
            background: "#050509",
            minHeight: "260px",
          }}
        >
          {!selectedPlayer ? (
            <div>No player selected.</div>
          ) : (
            <>
              {/* Profile header (name + big avatar, like /profile) */}
              <div
                style={{
                  marginBottom: "0.75rem",
                  display: "flex",
                  gap: "0.9rem",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "16px",
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "#222",
                  }}
                >
                  {selectedPlayer.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedPlayer.avatarUrl}
                      alt={selectedPlayer.discordTag || "avatar"}
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
                        fontSize: "0.85rem",
                        opacity: 0.6,
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
                      <h2 style={{ margin: 0, fontSize: "1.1rem" }}>
                        {selectedPlayer.discordTag || "(No Discord name)"}
                      </h2>
                      {selectedPlayer.riotId && (
                        <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                          Riot ID: {selectedPlayer.riotId}
                        </div>
                      )}
                      {selectedPlayer.ign && (
                        <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                          IGN: {selectedPlayer.ign}
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        textAlign: "right",
                        fontSize: "0.8rem",
                        opacity: 0.8,
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
                        marginTop: "0.4rem",
                        fontSize: "0.8rem",
                        opacity: 0.6,
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

              {/* Registrations */}
              <div
                style={{
                  marginTop: "0.75rem",
                  borderTop: "1px solid #333",
                  paddingTop: "0.6rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.85rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    opacity: 0.75,
                    marginBottom: "0.4rem",
                  }}
                >
                  Registrations ({selectedPlayer.registeredFor.length})
                </div>

                {selectedPlayer.registeredFor.length === 0 && (
                  <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                    This player has not registered for any tournaments.
                  </div>
                )}

                {selectedPlayer.registeredFor.length > 0 && (
                  <div
                    style={{
                      maxHeight: "320px",
                      overflowY: "auto",
                      borderRadius: "4px",
                      border: "1px solid #222",
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
                            padding: "0.45rem 0.5rem",
                            borderBottom:
                              idx === selectedPlayer.registeredFor.length - 1
                                ? "none"
                                : "1px solid #222",
                          }}
                        >
                          {/* Main row */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)",
                              gap: "0.4rem",
                              fontSize: "0.8rem",
                              marginBottom:
                                extraEntries.length > 0 ? "0.3rem" : 0,
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 500 }}>
                                {reg.name || reg.tournamentId || "—"}
                              </div>
                              <div style={{ opacity: 0.7 }}>
                                ID: {reg.tournamentId || reg.id || "—"}
                              </div>
                            </div>
                            <div>
                              <div>{reg.game || "—"}</div>
                              {reg.mode && (
                                <div style={{ opacity: 0.7 }}>{reg.mode}</div>
                              )}
                            </div>
                            <div>{formattedDate}</div>
                            <div>
                              {resultPieces.length > 0
                                ? resultPieces.join(" · ")
                                : "—"}
                            </div>
                          </div>

                          {/* Extra responses / answers */}
                          {extraEntries.length > 0 && (
                            <div
                              style={{
                                marginTop: "0.15rem",
                                padding: "0.35rem 0.4rem",
                                borderRadius: "4px",
                                background: "#070713",
                                fontSize: "0.76rem",
                              }}
                            >
                              <div
                                style={{
                                  textTransform: "uppercase",
                                  letterSpacing: "0.08em",
                                  opacity: 0.7,
                                  marginBottom: "0.2rem",
                                }}
                              >
                                Registration Responses
                              </div>
                              <dl
                                style={{
                                  margin: 0,
                                  display: "grid",
                                  gridTemplateColumns: "auto 1fr",
                                  rowGap: "0.1rem",
                                  columnGap: "0.4rem",
                                }}
                              >
                                {extraEntries.map(([key, value]) => (
                                  <React.Fragment key={key}>
                                    <dt
                                      style={{
                                        opacity: 0.8,
                                        fontWeight: 500,
                                      }}
                                    >
                                      {key}:
                                    </dt>
                                    <dd
                                      style={{
                                        margin: 0,
                                        opacity: 0.95,
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
