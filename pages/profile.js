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

  // Normalize gameProfiles into a simple shape for the client
  const rawProfiles = player.gameProfiles || {};

  function normalizeProfile(key) {
    const p = rawProfiles[key] || {};
    return {
      ign: p.ign || "",
      rankTier: p.rankTier || "",
      rankDivision: p.rankDivision || "",
      region: p.region || "",
    };
  }

  const gameProfiles = {
    valorant: normalizeProfile("VALORANT"),
    hok: normalizeProfile("HOK"),
    tft: normalizeProfile("TFT"),
  };

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
    },
  };
}

export default function Profile({
  username,
  discordId,
  avatar,
  stats,
  history,
  gameProfiles,
}) {
  const avatarUrl =
    avatar && discordId
      ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=256`
      : null;

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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "0.9rem",
            }}
          >
            <GameProfileCard
              title="VALORANT"
              description="Used for Valorant teams and tournaments."
              gameKey="VALORANT"
              initialProfile={gameProfiles.valorant}
            />
            <GameProfileCard
              title="Honor of Kings"
              description="Used for Honor of Kings (HoK) teams and tournaments."
              gameKey="HOK"
              initialProfile={gameProfiles.hok}
            />
            <GameProfileCard
              title="Teamfight Tactics"
              description="Used for TFT tournaments and events."
              gameKey="TFT"
              initialProfile={gameProfiles.tft}
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

// ---------- Subcomponent: Game Profile Card ----------
function GameProfileCard({ title, description, gameKey, initialProfile }) {
  const [form, setForm] = useState(initialProfile || {});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const isEmpty =
    !form.ign && !form.rankTier && !form.rankDivision && !form.region;

  function handleChange(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setMessage("");
    setSaving(true);

    try {
      const res = await fetch("/api/profile/game-profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          game: gameKey,
          profile: form,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setMessage(data.error || "Failed to save profile.");
      } else {
        setMessage("Profile saved.");
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
        borderRadius: "12px",
        border: "1px solid rgba(148,163,184,0.35)",
        padding: "0.75rem 0.9rem 0.8rem",
        backgroundColor: "#020617",
        display: "flex",
        flexDirection: "column",
        gap: "0.45rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "0.5rem",
          alignItems: "center",
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
            {title.toUpperCase()}
          </div>
          <div
            style={{
              fontSize: "0.8rem",
              color: "#9ca3af",
              marginTop: "0.2rem",
            }}
          >
            {description}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "0.3rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
        }}
      >
        <Field
          label="In-game name / Riot ID"
          placeholder="e.g. EDG WINSON#NA1"
          value={form.ign || ""}
          onChange={(v) => handleChange("ign", v)}
        />
        <Field
          label="Rank tier"
          placeholder="e.g. Gold, Ascendant, Master"
          value={form.rankTier || ""}
          onChange={(v) => handleChange("rankTier", v)}
        />
        <Field
          label="Rank division"
          placeholder='e.g. "1", "2", "3" or leave blank'
          value={form.rankDivision || ""}
          onChange={(v) => handleChange("rankDivision", v)}
        />
        <Field
          label="Region"
          placeholder="e.g. NA, EUW, SEA"
          value={form.region || ""}
          onChange={(v) => handleChange("region", v)}
        />
      </div>

      <div
        style={{
          marginTop: "0.3rem",
          fontSize: "0.75rem",
          color: isEmpty ? "#fbbf24" : "#9ca3af",
        }}
      >
        {isEmpty ? (
          <>
            You haven&apos;t set your {title} profile yet. Enter your info and
            we&apos;ll save it to your account and use it for teams and
            tournaments.
          </>
        ) : (
          <>
            This info comes from your {title} profile. Make sure it&apos;s
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
          {saving ? "Saving..." : "Save"}
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

// Small field helper
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
