// pages/account/registrations.js
import React, { useState } from "react";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import styles from "../../styles/Valorant.module.css";

export async function getServerSideProps({ req }) {
  // read playerId from cookie
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
    // safety net: require login, return here after
    return {
      redirect: {
        destination: "/api/auth/discord?next=/account/registrations",
        permanent: false,
      },
    };
  }

  await connectToDatabase();
  const player = await Player.findById(playerId).lean();

  if (!player) {
    return {
      redirect: {
        destination: "/api/auth/discord?next=/account/registrations",
        permanent: false,
      },
    };
  }

  const regs = Array.isArray(player.registeredFor) ? player.registeredFor : [];

  // Normalize + sort by start date if present
  const registrations = regs
    .map((r) => ({
      id: r.id || r.tournamentId || "tbd",
      name: r.name || r.tournament || "Tournament",
      game: r.game || "VALORANT",
      mode: r.mode || "—",
      status: r.status || "open",
      start: r.start || r.date || null, // ISO string if you have it
      detailsUrl:
        r.detailsUrl ||
        (r.game === "VALORANT" ? "/valorant" : "/tournaments-hub/valorant-types"),
    }))
    .sort((a, b) => {
      const da = a.start ? new Date(a.start).getTime() : 0;
      const db = b.start ? new Date(b.start).getTime() : 0;
      return da - db; // soonest first
    });

  return { props: { initialRegistrations: registrations } };
}

export default function MyRegistrations({ initialRegistrations }) {
  const [list, setList] = useState(initialRegistrations || []);
  const [busyTid, setBusyTid] = useState(null);

  async function leave(tid) {
    try {
      setBusyTid(tid);
      const res = await fetch(`/api/registrations?tid=${encodeURIComponent(tid)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to leave registration");
      setList((prev) => prev.filter((r) => r.id !== tid));
    } catch (e) {
      alert(e.message || "Could not remove registration.");
    } finally {
      setBusyTid(null);
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroBadge}>Account</div>
            <h1 className={styles.heroTitle}>My Registrations</h1>
            <p className={styles.heroSubtitle}>
              These are the tournaments you’re currently registered for.
            </p>
          </div>
        </section>

        {/* List */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>CURRENT / ACTIVE</h2>
            <span className={styles.detailValueHighlight}>{list.length}</span>
          </div>

          {!list.length ? (
            <div style={{ padding: 12, color: "#b6b8be" }}>
              You’re not registered for any upcoming events.
              <div style={{ marginTop: 10 }}>
                <a href="/tournaments-hub/valorant-types" className={styles.primaryBtn}>
                  Browse tournaments
                </a>
              </div>
            </div>
          ) : (
            <div className={styles.cardGrid}>
              {list.map((r) => {
                const dateStr = r.start
                  ? new Date(r.start).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "TBD";

                return (
                  <div key={r.id} className={styles.tCard}>
                    <div className={styles.tGlow} />
                    <div className={styles.tHead}>
                      <span className={styles.tag}>{r.game}</span>
                      <h3 className={styles.tTitle}>{r.name}</h3>
                      <p className={styles.tMeta}>
                        Mode: <strong>{r.mode}</strong> · Status:{" "}
                        <strong style={{ textTransform: "capitalize" }}>{r.status}</strong>
                      </p>
                    </div>

                    <div className={styles.tBody}>
                      <div className={styles.factRow}>
                        <div className={styles.factLabel}>Tournament ID</div>
                        <div className={styles.factValue}>#{r.id}</div>
                      </div>
                      <div className={styles.factRow}>
                        <div className={styles.factLabel}>Starts</div>
                        <div className={styles.factValue}>{dateStr}</div>
                      </div>
                      <div className={styles.factRow}>
                        <div className={styles.factLabel}>Details</div>
                        <div className={styles.factValue}>
                          <a href={r.detailsUrl} style={{ color: "#ff4655", textDecoration: "none" }}>
                            View event →
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className={styles.tActions}>
                      <a href={r.detailsUrl} className={styles.primaryBtn}>
                        View event
                      </a>
                      <button
                        onClick={() => leave(r.id)}
                        className={styles.secondaryBtn}
                        disabled={busyTid === r.id}
                        style={{ cursor: busyTid === r.id ? "wait" : "pointer" }}
                      >
                        {busyTid === r.id ? "Leaving..." : "Leave registration"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <div className={styles.footerBrand}>VALCOMP — community-run Valorant events</div>
            <div className={styles.footerSub}>Manage your entries here any time.</div>
            <div className={styles.footerCopy}>© 2025 valcomp</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
