// /pages/valorant/index.js
import React, { useEffect, useState } from "react";
import styles from "../../styles/Valorant.module.css";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import { tournamentsById as catalog } from "../../lib/tournaments";

const TOURNAMENT_ID = "VALO-SOLO-SKIRMISH-1"; // keep this in sync with your catalog/key
const FALLBACK_CAPACITY = 16;

// ---------- SERVER SIDE: block page if tournament is FULL ----------
export async function getServerSideProps() {
  try {
    await connectToDatabase();

    const t = catalog[TOURNAMENT_ID];
    const capacity = t?.capacity ?? FALLBACK_CAPACITY;

    const registeredCount = await Player.countDocuments({
      "registeredFor.tournamentId": TOURNAMENT_ID,
    });

    const isFull = registeredCount >= capacity;

    if (isFull) {
      return {
        redirect: {
          destination: "/tournaments-hub/valorant-types?full=1",
          permanent: false,
        },
      };
    }

    return {
      props: {
        initialRegistered: registeredCount,
        capacity,
      },
    };
  } catch (err) {
    console.error("[/valorant] getServerSideProps error:", err);
    // Fail open if something breaks – page still loads, just without live slot count
    return {
      props: {
        initialRegistered: null,
        capacity: FALLBACK_CAPACITY,
      },
    };
  }
}

