// pages/tournaments/[tournamentId]/index.js
import React, { useEffect, useState } from "react";
import styles from "../../../styles/Valorant.module.css";
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";
import Tournament from "../../../models/Tournament";
import { tournamentsById as catalog } from "../../../lib/tournaments";
import { getCurrentPlayerFromReq } from "../../../lib/getCurrentPlayer";

const FALLBACK_CAPACITY = 16;

/** --- THEME CONFIG PER GAME --- */
const GAME_THEMES = {
  valorant: {
    key: "valorant",
    badgeBorder: "1px solid rgba(248,113,113,0.4)",
    badgeColor: "#f87171",
    badgeBg: "rgba(248,113,113,0.06)",
    cardGradient:
      "radial-gradient(circle at 10% 0%, rgba(255,0,70,0.18) 0%, rgba(15,15,15,1) 55%)",
    primaryButton: "#ff0046",
    primaryShadow:
      "0 30px 120px rgba(255,0,70,0.25), 0 10px 40px rgba(0,0,0,.8)",
  },
  tft: {
    key: "tft",
    badgeBorder: "1px solid rgba(34,197,94,0.6)",
    badgeColor: "#4ade80",
    badgeBg: "rgba(34,197,94,0.12)",
    cardGradient:
      "radial-gradient(circle at 10% 0%, rgba(34,197,94,0.22) 0%, rgba(15,15,15,1) 55%)",
    primaryButton: "#22c55e",
    primaryShadow:
      "0 30px 120px rgba(34,197,94,0.25), 0 10px 40px rgba(0,0,0,.8)",
  },
  hok: {
    key: "hok",
    badgeBorder: "1px solid rgba(56,189,248,0.6)",
    badgeColor: "#38bdf8",
    badgeBg: "rgba(56,189,248,0.12)",
    cardGradient:
      "radial-gradient(circle at 10% 0%, rgba(56,189,248,0.22) 0%, rgba(15,15,15,1) 55%)",
    primaryButton: "#38bdf8",
    primaryShadow:
      "0 30px 120px rgba(56,189,248,0.25), 0 10px 40px rgba(0,0,0,.8)",
  },
};

const DEFAULT_THEME = GAME_THEMES.valorant;

/** --- QUICK FACTS & RULES TEMPLATES PER GAME / MODE --- */
const QUICK_FACTS_TEMPLATES = {
  // Valorant 1v1 duel
  "valorant_1v1": {
    mode: "1v1 Skirmish",
    format: "Best-of-1 • First to 20 kills • Win by 2",
    map: "Randomized: Skirmish A / B / C",
    server: "NA (custom lobby)",
    checkIn: "15 minutes before start (Discord)",
  },
  // Valorant 2v2
  "valorant_2v2": {
    mode: "2v2 Wingman",
    format: "Best-of-1 or Bo3 (see Discord) • First to 9 • OT enabled",
    map: "Wingman map pool",
    server: "NA (custom lobby)",
    checkIn: "15 minutes before start (Discord)",
  },
  // Valorant 5v5
  "valorant_5v5": {
    mode: "5v5 Standard",
    format: "Competitive rules • Full team draft • Map picks / bans",
    map: "Competitive map pool",
    server: "NA (custom lobby)",
    checkIn: "30 minutes before start (Discord)",
  },
  // TFT solo
  "tft_solo": {
    mode: "TFT Solo Lobby",
    format: "Multi-lobby FFA • Points by placement • Cuts between stages",
    map: "Current TFT Set",
    server: "NA (League client)",
    checkIn: "15 minutes before first lobby (Discord)",
  },
  // TFT Double Up
  "tft_double": {
    mode: "TFT Double Up Duos",
    format: "Duos lobbies • Shared HP & econ • Points by placement",
    map: "Current TFT Set",
    server: "NA (League client)",
    checkIn: "15 minutes before first lobby (Discord)",
  },
  // Honor of Kings 5v5
  "hok_5v5": {
    mode: "5v5 Standard",
    format: "Full team draft • Best-of series • Objective-focused play",
    map: "Classic 5v5 map",
    server: "NA (Honor of Kings)",
    checkIn: "30 minutes before start (Discord)",
  },
};

