// pages/index.js
import React from "react";
import styles from "../styles/Valorant.module.css";
import { connectToDatabase } from "../lib/mongodb";
import Player from "../models/Player";
import TournamentState from "../models/TournamentState";

const DEFAULT_TOURNAMENT_ID = "VALO-SOLO-SKIRMISH-1";
const DEFAULT_MAX_SLOTS = 16;

export async function getServerSideProps() {
  await connectToDatabase();

  // 1) Find the currently featured tournament (if any)
  const state = await TournamentState.findOne({ isFeatured: true }).lean();

  if (!state) {
    return { props: { featured: null } };
  }

  const tournamentId = state.tournamentId || DEFAULT_TOURNAMENT_ID;

  // 2) Count registrations for this tournament
  const currentCount = await Player.countDocuments({
    "registeredFor.tournamentId": tournamentId,
  });

  const maxSlots = DEFAULT_MAX_SLOTS;

  const featured = {
    tournamentId,
    currentCount: Number(currentCount) || 0,
    maxSlots: Number(maxSlots) || DEFAULT_MAX_SLOTS,
    status: state.status || "ongoing", // upcoming / ongoing / completed

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
  const isOngoing = hasFeatured && featured.status === "ongoing";

  const statusText = !hasFeatured
    ? "COMING SOON"
    : !isOngoing
    ? "COMPLETED"
    : isFull
    ? "FULL / CLOSED"
    : "OPEN ENTRY";

  const slotsText = hasFeatured ? `${currentCount} / ${maxSlots}` : "-- / --";
  const playersText = hasFeatured
    ? `${currentCount} REGISTERED`
    : "COMING SOON";

  // --- FALLBACKS TO YOUR ORIGINAL HARD-CODED TEXT ---
  const titleText =
    (hasFeatured && featured.displayName) || "SOLO SKIRMISH #1";

  const descriptionText =
    (hasFeatured && featured.displayDescription) ||
    "Double elimination bracket. Winner takes all. Screenshot score verification required.";

  const startTimeText =
    (hasFeatured && featured.displayTime) || "NOV 2 • 7PM ET";

  const gameLabel =
    (hasFeatured && featured.displayGameLabel) || "VALORANT";
  const modeLabel =
    (hasFeatured && featured.displayModeLabel) || "1v1";

  const canRegister = hasFeatured && isOngoing && !isFull;

  const ctaHref =
    (hasFeatured && featured.ctaPath) ||
    "/tournaments-hub/valorant-types/1v1";

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
              <span className={styles.gamePill}>
                {`${gameLabel.toUpperCase()} • ${modeLabel}`}
              </span>
            </div>

            <h3 className={styles.featuredTitle}>{titleText}</h3>
            <p className={styles.featuredSubtitle}>{descriptionText}</p>

            <div className={styles.featuredMetaRow}>
              <div>
                <div className={styles.metaLabel}>STATUS</div>
                <div
                  className={styles.metaValue}
                  style={{
                    color: !hasFeatured
                      ? "#eab308"
                      : !isOngoing
                      ? "#f97316"
                      : isFull
                      ? "#ff4655"
                      : "#4ade80",
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
                      ? isOngoing && isFull
                        ? "BRACKET FULL"
                        : "REGISTRATION CLOSED"
                      : "COMING SOON"}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: Upcoming List (unchanged) */}
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

        {/* BOTTOM GRID (unchanged) */}
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
                <div className={styles.gameDesc}>Solo & Team Brackets</div>
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
              Suggest a game in <span className={styles.highlight}>#ideas</span> on Discord.
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
