// pages/index.js
import React from "react";
import styles from "../styles/Valorant.module.css";
import { connectToDatabase } from "../lib/mongodb";
import Player from "../models/Player";
import TournamentState from "../models/TournamentState";

const DEFAULT_MAX_SLOTS = 16;

export async function getServerSideProps() {
  await connectToDatabase();

  // 1) Find the currently featured tournament (if any)
  const state = await TournamentState.findOne({ isFeatured: true }).lean();

  if (!state) {
    // No featured tournament at all
    return { props: { featured: null } };
  }

  const tournamentId = state.tournamentId;

  // 2) Count registrations for this tournament
  const currentCount = await Player.countDocuments({
    "registeredFor.tournamentId": tournamentId,
  });

  // Allow capacity override from state if you ever add it
  const maxSlots =
    typeof state.maxSlots === "number" && state.maxSlots > 0
      ? state.maxSlots
      : DEFAULT_MAX_SLOTS;

  // 🔹 Normalize status so we only ever have "ongoing" or "completed"
  const rawStatus = state.status || "ongoing";
  const normalizedStatus =
    rawStatus === "completed" ? "completed" : "ongoing";

  const featured = {
    tournamentId,
    currentCount: Number(currentCount) || 0,
    maxSlots: Number(maxSlots) || DEFAULT_MAX_SLOTS,
    status: normalizedStatus, // "ongoing" | "completed"

    // Homepage display fields (may be empty)
    displayName: state.displayName || "",
    displayDescription: state.displayDescription || "",
    displayTime: state.displayTime || "",
    displayGameLabel: state.displayGameLabel || "",
    displayModeLabel: state.displayModeLabel || "",
    ctaPath: state.ctaPath || "",
  };

  return { props: { featured } };
}

