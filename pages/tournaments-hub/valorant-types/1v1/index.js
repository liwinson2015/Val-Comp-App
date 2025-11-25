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
        const res = await fetch(`/api/tournaments/${TID}/registrations`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!ignore) setInfo(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const capacity = info?.capacity ?? 16;
  const registered = info?.registered ?? 0;
  const isFull = info?.isFull || registered >= capacity;
  const statusLabel = loading ? "Checking..." : isFull ? "Closed" : "Open For Registration";

  const tournaments = [
    {
      id: TID,
      title: "Valorant Skirmish Tournament #1",
      host: "5TQ",
      start: "Nov 2, 2025",
      format: "1v1 • Single Elimination",
      checkIn: "15 min before start",
      // UPDATED PRIZE
      prize: "$20 Valorant Gift Card",
      server: "NA (Custom)",
      // UPDATED MAPS
      maps: "Skirmish A / B / C (random)",
      rules: "No Cheats",
      detailsUrl: "/valorant",
    },
  ];

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>VALORANT 1v1</div>
          <h1 className={styles.heroTitle}>Upcoming Tournaments</h1>
          <p className={styles.heroSubtitle}>
            Solo skirmish duels hosted by 5TQ. Claim your slot and climb the bracket.
          </p>
        </section>

        {/* List Panel */}
        <section className={styles.panel}>
          <div className={styles.cardGrid}>
            {tournaments.map((t) => (
              <article key={t.id} className={styles.tCard}>
                
                <header className={styles.tHead}>
                  <span className={styles.tag}>{statusLabel}</span>
                  <h3 className={styles.tTitle}>{t.title}</h3>
                  
                  <div className={styles.tID}>
                    ID: <span>{t.id}</span>
                  </div>
                  
                  <p className={styles.tMeta}>
                    Hosted by <span style={{color:'#fff'}}>{t.host}</span> • Starts {t.start}
                  </p>
                </header>

                {/* Info Grid */}
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
                  <div className={styles.factRow}>
                    <div className={styles.factLabel}>Slots</div>
                    <div className={styles.factValue}>
                      {loading
                        ? "..."
                        : <span style={{ color: isFull ? '#ef4444' : '#00c6ff' }}>
                            {registered} / {capacity} {isFull ? "(FULL)" : ""}
                          </span>
                      }
                    </div>
                  </div>
                </div>

                {/* Pills */}
                <div className={styles.pillRow}>
                  <div className={styles.pill}>{t.server}</div>
                  <div className={styles.pill}>{t.maps}</div>
                  <div className={styles.pill}>{t.rules}</div>
                </div>

                {/* Actions */}
                <div className={styles.tActions}>
                  {isFull ? (
                    <span
                      className={styles.primaryBtn}
                      style={{
                        background: "#333",
                        color: "#666",
                        cursor: "default",
                        boxShadow: "none",
                        transform: "none"
                      }}
                    >
                      Tournament Full
                    </span>
                  ) : (
                    <Link href={t.detailsUrl} className={styles.primaryBtn}>
                      View Details
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Back */}
        <div className={styles.backBar}>
          <button
            className={styles.ghostBtn}
            onClick={() => router.back()}
          >
            ← Back
          </button>
        </div>
        
      </div>
    </div>
  );
}