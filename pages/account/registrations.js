// pages/account/registrations.js
import React from "react";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import styles from "../../styles/Valorant.module.css";

export async function getServerSideProps({ req, query }) {
  const cookieHeader = req.headers.cookie || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").filter(Boolean).map((c) => {
      const [k, ...rest] = c.trim().split("=");
      return [k, decodeURIComponent(rest.join("=") || "")];
    })
  );
  const playerId = cookies.playerId || null;

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

  const regs = Array.isArray(player.registeredFor) ? player.registeredFor : [];

  return {
    props: {
      registrations: regs.map((r) => ({
        id: r.id || r.tournamentId || "",
        name: r.name || "Tournament",
        game: r.game || "",
        mode: r.mode || "",
        status: r.status || "open",
        start: r.start || null,
        detailsUrl: r.detailsUrl || "/valorant",
      })),
    },
  };
}

export default function MyRegistrations({ registrations }) {
  const count = registrations.length;

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Header / hero */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroBadge}>Account</div>
            <h1 className={styles.heroTitle}>My Registrations</h1>
            <p className={styles.heroSubtitle}>
              These are the tournaments you're currently registered for.
            </p>
          </div>
        </section>

        {/* Small strip above cards */}
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
              borderRadius: "999px",
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

        {/* Cards list */}
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
                <span className="chip">{r.game}</span>
                <span className="chip">{r.mode || "—"}</span>
                <span
                  className="chip"
                  style={{
                    background: "#12331a",
                    borderColor: "#1e7f3a",
                    color: "#b6f3c8",
                  }}
                >
                  {r.status || "Open"}
                </span>
              </div>

              {/* Info grid */}
              <div className={styles.detailGrid} style={{ marginTop: 8 }}>
                <div className={styles.detailLabel}>Tournament ID</div>
                <div className={styles.detailValue}>#{r.id}</div>

                <div className={styles.detailLabel}>Starts</div>
                <div className={styles.detailValue}>
                  {r.start
                    ? new Date(r.start).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "TBD"}
                </div>

                <div className={styles.detailLabel}>Links</div>
                <div className={styles.detailValue} style={{ display: "flex", gap: 14 }}>
                  <a href={r.detailsUrl} className={styles.linkAccent}>
                    View details →
                  </a>
                  <a href="/valorant/bracket" className={styles.linkAccent}>
                    View bracket →
                  </a>
                </div>
              </div>
            </section>
          ))
        )}

        {/* Optional footer */}
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

      {/* tiny CSS helper for chips without touching your module file */}
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
