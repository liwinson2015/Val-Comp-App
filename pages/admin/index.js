// pages/admin/index.js
import React from "react";
import { getCurrentPlayerFromReq } from "../../lib/getCurrentPlayer";
import styles from "../../styles/Valorant.module.css";

export async function getServerSideProps({ req }) {
  const player = await getCurrentPlayerFromReq(req);

  // 1) Not logged in → send to Discord login, then back to /admin
  if (!player) {
    return {
      redirect: {
        destination: "/api/auth/discord?next=/admin",
        permanent: false,
      },
    };
  }

  // 2) Logged in but not admin → send to home page
  if (!player.isAdmin) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  // 3) Admin → allow access
  return {
    props: {
      player: {
        _id: player._id.toString(),
        username: player.username || "",
        discordId: player.discordId || "",
      },
    },
  };
}

export default function AdminDashboard({ player }) {
  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentWrapper}>
        <h1 className={styles.pageTitle}>Admin Dashboard</h1>

        <p className={styles.subtitle}>
          Logged in as <strong>{player.username || "Unknown"}</strong> (Discord
          ID: {player.discordId || "N/A"})
        </p>

        <p style={{ marginBottom: "1.5rem" }}>
          This is your private admin area. From here we&apos;ll add tools to
          create tournaments, randomize brackets, and manage players.
        </p>

        <ul style={{ marginBottom: "2rem" }}>
          <li>✅ Only admin accounts (isAdmin = true) can see this page</li>
          <li>❌ Non-admin accounts will be redirected to /</li>
          <li>❌ Logged-out users will be sent to Discord login</li>
        </ul>

        {/* 🔥 Admin tools section */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          <a
            href="/admin/brackets"
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              background: "#1f2933",
              border: "1px solid #374151",
              color: "white",
              textDecoration: "none",
              fontSize: "0.95rem",
            }}
          >
            🧩 Manage Brackets
          </a>

          {/* placeholders for future tools */}
          <a
            href="/admin"
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              background: "#111827",
              border: "1px dashed #374151",
              color: "#9ca3af",
              textDecoration: "none",
              fontSize: "0.9rem",
              pointerEvents: "none",
            }}
          >
            (coming soon) Tournaments
          </a>
          <a
            href="/admin"
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              background: "#111827",
              border: "1px dashed #374151",
              color: "#9ca3af",
              textDecoration: "none",
              fontSize: "0.9rem",
              pointerEvents: "none",
            }}
          >
            (coming soon) Announcements
          </a>
        </div>
      </div>
    </div>
  );
}
