// pages/admin/index.js
import React from "react";
import { useRouter } from "next/router";
import styles from "../../styles/AdminDashboard.module.css";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import { getCurrentPlayerFromReq } from "../../lib/getCurrentPlayer";

// ---------- SERVER SIDE (UNTOUCHED) ----------
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

  await connectToDatabase();
  const totalPlayers = await Player.countDocuments({});
  // const totalTournaments = 0; 

  return {
    props: {
      player: {
        username: player.username,
        discordId: player.discordId,
        email: player.email || null,
      },
      stats: {
        totalPlayers,
      },
    },
  };
}

// ---------- PAGE COMPONENT ----------
export default function AdminDashboard({ player, stats }) {
  const router = useRouter();

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>
            Command Center for <span className={styles.highlight}>{player.username}</span>
          </p>
        </div>
        <div className={styles.badge}>Admin Access</div>
      </header>

      <main className={styles.grid}>
        {/* LEFT: Account Info */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
             Current Session
          </h2>
          
          <div className={styles.cardMeta}>
            <span>Username:</span> <span className={styles.bold}>{player.username}</span>
          </div>
          <div className={styles.cardMeta}>
            <span>Discord ID:</span> <span className={styles.mono}>{player.discordId}</span>
          </div>
          {player.email && (
            <div className={styles.cardMeta}>
              <span>Email:</span> <span className={styles.mono}>{player.email}</span>
            </div>
          )}

          <div className={styles.statsRow}>
            <div className={styles.statBox}>
              <div className={styles.statLabel}>Total Players</div>
              <div className={styles.statValue}>{stats.totalPlayers}</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statLabel}>Active Events</div>
              <div className={styles.statValue} style={{ color: '#64748b' }}>0</div>
            </div>
          </div>

          <div className={styles.statusList}>
            <div className={styles.statusItem}>
              <span className={styles.statusDot + " " + styles.ok} />
              Database Connected
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusDot + " " + styles.ok} />
              Admin Privileges Verified
            </div>
          </div>
        </section>

        {/* RIGHT: Actions */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Management</h2>
          <p className={styles.cardText}>
            Select an action to manage tournament data.
          </p>

          <div className={styles.buttonGrid}>
            <button
              className={styles.primaryButton}
              onClick={() => router.push("/admin/brackets")}
            >
              <span>🧩</span> Manage Brackets
            </button>

            <button
              className={styles.secondaryButton}
              onClick={() => router.push("/admin/players")}
            >
              <span>👥</span> Manage Players
            </button>

            <button className={styles.disabledButton} disabled>
              🏆 Create Tournament (Soon)
            </button>
            
            <button className={styles.disabledButton} disabled>
              📢 Broadcast (Soon)
            </button>
          </div>
          
          <div className={styles.helperText}>
            More features coming in v2.0
          </div>
        </section>
      </main>
    </div>
  );
}