// ---------- CLIENT SIDE COMPONENT ----------
export default function ValorantEventPage({
  initialRegistered,
  capacity,
}) {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  // Slots (start from server values, optional)
  const [slotsUsed, setSlotsUsed] = useState(initialRegistered);
  const [slotsCapacity] = useState(capacity ?? FALLBACK_CAPACITY);

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        // Login + registration status
        const url = `/api/registration/status?tournamentId=${encodeURIComponent(
          TOURNAMENT_ID
        )}`;
        const res = await fetch(url, { credentials: "same-origin" });
        const data = await res.json();
        if (!ignore) {
          setLoggedIn(!!data.loggedIn);
          setIsRegistered(!!data.isRegistered);
        }

        // Optional: refresh slots from same API used on 1v1 page
        try {
          const regInfoRes = await fetch(
            `/api/tournaments/${TOURNAMENT_ID}/registrations`,
            { cache: "no-store" }
          );
          const regInfo = await regInfoRes.json();
          if (!ignore && typeof regInfo.registered === "number") {
            setSlotsUsed(regInfo.registered);
          }
        } catch (e) {
          console.error("[/valorant] slot refresh error:", e);
        }

        if (!ignore) setLoading(false);
      } catch (e) {
        console.error("[/valorant] status error:", e);
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  // Decide what the red button should do
  let registerHref = "/valorant/register";
  let registerLabel = "Register";
  let disabled = false;

  if (!loggedIn) {
    // Route through Discord, then back to the intended register page
    registerHref = `/api/auth/discord?next=${encodeURIComponent(
      "/valorant/register"
    )}`;
  } else if (isRegistered) {
    // Already registered: send them to their registrations instead
    registerHref = "/account/registrations";
    registerLabel = "View my registration";
  }

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroBadge}>VALORANT TOURNAMENT</div>
            <h1 className={styles.heroTitle}>VALORANT — Solo Skirmish #1</h1>
            <p className={styles.heroSubtitle}>
              1v1 skirmish duels. Bragging rights. Skin prize for the winner.
            </p>

            {/* Buttons */}
            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <a
                href={registerHref}
                style={{
                  display: "inline-block",
                  background: "#ff0046",
                  color: "white",
                  fontWeight: 700,
                  padding: "10px 14px",
                  borderRadius: 10,
                  textDecoration: "none",
                  boxShadow: "0 10px 30px rgba(255,0,70,0.35)",
                  opacity: loading ? 0.7 : 1,
                  pointerEvents: loading ? "none" : "auto",
                }}
                aria-disabled={disabled || loading}
                onClick={(e) => {
                  if (disabled || loading) e.preventDefault();
                }}
              >
                {loading ? "Checking status…" : registerLabel}
              </a>

              <a
                href="https://discord.gg/qUzCCK8nuc"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  background: "#2a2f3a",
                  color: "white",
                  fontWeight: 700,
                  padding: "10px 14px",
                  borderRadius: 10,
                  textDecoration: "none",
                  border: "1px solid #3a4150",
                }}
              >
                Join Discord
              </a>
            </div>
          </div>
        </section>

        {/* Quick facts */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>QUICK FACTS</h2>
          </div>
          <div className={styles.detailGrid}>
            <div className={styles.detailLabel}>Mode</div>
            <div className={styles.detailValue}>1v1 Skirmish</div>

            <div className={styles.detailLabel}>Slots</div>
            <div className={styles.detailValue}>
              {slotsUsed == null || slotsCapacity == null
                ? "16 Players"
                : `${slotsUsed} / ${slotsCapacity} Players`}
            </div>

            <div className={styles.detailLabel}>Format</div>
            <div className={styles.detailValue}>
              Best-of-1 • First to <strong>20</strong> kills •{" "}
              <strong>Win by 2</strong>
            </div>

            <div className={styles.detailLabel}>Map</div>
            <div className={styles.detailValue}>
              Randomized: Skirmish A, B, or C
            </div>

            <div className={styles.detailLabel}>Server</div>
            <div className={styles.detailValue}>NA (custom lobby)</div>

            <div className={styles.detailLabel}>Check-in</div>
            <div className={styles.detailValue}>
              15 minutes before start in Discord
            </div>

            <div className={styles.detailLabel}>Entry</div>
            <div className={styles.detailValue}>Free</div>

            <div className={styles.detailLabel}>Prize</div>
            <div className={styles.detailValue}>
              Skin (TBD) + bragging rights
            </div>
          </div>
        </section>

        {/* Format & Scoring */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>FORMAT &amp; SCORING</h2>
          </div>
          <ul className={styles.rulesList}>
            <li>
              <strong>Match:</strong> <strong>Best-of-1</strong>.
            </li>
            <li>
              <strong>Game Win Condition:</strong> First to{" "}
              <strong>20</strong> kills and must lead by{" "}
              <strong>2</strong> (win-by-two).
            </li>
            <li>
              <strong>No time cap.</strong> Play continues until win-by-two is
              achieved.
            </li>
            <li>
              <strong>Map:</strong> Randomized each match between{" "}
              <em>Skirmish A / B / C</em>.
            </li>
            <li>
              <strong>Lobby:</strong> Admin/stream host invites both players. Be
              online and ready at your match time.
            </li>
          </ul>
        </section>

        {/* Rules & Conduct */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>RULES &amp; CONDUCT</h2>
          </div>
          <ul className={styles.rulesList}>
            <li>No smurfing. No cheats, scripts, or third-party aim tools.</li>
            <li>No-shows: 5-minute grace, then you may be replaced by a sub.</li>
            <li>
              Disconnects before 3 kills → remake; after 3 kills → continue
              from score unless admin rules otherwise.
            </li>
            <li>
              Report scores in Discord with a screenshot; both players must
              confirm.
            </li>
            <li>Admins have final say on disputes.</li>
          </ul>
        </section>

        {/* Schedule & Reporting */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>SCHEDULE &amp; REPORTING</h2>
          </div>
          <div className={styles.detailGrid}>
            <div className={styles.detailLabel}>Check-in</div>
            <div className={styles.detailValue}>
              15 minutes before bracket start in <strong>#check-in</strong>
            </div>

            <div className={styles.detailLabel}>Round Pace</div>
            <div className={styles.detailValue}>
              Please be ready; matches fire back-to-back
            </div>

            <div className={styles.detailLabel}>Report</div>
            <div className={styles.detailValue}>
              Post final score + screenshot in{" "}
              <strong>#match-report</strong>
            </div>

            <div className={styles.detailLabel}>Stream</div>
            <div className={styles.detailValue}>
              Select matches may be streamed or clipped
            </div>
          </div>
        </section>

        {/* Eligibility / Registration policy */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>ELIGIBILITY &amp; REGISTRATION</h2>
          </div>
          <ul className={styles.rulesList}>
            <li>Must join Discord and respond to check-in pings.</li>
            <li>One entry per player. Duplicate entries will be removed.</li>
            <li>
              If you’ve already registered, the Register page will show you as
              locked-in automatically.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
