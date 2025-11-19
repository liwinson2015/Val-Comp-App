// pages/profile.js
import { useState } from "react";
import { connectToDatabase } from "../lib/mongodb";
import Player from "../models/Player";
import styles from "../styles/Profile.module.css";

/**
 * Expected (optional) shape for player.registeredFor items if you later populate it:
 * {
 *   id: "skirmish-1",
 *   name: "Valorant Skirmish #1",
 *   game: "VALORANT",
 *   mode: "1v1",
 *   date: "2025-11-02T23:00:00Z",
 *   placement: 5,
 *   result: "Round of 8"
 * }
 */

// ---------- Game config (UI only) ----------
const GAME_DEFS = [
  {
    code: "VALORANT",
    label: "VALORANT",
    description: "Used for Valorant teams and tournaments.",
    kind: "TAGGED_ID", // name + tag
    rankTiers: [
      "Iron",
      "Bronze",
      "Silver",
      "Gold",
      "Platinum",
      "Diamond",
      "Ascendant",
      "Immortal",
      "Radiant",
    ],
    rankDivisions: ["1", "2", "3"],
    defaultRegion: "NA",
    regions: ["NA", "EU", "APAC", "KR", "LATAM", "BR", "Other"],
  },
  {
    code: "TFT",
    label: "TEAMFIGHT TACTICS",
    description: "Used for TFT tournaments and events.",
    kind: "TAGGED_ID", // name + tag
    rankTiers: [
      "Iron",
      "Bronze",
      "Silver",
      "Gold",
      "Platinum",
      "Emerald",
      "Diamond",
      "Master",
      "Grandmaster",
      "Challenger",
    ],
    rankDivisions: ["1", "2", "3", "4"],
    defaultRegion: "NA",
    regions: ["NA", "EUW", "EUNE", "OCE", "KR", "BR", "Other"],
  },
  {
    code: "HOK",
    label: "HONOR OF KINGS",
    description: "Used for Honor of Kings teams and tournaments.",
    kind: "SINGLE_NAME", // one IGN field
    rankTiers: [
      "Bronze",
      "Silver",
      "Gold",
      "Platinum",
      "Diamond",
      "Master",
      "Grandmaster",
    ],
    // For now: 5 generic divisions per rank (you can refine later)
    rankDivisions: ["V", "IV", "III", "II", "I"],
    defaultRegion: "NA",
    regions: ["NA", "EU", "SEA", "MENA", "Other"],
  },
];

const GAME_CODES = GAME_DEFS.map((g) => g.code);

