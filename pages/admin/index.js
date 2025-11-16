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
        _id: player._id,
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

        <p>
          This is your private admin area. From here we’ll add tools to create
          tournaments, randomize brackets, and manage players.
        </p>

        <ul>
          <li>✅ Only admin accounts (isAdmin = true) can see this page</li>
          <li>❌ Non-admin accounts will be redirected to /</li>
          <li>❌ Logged-out users will be sent to Discord login</li>
        </ul>
      </div>
    </div>
  );
}
