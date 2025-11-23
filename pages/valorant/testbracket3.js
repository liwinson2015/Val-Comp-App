import React from 'react';
import styles from '../../styles/testbracket3.module.css';

// --- MOCK DATA ---
const LEFT_BRACKET = [
  [ // Round 1
    { p1: { name: "SENTINELS", s: 2, w: true }, p2: { name: "100 THIEVES", s: 1 } },
    { p1: { name: "CLOUD9", s: 0 }, p2: { name: "G2 ESPORTS", s: 2, w: true } },
    { p1: { name: "KRU", s: 1 }, p2: { name: "LEVIATAN", s: 2, w: true } },
    { p1: { name: "MIBR", s: 0 }, p2: { name: "FURIA", s: 2, w: true } },
  ],
  [ // Round 2
    { p1: { name: "SENTINELS", s: 2, w: true }, p2: { name: "G2", s: 1 } },
    { p1: { name: "LEVIATAN", s: 2, w: true }, p2: { name: "FURIA", s: 0 } },
  ],
  [ // Round 3
    { p1: { name: "SENTINELS", s: 1 }, p2: { name: "LEVIATAN", s: 2, w: true } },
  ]
];

const RIGHT_BRACKET = [
  [
    { p1: { name: "FNATIC", s: 2, w: true }, p2: { name: "LIQUID", s: 0 } },
    { p1: { name: "NAVI", s: 1 }, p2: { name: "VITALITY", s: 2, w: true } },
    { p1: { name: "DRX", s: 2, w: true }, p2: { name: "ZETA", s: 0 } },
    { p1: { name: "PRX", s: 2, w: true }, p2: { name: "GEN.G", s: 1 } },
  ],
  [
    { p1: { name: "FNATIC", s: 2, w: true }, p2: { name: "VITALITY", s: 1 } },
    { p1: { name: "DRX", s: 1 }, p2: { name: "PRX", s: 2, w: true } },
  ],
  [
    { p1: { name: "FNATIC", s: 1 }, p2: { name: "PRX", s: 2, w: true } },
  ]
];

const GRAND_FINAL = { p1: { name: "LEVIATAN", s: 3, w: true }, p2: { name: "PRX", s: 2 } };


// --- SUB-COMPONENTS ---

const Team = ({ data }) => (
  <div className={`${styles.teamRow} ${data.w ? styles.winner : styles.loser}`}>
    <div style={{display:'flex', alignItems:'center'}}>
        {/* Placeholder for Team Logo - visual detail */}
        <div className={styles.teamLogo}></div>
        <span>{data.name}</span>
    </div>
    <div className={styles.scoreBox}>
        {data.s}
    </div>
  </div>
);

const Match = ({ data, isFinal }) => (
  <div className={`${styles.matchBox} ${isFinal ? styles.finalBox : ''}`}>
    <Team data={data.p1} />
    <Team data={data.p2} />
  </div>
);

const Conference = ({ rounds, side }) => (
  <div className={`${styles.conference} ${styles[side + 'Side']}`} style={{display:'flex', flexDirection: side === 'right' ? 'row-reverse' : 'row', gap: '40px'}}>
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
        body { margin: 0; background: #0b0c15; }
      `}</style>
      
      <div className={styles.container}>
        <div className={styles.bracketBoard}>
          
          <Conference rounds={LEFT_BRACKET} side="left" />

          <div className={styles.finalColumn}>
            <div className={styles.trophy}>🏆</div>
            <Match data={GRAND_FINAL} isFinal={true} />
            <div style={{
                marginTop:'15px', 
                fontSize:'12px', 
                color:'#7000ff', 
                letterSpacing:'4px',
                fontWeight: 'bold',
                textShadow: '0 0 10px rgba(112,0,255,0.6)'
            }}>
                VCT CHAMPIONS
            </div>
          </div>

          <Conference rounds={RIGHT_BRACKET} side="right" />

        </div>
      </div>
    </>
  );
}