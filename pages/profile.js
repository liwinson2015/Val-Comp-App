// pages/profile.js
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
 *   placement: 5, // 1 for champion, etc. (optional)
 *   result: "Round of 8" // optional descriptive string
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
  // (You can later populate this from your Registration/Match models.)
  const history = Array.isArray(player.registeredFor) ? player.registeredFor : [];

  // Compute simple stats from history if placement exists
  const played = history.length;
  const wins = history.filter((h) => Number(h.placement) === 1).length;
  const top4 = history.filter((h) => Number(h.placement) > 0 && Number(h.placement) <= 4).length;
  const bestFinish =
    history.reduce((best, h) => {
      const p = Number(h.placement);
      if (!p || p <= 0) return best;
      return Math.min(best, p);
    }, Infinity) || null;

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
            typeof h.placement === "number" ? h.placement : (h.placement ? Number(h.placement) : null),
          result: h.result || null,
        }))
        .sort((a, b) => {
          const da = a.date ? new Date(a.date).getTime() : 0;
          const db = b.date ? new Date(b.date).getTime() : 0;
          return db - da;
        }),
    },
  };
}

export default function Profile({ username, discordId, avatar, stats, history }) {
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
                        <div className={styles.eventSubtle}>#{h.id.toString().slice(0, 8)}</div>
                      </div>
                      <div className={styles.cell}>{h.game}</div>
                      <div className={styles.cell}>{h.mode}</div>
                      <div className={styles.cell}>{dateStr}</div>
                      <div className={styles.cell}>{h.result || "—"}</div>
                      <div className={styles.cell}>
                        {typeof h.placement === "number" ? (
                          <span className={h.placement === 1 ? styles.placementGold : styles.placement}>
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
                <a href="/tournaments-hub/valorant-types" className={styles.primaryBtn}>
                  Browse Tournaments
                </a>
                <a href="/valorant" className={styles.secondaryBtn}>
                  View Event Details
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
                  Connected as <span className={styles.mono}>{username || "Unknown"}</span>
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
          Stats update when brackets close. More analytics (W/L, K/D, streaks) coming soon.
        </div>
      </div>
    </div>
  );
}
