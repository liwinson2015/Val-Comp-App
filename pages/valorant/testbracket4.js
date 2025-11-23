import React from 'react';
import styles from '../../styles/testbracket4.module.css';

// Dummy Data Structure holds the state of the tournament
const tournamentData = {
  leftSide: {
    round1: [
      { id: 1, p1: "Sentinels", s1: 2, p2: "100 Thieves", s2: 1, winner: 1 },
      { id: 2, p1: "Cloud9", s1: 0, p2: "NRG", s2: 2, winner: 2 },
      { id: 3, p1: "Leviatán", s1: 2, p2: "KRÜ", s2: 0, winner: 1 },
      { id: 4, p1: "LOUD", s1: 1, p2: "FURIA", s2: 2, winner: 2 },
    ],
    round2: [
      { id: 5, p1: "Sentinels", s1: 2, p2: "NRG", s2: 1, winner: 1 },
      { id: 6, p1: "Leviatán", s1: 0, p2: "FURIA", s2: 2, winner: 2 },
    ],
    semis: [
      { id: 7, p1: "Sentinels", s1: 2, p2: "FURIA", s2: 0, winner: 1 },
    ]
  },
  rightSide: {
    round1: [
      { id: 8, p1: "Fnatic", s1: 2, p2: "Liquid", s2: 0, winner: 1 },
      { id: 9, p1: "Navi", s1: 1, p2: "Vitality", s2: 2, winner: 2 },
      { id: 10, p1: "DRX", s1: 2, p2: "T1", s2: 0, winner: 1 },
      { id: 11, p1: "Paper Rex", s1: 2, p2: "ZETA", s2: 1, winner: 1 },
    ],
    round2: [
      { id: 12, p1: "Fnatic", s1: 2, p2: "Vitality", s2: 0, winner: 1 },
      { id: 13, p1: "DRX", s1: 1, p2: "Paper Rex", s2: 2, winner: 2 },
    ],
    semis: [
      { id: 14, p1: "Fnatic", s1: 1, p2: "Paper Rex", s2: 2, winner: 2 },
    ]
  },
  finals: {
    id: 15, p1: "Sentinels", s1: 3, p2: "Paper Rex", s2: 1, winner: 1
  }
};

// MatchCard Component accepts a 'theme' prop (ice, fire, or clash)
const MatchCard = ({ match, theme = 'ice' }) => {
  if (!match) return <div className={styles.matchWrapper}></div>;

  // Determine which CSS module class to apply based on theme prop
  let themeClass = styles.cardIce; // default
  if (theme === 'fire') themeClass = styles.cardFire;
  if (theme === 'clash') themeClass = styles.cardClash;

  return (
    <div className={styles.matchWrapper}>
      <div className={`${styles.matchCard} ${themeClass}`}>
        {/* Player 1 Row */}
        <div className={`${styles.team} ${match.winner === 1 ? styles.winnerRow : ''}`}>
          <span>{match.p1}</span>
          <span className={styles.score}>{match.s1}</span>
        </div>
        {/* Player 2 Row */}
        <div className={`${styles.team} ${match.winner === 2 ? styles.winnerRow : ''}`}>
          <span>{match.p2}</span>
          <span className={styles.score}>{match.s2}</span>
        </div>
      </div>
    </div>
  );
};

export default function TestBracket4() {
  return (
    <div className={styles.container}>
       {/* Ideally load a futuristic font in your _document.js, like Rajdhani or Orbitron */}
       <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&display=swap" rel="stylesheet" />

      <header className={styles.header}>
        <h1 className={styles.title}>FROSTFIRE CHAMPIONS</h1>
        <p className={styles.subtitle}>GLOBAL ELIMINATION BRACKET // 2025</p>
      </header>

      <div className={styles.bracketWrapper}>
        
        {/* --- LEFT SIDE (ICE THEME) --- */}
        
        {/* Left Round of 16 */}
        <div className={`${styles.column} ${styles.columnLeft}`}>
          {tournamentData.leftSide.round1.map((m) => (
            <MatchCard key={m.id} match={m} theme="ice" />
          ))}
        </div>

        {/* Left Quarters */}
        <div className={`${styles.column} ${styles.columnLeft}`}>
          {tournamentData.leftSide.round2.map((m) => (
            <MatchCard key={m.id} match={m} theme="ice" />
          ))}
        </div>

        {/* Left Semis */}
        <div className={`${styles.column} ${styles.columnLeft}`}>
           {tournamentData.leftSide.semis.map((m) => (
            <MatchCard key={m.id} match={m} theme="ice" />
          ))}
        </div>

        {/* --- MIDDLE (CLASH THEME) --- */}
        
        <div className={`${styles.column} ${styles.columnMid}`}>
          <div style={{textAlign: 'center', marginBottom: '20px'}}>
             <span className={styles.trophyIcon}>⚔️</span>
          </div>
          {/* The Finals Card gets the special 'clash' theme */}
          <MatchCard match={tournamentData.finals} theme="clash" />
          <div style={{textAlign: 'center', marginTop: '20px', color: 'var(--clash-primary)', letterSpacing: '3px', fontWeight: 'bold'}}>
            GRAND FINAL CHAMPION
          </div>
        </div>

        {/* --- RIGHT SIDE (FIRE THEME) --- */}

        {/* Right Semis */}
        <div className={`${styles.column} ${styles.columnRight}`}>
           {tournamentData.rightSide.semis.map((m) => (
            <MatchCard key={m.id} match={m} theme="fire" />
          ))}
        </div>

        {/* Right Quarters */}
        <div className={`${styles.column} ${styles.columnRight}`}>
          {tournamentData.rightSide.round2.map((m) => (
            <MatchCard key={m.id} match={m} theme="fire" />
          ))}
        </div>

        {/* Right Round of 16 */}
        <div className={`${styles.column} ${styles.columnRight}`}>
          {tournamentData.rightSide.round1.map((m) => (
            <MatchCard key={m.id} match={m} theme="fire" />
          ))}
        </div>

      </div>
    </div>
  );
}