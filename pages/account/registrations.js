// pages/account/registrations.js
import React from "react";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import styles from "../../styles/Valorant.module.css";
import { tournamentsById as catalog } from "../../lib/tournaments";

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .filter(Boolean)
      .map((c) => {
        const [k, ...rest] = c.trim().split("=");
        return [k, decodeURIComponent(rest.join("=") || "")];
      })
  );
}

export async function getServerSideProps({ req }) {
  const cookies = parseCookies(req.headers.cookie || "");
  const playerId = cookies.playerId || null;

  // Gate: must be logged in
  if (!playerId) {
    const next = "/account/registrations";
    return {
      redirect: {
        destination: `/api/auth/discord?next=${encodeURIComponent(next)}`,
        permanent: false,
      },
    };
  }

  await connectToDatabase();
  const player = await Player.findById(playerId).lean();

  if (!player) {
    const next = "/account/registrations";
    return {
      redirect: {
        destination: `/api/auth/discord?next=${encodeURIComponent(next)}`,
        permanent: false,
      },
    };
  }

  const rawRegs = Array.isArray(player.registeredFor) ? player.registeredFor : [];

  // Enrich from catalog (your DB only stores tournamentId, ign, rank, createdAt)
  const registrations = rawRegs.map((r) => {
    const meta = catalog[r.tournamentId] || {};
    return {
      id: r.tournamentId || "",
      name: meta.name || "Tournament",
      game: meta.game || "—",
      mode: meta.mode || "—",
      status: meta.status || "—",
      start: meta.start || null,
      detailsUrl: meta.detailsUrl || "#",
      bracketUrl: meta.bracketUrl || "#",
    };
  });

  return { props: { registrations } };
}

export default function MyRegistrations({ registrations }) {
  const count = registrations.length;

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroBadge}>Account</div>
            <h1 className={styles.heroTitle}>My Registrations</h1>
            <p className={styles.heroSubtitle}>
              These are the tournaments you're currently registered for.
            </p>
          </div>
        </section>

        {/* Section header above cards */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
            color: "#9aa2b2",
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: ".08em",
            fontWeight: 700,
          }}
        >
          <span>Current / Active</span>
          <span
            style={{
              marginLeft: 8,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 18,
              height: 18,
              borderRadius: 999,
              background: "#2a1013",
              color: "#ff8da0",
              border: "1px solid #511620",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {count}
          </span>
        </div>

        {/* List */}
        {count === 0 ? (
          <section className={styles.card}>
            <p style={{ color: "#cbd5e1", margin: 0 }}>
              You haven’t registered for any tournaments yet.
            </p>
          </section>
        ) : (
          registrations.map((r) => (
            <section key={r.id} className={styles.card}>
              <div className={styles.cardHeaderRow}>
                <h2 className={styles.cardTitle}>{r.name}</h2>
              </div>

              {/* Chips */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                {r.game && <span className="chip">{r.game}</span>}
                {r.mode && <span className="chip">{r.mode}</span>}
                {r.status && (
                  <span
                    className="chip"
                    style={{
                      background: "#12331a",
                      borderColor: "#1e7f3a",
                      color: "#b6f3c8",
                    }}
                  >
                    {r.status}
                  </span>
                )}
              </div>

              {/* Info grid */}
              <div className={styles.detailGrid} style={{ marginTop: 8 }}>
                <div className={styles.detailLabel}>Tournament ID</div>
                <div className={styles.detailValue}>#{r.id}</div>

                <div className={styles.detailLabel}>Starts</div>
                <div className={styles.detailValue}>
                  {r.start
                    ? new Date(r.start).toLocaleString("en-US", {
                        timeZone: "America/New_York", // lock display to ET
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })
                    : "TBD"}
                </div>

                <div className={styles.detailLabel}>Links</div>
                <div className={styles.detailValue} style={{ display: "flex", gap: 14 }}>
                  <a href={r.detailsUrl} className={styles.linkAccent}>
                    View details →
                  </a>
                  <a href={r.bracketUrl} className={styles.linkAccent}>
                    View bracket →
                  </a>
                </div>
              </div>
            </section>
          ))
        )}

        {/* Footer */}
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <div className={styles.footerBrand}>VALCOMP — community-run Valorant events</div>
            <div className={styles.footerSub}>
              Brackets, paid prize pools, and leaderboards coming soon.
            </div>
            <div className={styles.footerCopy}>© 2025 valcomp</div>
          </div>
        </footer>
      </div>

      {/* Tiny chip helper without editing your module */}
      <style jsx global>{`
        .chip {
          display: inline-block;
          padding: 4px 8px;
          border: 1px solid #2b2f37;
          border-radius: 999px;
          background: #1a1a1f;
          color: #e6e7eb;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
      `}</style>
    </div>
  );
}