const RULE_TEMPLATES = {
  // ----- VALORANT 1v1 -----
  "valorant_1v1": {
    format: [
      "Match: Best-of-1.",
      "Game Win Condition: First to 20 kills and must lead by 2 (win-by-two).",
      "No time cap. Play continues until win-by-two is achieved.",
      "Map: Randomized each match between Skirmish A / B / C.",
      "Lobby: Admin/stream host invites both players. Be online and ready at your match time.",
    ],
    conduct: [
      "No smurfing. No cheats, scripts, or third-party aim tools.",
      "No-shows: 5-minute grace, then you may be replaced by a sub.",
      "Disconnects before 3 kills → remake; after 3 kills → continue from score unless admin rules otherwise.",
      "Report scores in Discord with a screenshot; both players must confirm.",
      "Admins have final say on disputes.",
    ],
    schedule: [
      ["Check-in", "15 minutes before bracket start in #check-in"],
      ["Round Pace", "Please be ready; matches fire back-to-back"],
      ["Report", "Post final score + screenshot in #match-report"],
      ["Stream", "Select matches may be streamed or clipped"],
    ],
    eligibility: [
      "Must join Discord and respond to check-in pings.",
      "One entry per player. Duplicate entries will be removed.",
      "If you’ve already registered, the Register page will show you as locked-in automatically.",
    ],
  },

  // ----- VALORANT 2v2 -----
  "valorant_2v2": {
    format: [
      "Match: Wingman (2v2).",
      "Game Win Condition: Standard Wingman rules (see lobby / Discord).",
      "Map: From the current Wingman map pool.",
      "Lobby: Host invites both duos. Captains must be online.",
    ],
    conduct: [
      "No smurfing, cheating, or exploiting bugs.",
      "Both players on a duo must remain the same for the whole event unless approved by admins.",
      "Disconnects: pause and contact an admin; rulings may vary by round.",
      "Report scores with a screenshot in the assigned Discord channel.",
    ],
    schedule: [
      ["Check-in", "15 minutes before bracket start in #check-in"],
      ["Round Pace", "Matches run back-to-back; stay in lobby unless told otherwise"],
      ["Report", "Winning duo posts final score + screenshot in #match-report"],
      ["Stream", "Featured matches may be streamed or cast"],
    ],
    eligibility: [
      "All players must be in the 5TQ Discord.",
      "Only one account per player; account must be in good standing.",
      "Admins reserve the right to remove teams for toxicity or rule-breaking.",
    ],
  },

  // ----- VALORANT 5v5 -----
  "valorant_5v5": {
    format: [
      "Mode: 5v5 competitive-style custom lobbies.",
      "Series: Best-of-1 or Best-of-3 depending on stage (see Discord).",
      "Map Select: Veto / pick system posted in Discord before the event.",
      "Overtime: Standard competitive OT settings unless otherwise stated.",
    ],
    conduct: [
      "No cheating, scripting, or unauthorized third-party tools.",
      "Teams must have at least 4 of the original 5 players; subs require admin approval.",
      "No stream-sniping or ghosting from spectators.",
      "All disputes are handled by admins; their decision is final.",
    ],
    schedule: [
      ["Check-in", "30 minutes before match time in #team-check-in"],
      ["Lobby", "Captains will be pinged when lobbies are ready"],
      ["Reporting", "Captains report scores with screenshots in #team-report"],
      ["Stream", "Selected matches may be streamed or highlighted"],
    ],
    eligibility: [
      "Players must be in the 5TQ Discord and on a registered team.",
      "One roster per event; major roster changes mid-event are not allowed.",
      "Any unsportsmanlike behavior can result in penalties or disqualification.",
    ],
  },

  // ----- TFT SOLO -----
  "tft_solo": {
    format: [
      "Mode: Solo TFT lobbies (8 players each).",
      "Format: Multi-lobby FFA with points based on placement.",
      "Advancement: Top players after each stage advance; cuts are posted in Discord.",
      "Tiebreakers: Sum of placements, then highest single placement, then admin decision.",
    ],
    conduct: [
      "No win-trading or intentional feeding between players.",
      "No account sharing; you must play on your own account.",
      "Follow all Riot terms of service and 5TQ community rules.",
      "Report suspicious behavior to an admin with screenshots or clips.",
    ],
    schedule: [
      ["Check-in", "15 minutes before first lobby in #tft-check-in"],
      ["Lobbies", "Matches fire back-to-back; stay ready between games"],
      ["Reporting", "Lobby hosts report placements in the assigned channel"],
      ["Set / Patch", "Current live set and patch at time of event"],
    ],
    eligibility: [
      "Players must be present in the 5TQ Discord.",
      "Only one entry per player; duplicate entries will be removed.",
      "Admins may remove players for repeated no-shows or toxic behavior.",
    ],
  },

  // ----- TFT DOUBLE UP -----
  "tft_double": {
    format: [
      "Mode: TFT Double Up (Duos).",
      "Format: Duo lobbies with shared HP and units.",
      "Scoring: Points based on final duo placement in each lobby.",
      "Advancement: Top duos progress according to the format posted in Discord.",
    ],
    conduct: [
      "Duos must remain the same pair for the entire event unless admins approve a sub.",
      "No collusion or teaming with other duos beyond normal Double Up gameplay.",
      "Respect all players and staff; toxicity can result in penalties.",
    ],
    schedule: [
      ["Check-in", "15 minutes before first lobby in #tft-double-check-in"],
      ["Lobby Flow", "Admins will ping duos when lobbies are ready"],
      ["Reporting", "Lobby hosts report placements; both players should verify"],
      ["Stream", "Select duos / lobbies may be streamed"],
    ],
    eligibility: [
      "Both players must be in the 5TQ Discord.",
      "Each player may only be on one duo per event.",
      "Admins may adjust format or pacing to keep the tournament on schedule.",
    ],
  },

  // ----- HONOR OF KINGS 5v5 -----
  "hok_5v5": {
    format: [
      "Mode: 5v5 standard on the classic map.",
      "Format: Bracket-style team tournament (single or double elim as posted).",
      "Draft: Standard draft rules; bans and picks follow event rules in Discord.",
      "Side Selection: Determined by seeding or coin flip unless otherwise stated.",
    ],
    conduct: [
      "No scripts, exploits, or third-party cheating tools.",
      "Teams must maintain roster integrity; subs require admin approval.",
      "Verbal abuse, griefing, or intentional feeding will not be tolerated.",
      "All rule disputes are handled by admins; their decision is final.",
    ],
    schedule: [
      ["Check-in", "30 minutes before match time in the HOK channel"],
      ["Lobby", "Captains add admins and opponents to join the room"],
      ["Reporting", "Captains report results with screenshots after each game"],
      ["Stream", "Featured matches may be streamed or recorded"],
    ],
    eligibility: [
      "Players must be in the 5TQ Discord and queued on the correct server / region.",
      "Only registered teams with confirmed rosters may participate.",
      "Failure to check in on time may result in a forfeit.",
    ],
  },
};

