// pages/index.js
import React from "react";
import styles from "../styles/Valorant.module.css";
import { connectToDatabase } from "../lib/mongodb";
import Registration from "../models/Registration";

const TOURNAMENT_ID = "VALO-SOLO-SKIRMISH-1";
const MAX_SLOTS = 16;

export async function getServerSideProps() {
  await connectToDatabase();

  const currentCount = await Registration.countDocuments({
    tournamentId: TOURNAMENT_ID,
  });

  return {
    props: {
      featured: {
        tournamentId: TOURNAMENT_ID,
        maxSlots: MAX_SLOTS,
        currentCount: Number(currentCount) || 0,
      },
    },
  };
}

export default function HomePage({ featured }) {
  const { currentCount, maxSlots } = featured;
  const isFull = currentCount >= maxSlots;
  const statusText = isFull ? "Full" : "Open for registration";
  const slotsText = `${currentCount}/${maxSlots} filled`;

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroBadge}>COMMUNITY GAMING TOURNAMENTS</div>
            <h1 className={styles.heroTitle}>PLAY. COMPETE. CLIMB.</h1>
            <p className={styles.heroSubtitle}>
              Brackets for multiple games, hosted by 5TQ.
              <br />
              Sign in, claim your slot, and battle through a live bracket for
              skins, gift cards, and more.
            </p>

            {/* buttons removed, everything centered */}

            <div className={styles.heroStats}>
              <div>
                <span className={styles.heroStatLabel}>PLAYERS</span>
                <span className={styles.heroStatValue}>
                  100+ registered
                </span>
              </div>
              <div>
                <span className={styles.heroStatLabel}>GAMES</span>
                <span className={styles.heroStatValue}>
                  VALORANT · TFT · more
                </span>
              </div>
              <div>
                <span className={styles.heroStatLabel}>PRIZE POOL</span>
                <span className={styles.heroStatValue}>
                  Skins, RP / gift cards
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURED + UPCOMING */}
        <section className={`${styles.card} ${styles.cardGrid}`}>
          {/* Featured bracket (Valorant) */}
          <div className={styles.featuredColumn}>
            <div className={styles.cardHeaderRow}>
              <h2 className={styles.cardTitle}>FEATURED BRACKET</h2>
              <span className={styles.gamePill}>VALORANT · 1v1</span>
            </div>

            <h3 className={styles.featuredTitle}>Solo Skirmish #1</h3>
            <p className={styles.featuredSubtitle}>
              16-player 1v1 bracket. Fast matches, single elimination.
              Winner takes the skin prize.
            </p>

            <div className={styles.featuredMetaRow}>
              <div>
                <div className={styles.metaLabel}>STATUS</div>
                <div className={styles.metaValue}>{statusText}</div>
              </div>
              <div>
                <div className={styles.metaLabel}>START TIME</div>
                <div className={styles.metaValue}>Nov 2 · 7:00 pm ET</div>
              </div>
              <div>
                <div className={styles.metaLabel}>SLOTS</div>
                <div className={styles.metaValue}>{slotsText}</div>
              </div>
            </div>

            <div className={styles.featuredActions}>
              {isFull ? (
                <button
                  className={`${styles.heroPrimary} ${styles.heroPrimaryDisabled}`}
                  disabled
                >
                  Full
                </button>
              ) : (
                <a
                  href="/tournaments-hub/valorant-types/1v1"
                  className={styles.heroPrimary}
                >
                  Claim your spot
                </a>
              )}

              <a
                href="/tournaments-hub/valorant-types/1v1"
                className={styles.textLink}
              >
                View Valorant brackets →
              </a>
            </div>
          </div>

          {/* Upcoming events */}
          <div className={styles.upcomingColumn}>
            <div className={styles.cardHeaderRow}>
              <h2 className={styles.cardTitle}>UPCOMING EVENTS</h2>
            </div>

            <ul className={styles.eventList}>
              <li className={styles.eventItem}>
                <div className={styles.eventGame}>TEAMFIGHT TACTICS</div>
                <div className={styles.eventMain}>TFT event (Coming soon)</div>
                <div className={styles.eventMeta}>Free for all</div>
              </li>
              <li className={styles.eventItem}>
                <div className={styles.eventGame}>FUTURE TITLES</div>
                <div className={styles.eventMain}>
                  Next title chosen by Discord
                </div>
                <div className={styles.eventMeta}>
                  More games: coming soon
                </div>
              </li>
            </ul>

            {/* removed "See all planned brackets →" */}
          </div>
        </section>

        {/* HOW IT WORKS + GAMES WE RUN */}
        <section className={styles.bottomGrid}>
          <section className={`${styles.card} ${styles.howCard}`}>
            <div className={styles.cardHeaderRow}>
              <h2 className={styles.cardTitle}>HOW IT WORKS</h2>
            </div>
            <ul className={styles.rulesList}>
              <li>Sign in with Discord so we can ping you easily.</li>
              <li>Select a tournament and grab an open slot.</li>
              <li>Check in on Discord at start time for lobby info.</li>
              <li>Play your matches and report scores with a screenshot.</li>
              <li>Top players win prizes and show up on the site.</li>
            </ul>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <h2 className={styles.cardTitle}>GAMES WE RUN</h2>
            </div>
            <div className={styles.gamesRow}>
              <div className={styles.gameTag}>
                <div className={styles.gameBadge}>VALORANT</div>
                <div className={styles.gameDesc}>Solo & team brackets</div>
              </div>
              <div className={styles.gameTag}>
                <div className={styles.gameBadge}>TEAMFIGHT TACTICS</div>
                <div className={styles.gameDesc}>Free for all</div>
              </div>
              <div className={styles.gameTag}>
                <div className={styles.gameBadge}>FUTURE TITLES</div>
                <div className={styles.gameDesc}>
                  More games: coming soon
                </div>
              </div>
            </div>
            <p className={styles.gamesFooter}>
              Want a specific game? Drop it in{" "}
              <span className={styles.highlight}>#tournament-ideas</span> on
              Discord.
            </p>
          </section>
        </section>

        {/* FOOTER */}
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <div className={styles.footerBrand}>
              Community-run gaming events by 5TQ
            </div>
            <div className={styles.footerSub}>
              More brackets, paid prize pools, and cross-game leaderboards
              coming soon.
            </div>
            <div className={styles.footerCopy}>
              © 2025 — all tournaments run independently
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
