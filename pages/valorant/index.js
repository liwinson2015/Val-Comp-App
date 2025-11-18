// pages/valorant/index.js
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import { tournamentsById as catalog } from "../../lib/tournaments";

const TOURNAMENT_ID = "VALO-SOLO-SKIRMISH-1";
const FALLBACK_CAPACITY = 16;

// ---------- SERVER SIDE: only redirect if FULL ----------
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
    // Fail open if something goes wrong
    return {
      props: {
        initialRegistered: null,
        capacity: FALLBACK_CAPACITY,
      },
    };
  }
}

// ---------- CLIENT SIDE ----------
export default function ValorantEventPage({
  initialRegistered,
  capacity,
}) {
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const [slotsUsed, setSlotsUsed] = useState(initialRegistered);
  const [slotsCapacity] = useState(capacity ?? FALLBACK_CAPACITY);

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

        // Refresh slots from tournaments API (same as 1v1 page)
        const regInfoRes = await fetch(
          `/api/tournaments/${TOURNAMENT_ID}/registrations`,
          { cache: "no-store" }
        );
        const regInfo = await regInfoRes.json();
        if (!ignore && typeof regInfo.registered === "number") {
          setSlotsUsed(regInfo.registered);
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
  } else if (isRegistered) {
    ctaLabel = "Already registered";
    ctaHref = null;
    ctaDisabled = true;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f0f0f",
        color: "white",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Inter", Roboto, sans-serif',
        padding: "2.5rem 1rem 3rem",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: "960px" }}>
        {/* Hero banner */}
        <div
          style={{
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
        </div>

        {/* Main card */}
        <div
          style={{
            background:
              "radial-gradient(circle at 10% 0%, rgba(255,0,70,0.18) 0%, rgba(15,15,15,1) 55%)",
            borderRadius: "1.1rem",
            border: "1px solid #2d2d2d",
            boxShadow:
              "0 30px 120px rgba(255,0,70,0.25), 0 10px 40px rgba(0,0,0,.8)",
            padding: "1.75rem 1.75rem 1.5rem",
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
            {/* Left: facts */}
            <div>
              {[
                ["Format", "1v1 • Single Elimination"],
                ["Check-in", "15 min before start (Discord)"],
                ["Prize", "Skin (TBD) + bragging rights"],
                ["Server", "NA (custom lobby)"],
                ["Maps", "Skirmish A / B / C (random)"],
                ["Rules", "No smurfing • No cheats"],
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

            {/* Right: slots + CTA */}
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
                    ? "—"
                    : `${slotsUsed} / ${slotsCapacity}`}
                </div>
              </div>

              <div>
                {ctaHref ? (
                  <Link
                    href={ctaHref}
                    className="valorant-primary-btn"
                    style={{
                      display: "inline-flex",
                      justifyContent: "center",
                      alignItems: "center",
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.7rem",
                      backgroundColor: ctaDisabled ? "#4b5563" : "#ff0046",
                      color: "white",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      border: "none",
                      textDecoration: "none",
                      boxShadow: ctaDisabled
                        ? "none"
                        : "0 15px 60px rgba(255,0,70,0.5), 0 4px 20px rgba(0,0,0,.8)",
                      cursor: ctaDisabled ? "not-allowed" : "pointer",
                      opacity: ctaDisabled ? 0.6 : 1,
                      transition: "background-color .15s",
                    }}
                    aria-disabled={ctaDisabled ? "true" : "false"}
                  >
                    {ctaLabel}
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={ctaDisabled}
                    style={{
                      display: "inline-flex",
                      justifyContent: "center",
                      alignItems: "center",
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.7rem",
                      backgroundColor: ctaDisabled ? "#4b5563" : "#ff0046",
                      color: "white",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      border: "none",
                      boxShadow: ctaDisabled
                        ? "none"
                        : "0 15px 60px rgba(255,0,70,0.5), 0 4px 20px rgba(0,0,0,.8)",
                      cursor: ctaDisabled ? "not-allowed" : "pointer",
                      opacity: ctaDisabled ? 0.6 : 1,
                      transition: "background-color .15s",
                    }}
                  >
                    {ctaLabel}
                  </button>
                )}

                <p
                  style={{
                    marginTop: "0.6rem",
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
        </div>

        {/* Back link */}
        <div
          style={{
            marginTop: "1.5rem",
            fontSize: "0.8rem",
          }}
        >
          <Link
            href="/tournaments-hub/valorant-types/1v1"
            style={{
              color: "#9ca3af",
              textDecoration: "none",
            }}
          >
            ← Back to 1v1 list
          </Link>
        </div>
      </div>
    </div>
  );
}
