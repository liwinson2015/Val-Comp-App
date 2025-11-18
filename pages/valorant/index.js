// /pages/valorant/index.js
import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../../styles/Valorant.module.css";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import { tournamentsById as catalog } from "../../lib/tournaments";

const TOURNAMENT_ID = "VALO-SOLO-SKIRMISH-1";
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

        // Optional: refresh slots from same API used on 1v1 list
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
  let registerLabel = "Register now";
  let disabled = false;

  if (!loggedIn) {
    registerHref = `/api/auth/discord?next=${encodeURIComponent(
      "/valorant/register"
    )}`;
    registerLabel = "Log in with Discord";
  } else if (isRegistered) {
    registerHref = "/account/registrations";
    registerLabel = "View my registration";
    disabled = false;
  }

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* HERO + NEW MAIN CARD */}
        <section
          style={{
            marginTop: "2.5rem",
            marginBottom: "1.75rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              padding: "0.2rem 0.9rem",
              borderRadius: "999px",
              border: "1px solid rgba(248,113,113,0.4)",
              fontSize: "0.7rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#f87171",
              marginBottom: "0.6rem",
            }}
          >
            Valorant 1v1
          </div>
          <h1
            style={{
              fontSize: "1.9rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              margin: 0,
            }}
          >
            Valorant Skirmish Tournament #1
          </h1>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "0.9rem",
              color: "#9ca3af",
            }}
          >
            Solo 1v1 skirmish hosted by 5TQ. Claim your slot, climb the bracket,
            and show off your aim.
          </p>
        </section>

        <section
          style={{
            background:
              "radial-gradient(circle at 10% 0%, rgba(255,0,70,0.18) 0%, rgba(15,15,15,1) 55%)",
            borderRadius: "1.1rem",
            border: "1px solid #2d2d2d",
            boxShadow:
              "0 30px 120px rgba(255,0,70,0.25), 0 10px 40px rgba(0,0,0,.8)",
            padding: "1.75rem 1.75rem 1.5rem",
            marginBottom: "2rem",
          }}
        >
          {/* Top row: status + meta */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "1.25rem",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#22c55e",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                OPEN
              </div>
              <div
                style={{
                  fontSize: "0.78rem",
                  marginTop: "0.15rem",
                  color: "#e5e7eb",
                }}
              >
                Tournament ID:{" "}
                <span style={{ fontWeight: 700, color: "#f9fafb" }}>
                  {TOURNAMENT_ID}
                </span>
              </div>
            </div>

            <div
              style={{
                textAlign: "right",
                fontSize: "0.8rem",
                color: "#9ca3af",
              }}
            >
              <div>Hosted by 5TQ</div>
              <div>Starts November 2nd, 2025</div>
            </div>
          </div>

          {/* Middle: info grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1.1fr)",
              gap: "1.5rem",
              alignItems: "flex-start",
            }}
          >
            {/* Left: condensed quick facts */}
            <div>
              {[
                ["Mode", "1v1 Skirmish"],
                [
                  "Format",
                  "Best-of-1 • First to 20 kills • Win by 2",
                ],
                ["Map", "Randomized: Skirmish A / B / C"],
                ["Server", "NA (custom lobby)"],
                ["Check-in", "15 minutes before start (Discord)"],
                ["Entry", "Free"],
                ["Prize", "Skin (TBD) + bragging rights"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.25rem 0",
                    fontSize: "0.86rem",
                  }}
                >
                  <span style={{ color: "#9ca3af" }}>{label}</span>
                  <span style={{ color: "#e5e7eb", marginLeft: "1rem" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Right: slots + CTA & Discord */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                gap: "0.9rem",
              }}
            >
              <div
                style={{
                  backgroundColor: "#111827",
                  borderRadius: "0.75rem",
                  padding: "0.8rem 0.85rem",
                  border: "1px solid #1f2937",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "#9ca3af",
                    marginBottom: "0.25rem",
                  }}
                >
                  Slots
                </div>
                <div
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: "#f9fafb",
                  }}
                >
                  {slotsUsed == null || slotsCapacity == null
                    ? "16 / 16"
                    : `${slotsUsed} / ${slotsCapacity}`}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.55rem",
                }}
              >
                {/* Red primary button */}
                <a
                  href={registerHref}
                  onClick={(e) => {
                    if (disabled || loading) e.preventDefault();
                  }}
                  style={{
                    display: "inline-flex",
                    justifyContent: "center",
                    alignItems: "center",
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.7rem",
                    backgroundColor: disabled || loading ? "#4b5563" : "#ff0046",
                    color: "white",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    border: "none",
                    textDecoration: "none",
                    boxShadow:
                      disabled || loading
                        ? "none"
                        : "0 15px 60px rgba(255,0,70,0.5), 0 4px 20px rgba(0,0,0,.8)",
                    cursor:
                      disabled || loading ? "not-allowed" : "pointer",
                    opacity: disabled || loading ? 0.6 : 1,
                    transition: "background-color .15s",
                  }}
                  aria-disabled={disabled || loading}
                >
                  {loading ? "Checking status…" : registerLabel}
                </a>

                {/* Gray Discord button */}
                <a
                  href="https://discord.gg/qUzCCK8nuc"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    justifyContent: "center",
                    alignItems: "center",
                    width: "100%",
                    padding: "0.7rem 1rem",
                    borderRadius: "0.7rem",
                    backgroundColor: "#1f2937",
                    color: "white",
                    fontWeight: 600,
                    fontSize: "0.86rem",
                    border: "1px solid #374151",
                    textDecoration: "none",
                    cursor: "pointer",
                  }}
                >
                  Join Discord
                </a>

                <p
                  style={{
                    marginTop: "0.2rem",
                    fontSize: "0.75rem",
                    color: "#9ca3af",
                    lineHeight: 1.4,
                  }}
                >
                  You&apos;ll need to log in with Discord to secure your slot.
                  No alt accounts, smurfing, or cheating allowed.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* BELOW: old detailed sections, but under the new hero/card */}

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
