// pages/valorant/testbracket3.js
import React from 'react';
// IMPORTANT: Pointing to new compact styles
import styles from '../../styles/testbracket3.module.css';

// --- DATA (Same as before) ---
const LEFT_BRACKET = [
  {
    name: "RO16 Left",
    matches: [
      { p1: { name: "Sentinels", score: 2, winner: true }, p2: { name: "100T", score: 1 } },
      { p1: { name: "Cloud9", score: 0 }, p2: { name: "G2", score: 2, winner: true } },
      { p1: { name: "KRU", score: 1 }, p2: { name: "Leviatan", score: 2, winner: true } },
      { p1: { name: "MIBR", score: 0 }, p2: { name: "Furia", score: 2, winner: true } },
    ]
  },
  {
    name: "Quarters Left",
    matches: [
      { p1: { name: "Sentinels", score: 2, winner: true }, p2: { name: "G2", score: 1 } },
      { p1: { name: "Leviatan", score: 2, winner: true }, p2: { name: "Furia", score: 0 } },
    ]
  },
  {
    name: "Semis Left",
    matches: [
      { p1: { name: "Sentinels", score: 1 }, p2: { name: "Leviatan", score: 2, winner: true } },
    ]
  }
];

const RIGHT_BRACKET = [
  {
    name: "RO16 Right",
    matches: [
      { p1: { name: "Fnatic", score: 2, winner: true }, p2: { name: "Liquid", score: 0 } },
      { p1: { name: "Navi", score: 1 }, p2: { name: "Vitality", score: 2, winner: true } },
      { p1: { name: "DRX", score: 2, winner: true }, p2: { name: "ZETA", score: 0 } },
      { p1: { name: "PRX", score: 2, winner: true }, p2: { name: "GenG", score: 1 } },
    ]
  },
  {
    name: "Quarters Right",
    matches: [
      { p1: { name: "Fnatic", score: 2, winner: true }, p2: { name: "Vitality", score: 1 } },
      { p1: { name: "DRX", score: 1 }, p2: { name: "PRX", score: 2, winner: true } },
    ]
  },
  {
    name: "Semis Right",
    matches: [
      { p1: { name: "Fnatic", score: 1 }, p2: { name: "PRX", score: 2, winner: true } },
    ]
  }
];

const FINAL_MATCH = {
  p1: { name: "Leviatan", score: 3, winner: true }, 
  p2: { name: "PRX", score: 2 } 
};


// --- Sub-Components ---

const MatchCard = ({ p1, p2, final = false }) => (
  <div className={`${styles.card} ${final ? styles.finalCard : ''}`}>
    <div className={`${styles.player} ${p1.winner ? styles.winner : styles.loser}`}>
      <span>{p1.name}</span>
      <span className={styles.score}>{p1.score}</span>
    </div>
    {/* Thinner divider */}
    <div style={{height: '1px', background: '#333', margin: '2px 0'}}></div>
    <div className={`${styles.player} ${p2.winner ? styles.winner : styles.loser}`}>
      <span>{p2.name}</span>
      <span className={styles.score}>{p2.score}</span>
    </div>
  </div>
);

const BracketSide = ({ rounds, side }) => {
  return (
    <div className={`${styles.sideBracket} ${styles[side + 'Side']}`}>
      {rounds.map((round, rIndex) => (
        <div key={rIndex} className={styles.column}>
          {round.matches.map((match, mIndex) => {
            const isEven = mIndex % 2 === 0;
            return (
              <div key={mIndex} className={styles.matchWrapper} data-even={isEven}>
                <MatchCard p1={match.p1} p2={match.p2} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const TestBracket3 = () => {
  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap');
        body { margin: 0; background: #0f1923; } /* Ensure body doesn't have default margins */
      `}</style>

      <div className={styles.container}>
        <div className={styles.layoutGrid}>
          
          <BracketSide rounds={LEFT_BRACKET} side="left" />

          <div className={styles.finalWrapper}>
            <div className={styles.finalTitle}>Grand Final</div>
            <MatchCard p1={FINAL_MATCH.p1} p2={FINAL_MATCH.p2} final={true} />
          </div>

          <BracketSide rounds={RIGHT_BRACKET} side="right" />

        </div>
      </div>
    </>
  );
};

export default TestBracket3;