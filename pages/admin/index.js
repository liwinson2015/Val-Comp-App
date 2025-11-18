// pages/admin/index.js
import React from "react";
import { useRouter } from "next/router";
import styles from "../../styles/AdminDashboard.module.css";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import { getCurrentPlayerFromReq } from "../../lib/getCurrentPlayer";

// ---------- SERVER SIDE ----------
export async function getServerSideProps({ req }) {
  const player = await getCurrentPlayerFromReq(req);

  if (!player) {
    const encoded = encodeURIComponent("/admin");
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

  // (Optional) you can load some basic stats later
  await connectToDatabase();
  const totalPlayers = await Player.countDocuments({});
  // const totalTournaments = 0; // placeholder for when you add tournaments

  return {
    props: {
      player: {
        username: player.username,
        discordId: player.discordId,
        email: player.email || null,
      },
      stats: {
        totalPlayers,
        // totalTournaments,
      },
    },
  };
}

// ---------- PAGE COMPONENT ----------
export default function AdminDashboard({ player, stats }) {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <p className={styles.subtitle}>
            Welcome back, <span className={styles.highlight}>{player.username}</span>
          </p>
        </div>
        <div className={styles.badge}>ADMIN</div>
      </div>

      <div className={styles.grid}>
        {/* LEFT: Admin info + system status */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Account Overview</h2>
          <p className={styles.cardText}>
            Logged in as <span className={styles.bold}>{player.username}</span>
          </p>
          <p className={styles.cardMeta}>
            Discord ID: <span className={styles.mono}>{player.discordId}</span>
          </p>
          {player.email && (
            <p className={styles.cardMeta}>
              Email: <span className={styles.mono}>{player.email}</span>
            </p>
          )}

          <div className={styles.statusList}>
            <div className={styles.statusItem}>
              <span className={styles.statusDot + " " + styles.ok} />
              Only <span className={styles.bold}>admin accounts</span> can access this page.
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusDot + " " + styles.warn} />
              Non-admin users are redirected to the home page.
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusDot + " " + styles.error} />
              Logged-out users are sent to Discord login.
            </div>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.statBox}>
              <div className={styles.statLabel}>Total Players</div>
              <div className={styles.statValue}>{stats.totalPlayers}</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statLabel}>Tournaments</div>
              <div className={styles.statValue}>coming soon</div>
            </div>
          </div>
        </section>

        {/* RIGHT: Quick actions */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Quick Actions</h2>
          <p className={styles.cardText}>
            Use these tools to manage brackets, players, and upcoming events.
          </p>

          <div className={styles.buttonGrid}>
            <button
              className={styles.primaryButton}
              onClick={() => router.push("/admin/brackets")}
            >
              🧩 Manage Brackets
            </button>

            <button
              className={styles.secondaryButton}
              onClick={() => router.push("/admin/players")}
            >
              👥 Manage Players
            </button>

            <button className={styles.disabledButton} disabled>
              🏆 Tournaments (soon)
            </button>

            <button className={styles.disabledButton} disabled>
              📢 Announcements (soon)
            </button>
          </div>

          <div className={styles.helperText}>
            Future tools will let you create tournaments, schedule matches, and
            send announcements directly to registered players.
          </div>
        </section>
      </div>
    </div>
  );
}
