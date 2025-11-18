// pages/index.js
import React from "react";
import styles from "../styles/Valorant.module.css";

export default function HomePage() {
  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroBadge}>Community Gaming Tournaments</div>
            <h1 className={styles.heroTitle}>Play. Compete. Climb.</h1>
            <p className={styles.heroSubtitle}>
              Brackets for multiple games, hosted by 5TQ.
              <br />
              Sign in, claim your slot, and battle through a live bracket for
              skins, gift cards, and more.
            </p>

            <div className={styles.heroActions}>
              {/* Keep your existing Valorant 1v1 link as the main CTA */}
              <a
                href="/tournaments-hub/valorant-types/1v1"
                className={styles.heroPrimary}
              >
                Join next VALORANT 1v1
              </a>
              <a href="/tournaments" className={styles.heroSecondary}>
                Browse all tournaments
              </a>
            </div>

            <div className={styles.heroStats}>
              <div>
                <span className={styles.heroStatLabel}>Players</span>
                <span className={styles.heroStatValue}>100+ registered</span>
              </div>
              <div>
                <span className={styles.heroStatLabel}>Games</span>
                <span className={styles.heroStatValue}>
                  VALORANT • League • more
                </span>
              </div>
              <div>
                <span className={styles.heroStatLabel}>Prize pool</span>
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
              <h2 className={styles.cardTitle}>Featured bracket</h2>
              <span className={styles.gamePill}>VALORANT • 1v1</span>
            </div>

            <h3 className={styles.featuredTitle}>Solo Skirmish #1</h3>
            <p className={styles.featuredSubtitle}>
              16-player 1v1 bracket. Fast matches, single elimination.
              Winner takes the skin prize.
            </p>

            <div className={styles.featuredMetaRow}>
              <div>
                <div className={styles.metaLabel}>Status</div>
                <div className={styles.metaValue}>Open for registration</div>
              </div>
              <div>
                <div className={styles.metaLabel}>Start time</div>
                <div className={styles.metaValue}>Nov 2 • 7:00 pm ET</div>
              </div>
              <div>
                <div className={styles.metaLabel}>Slots</div>
                <div className={styles.metaValue}>16 players</div>
              </div>
            </div>

            <div className={styles.featuredActions}>
              <a
                href="/tournaments-hub/valorant-types/1v1"
                className={styles.heroPrimary}
              >
                Claim your slot
              </a>
              <a
                href="/tournaments-hub/valorant-types/1v1"
                className={styles.textLink}
              >
                View Valorant brackets →
              </a>
            </div>
          </div>

          {/* Upcoming multi-game section */}
          <div className={styles.upcomingColumn}>
            <div className={styles.cardHeaderRow}>
              <h2 className={styles.cardTitle}>Upcoming events</h2>
            </div>

            <ul className={styles.eventList}>
              <li className={styles.eventItem}>
                <div className={styles.eventGame}>League of Legends</div>
                <div className={styles.eventMain}>
                  Teamfight Clash (Coming soon)
                </div>
                <div className={styles.eventMeta}>
                  5v5 • Draft format • Free entry
                </div>
              </li>
              <li className={styles.eventItem}>
                <div className={styles.eventGame}>Community vote</div>
                <div className={styles.eventMain}>
                  Next title chosen by Discord
                </div>
                <div className={styles.eventMeta}>
                  TFT, CS, or another game — vote in{" "}
                  <span className={styles.highlight}>#tournament-ideas</span>.
                </div>
              </li>
            </ul>

            <a href="/tournaments" className={styles.textLink}>
              See all planned brackets →
            </a>
          </div>
        </section>

        {/* HOW IT WORKS + GAMES WE RUN */}
        <section className={styles.bottomGrid}>
          <section className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <h2 className={styles.cardTitle}>How it works</h2>
            </div>
            <ul className={styles.rulesList}>
              <li>Sign in with Discord so we can ping you easily.</li>
              <li>Select a tournament and grab an open slot.</li>
              <li>Check in on Discord at start time for lobby info.</li>
              <li>
                Play your matches and report scores with a screenshot in Discord.
              </li>
              <li>Top players win prizes and show up on the site.</li>
            </ul>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <h2 className={styles.cardTitle}>Games we run</h2>
            </div>
            <div className={styles.gamesRow}>
              <div className={styles.gameTag}>
                <div className={styles.gameBadge}>VALORANT</div>
                <div className={styles.gameDesc}>Solo & team brackets</div>
              </div>
              <div className={styles.gameTag}>
                <div className={styles.gameBadge}>League of Legends</div>
                <div className={styles.gameDesc}>Clash-style 5v5 soon</div>
              </div>
              <div className={styles.gameTag}>
                <div className={styles.gameBadge}>Future titles</div>
                <div className={styles.gameDesc}>
                  TFT, CS, and more based on community votes
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
              More brackets, paid prize pools, and cross-game leaderboards coming
              soon.
            </div>
            <div className={styles.footerCopy}>© 2025 — all tournaments run independently</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
