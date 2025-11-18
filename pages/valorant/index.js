// pages/valorant/index.js
import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../../styles/Valorant.module.css";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import { tournamentsById as catalog } from "../../lib/tournaments";

const TOURNAMENT_ID = "VALO-SOLO-SKIRMISH-1";

// ---------- SERVER SIDE: only redirect if FULL ----------
export async function getServerSideProps() {
  try {
    await connectToDatabase();

    // capacity from your catalog if present, otherwise 16
    const t = catalog[TOURNAMENT_ID];
    const capacity = t?.capacity ?? 16;

    const registeredCount = await Player.countDocuments({
      "registeredFor.tournamentId": TOURNAMENT_ID,
    });

    const isFull = registeredCount >= capacity;

    if (isFull) {
      // Tournament full → don't allow manual entry to this page
      return {
        redirect: {
          destination: "/tournaments-hub/valorant-types?full=1",
          permanent: false,
        },
      };
    }

    // Not full → let the page render, with current slots info
    return {
      props: {
        initialRegistered: registeredCount,
        capacity,
      },
    };
  } catch (err) {
    console.error("[/valorant] getServerSideProps error:", err);
    // Fail open: if the check breaks, still show the page
    return {
      props: {
        initialRegistered: null,
        capacity: null,
        error: true,
      },
    };
  }
}

// ---------- CLIENT SIDE PAGE ----------
export default function ValorantEventPage({
  initialRegistered,
  capacity,
  error,
}) {
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  // Optional: keep a slots display, seeded from server
  const [slotsUsed, setSlotsUsed] = useState(initialRegistered);
  const [slotsCapacity] = useState(capacity ?? 16);

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        // Check login + registration status for this tournament
        const statusUrl = `/api/registration/status?tournamentId=${encodeURIComponent(
          TOURNAMENT_ID
        )}`;
        const statusRes = await fetch(statusUrl, {
          credentials: "same-origin",
        });
        const statusData = await statusRes.json();

        if (!ignore) {
          setLoggedIn(!!statusData.loggedIn);
          setIsRegistered(!!statusData.isRegistered);
        }

        // Optionally refresh slots from the same API used on the 1v1 list
        const regInfoRes = await fetch(
          `/api/tournaments/${TOURNAMENT_ID}/registrations`,
          { cache: "no-store" }
        );
        const regInfo = await regInfoRes.json();
        if (!ignore) {
          if (typeof regInfo.registered === "number") {
            setSlotsUsed(regInfo.registered);
          }
        }

        if (!ignore) setLoadingStatus(false);
      } catch (e) {
        console.error("[/valorant] client status error:", e);
        if (!ignore) setLoadingStatus(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  const isChecking = loadingStatus;
  const isErrored = !!error;

  // CTA button logic
  let ctaLabel = "Register now";
  let ctaHref = "/valorant/register";
  let ctaDisabled = false;

  if (isChecking) {
    ctaLabel = "Checking status…";
    ctaHref = null;
    ctaDisabled = true;
  } else if (!loggedIn) {
    ctaLabel = "Log in with Discord";
    const next = encodeURIComponent("/valorant");
    ctaHref = `/api/auth/discord?next=${next}`;
    ctaDisabled = false;
  } else if (isRegistered) {
    ctaLabel = "Already registered";
    ctaHref = null;
    ctaDisabled = true;
  }

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Hero / Header */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroBadge}>VALORANT 1v1</div>
            <h1 className={styles.heroTitle}>Valorant Skirmish Tournament #1</h1>
            <p className={styles.heroSubtitle}>
              Solo 1v1 skirmish hosted by 5TQ. Claim your slot, climb the
              bracket, and show off your aim.
            </p>
          </div>
        </section>

        {/* Main card */}
        <section className={styles.panel}>
          <article className={styles.mainCard}>
            <div className={styles.cardGlow} />

            <header className={styles.cardHead}>
              <div className={styles.cardStatusRow}>
                <span className={styles.tag}>OPEN</span>
                <span className={styles.tournamentId}>
                  Tournament ID:{" "}
                  <strong className={styles.tournamentIdValue}>
                    {TOURNAMENT_ID}
                  </strong>
                </span>
              </div>
              <p className={styles.cardMeta}>
                Hosted by 5TQ • Starts November 2nd, 2025
              </p>
            </header>

            <div className={styles.cardBody}>
              {/* Left column info */}
              <div className={styles.infoCol}>
                <div className={styles.factRow}>
                  <div className={styles.factLabel}>Format</div>
                  <div className={styles.factValue}>
                    1v1 • Single Elimination
                  </div>
                </div>
                <div className={styles.factRow}>
                  <div className={styles.factLabel}>Check-in</div>
                  <div className={styles.factValue}>
                    15 min before start (Discord)
                  </div>
                </div>
                <div className={styles.factRow}>
                  <div className={styles.factLabel}>Prize</div>
                  <div className={styles.factValue}>
                    Skin (TBD) + bragging rights
                  </div>
                </div>
                <div className={styles.factRow}>
                  <div className={styles.factLabel}>Server</div>
                  <div className={styles.factValue}>NA (custom lobby)</div>
                </div>
                <div className={styles.factRow}>
                  <div className={styles.factLabel}>Maps</div>
                  <div className={styles.factValue}>
                    Skirmish A / B / C (random)
                  </div>
                </div>
                <div className={styles.factRow}>
                  <div className={styles.factLabel}>Rules</div>
                  <div className={styles.factValue}>
                    No smurfing • No cheats
                  </div>
                </div>
              </div>

              {/* Right column: slots + CTA */}
              <div className={styles.sideCol}>
                <div className={styles.slotsBox}>
                  <div className={styles.slotsLabel}>Slots</div>
                  <div className={styles.slotsValue}>
                    {slotsUsed == null || slotsCapacity == null
                      ? "—"
                      : `${slotsUsed} / ${slotsCapacity}`}
                  </div>
                  {isErrored && (
                    <div className={styles.slotsNote}>
                      (Could not refresh status; values may be slightly stale.)
                    </div>
                  )}
                </div>

                <div className={styles.ctaWrap}>
                  {ctaHref ? (
                    <Link
                      href={ctaHref}
                      className={styles.primaryBtn}
                      aria-disabled={ctaDisabled ? "true" : "false"}
                      style={
                        ctaDisabled
                          ? {
                              pointerEvents: "none",
                              opacity: 0.7,
                              cursor: "default",
                            }
                          : undefined
                      }
                    >
                      {ctaLabel}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      disabled={ctaDisabled}
                      style={
                        ctaDisabled
                          ? {
                              pointerEvents: "none",
                              opacity: 0.7,
                              cursor: "default",
                            }
                          : undefined
                      }
                    >
                      {ctaLabel}
                    </button>
                  )}

                  <p className={styles.smallNote}>
                    You&apos;ll need to log in with Discord to secure your slot.
                    No alt accounts, smurfing, or cheating allowed.
                  </p>
                </div>
              </div>
            </div>
          </article>
        </section>

        {/* Back link */}
        <div className={styles.backBar}>
          <Link
            href="/tournaments-hub/valorant-types/1v1"
            className={styles.ghostBtn}
          >
            ← Back to 1v1 list
          </Link>
        </div>
      </div>
    </div>
  );
}
