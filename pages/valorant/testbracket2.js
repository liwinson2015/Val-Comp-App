// pages/valorant/testbracket2.js
import React from 'react';
import styles from '../../styles/testbracket2.module.css';

// --- DATA: Split into Left Conference and Right Conference ---

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
      <span>{p1.score}</span>
    </div>
    <div style={{height: '1px', background: '#333', margin: '4px 0'}}></div>
    <div className={`${styles.player} ${p2.winner ? styles.winner : styles.loser}`}>
      <span>{p2.name}</span>
      <span>{p2.score}</span>
    </div>
  </div>
);

const BracketSide = ({ rounds, side }) => {
  return (
    // 'leftSide' or 'rightSide' class controls the line direction and row-reverse
    <div className={`${styles.sideBracket} ${styles[side + 'Side']}`}>
      {rounds.map((round, rIndex) => (
        <div key={rIndex} className={styles.column}>
          {round.matches.map((match, mIndex) => {
            // Determine Even/Odd for line connectors
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

const TestBracket2 = () => {
  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap');
      `}</style>

      <div className={styles.container}>
        <div className={styles.layoutGrid}>
          
          {/* 1. Left Bracket (Sentinels, Leviatan, etc) */}
          <BracketSide rounds={LEFT_BRACKET} side="left" />

          {/* 2. Center Stage (Grand Final) */}
          <div className={styles.finalWrapper}>
            <div className={styles.trophyIcon}>🏆 VCT CHAMPIONS</div>
            <MatchCard p1={FINAL_MATCH.p1} p2={FINAL_MATCH.p2} final={true} />
            <div style={{color: '#666', fontSize: '12px', marginTop: '10px'}}>BO5 FINAL</div>
          </div>

          {/* 3. Right Bracket (Fnatic, PRX, etc) */}
          <BracketSide rounds={RIGHT_BRACKET} side="right" />

        </div>
      </div>
    </>
  );
};

export default TestBracket2;