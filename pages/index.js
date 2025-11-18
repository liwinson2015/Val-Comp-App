// pages/index.js
import Link from "next/link";
import styles from "../styles/Home.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.tagline}>Community Gaming Tournaments</p>
          <h1 className={styles.title}>Welcome to your next matchup.</h1>
          <p className={styles.subtitle}>
            Join weekly brackets across multiple games. Sign in, claim your spot,
            get placed into a live bracket, and play for prizes.
          </p>

          <div className={styles.heroActions}>
            <Link href="/tournaments" className={styles.primaryAction}>
              View tournaments
            </Link>
            <Link href="/discord" className={styles.secondaryAction}>
              Join our Discord
            </Link>
          </div>

          <div className={styles.heroMeta}>
            <div>
              <span className={styles.metaLabel}>Players</span>
              <span className={styles.metaValue}>100+ registered</span>
            </div>
            <div>
              <span className={styles.metaLabel}>Games</span>
              <span className={styles.metaValue}>VALORANT · LoL · More</span>
            </div>
            <div>
              <span className={styles.metaLabel}>Prize pool</span>
              <span className={styles.metaValue}>Skins & gift cards</span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED / UPCOMING */}
      <section className={styles.mainGrid}>
        <div className={styles.featuredCard}>
          <div className={styles.featuredHeader}>
            <span className={styles.pill}>Featured bracket</span>
            <span className={styles.gamePill}>VALORANT · 1v1</span>
          </div>

          <h2 className={styles.featuredTitle}>Solo Skirmish #1</h2>
          <p className={styles.featuredSubtitle}>
            16-player bracket. Fast matches, single elimination. Winner takes the
            skin prize.
          </p>

          <div className={styles.featuredMetaRow}>
            <div>
              <span className={styles.metaLabel}>Status</span>
              <span className={styles.metaValue}>Open for registration</span>
            </div>
            <div>
              <span className={styles.metaLabel}>Start time</span>
              <span className={styles.metaValue}>Nov 2 · 7:00 pm ET</span>
            </div>
            <div>
              <span className={styles.metaLabel}>Slots</span>
              <span className={styles.metaValue}>16 players</span>
            </div>
          </div>

          <div className={styles.featuredActions}>
            <Link href="/valorant/register" className={styles.primaryAction}>
              Claim your slot
            </Link>
            <Link href="/tournaments/valo-solo-skirmish-1" className={styles.textLink}>
              View details →
            </Link>
          </div>
        </div>

        <div className={styles.sideCard}>
          <h3 className={styles.sideTitle}>Upcoming events</h3>
          <ul className={styles.eventList}>
            <li className={styles.eventItem}>
              <div className={styles.eventGame}>League of Legends</div>
              <div className={styles.eventMain}>Teamfight Clash (Coming soon)</div>
              <div className={styles.eventMeta}>5v5 · Free entry · Draft format</div>
            </li>
            <li className={styles.eventItem}>
              <div className={styles.eventGame}>Open Slot</div>
              <div className={styles.eventMain}>Next community vote</div>
              <div className={styles.eventMeta}>
                Valorant? TFT? Another title? Decide in Discord.
              </div>
            </li>
          </ul>
          <Link href="/tournaments" className={styles.textLink}>
            See all planned brackets →
          </Link>
        </div>
      </section>

      {/* HOW IT WORKS + GAMES */}
      <section className={styles.bottomGrid}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>How it works</h3>
          <ol className={styles.steps}>
            <li>Sign in with Discord so we can reach you quickly.</li>
            <li>Pick a tournament and grab an open slot.</li>
            <li>Check in on Discord at start time for lobby info.</li>
            <li>Play your matches and report scores with screenshots.</li>
            <li>Winners get prizes; standings show up on the site.</li>
          </ol>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Games we run</h3>
          <div className={styles.gamesRow}>
            <div className={styles.gameTag}>
              <span className={styles.gameBadge}>VALORANT</span>
              <span className={styles.gameDesc}>Solo & team brackets</span>
            </div>
            <div className={styles.gameTag}>
              <span className={styles.gameBadge}>League of Legends</span>
              <span className={styles.gameDesc}>Clash-style 5v5</span>
            </div>
            <div className={styles.gameTag}>
              <span className={styles.gameBadge}>Future titles</span>
              <span className={styles.gameDesc}>TFT, CS, more coming</span>
            </div>
          </div>
          <p className={styles.cardFooter}>
            Want your game featured? Drop a suggestion in the{" "}
            <span className={styles.highlight}>#tournament-ideas</span> channel on Discord.
          </p>
        </div>
      </section>
    </div>
  );
}
