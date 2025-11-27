// pages/tournaments-hub/index.js
import React from "react";
import Link from "next/link";
import s from "../../styles/TournamentsHub.module.css";

export default function TournamentsHubPage() {
  return (
    <div className={s.container}>
      <div className={s.content}>
        {/* Header */}
        <header className={s.header}>
          <span className={s.subLabel}>// 5TQ TOURNAMENTS</span>
          <h1 className={s.title}>Select Your Game</h1>
          <p className={s.description}>
            Browse competitive events by title. Join the arena, compete for glory,
            and climb the leaderboards. New titles arriving soon.
          </p>
        </header>

        {/* Games Grid */}
        <div className={s.grid}>
          {/* VALORANT CARD */}
          <Link
            href="/tournaments-hub/valorant-types"
            className={`${s.card} ${s.valorantCard} ${s.cardInteractive}`}
          >
            <div className={`${s.cardTag} ${s.tagRed}`}>
              <span>●</span> FPS • Competitive
            </div>

            <h2 className={s.cardTitle}>VALORANT</h2>

            <p className={s.cardDesc}>
              Solo skirmishes, duo events, and full team tournaments.
              View current and upcoming brackets.
            </p>

            <div className={s.cardLink}>
              View Tournaments <span className={s.arrow}>→</span>
            </div>
          </Link>

          {/* TEAMFIGHT TACTICS CARD */}
          <Link
            href="/tournaments-hub/tft-types"
            className={`${s.card} ${s.tftCard} ${s.cardInteractive}`}
          >
            <div className={`${s.cardTag} ${s.tagTft}`}>
              <span>●</span> Auto Chess • Strategy
            </div>

            <h2 className={s.cardTitle}>TEAMFIGHT TACTICS</h2>

            <p className={s.cardDesc}>
              Single lobby tournaments and Double Up brackets.
              Draft hard, high roll, and out-position your opponents.
            </p>

            <div className={s.cardLink}>
              View Tournaments <span className={s.arrow}>→</span>
            </div>
          </Link>

          {/* COMING SOON CARD */}
          <div className={`${s.card} ${s.soonCard}`}>
            <div className={`${s.cardTag} ${s.tagGray}`}>
              Coming Soon
            </div>

            <h2 className={s.cardTitle} style={{ opacity: 0.5 }}>
              More Titles
            </h2>

            <p className={s.cardDesc}>
              We’re expanding to more games in the future.
              Drop suggestions in Discord for what you want to see next.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
