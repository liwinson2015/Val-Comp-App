// pages/tournaments/[tournamentId].js
import React, { useEffect, useState } from "react";
import styles from "../../styles/Valorant.module.css";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import Tournament from "../../models/Tournament";
import { tournamentsById as catalog } from "../../lib/tournaments";
import { getCurrentPlayerFromReq } from "../../lib/getCurrentPlayer";

const FALLBACK_CAPACITY = 16;

// Helper to format ISO-ish strings nicely; otherwise return as-is
function formatMaybeDate(input) {
  if (!input || typeof input !== "string") return input;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) {
    // not a real date, just return the original string
    return input;
  }
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: "America/New_York", // change if you want different default tz
  });
}

// ---------- SERVER SIDE: block page if FULL *and* user not registered ----------
export async function getServerSideProps({ req, params }) {
  const { tournamentId } = params;

  try {
    const player = await getCurrentPlayerFromReq(req);
    await connectToDatabase();

    // Load Tournament doc (new source of truth)
    const tournamentDoc = await Tournament.findOne({ tournamentId }).lean();

    if (!tournamentDoc) {
      return { notFound: true };
    }

    // Legacy catalog fallback (for now, while we still use lib/tournaments)
    const legacy = catalog[tournamentId] || {};

    const capacity =
      tournamentDoc.capacity ??
      legacy.capacity ??
      FALLBACK_CAPACITY;

    // How many players are currently registered?
    const registeredCount = await Player.countDocuments({
      "registeredFor.tournamentId": tournamentId,
    });

    const isFull = registeredCount >= capacity;

    // Is this logged-in player registered for THIS tournament?
    const userIsRegistered =
      !!player &&
      Array.isArray(player.registeredFor) &&
      player.registeredFor.some(
        (entry) => entry.tournamentId === tournamentId
      );

    // If full AND user is not registered → redirect away (same behavior as /valorant)
    if (isFull && !userIsRegistered) {
      return {
        redirect: {
          destination: "/tournaments-hub/valorant-types?full=1",
          permanent: false,
        },
      };
    }

    const meta = tournamentDoc.meta || {};

    // Display fields with fallback to legacy + hard-coded text
    const displayName =
      tournamentDoc.name ||
      legacy.name ||
      "Valorant Skirmish Tournament #1";

    const displaySubtitle =
      meta.displayDescription ||
      legacy.subtitle ||
      "Solo 1v1 skirmish hosted by 5TQ. Claim your slot, climb the bracket, and show off your aim.";

    const heroBadge =
      meta.displayGameLabel ||
      legacy.game ||
      "Valorant 1v1";

    // Host: meta → legacy → default "5TQ"
    const displayHost =
      meta.displayHost ||
      legacy.displayHost ||
      "5TQ";

    // Prize: read from meta, then legacy, then default
    const displayPrize =
      meta.displayPrize ||
      legacy.displayPrize ||
      "$20 Valorant Gift Card";

    // Entry / fee: meta → legacy → default
    const displayEntry =
      meta.displayEntry ||
      legacy.displayEntry ||
      "Free";

    // Nicely formatted start time:
    // prefer meta.displayTime, then legacy.start, and format either if it looks like a date
    let startsText = "TBD";

    if (meta.displayTime) {
      startsText = formatMaybeDate(meta.displayTime);
    } else if (legacy.start) {
      startsText = formatMaybeDate(legacy.start);
    } else {
      startsText = "November 2, 2025";
    }

    // Status from Tournament doc (optional for now)
    const status = tournamentDoc.status || "ongoing";

    return {
      props: {
        tournamentId,
        initialRegistered: registeredCount,
        capacity,
        displayName,
        displaySubtitle,
        heroBadge,
        startsText,
        status,
        isFull,        // initial full flag from server
        displayPrize,  // dynamic prize
        displayEntry,  // dynamic entry / fee
        displayHost,   // dynamic host
      },
    };
  } catch (err) {
    console.error("[/tournaments/[tournamentId]] getServerSideProps error:", err);
    return {
      props: {
        tournamentId,
        initialRegistered: null,
        capacity: FALLBACK_CAPACITY,
        displayName: "Valorant Skirmish Tournament",
        displaySubtitle:
          "Solo skirmish hosted by 5TQ. Claim your slot, climb the bracket, and show off your aim.",
        heroBadge: "Valorant 1v1",
        startsText: "TBD",
        status: "upcoming",
        isFull: false,
        displayPrize: "$20 Valorant Gift Card",
        displayEntry: "Free",
        displayHost: "5TQ",
      },
    };
  }
}