export default function HomePage({ featured }) {
  const hasFeatured = !!featured;

  const currentCount = hasFeatured ? featured.currentCount : 0;
  const maxSlots = hasFeatured ? featured.maxSlots : DEFAULT_MAX_SLOTS;

  const isFull = hasFeatured && currentCount >= maxSlots;
  const status = hasFeatured ? featured.status : null; // "ongoing" | "completed" | null

  // ----- STATUS TEXT + COLOR (only ongoing / completed) -----
  let statusText;
  if (!hasFeatured) {
    statusText = "COMING SOON";
  } else if (status === "completed") {
    statusText = "COMPLETED";
  } else if (isFull) {
    statusText = "FULL / CLOSED";
  } else {
    // ongoing and not full
    statusText = "OPEN ENTRY";
  }

  let statusColor;
  if (!hasFeatured) {
    statusColor = "#eab308"; // yellow
  } else if (status === "completed") {
    statusColor = "#9ca3af"; // gray
  } else if (isFull) {
    statusColor = "#ff4655"; // red
  } else {
    // ongoing + open
    statusColor = "#4ade80"; // green
  }

  const slotsText = hasFeatured ? `${currentCount} / ${maxSlots}` : "-- / --";
  const playersText = hasFeatured
    ? `${currentCount} REGISTERED`
    : "COMING SOON";

  // ----- TEXT WHEN THERE IS / ISN'T A FEATURED TOURNAMENT -----

  // Title of the big card
  const titleText = hasFeatured
    ? featured.displayName || "SOLO SKIRMISH #1"
    : "NEXT BRACKET COMING SOON";

  // Subtitle line
  const descriptionText = hasFeatured
    ? featured.displayDescription ||
      "Double elimination bracket. Winner takes all. Screenshot score verification required."
    : "We’re lining up the next community tournament. Check back soon or follow announcements on Discord.";

  // Start time text
  const startTimeText = hasFeatured
    ? featured.displayTime || "NOV 2 • 7PM ET"
    : "TBD";

  // Chip in the top right of the card
  const gameLabel = hasFeatured
    ? featured.displayGameLabel || "VALORANT"
    : "TBA";

  const modeLabel = hasFeatured
    ? featured.displayModeLabel || "1v1"
    : "SOON";

  const pillText = hasFeatured
    ? `${gameLabel.toUpperCase()} • ${modeLabel}`
    : "COMING SOON";

  // Only allow registration if ongoing + not full
  const canRegister =
    hasFeatured && status === "ongoing" && !isFull;

  // CTA: prefer explicit ctaPath, otherwise go to the dynamic tournament page
  const ctaHref = hasFeatured
    ? featured.ctaPath || `/tournaments/${featured.tournamentId}`
    : "/tournaments-hub/valorant-types/1v1";

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* HERO SECTION */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>COMPETITIVE BRACKETS</div>
          <h1 className={styles.heroTitle}>PLAY. COMPETE. CLIMB.</h1>
          <p className={styles.heroSubtitle}>
            Community tournaments hosted by 5TQ. <br />
            Battle for skins, RP, and glory in a live bracket environment.
          </p>

          <div className={styles.heroStats}>
            <div>
              <span className={styles.heroStatLabel}>LIVE COUNT</span>
              <span className={styles.heroStatValue}>{playersText}</span>
            </div>
            <div>
              <span className={styles.heroStatLabel}>ACTIVE TITLES</span>
              <span className={styles.heroStatValue}>
                VALORANT // TFT
              </span>
            </div>
            <div>
              <span className={styles.heroStatLabel}>PRIZE POOL</span>
              <span className={styles.heroStatValue}>
                SKINS / GIFT CARDS
              </span>
            </div>
          </div>
        </section>

        {/* FEATURED + UPCOMING GRID */}
        <section className={styles.cardGrid}>
          {/* LEFT: Featured Tournament */}
          <div className={styles.featuredColumn}>
            <div className={styles.cardHeaderRow}>
              <h2 className={styles.cardTitle}>FEATURED EVENT</h2>
              <span className={styles.gamePill}>{pillText}</span>
            </div>

            <h3 className={styles.featuredTitle}>{titleText}</h3>
            <p className={styles.featuredSubtitle}>{descriptionText}</p>

            <div className={styles.featuredMetaRow}>
              <div>
                <div className={styles.metaLabel}>STATUS</div>
                <div
                  className={styles.metaValue}
                  style={{
                    color: statusColor,
                  }}
                >
                  {statusText}
                </div>
              </div>
              <div>
                <div className={styles.metaLabel}>START TIME</div>
                <div className={styles.metaValue}>{startTimeText}</div>
              </div>
              <div>
                <div className={styles.metaLabel}>SLOTS</div>
                <div className={styles.metaValue}>{slotsText}</div>
              </div>
            </div>

            <div className={styles.featuredActions}>
              {canRegister ? (
                <a href={ctaHref} className={styles.heroPrimary}>
                  <span>CLAIM YOUR SPOT</span>
                </a>
              ) : (
                <button
                  className={`${styles.heroPrimary} ${styles.heroPrimaryDisabled}`}
                  disabled
                >
                  <span>
                    {hasFeatured
                      ? status === "completed"
                        ? "BRACKET COMPLETED"
                        : isFull
                        ? "BRACKET FULL"
                        : "REGISTRATION CLOSED"
                      : "COMING SOON"}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: Upcoming List */}
          <div className={styles.upcomingColumn}>
            <div className={styles.cardHeaderRow}>
              <h2 className={styles.cardTitle}>IN THE PIPELINE</h2>
            </div>

            <ul className={styles.eventList}>
              <li className={styles.eventItem}>
                <div className={styles.eventGame}>TEAMFIGHT TACTICS</div>
                <div className={styles.eventMain}>Weekly TFT Showdown</div>
                <div className={styles.eventMeta}>Free for all • Date TBD</div>
              </li>
              <li className={styles.eventItem}>
                <div className={styles.eventGame}>COMMUNITY VOTE</div>
                <div className={styles.eventMain}>
                  Next Title Selection
                </div>
                <div className={styles.eventMeta}>
                  Voting happens on Discord
                </div>
              </li>
            </ul>
          </div>
        </section>

        {/* BOTTOM GRID */}
        <section className={styles.bottomGrid}>
          <section className={styles.howCard}>
            <div className={styles.cardHeaderRow}>
              <h2 className={styles.cardTitle}>PROTOCOL</h2>
            </div>
            <ul className={styles.rulesList}>
              <li>Link your Discord account for match coordination.</li>
              <li>Select an active tournament and register.</li>
              <li>Check-in 15 minutes prior to match start.</li>
              <li>Submit screenshot proof of victory.</li>
              <li>Prizes distributed via Discord within 24h.</li>
            </ul>
          </section>

          <section className={styles.gamesCard}>
            <div className={styles.cardHeaderRow}>
              <h2 className={styles.cardTitle}>ACTIVE GAMES</h2>
            </div>
            <div className={styles.gamesRow}>
              <div className={styles.gameTag}>
                <div className={styles.gameBadge}>VAL</div>
                <div className={styles.gameDesc}>Solo &amp; Team Brackets</div>
              </div>
              <div className={styles.gameTag}>
                <div className={styles.gameBadge}>TFT</div>
                <div className={styles.gameDesc}>FFA Lobbies</div>
              </div>
              <div className={styles.gameTag}>
                <div className={styles.gameBadge}>???</div>
                <div className={styles.gameDesc}>
                  More Coming Soon
                </div>
              </div>
            </div>
            <p className={styles.gamesFooter}>
              Suggest a game in{" "}
              <span className={styles.highlight}>#ideas</span> on Discord.
            </p>
          </section>
        </section>

        {/* FOOTER */}
        <footer className={styles.footer}>
          <div className={styles.footerBrand}>
            5TQ TOURNAMENTS
          </div>
          <div className={styles.footerSub}>
            Independent community events. Not affiliated with Riot Games.
          </div>
          <div className={styles.footerCopy}>
            © 2025 ALL RIGHTS RESERVED
          </div>
        </footer>
      </div>
    </div>
  );
}
