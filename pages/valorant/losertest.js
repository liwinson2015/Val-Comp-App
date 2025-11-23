import React from 'react';
import styles from '../../styles/losertest.module.css';

// --- DATA: LOSERS BRACKET ---
// A 16-team tournament creates a deep losers bracket run.
const losersBracketData = {
  round1: [ // 4 Matches (Losers from Winners R1)
    { id: 'L1', p1: "100 Thieves", p2: "Cloud9", winner: 1 },
    { id: 'L2', p1: "KRÜ", p2: "LOUD", winner: 2 },
    { id: 'L3', p1: "Liquid", p2: "Navi", winner: 2 },
    { id: 'L4', p1: "T1", p2: "ZETA", winner: 1 },
  ],
  round2: [ // 4 Matches (Winners of L1 vs Losers from Winners R2)
    { id: 'L5', p1: "100 Thieves", p2: "Leviatán", winner: 2 },
    { id: 'L6', p1: "LOUD", p2: "NRG", winner: 1 },
    { id: 'L7', p1: "Navi", p2: "DRX", winner: 1 },
    { id: 'L8', p1: "T1", p2: "Vitality", winner: 2 },
  ],
  round3: [ // 2 Matches (Winners of L2 face off)
    { id: 'L9', p1: "Leviatán", p2: "LOUD", winner: 1 },
    { id: 'L10', p1: "Navi", p2: "Vitality", winner: 2 },
  ],
  round4: [ // 2 Matches (Winners of L3 vs Losers from Winners Semis)
    { id: 'L11', p1: "Leviatán", p2: "Fnatic", winner: 2 },
    { id: 'L12', p1: "Vitality", p2: "FURIA", winner: 1 },
  ],
  semis: [ // 1 Match (Losers Semifinal)
    { id: 'L13', p1: "Fnatic", p2: "Vitality", winner: 1 },
  ],
  finals: [ // 1 Match (Losers Final - Winner goes to Grand Finals)
    { id: 'L14', p1: "Fnatic", p2: "Paper Rex", winner: 1 }, 
  ]
};

const MatchCard = ({ match }) => {
  if (!match) return <div className={styles.matchWrapper}></div>;

  return (
    <div className={styles.matchWrapper}>
      <div className={styles.matchCard}>
        {/* P1 */}
        <div className={`${styles.team} ${match.winner === 1 ? styles.winnerRow : ''}`}>
          <span>{match.p1}</span>
        </div>
        {/* P2 */}
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
        <p className={styles.subtitle}>THE PATH BACK TO GLORY</p>
      </header>

      {/* Horizontal Scroll Wrapper */}
      <div className={styles.bracketContainer}>
        
        {/* Round 1 */}
        <div className={styles.roundColumn}>
          <h3 className={styles.roundTitle}>Round 1</h3>
          <div className={styles.matchList}>
            {losersBracketData.round1.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>

        {/* Round 2 */}
        <div className={styles.roundColumn}>
          <h3 className={styles.roundTitle}>Round 2</h3>
          <div className={styles.matchList}>
            {losersBracketData.round2.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>

        {/* Round 3 */}
        <div className={styles.roundColumn}>
          <h3 className={styles.roundTitle}>Round 3</h3>
          <div className={styles.matchList}>
             {losersBracketData.round3.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>

        {/* Round 4 */}
        <div className={styles.roundColumn}>
          <h3 className={styles.roundTitle}>Round 4</h3>
          <div className={styles.matchList}>
             {losersBracketData.round4.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>

        {/* Lower Semis */}
        <div className={styles.roundColumn}>
          <h3 className={styles.roundTitle}>Semis</h3>
          <div className={styles.matchList}>
             {losersBracketData.semis.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>

        {/* Lower Finals */}
        <div className={styles.roundColumn}>
          <h3 className={styles.roundTitle} style={{color: '#fff'}}>LOWER FINAL</h3>
          <div className={styles.matchList}>
             {losersBracketData.finals.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </div>

      </div>
    </div>
  );
}