// ---------- CLIENT SIDE COMPONENT ----------
export default function TournamentDetailPage({
  tournamentId,
  initialRegistered,
  capacity,
  displayName,
  displaySubtitle,
  heroBadge,
  startsText,
  status,
  isFull,
  displayPrize,
  displayEntry,
  displayHost,
}) {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const [slotsUsed, setSlotsUsed] = useState(initialRegistered);
  const [slotsCapacity] = useState(capacity ?? FALLBACK_CAPACITY);

  // 🔹 dynamic path for this tournament's registration page
  const registerPath = `/tournaments/${encodeURIComponent(
    tournamentId
  )}/register`;

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        // Login + registration status
        const url = `/api/registration/status?tournamentId=${encodeURIComponent(
          tournamentId
        )}`;
        const res = await fetch(url, { credentials: "same-origin" });
        const data = await res.json();
        if (!ignore) {
          setLoggedIn(!!data.loggedIn);
          setIsRegistered(!!data.isRegistered);
        }

        // Refresh slots from registrations API
        try {
          const regInfoRes = await fetch(
            `/api/tournaments/${encodeURIComponent(
              tournamentId
            )}/registrations`,
            { cache: "no-store" }
          );
          const regInfo = await regInfoRes.json();
          if (!ignore && typeof regInfo.registered === "number") {
            setSlotsUsed(regInfo.registered);
          }
        } catch (e) {
          console.error("[tournament detail] slot refresh error:", e);
        }

        if (!ignore) setLoading(false);
      } catch (e) {
        console.error("[tournament detail] status error:", e);
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [tournamentId]);

  // Compute full status on the client as well (in case slots change)
  const effectiveIsFull =
    slotsUsed != null && slotsCapacity != null
      ? slotsUsed >= slotsCapacity
      : !!isFull;

  // Decide the status chip label + color
  let statusLabel = "OPEN";
  let statusColor = "#22c55e";

  if (status === "completed") {
    statusLabel = "COMPLETED";
    statusColor = "#9ca3af";
  } else if (effectiveIsFull) {
    statusLabel = "FULL";
    statusColor = "#f97316";
  }

  // Decide what the red button should do
  let registerHref = registerPath; // 🔹 dynamic per tournament
  let registerLabel = "Register now";
  let buttonDisabled = false;

  if (!loggedIn) {
    registerHref = `/api/auth/discord?next=${encodeURIComponent(
      registerPath
    )}`;
    registerLabel = "Log in with Discord";
  } else if (isRegistered) {
    registerHref = "/account/registrations";
    registerLabel = "View my registration";
    buttonDisabled = false;
  }

  // Override behavior if tournament is FULL or COMPLETED
  if (status === "completed") {
    registerLabel = "Tournament completed";
    buttonDisabled = true;
  } else if (effectiveIsFull && !isRegistered) {
    // full and you're not registered
    registerLabel = "Tournament full";
    buttonDisabled = true;
  }

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* HERO + MAIN CARD */}
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
            {heroBadge}
          </div>
          <h1
            style={{
              fontSize: "1.9rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              margin: 0,
            }}
          >
            {displayName}
          </h1>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "0.9rem",
              color: "#9ca3af",
            }}
          >
            {displaySubtitle}
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
                  color: statusColor,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {statusLabel}
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
                  {tournamentId}
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
              <div>Hosted by {displayHost}</div>
              <div>Starts {startsText}</div>
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
                ["Entry", displayEntry],
                ["Prize", displayPrize],
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
                    if (buttonDisabled || loading) e.preventDefault();
                  }}
                  style={{
                    display: "inline-flex",
                    justifyContent: "center",
                    alignItems: "center",
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.7rem",
                    backgroundColor:
                      buttonDisabled || loading ? "#4b5563" : "#ff0046",
                    color: "white",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    border: "none",
                    textDecoration: "none",
                    boxShadow:
                      buttonDisabled || loading
                        ? "none"
                        : "0 15px 60px rgba(255,0,70,0.5), 0 4px 20px rgba(0,0,0,.8)",
                    cursor:
                      buttonDisabled || loading ? "not-allowed" : "pointer",
                    opacity: buttonDisabled || loading ? 0.6 : 1,
                    transition: "background-color .15s",
                  }}
                  aria-disabled={buttonDisabled || loading}
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

        {/* Info sections */}
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