/** Helper: format ISO-ish strings nicely; otherwise return as-is */
function formatMaybeDate(input) {
  if (!input || typeof input !== "string") return input;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: "America/New_York",
  });
}

/** Normalize status */
function normalizeTournamentStatus(doc) {
  const raw =
    doc.status ||
    (doc.meta && doc.meta.status) ||
    (doc.bracket && doc.bracket.status);

  if (raw === "completed") return "completed";
  return "ongoing";
}

/** Build quick facts using templates + meta overrides */
function buildQuickFacts(gameKey, modeKey, meta, displayEntry, displayPrize) {
  const rulesKey = `${gameKey}_${modeKey}`;
  const base = QUICK_FACTS_TEMPLATES[rulesKey] || QUICK_FACTS_TEMPLATES["valorant_1v1"];

  const mode = meta.displayMode || base.mode;
  const format = meta.displayFormat || base.format;
  const map = meta.displayMap || base.map;
  const server = meta.displayServer || base.server;
  const checkIn = meta.displayCheckIn || base.checkIn;

  return [
    { label: "Mode", value: mode },
    { label: "Format", value: format },
    { label: "Map", value: map },
    { label: "Server", value: server },
    { label: "Check-in", value: checkIn },
    { label: "Entry", value: displayEntry },
    { label: "Prize", value: displayPrize },
  ];
}

