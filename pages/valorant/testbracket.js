// pages/valorant/testbracket.js
import React from 'react';
// Note the double dot to go up two levels: pages/valorant -> pages -> root -> styles
import styles from '../../styles/testbracket.module.css';

// --- Mock Data (16 Player Bracket) ---
const BRACKET_DATA = [
  {
    id: "r16",
    name: "Round of 16",
    matches: [
      { id: "m1", p1: { name: "Tenz", score: 2, winner: true }, p2: { name: "Yay", score: 1 } },
      { id: "m2", p1: { name: "Boaster", score: 0 }, p2: { name: "Derke", score: 2, winner: true } },
      { id: "m3", p1: { name: "Aspas", score: 2, winner: true }, p2: { name: "Sacy", score: 0 } },
      { id: "m4", p1: { name: "Chronicle", score: 1 }, p2: { name: "Leo", score: 2, winner: true } },
      { id: "m5", p1: { name: "Demon1", score: 2, winner: true }, p2: { name: "Jawgemo", score: 1 } },
      { id: "m6", p1: { name: "Boostio", score: 0 }, p2: { name: "Ethan", score: 2, winner: true } },
      { id: "m7", p1: { name: "Jinggg", score: 2, winner: true }, p2: { name: "Forsaken", score: 1 } },
      { id: "m8", p1: { name: "Something", score: 2, winner: true }, p2: { name: "Mindfreak", score: 0 } },
    ],
  },
  {
    id: "qf",
    name: "Quarterfinals",
    matches: [
      { id: "q1", p1: { name: "Tenz", score: 1 }, p2: { name: "Derke", score: 2, winner: true } },
      { id: "q2", p1: { name: "Aspas", score: 2, winner: true }, p2: { name: "Leo", score: 1 } },
      { id: "q3", p1: { name: "Demon1", score: 2, winner: true }, p2: { name: "Ethan", score: 0 } },
      { id: "q4", p1: { name: "Jinggg", score: 1 }, p2: { name: "Something", score: 2, winner: true } },
    ],
  },
  {
    id: "sf",
    name: "Semifinals",
    matches: [
      { id: "s1", p1: { name: "Derke", score: 1 }, p2: { name: "Aspas", score: 2, winner: true } },
      { id: "s2", p1: { name: "Demon1", score: 2, winner: true }, p2: { name: "Something", score: 0 } },
    ],
  },
  {
    id: "gf",
    name: "Grand Final",
    matches: [
      { id: "f1", p1: { name: "Aspas", score: 3 }, p2: { name: "Demon1", score: 1, winner: true } }, // Demon1 wins in my book!
    ],
  },
];

// --- Components ---

const Matchup = ({ matchData, index }) => {
  // Helper to determine if this match is "Even" or "Odd" in the list
  // This determines if the connecting line goes UP or DOWN
  const isEven = index % 2 === 0;

  return (
    <div className={styles.matchupWrapper} data-even={isEven}>
      <div className={styles.matchupCard}>
        {/* Player 1 */}
        <div className={`${styles.playerSlot} ${matchData.p1.winner ? styles.winner : styles.loser}`}>
          <span>{matchData.p1.name}</span>
          <span className={styles.score}>{matchData.p1.score}</span>
        </div>
        
        {/* Divider */}
        <div style={{ height: '1px', background: '#444c55', width: '100%' }}></div>
        
        {/* Player 2 */}
        <div className={`${styles.playerSlot} ${matchData.p2.winner ? styles.winner : styles.loser}`}>
          <span>{matchData.p2.name}</span>
          <span className={styles.score}>{matchData.p2.score}</span>
        </div>
      </div>
    </div>
  );
};

const TestBracket = () => {
  return (
    <>
      {/* Optional: Load a font that looks like Valorant's */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap');
      `}</style>

      <div className={styles.bracketContainer}>
        <div className={styles.bracketGrid}>
          {BRACKET_DATA.map((round, roundIndex) => (
            <div key={round.id} className={styles.roundColumn}>
              <h3 className={styles.roundTitle}>{round.name}</h3>
              
              {round.matches.map((match, matchIndex) => (
                <Matchup 
                  key={match.id} 
                  matchData={match} 
                  index={matchIndex} 
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default TestBracket;