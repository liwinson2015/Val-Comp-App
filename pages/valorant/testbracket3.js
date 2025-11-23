import React from 'react';
import styles from '../../styles/testbracket3.module.css';

// --- DATA ---
const LEFT_BRACKET = [
  // Round 1
  [
    { p1: { name: "SENTINELS", s: 2, w: true }, p2: { name: "100 THIEVES", s: 1 } },
    { p1: { name: "CLOUD9", s: 0 }, p2: { name: "G2 ESPORTS", s: 2, w: true } },
    { p1: { name: "KRU", s: 1 }, p2: { name: "LEVIATAN", s: 2, w: true } },
    { p1: { name: "MIBR", s: 0 }, p2: { name: "FURIA", s: 2, w: true } },
  ],
  // Round 2
  [
    { p1: { name: "SENTINELS", s: 2, w: true }, p2: { name: "G2", s: 1 } },
    { p1: { name: "LEVIATAN", s: 2, w: true }, p2: { name: "FURIA", s: 0 } },
  ],
  // Round 3
  [
    { p1: { name: "SENTINELS", s: 1 }, p2: { name: "LEVIATAN", s: 2, w: true } },
  ]
];

const RIGHT_BRACKET = [
  // Round 1
  [
    { p1: { name: "FNATIC", s: 2, w: true }, p2: { name: "LIQUID", s: 0 } },
    { p1: { name: "NAVI", s: 1 }, p2: { name: "VITALITY", s: 2, w: true } },
    { p1: { name: "DRX", s: 2, w: true }, p2: { name: "ZETA", s: 0 } },
    { p1: { name: "PRX", s: 2, w: true }, p2: { name: "GEN.G", s: 1 } },
  ],
  // Round 2
  [
    { p1: { name: "FNATIC", s: 2, w: true }, p2: { name: "VITALITY", s: 1 } },
    { p1: { name: "DRX", s: 1 }, p2: { name: "PRX", s: 2, w: true } },
  ],
  // Round 3
  [
    { p1: { name: "FNATIC", s: 1 }, p2: { name: "PRX", s: 2, w: true } },
  ]
];

const GRAND_FINAL = { p1: { name: "LEVIATAN", s: 3, w: true }, p2: { name: "PRX", s: 2 } };


// --- COMPONENTS ---

const Team = ({ data }) => (
  <div className={`${styles.teamRow} ${data.w ? styles.winner : styles.loser}`}>
    <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%'}}>
      {data.name}
    </span>
    <span className={styles.score}>{data.s}</span>
  </div>
);

const Match = ({ data, isFinal }) => (
  <div className={`${styles.matchBox} ${isFinal ? styles.finalBox : ''}`}>
    <Team data={data.p1} />
    {/* A thin neon divider line */}
    <div style={{height: '1px', background: 'rgba(255,255,255,0.05)', width: '100%'}}></div>
    <Team data={data.p2} />
  </div>
);

const Conference = ({ rounds, side }) => (
  <div className={`${styles.conference} ${styles[side + 'Side']}`} style={{display:'flex', flexDirection: side === 'right' ? 'row-reverse' : 'row', gap: '30px'}}>
    {rounds.map((roundMatches, colIndex) => (
      <div key={colIndex} className={styles.column}>
        {roundMatches.map((match, matchIndex) => {
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
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;700&display=swap');
        body { margin: 0; background: #05050a; }
      `}</style>
      
      <div className={styles.container}>
        <div className={styles.bracketBoard}>
          
          <Conference rounds={LEFT_BRACKET} side="left" />

          <div className={styles.finalColumn}>
            <div className={styles.trophy}>🏆</div>
            <Match data={GRAND_FINAL} isFinal={true} />
            <div style={{marginTop:'10px', fontSize:'10px', color:'#00f3ff', letterSpacing:'2px'}}>CHAMPIONSHIP</div>
          </div>

          <Conference rounds={RIGHT_BRACKET} side="right" />

        </div>
      </div>
    </>
  );
}