/** Pick rule-set for this game + mode */
function pickRules(gameKey, modeKey) {
  const key = `${gameKey}_${modeKey}`;
  return RULE_TEMPLATES[key] || RULE_TEMPLATES["valorant_1v1"];
}

// ---------- SERVER SIDE ----------
export async function getServerSideProps({ req, params }) {
  const { tournamentId } = params;

  try {
    const player = await getCurrentPlayerFromReq(req);
    await connectToDatabase();

    const tournamentDoc = await Tournament.findOne({ tournamentId }).lean();
    if (!tournamentDoc) {
      return { notFound: true };
    }

    const legacy = catalog[tournamentId] || {};

    const capacity =
      tournamentDoc.capacity ??
      legacy.capacity ??
      FALLBACK_CAPACITY;

    // registered players
    const registeredCount = await Player.countDocuments({
      "registeredFor.tournamentId": tournamentId,
    });

    const isFull = registeredCount >= capacity;

    // is current player registered here?
    const userIsRegistered =
      !!player &&
      Array.isArray(player.registeredFor) &&
      player.registeredFor.some((entry) => entry.tournamentId === tournamentId);

    // if full & not registered → bounce back to hub
    if (isFull && !userIsRegistered) {
      return {
        redirect: {
          destination: "/tournaments-hub/valorant-types?full=1",
          permanent: false,
        },
      };
    }

    const meta = tournamentDoc.meta || {};

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

    // game / mode keys for theming + rules
    const gameKey = String(tournamentDoc.game || legacy.game || "valorant").toLowerCase();
    const modeKey = String(tournamentDoc.mode || legacy.mode || "1v1").toLowerCase();

    // Host
    const displayHost =
      meta.displayHost ||
      legacy.displayHost ||
      "5TQ";

    // Prize
    const displayPrize =
      meta.displayPrize ||
      legacy.displayPrize ||
      "$20 Valorant Gift Card";

    // Entry
    const displayEntry =
      meta.displayEntry ||
      legacy.displayEntry ||
      "Free";

    // Start time
    let startsText = "TBD";
    if (meta.displayTime) {
      startsText = formatMaybeDate(meta.displayTime);
    } else if (legacy.start) {
      startsText = formatMaybeDate(legacy.start);
    } else {
      startsText = "November 2, 2025";
    }

    const status = normalizeTournamentStatus(tournamentDoc);

    const theme = GAME_THEMES[gameKey] || DEFAULT_THEME;
    const quickFacts = buildQuickFacts(
      gameKey,
      modeKey,
      meta,
      displayEntry,
      displayPrize
    );
    const rules = pickRules(gameKey, modeKey);

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
        isFull,
        displayPrize,
        displayEntry,
        displayHost,
        gameKey,
        theme,
        quickFacts,
        rules,
      },
    };
  } catch (err) {
    console.error("[/tournaments/[tournamentId]] getServerSideProps error:", err);
    const theme = DEFAULT_THEME;
    const quickFacts = buildQuickFacts(
      "valorant",
      "1v1",
      {},
      "Free",
      "$20 Valorant Gift Card"
    );
    const rules = pickRules("valorant", "1v1");

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
        status: "ongoing",
        isFull: false,
        displayPrize: "$20 Valorant Gift Card",
        displayEntry: "Free",
        displayHost: "5TQ",
        gameKey: "valorant",
        theme,
        quickFacts,
        rules,
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
  gameKey,
  theme,
  quickFacts,
  rules,
}) {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const [slotsUsed, setSlotsUsed] = useState(initialRegistered);
  const [slotsCapacity] = useState(capacity ?? FALLBACK_CAPACITY);

  const registerPath = `/tournaments/${encodeURIComponent(
    tournamentId
  )}/register`;

  const resolvedTheme = theme || DEFAULT_THEME;
  const facts = quickFacts || [];
  const ruleBlocks = rules || pickRules("valorant", "1v1");

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const url = `/api/registration/status?tournamentId=${encodeURIComponent(
          tournamentId
        )}`;
        const res = await fetch(url, { credentials: "same-origin" });
        const data = await res.json();
        if (!ignore) {
          setLoggedIn(!!data.loggedIn);
          setIsRegistered(!!data.isRegistered);
        }

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

  const effectiveIsFull =
    slotsUsed != null && slotsCapacity != null
      ? slotsUsed >= slotsCapacity
      : !!isFull;

  let statusLabel = "OPEN";
  let statusColor = "#22c55e";

  if (status === "completed") {
    statusLabel = "COMPLETED";
    statusColor = "#9ca3af";
  } else if (effectiveIsFull) {
    statusLabel = "FULL";
    statusColor = "#f97316";
  }

  let registerHref = registerPath;
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

  if (status === "completed") {
    registerLabel = "Tournament completed";
    buttonDisabled = true;
  } else if (effectiveIsFull && !isRegistered) {
    registerLabel = "Tournament full";
    buttonDisabled = true;
  }

  const shellClass = [
    styles.shell,
    gameKey === "tft" ? styles.shellTft : "",
    gameKey === "hok" ? styles.shellHok : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass}>
      <div className={styles.contentWrap}>
        {/* HERO */}
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
              border: resolvedTheme.badgeBorder,
              fontSize: "0.7rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: resolvedTheme.badgeColor,
              background: resolvedTheme.badgeBg,
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

        {/* MAIN CARD */}
        <section
          style={{
            background: resolvedTheme.cardGradient,
            borderRadius: "1.1rem",
            border: "1px solid #2d2d2d",
            boxShadow: resolvedTheme.primaryShadow,
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
            {/* Left: quick facts */}
            <div>
              {facts.map(({ label, value }) => (
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

            {/* Right: slots + CTAs */}
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
                {/* Primary button */}
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
                      buttonDisabled || loading
                        ? "#4b5563"
                        : resolvedTheme.primaryButton,
                    color: "white",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    border: "none",
                    textDecoration: "none",
                    boxShadow:
                      buttonDisabled || loading
                        ? "none"
                        : resolvedTheme.primaryShadow,
                    cursor:
                      buttonDisabled || loading ? "not-allowed" : "pointer",
                    opacity: buttonDisabled || loading ? 0.6 : 1,
                    transition: "background-color .15s",
                  }}
                  aria-disabled={buttonDisabled || loading}
                >
                  {loading ? "Checking status…" : registerLabel}
                </a>

                {/* Discord button */}
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

        {/* FORMAT & SCORING */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>FORMAT &amp; SCORING</h2>
          </div>
          <ul className={styles.rulesList}>
            {ruleBlocks.format.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>
        </section>

        {/* RULES & CONDUCT */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>RULES &amp; CONDUCT</h2>
          </div>
          <ul className={styles.rulesList}>
            {ruleBlocks.conduct.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>
        </section>

        {/* SCHEDULE & REPORTING */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>SCHEDULE &amp; REPORTING</h2>
          </div>
          <div className={styles.detailGrid}>
            {ruleBlocks.schedule.map(([label, value], idx) => (
              <React.Fragment key={idx}>
                <div className={styles.detailLabel}>{label}</div>
                <div className={styles.detailValue}>{value}</div>
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* ELIGIBILITY & REGISTRATION */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>ELIGIBILITY &amp; REGISTRATION</h2>
          </div>
          <ul className={styles.rulesList}>
            {ruleBlocks.eligibility.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
