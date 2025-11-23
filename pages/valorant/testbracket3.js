import React from 'react';
import styles from '../../styles/testbracket3.module.css';

// --- DATA STRUCTURE ---
const LEFT_BRACKET = [
  // Round 1 (4 matches)
  [
    { p1: { name: "SEN", s: 2, w: true }, p2: { name: "100T", s: 1 } },
    { p1: { name: "C9", s: 0 }, p2: { name: "G2", s: 2, w: true } },
    { p1: { name: "KRU", s: 1 }, p2: { name: "LEV", s: 2, w: true } },
    { p1: { name: "MIBR", s: 0 }, p2: { name: "FUR", s: 2, w: true } },
  ],
  // Round 2 (2 matches)
  [
    { p1: { name: "SEN", s: 2, w: true }, p2: { name: "G2", s: 1 } },
    { p1: { name: "LEV", s: 2, w: true }, p2: { name: "FUR", s: 0 } },
  ],
  // Round 3 (1 match)
  [
    { p1: { name: "SEN", s: 1 }, p2: { name: "LEV", s: 2, w: true } },
  ]
];

const RIGHT_BRACKET = [
  // Round 1
  [
    { p1: { name: "FNC", s: 2, w: true }, p2: { name: "TL", s: 0 } },
    { p1: { name: "NAVI", s: 1 }, p2: { name: "VIT", s: 2, w: true } },
    { p1: { name: "DRX", s: 2, w: true }, p2: { name: "ZETA", s: 0 } },
    { p1: { name: "PRX", s: 2, w: true }, p2: { name: "GEN", s: 1 } },
  ],
  // Round 2
  [
    { p1: { name: "FNC", s: 2, w: true }, p2: { name: "VIT", s: 1 } },
    { p1: { name: "DRX", s: 1 }, p2: { name: "PRX", s: 2, w: true } },
  ],
  // Round 3
  [
    { p1: { name: "FNC", s: 1 }, p2: { name: "PRX", s: 2, w: true } },
  ]
];

const GRAND_FINAL = { p1: { name: "LEV", s: 3, w: true }, p2: { name: "PRX", s: 2 } };


// --- COMPONENTS ---

const Team = ({ data }) => (
  <div className={`${styles.teamRow} ${data.w ? styles.winner : styles.loser}`}>
    <span>{data.name}</span>
    <span className={styles.score}>{data.s}</span>
  </div>
);

const Match = ({ data, isFinal }) => (
  <div className={`${styles.matchBox} ${isFinal ? styles.finalBox : ''}`}>
    {isFinal && <span className={styles.champLabel}>GRAND FINAL</span>}
    <Team data={data.p1} />
    <Team data={data.p2} />
  </div>
);

const Conference = ({ rounds, side }) => (
  <div className={`${styles.conference} ${styles[side + 'Side']}`} style={{display:'flex', flexDirection: side === 'right' ? 'row-reverse' : 'row', gap: '35px'}}>
    {rounds.map((roundMatches, colIndex) => (
      <div key={colIndex} className={styles.column}>
        {roundMatches.map((match, matchIndex) => {
          // Logic for connecting lines: Is this match the top or bottom of a bracket pair?
          // Even indices (0, 2) connect DOWN ("top"). Odd indices (1, 3) connect UP ("bottom").
          // The last round (colIndex 2) doesn't need vertical forks, just a straight line.
          let pos = null;
          if (colIndex < rounds.length - 1) {
            pos = matchIndex % 2 === 0 ? "top" : "bottom";
          }
          
          return (
            <div key={matchIndex} className={styles.matchWrapper} data-pos={pos}>
              <Match data={match} />
            </div>
          );
        })}
      </div>
    ))}
  </div>
);

export default function TestBracket3() {
  return (
    <div className={styles.container}>
      <div className={styles.bracketBoard}>
        
        {/* Left Conference */}
        <Conference rounds={LEFT_BRACKET} side="left" />

        {/* Center Stage */}
        <div className={styles.finalColumn}>
          <div className={styles.logo}>🏆</div>
          <Match data={GRAND_FINAL} isFinal={true} />
        </div>

        {/* Right Conference */}
        <Conference rounds={RIGHT_BRACKET} side="right" />

      </div>
    </div>
  );
}