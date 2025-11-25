// pages/tournaments-hub/index.js
import React from "react";
import Link from "next/link";
import s from "../../styles/TournamentsHub.module.css"; // Make sure path is correct

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
              Solo skirmishes, team tournaments, and highlight-driven events.
              View current and upcoming brackets.
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
            
            <h2 className={s.cardTitle} style={{ opacity: 0.5 }}>More Titles</h2>
            
            <p className={s.cardDesc}>
              We are expanding our platform to include League of Legends, 
              CS:GO, and more. Stay tuned for updates.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}