// ---------- SERVER SIDE ----------
export async function getServerSideProps({ req }) {
  // Parse cookie -> playerId
  const cookieHeader = req.headers.cookie || "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .filter(Boolean)
      .map((c) => {
        const [k, ...rest] = c.trim().split("=");
        return [k, decodeURIComponent(rest.join("=") || "")];
      })
  );

  const playerId = cookies.playerId || null;
  if (!playerId) {
    // Send user to Discord login and bounce back to /profile after
    return {
      redirect: {
        destination: "/api/auth/discord?next=/profile",
        permanent: false,
      },
    };
  }

  await connectToDatabase();
  const player = await Player.findById(playerId).lean();

  if (!player) {
    return {
      redirect: {
        destination: "/api/auth/discord?next=/profile",
        permanent: false,
      },
    };
  }

  // History source: use player.registeredFor if present.
  const history = Array.isArray(player.registeredFor)
    ? player.registeredFor
    : [];

  // Compute simple stats from history if placement exists
  const played = history.length;
  const wins = history.filter((h) => Number(h.placement) === 1).length;
  const top4 = history.filter(
    (h) => Number(h.placement) > 0 && Number(h.placement) <= 4
  ).length;
  const bestFinish =
    history.reduce((best, h) => {
      const p = Number(h.placement);
      if (!p || p <= 0) return best;
      return Math.min(best, p);
    }, Infinity) || null;

  // Normalize gameProfiles into a simple shape for the client (keyed by game code)
  const rawProfiles = player.gameProfiles || {};

  function normalizeProfile(code) {
    const p = rawProfiles[code] || {};
    return {
      ign: p.ign || "",
      rankTier: p.rankTier || "",
      rankDivision: p.rankDivision || "",
      region: p.region || "",
    };
  }

  const gameProfiles = {};
  GAME_CODES.forEach((code) => {
    gameProfiles[code] = normalizeProfile(code);
  });

  // featuredGames: keep only known games, max 3
  const rawFeatured = Array.isArray(player.featuredGames)
    ? player.featuredGames
    : [];
  const featuredGames = rawFeatured
    .filter((code) => GAME_CODES.includes(code))
    .slice(0, 3);

  return {
    props: {
      username: player.username || "",
      discordId: player.discordId || "",
      avatar: player.avatar || "",
      stats: {
        played,
        wins,
        top4,
        bestFinish: Number.isFinite(bestFinish) ? bestFinish : null,
      },
      history: history
        .map((h) => ({
          id: h.id || h.tournamentId || h.name || "tbd",
          name: h.name || h.tournament || "Tournament",
          game: h.game || "VALORANT",
          mode: h.mode || "—",
          date: h.date || h.start || null,
          placement:
            typeof h.placement === "number"
              ? h.placement
              : h.placement
              ? Number(h.placement)
              : null,
          result: h.result || null,
        }))
        .sort((a, b) => {
          const da = a.date ? new Date(a.date).getTime() : 0;
          const db = b.date ? new Date(b.date).getTime() : 0;
          return db - da;
        }),
      gameProfiles,
      initialFeaturedGames: featuredGames,
    },
  };
}

