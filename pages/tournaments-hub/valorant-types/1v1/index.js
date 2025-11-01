// pages/tournaments-hub/valorant-types/1v1/index.js
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../../../../styles/Valorant1v1.module.css";

const TID = "VALO-SOLO-SKIRMISH-1";

export default function Valorant1v1ListPage() {
  const router = useRouter();

  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(`/api/tournaments/${TID}/registrations`, { cache: "no-store" });
        const data = await res.json();
        if (!ignore) setInfo(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  const capacity = info?.capacity ?? 16;
  const registered = info?.registered ?? 0;
  const isFull = info?.isFull || registered >= capacity;
  const statusLabel = loading ? "CHECKING…" : isFull ? "CLOSED" : "OPEN";

  const tournaments = [
    {
      id: TID,
      title: "Valorant Skirmish Tournament #1",
      host: "5TQ",
      start: "Starts November 2nd, 2025",
      format: "1v1 • Single Elimination",
      checkIn: "15 min before start (Discord)",
      prize: "Skin (TBD) + bragging rights",
      server: "NA (custom lobby)",
      maps: "Skirmish A / B / C (random)",
      rules: "No smurfing • No cheats",
      detailsUrl: "/valorant",
    },
  ];

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroBadge}>VALORANT 1v1</div>
            <h1 className={styles.heroTitle}>Upcoming 1v1 Tournaments</h1>
            <p className={styles.heroSubtitle}>
              Solo skirmish duels hosted by 5TQ. Claim your slot and climb the bracket.
            </p>
          </div>
        </section>

        {/* Panel */}
        <section className={styles.panel}>
          <div className={styles.cardGrid}>
            {tournaments.map((t) => (
              <article key={t.id} className={styles.tCard}>
                <div className={styles.tGlow} />

                <header className={styles.tHead}>
                  <span className={styles.tag}>{statusLabel}</span>
                  <h3 className={styles.tTitle}>{t.title}</h3>

                  {/* 🔵 NEW: show unique tournament ID here */}
                  <p style={{ color: "#9fb0c5", fontSize: "13px", margin: "4px 0" }}>
                    Tournament ID: <span style={{ fontWeight: 700, color: "#c9d4e6" }}>{t.id}</span>
                  </p>

                  <p className={styles.tMeta}>
                    Hosted by {t.host} • {t.start}
                  </p>
                </header>

                {/* Info rows */}
                <div className={styles.tBody}>
                  <div className={styles.factRow}>
                    <div className={styles.factLabel}>Format</div>
                    <div className={styles.factValue}>{t.format}</div>
                  </div>
                  <div className={styles.factRow}>
                    <div className={styles.factLabel}>Check-in</div>
                    <div className={styles.factValue}>{t.checkIn}</div>
                  </div>
                  <div className={styles.factRow}>
                    <div className={styles.factLabel}>Prize</div>
                    <div className={styles.factValue}>{t.prize}</div>
                  </div>
                  {/* Optional slots */}
                  <div className={styles.factRow}>
                    <div className={styles.factLabel}>Slots</div>
                    <div className={styles.factValue}>
                      {loading ? "…" : `${registered} / ${capacity}${isFull ? " • FULL" : ""}`}
                    </div>
                  </div>
                </div>

                {/* Pill row */}
                <div className={styles.pillRow}>
                  <div className={styles.pill}>{t.server}</div>
                  <div className={styles.pill}>{t.maps}</div>
                  <div className={styles.pill}>{t.rules}</div>
                </div>

                {/* Button */}
                <div className={styles.tActions}>
                  {isFull ? (
                    <span
                      className={styles.primaryBtn}
                      aria-disabled="true"
                      style={{ pointerEvents: "none", opacity: 0.6, cursor: "default" }}
                    >
                      FULL
                    </span>
                  ) : (
                    <Link href={t.detailsUrl} className={styles.primaryBtn}>
                      View details
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Back */}
        <div className={styles.backBar}>
          <button className={styles.ghostBtn} onClick={() => router.back()}>
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
