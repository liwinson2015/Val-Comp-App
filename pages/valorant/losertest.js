import React from 'react';
import styles from '../../styles/losertest.module.css';

// --- DATA: LOSERS BRACKET ---
const losersBracketData = {
  round1: [
    { id: 'L1', p1: "100 Thieves", p2: "Cloud9", winner: 1 },
    { id: 'L2', p1: "KRÜ", p2: "LOUD", winner: 2 },
    { id: 'L3', p1: "Liquid", p2: "Navi", winner: 2 },
    { id: 'L4', p1: "T1", p2: "ZETA", winner: 1 },
  ],
  round2: [
    { id: 'L5', p1: "100 Thieves", p2: "Leviatán", winner: 2 },
    { id: 'L6', p1: "LOUD", p2: "NRG", winner: 1 },
    { id: 'L7', p1: "Navi", p2: "DRX", winner: 1 },
    { id: 'L8', p1: "T1", p2: "Vitality", winner: 2 },
  ],
  round3: [
    { id: 'L9', p1: "Leviatán", p2: "LOUD", winner: 1 },
    { id: 'L10', p1: "Navi", p2: "Vitality", winner: 2 },
  ],
  round4: [
    { id: 'L11', p1: "Leviatán", p2: "Fnatic", winner: 2 },
    { id: 'L12', p1: "Vitality", p2: "FURIA", winner: 1 },
  ],
  semis: [
    { id: 'L13', p1: "Fnatic", p2: "Vitality", winner: 1 },
  ],
  finals: [
    { id: 'L14', p1: "Fnatic", p2: "Paper Rex", winner: 1 }, 
  ]
};

const MatchCard = ({ match }) => {
  if (!match) return <div className={styles.matchWrapper} style={{opacity: 0}}></div>;

  return (
    <div className={styles.matchWrapper}>
      <div className={styles.matchCard}>
        <div className={`${styles.team} ${match.winner === 1 ? styles.winnerRow : ''}`}>
          <span>{match.p1}</span>
        </div>
        <div className={`${styles.team} ${match.winner === 2 ? styles.winnerRow : ''}`}>
          <span>{match.p2}</span>
        </div>
      </div>
    </div>
  );
};

export default function LoserTest() {
  return (
    <div className={styles.container}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&display=swap" rel="stylesheet" />

      <header className={styles.header}>
        <h1 className={styles.title}>REDEMPTION BRACKET</h1>
      </header>

      <div className={styles.bracketContainer}>
        
        {/* Round 1 (4 Matches) */}
        <div className={styles.roundColumn}>
          <div className={styles.roundTitle}>Round 1</div>
          <div className={styles.matchList}>
            {losersBracketData.round1.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>

        {/* Round 2 (4 Matches) */}
        <div className={styles.roundColumn}>
          <div className={styles.roundTitle}>Round 2</div>
          <div className={styles.matchList}>
            {losersBracketData.round2.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>

        {/* Round 3 (2 Matches) */}
        <div className={styles.roundColumn}>
          <div className={styles.roundTitle}>Round 3</div>
          <div className={styles.matchList}>
             {/* Spacers are used implicitly by flex:space-around, but if you want specific alignment we can add empty divs */}
             {losersBracketData.round3.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>

        {/* Round 4 (2 Matches) */}
        <div className={styles.roundColumn}>
          <div className={styles.roundTitle}>Round 4</div>
          <div className={styles.matchList}>
             {losersBracketData.round4.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>

        {/* Semis (1 Match) */}
        <div className={styles.roundColumn}>
          <div className={styles.roundTitle}>Semis</div>
          <div className={styles.matchList}>
             {losersBracketData.semis.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>

        {/* Finals (1 Match) */}
        <div className={styles.roundColumn}>
          <div className={styles.roundTitle} style={{color: '#fff'}}>FINAL</div>
          <div className={styles.matchList}>
             {losersBracketData.finals.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>

      </div>
    </div>
  );
}