// ---------- MAIN COMPONENT ----------
export default function Profile({
  username,
  discordId,
  avatar,
  stats,
  history,
  gameProfiles,
  initialFeaturedGames,
}) {
  const avatarUrl =
    avatar && discordId
      ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=256`
      : null;

  const [profiles, setProfiles] = useState(gameProfiles || {});
  const [featuredGames, setFeaturedGames] = useState(
    initialFeaturedGames || []
  );

  // currently selected game for editor
  const [selectedGame, setSelectedGame] = useState(
    featuredGames[0] || "VALORANT"
  );

  function getGameDef(code) {
    return GAME_DEFS.find((g) => g.code === code) || GAME_DEFS[0];
  }

  function handleSelectGame(e) {
    setSelectedGame(e.target.value);
  }

  function handleProfileSaved(gameCode, profile) {
    setProfiles((prev) => ({
      ...prev,
      [gameCode]: {
        ...(prev[gameCode] || {}),
        ...profile,
      },
    }));
  }

  async function handleToggleFeatured(gameCode) {
    const already = featuredGames.includes(gameCode);
    let next;

    if (already) {
      next = featuredGames.filter((c) => c !== gameCode);
    } else {
      if (featuredGames.length >= 3) {
        alert("You can only feature up to 3 games.");
        return;
      }
      next = [...featuredGames, gameCode];
    }

    try {
      const res = await fetch("/api/profile/featured-games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ featuredGames: next }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error || "Failed to update featured games.");
        return;
      }
      setFeaturedGames(next);
    } catch (err) {
      console.error(err);
      alert("Something went wrong updating featured games.");
    }
  }

  function handleFeaturedCardClick(code) {
    setSelectedGame(code);
  }

  const selectedDef = getGameDef(selectedGame);
  const selectedProfile = profiles[selectedGame] || {
    ign: "",
    rankTier: "",
    rankDivision: "",
    region: "",
  };
  const isSelectedFeatured = featuredGames.includes(selectedGame);

  return (
    <div className={styles.shell}>
      <div className={styles.wrap}>
        {/* Hero / Header */}
        <section className={styles.headerCard}>
          <div className={styles.headerLeft}>
            <div className={styles.avatarRing}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className={styles.avatarImg} />
              ) : (
                <div className={styles.avatarFallback} />
              )}
            </div>
            <div>
              <div className={styles.badge}>PLAYER PROFILE</div>
              <h1 className={styles.title}>{username || "Unknown Player"}</h1>
              <div className={styles.subtle}>
                Discord ID: <span className={styles.mono}>{discordId}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Tournaments</div>
              <div className={styles.statValue}>{stats.played}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Wins</div>
              <div className={styles.statValue}>{stats.wins}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Top 4</div>
              <div className={styles.statValue}>{stats.top4}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Best Finish</div>
              <div className={styles.statValue}>
                {stats.bestFinish ? `#${stats.bestFinish}` : "—"}
              </div>
            </div>
          </div>
        </section>

        {/* Game Profiles */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>GAME PROFILES</h2>
          </div>
          <p
            style={{
              margin: "0 0 0.9rem",
              fontSize: "0.9rem",
              color: "#9ca3af",
            }}
          >
            These profiles store your in-game names and ranks for different
            games. We use this info to auto-fill team and tournament forms.
            Make sure it matches what you actually use in-game.
          </p>

          {/* Featured games row (player cards) */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.6rem",
              marginBottom: "0.9rem",
            }}
          >
            {featuredGames.map((code) => (
              <FeaturedGameCard
                key={code}
                code={code}
                profile={profiles[code] || {}}
                onClick={() => handleFeaturedCardClick(code)}
              />
            ))}

            {/* Empty slots up to 3 */}
            {featuredGames.length < 3 &&
              Array.from({ length: 3 - featuredGames.length }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  style={{
                    minWidth: "190px",
                    flex: "0 0 auto",
                    borderRadius: "12px",
                    border: "1px dashed rgba(148,163,184,0.5)",
                    padding: "0.55rem 0.7rem",
                    backgroundColor: "rgba(15,23,42,0.5)",
                    fontSize: "0.8rem",
                    color: "#9ca3af",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      marginBottom: "0.2rem",
                    }}
                  >
                    Empty slot
                  </div>
                  <div>
                    Choose a game in the editor below and mark it as featured to
                    show it here.
                  </div>
                </div>
              ))}
          </div>

          {/* Editor: select game + profile form */}
          <div
            style={{
              borderRadius: "10px",
              border: "1px solid rgba(148,163,184,0.35)",
              padding: "0.75rem 0.9rem 0.9rem",
              backgroundColor: "#020617",
            }}
          >
            {/* Top row: game select + featured toggle */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.6rem",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.7rem",
              }}
            >
              <div style={{ minWidth: "220px" }}>
                <label
                  htmlFor="game-select"
                  style={{
                    display: "block",
                    marginBottom: "0.15rem",
                    fontSize: "0.8rem",
                    color: "#9ca3af",
                  }}
                >
                  Select game to edit
                </label>
                <select
                  id="game-select"
                  value={selectedGame}
                  onChange={handleSelectGame}
                  style={{
                    width: "100%",
                    padding: "0.35rem 0.6rem",
                    borderRadius: "8px",
                    border: "1px solid #4b5563",
                    backgroundColor: "#020617",
                    color: "#f9fafb",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                >
                  {GAME_DEFS.map((g) => (
                    <option key={g.code} value={g.code}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleToggleFeatured(selectedGame)}
                style={{
                  padding: "0.35rem 0.8rem",
                  borderRadius: "999px",
                  border: "1px solid #facc15",
                  backgroundColor: isSelectedFeatured
                    ? "#facc15"
                    : "transparent",
                  color: isSelectedFeatured ? "#111827" : "#facc15",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {isSelectedFeatured ? "Unfeature game" : "Feature this game"}
              </button>
            </div>

            <GameProfileEditor
              key={selectedGame}
              gameDef={selectedDef}
              profile={selectedProfile}
              onProfileSaved={handleProfileSaved}
            />
          </div>
        </section>

        {/* Tournament History */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>TOURNAMENT HISTORY</h2>
            {history?.length ? (
              <span className={styles.badgeSoft}>{history.length} entries</span>
            ) : null}
          </div>

          {history?.length ? (
            <div className={styles.tableWrap}>
              <div className={styles.tableHead}>
                <div>Event</div>
                <div>Game</div>
                <div>Mode</div>
                <div>Date</div>
                <div>Result</div>
                <div>Placement</div>
              </div>
              <div className={styles.tableBody}>
                {history.map((h) => {
                  const dateStr = h.date
                    ? new Date(h.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—";
                  return (
                    <div key={h.id} className={styles.tableRow}>
                      <div className={styles.eventCell}>
                        <div className={styles.eventName}>{h.name}</div>
                        <div className={styles.eventSubtle}>
                          #{h.id.toString().slice(0, 8)}
                        </div>
                      </div>
                      <div className={styles.cell}>{h.game}</div>
                      <div className={styles.cell}>{h.mode}</div>
                      <div className={styles.cell}>{dateStr}</div>
                      <div className={styles.cell}>{h.result || "—"}</div>
                      <div className={styles.cell}>
                        {typeof h.placement === "number" ? (
                          <span
                            className={
                              h.placement === 1
                                ? styles.placementGold
                                : styles.placement
                            }
                          >
                            {`#${h.placement}`}
                          </span>
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>No tournaments yet</div>
              <div className={styles.emptyText}>
                Join your first bracket to build your competitive profile.
              </div>
              <div className={styles.emptyActions}>
                <a href="/tournaments-hub" className={styles.primaryBtn}>
                  Browse Tournaments
                </a>
              </div>
            </div>
          )}
        </section>

        {/* Linked Accounts (Discord) */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>LINKED ACCOUNTS</h2>
          </div>
          <div className={styles.linkedGrid}>
            <div className={styles.linkedItem}>
              <div className={styles.linkedIcon} aria-hidden />
              <div>
                <div className={styles.linkedLabel}>Discord</div>
                <div className={styles.linkedValue}>
                  Connected as{" "}
                  <span className={styles.mono}>{username || "Unknown"}</span>
                </div>
              </div>
            </div>
            <div className={styles.linkedRight}>
              <a
                className={styles.secondaryBtn}
                href="/api/auth/logout"
                title="Log out"
              >
                Log out
              </a>
            </div>
          </div>
        </section>

        {/* Footer-ish small print */}
        <div className={styles.mutedFoot}>
          Stats update when brackets close. More analytics (W/L, K/D, streaks)
          coming soon.
        </div>
      </div>
    </div>
  );
}

// ---------- Featured game card ----------
function FeaturedGameCard({ code, profile, onClick }) {
  const def = GAME_DEFS.find((g) => g.code === code);
  if (!def) return null;

  const ign = profile.ign || "IGN not set";
  const rank =
    profile.rankTier && profile.rankDivision
      ? `${profile.rankTier} ${profile.rankDivision}`
      : profile.rankTier || "Rank not set";
  const region = profile.region || "Region not set";

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minWidth: "190px",
        flex: "0 0 auto",
        borderRadius: "12px",
        border: "1px solid rgba(148,163,184,0.6)",
        padding: "0.55rem 0.7rem",
        background:
          "radial-gradient(circle at top left, #1f2937 0, #020617 55%, #020617 100%)",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          fontSize: "0.8rem",
          fontWeight: 600,
          letterSpacing: "0.04em",
          marginBottom: "0.15rem",
        }}
      >
        {def.label.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: "0.8rem",
          color: "#e5e7eb",
          marginBottom: "0.12rem",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {ign}
      </div>
      <div
        style={{
          fontSize: "0.75rem",
          color: "#9ca3af",
          marginBottom: "0.05rem",
        }}
      >
        {rank}
      </div>
      <div
        style={{
          fontSize: "0.7rem",
          color: "#6b7280",
        }}
      >
        {region}
      </div>
    </button>
  );
}

// ---------- Editor for a single game profile ----------
function GameProfileEditor({ gameDef, profile, onProfileSaved }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // derive initial fields based on kind
  let initialName = "";
  let initialTag = "";

  if (gameDef.kind === "TAGGED_ID") {
    if (profile.ign && profile.ign.includes("#")) {
      const idx = profile.ign.indexOf("#");
      initialName = profile.ign.slice(0, idx);
      initialTag = profile.ign.slice(idx + 1);
    } else if (profile.ign) {
      initialName = profile.ign;
      initialTag = "";
    }
  }

  const [namePart, setNamePart] = useState(initialName);
  const [tagPart, setTagPart] = useState(initialTag);
  const [singleIgn, setSingleIgn] = useState(
    gameDef.kind === "SINGLE_NAME" ? profile.ign || "" : ""
  );
  const [rankTier, setRankTier] = useState(profile.rankTier || "");
  const [rankDivision, setRankDivision] = useState(profile.rankDivision || "");
  const [region, setRegion] = useState(
    profile.region || gameDef.defaultRegion || ""
  );

  const isEmpty =
    !(profile.ign && profile.ign.trim()) &&
    !(profile.rankTier && profile.rankTier.trim()) &&
    !(profile.rankDivision && profile.rankDivision.trim()) &&
    !(profile.region && profile.region.trim());

  // whether division dropdown should be shown for current game/tier
  const showDivision =
    gameDef.rankDivisions &&
    gameDef.rankDivisions.length > 0 &&
    !(
      (gameDef.code === "VALORANT" &&
        (rankTier === "Immortal" || rankTier === "Radiant")) ||
      (gameDef.code === "TFT" &&
        (rankTier === "Master" ||
          rankTier === "Grandmaster" ||
          rankTier === "Challenger")) ||
      (gameDef.code === "HOK" && rankTier === "Grandmaster")
    );

  async function handleSave(e) {
    e.preventDefault();
    setMessage("");
    setSaving(true);

    let finalIgn = "";
    if (gameDef.kind === "TAGGED_ID") {
      const n = (namePart || "").trim();
      const t = (tagPart || "").trim();
      if (n && t) {
        finalIgn = `${n}#${t}`;
      } else if (n) {
        finalIgn = n;
      } else {
        finalIgn = "";
      }
    } else {
      finalIgn = (singleIgn || "").trim();
    }

    // Clear division for tiers that don't use it
    let finalDivision = (rankDivision || "").trim();
    if (
      (gameDef.code === "VALORANT" &&
        (rankTier === "Immortal" || rankTier === "Radiant")) ||
      (gameDef.code === "TFT" &&
        (rankTier === "Master" ||
          rankTier === "Grandmaster" ||
          rankTier === "Challenger")) ||
      (gameDef.code === "HOK" && rankTier === "Grandmaster")
    ) {
      finalDivision = "";
    }

    const payload = {
      ign: finalIgn,
      rankTier: (rankTier || "").trim(),
      rankDivision: finalDivision,
      region: (region || "").trim(),
    };

    try {
      const res = await fetch("/api/profile/game-profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          game: gameDef.code,
          profile: payload,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setMessage(data.error || "Failed to save profile.");
      } else {
        setMessage("Profile saved.");
        if (onProfileSaved) {
          onProfileSaved(gameDef.code, data.profile || payload);
        }
      }
    } catch (err) {
      console.error(err);
      setMessage("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSave}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.45rem",
      }}
    >
      <div>
        <div
          style={{
            fontSize: "0.85rem",
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          {gameDef.label.toUpperCase()}
        </div>
        <div
          style={{
            fontSize: "0.8rem",
            color: "#9ca3af",
            marginTop: "0.2rem",
          }}
        >
          {gameDef.description}
        </div>
      </div>

      {/* IGN fields */}
      {gameDef.kind === "TAGGED_ID" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr auto 1fr",
            gap: "0.4rem",
            alignItems: "flex-end",
            marginTop: "0.2rem",
          }}
        >
          <Field
            label="Name"
            placeholder="EDG WINSON"
            value={namePart}
            onChange={setNamePart}
          />
          <div
            style={{
              textAlign: "center",
              paddingBottom: "0.4rem",
              fontSize: "1rem",
              color: "#9ca3af",
            }}
          >
            #
          </div>
          <Field
            label="Tag"
            placeholder="NA1"
            value={tagPart}
            onChange={setTagPart}
          />
        </div>
      ) : (
        <div style={{ marginTop: "0.2rem" }}>
          <Field
            label="In-game name"
            placeholder="Your HoK name"
            value={singleIgn}
            onChange={setSingleIgn}
          />
        </div>
      )}

      {/* Rank + region row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: showDivision
            ? "minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1.3fr)"
            : "minmax(0, 2fr) minmax(0, 1.3fr)",
          gap: "0.5rem",
          marginTop: "0.1rem",
        }}
      >
        <SelectField
          label="Rank tier"
          value={rankTier}
          onChange={setRankTier}
          options={gameDef.rankTiers}
          placeholder="Select rank"
        />
        {showDivision && (
          <SelectField
            label="Division"
            value={rankDivision}
            onChange={setRankDivision}
            options={gameDef.rankDivisions}
            placeholder="—"
            allowEmpty
          />
        )}

        {gameDef.regions && gameDef.regions.length > 0 ? (
          <SelectField
            label={gameDef.code === "HOK" ? "Server" : "Region"}
            value={region}
            onChange={setRegion}
            options={gameDef.regions}
            placeholder="Select"
          />
        ) : (
          <Field
            label="Region"
            placeholder="e.g. NA, EUW, SEA"
            value={region}
            onChange={setRegion}
          />
        )}
      </div>

      <div
        style={{
          marginTop: "0.25rem",
          fontSize: "0.75rem",
          color: isEmpty ? "#fbbf24" : "#9ca3af",
        }}
      >
        {isEmpty ? (
          <>
            You haven&apos;t set your {gameDef.label} profile yet. Enter your
            info and we&apos;ll save it to your account and use it for teams and
            tournaments.
          </>
        ) : (
          <>
            This info comes from your {gameDef.label} profile. Make sure it&apos;s
            correct – if it&apos;s wrong, you might not be able to play. Any
            changes here will also update your profile.
          </>
        )}
      </div>

      <div
        style={{
          marginTop: "0.4rem",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "0.35rem 0.85rem",
            borderRadius: "999px",
            border: "none",
            background:
              "linear-gradient(135deg, #22c55e 0%, #16a34a 40%, #0f172a 100%)",
            color: "#f9fafb",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: saving ? "default" : "pointer",
            opacity: saving ? 0.75 : 1,
          }}
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
        {message && (
          <span
            style={{
              fontSize: "0.75rem",
              color: message.includes("saved") ? "#bbf7d0" : "#fecaca",
            }}
          >
            {message}
          </span>
        )}
      </div>
    </form>
  );
}

// ---------- Small helpers ----------
function Field({ label, value, onChange, placeholder }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.15rem",
        fontSize: "0.8rem",
      }}
    >
      <span style={{ color: "#e5e7eb" }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "0.35rem 0.55rem",
          borderRadius: "8px",
          border: "1px solid #4b5563",
          backgroundColor: "#020617",
          color: "#f9fafb",
          fontSize: "0.8rem",
          outline: "none",
        }}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  allowEmpty,
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.15rem",
        fontSize: "0.8rem",
      }}
    >
      <span style={{ color: "#e5e7eb" }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "0.35rem 0.55rem",
          borderRadius: "8px",
          border: "1px solid #4b5563",
          backgroundColor: "#020617",
          color: "#f9fafb",
          fontSize: "0.8rem",
          outline: "none",
        }}
      >
        {allowEmpty ? (
          <option value="">{placeholder || "—"}</option>
        ) : (
          <option value="">{placeholder || "Select"}</option>
        )}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
