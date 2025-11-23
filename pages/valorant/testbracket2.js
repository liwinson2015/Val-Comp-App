import React from 'react';
import styles from '../../styles/testbracket2.module.css';

const MATCHES = {
  left: [[{p1:{n:"SEN",s:2,w:1},p2:{n:"100T",s:1}},{p1:{n:"C9",s:0},p2:{n:"G2",s:2,w:1}},{p1:{n:"KRU",s:1},p2:{n:"LEV",s:2,w:1}},{p1:{n:"MIBR",s:0},p2:{n:"FUR",s:2,w:1}}],[{p1:{n:"SEN",s:2,w:1},p2:{n:"G2",s:1}},{p1:{n:"LEV",s:2,w:1},p2:{n:"FUR",s:0}}],[{p1:{n:"SEN",s:1},p2:{n:"LEV",s:2,w:1}}]],
  right: [[{p1:{n:"FNC",s:2,w:1},p2:{n:"TL",s:0}},{p1:{n:"NAVI",s:1},p2:{n:"VIT",s:2,w:1}},{p1:{n:"DRX",s:2,w:1},p2:{n:"ZETA",s:0}},{p1:{n:"PRX",s:2,w:1},p2:{n:"GEN",s:1}}],[{p1:{n:"FNC",s:2,w:1},p2:{n:"VIT",s:1}},{p1:{n:"DRX",s:1},p2:{n:"PRX",s:2,w:1}}],[{p1:{n:"FNC",s:1},p2:{n:"PRX",s:2,w:1}}]],
  final: {p1:{n:"LEV",s:3,w:1},p2:{n:"PRX",s:2}}
};

const Match = ({ d, final }) => (
  <div className={`${styles.matchBox} ${final ? styles.finalBox : ''}`}>
    <div className={styles.innerContent}>
      <div className={`${styles.teamRow} ${d.p1.w ? styles.winner : styles.loser}`}><span>{d.p1.n}</span><span className={styles.score}>{d.p1.s}</span></div>
      <div style={{height:'1px',background:'#30363d',margin:'2px 0'}}></div>
      <div className={`${styles.teamRow} ${d.p2.w ? styles.winner : styles.loser}`}><span>{d.p2.n}</span><span className={styles.score}>{d.p2.s}</span></div>
    </div>
  </div>
);

const Column = ({ rounds, side }) => (
  <div className={`${styles.side} ${styles[side + 'Side']}`} style={{display:'flex', flexDirection: side==='right'?'row-reverse':'row', gap:'40px'}}>
    {rounds.map((r, i) => (
      <div key={i} className={styles.column}>{r.map((m, j) => {
        const pos = i < rounds.length-1 ? (j%2===0 ? 'top':'bottom') : 'mid';
        return <div key={j} className={styles.matchWrapper} data-pos={pos}><Match d={m} /></div>
      })}</div>
    ))}
  </div>
);

export default function BracketV5() {
  return (
    <>
      <style jsx global>{`body { margin: 0; background: #0d1117; }`}</style>
      <div className={styles.container}>
        <div className={styles.bracketBoard}>
          <Column rounds={MATCHES.left} side="left" />
          <div className={styles.column} style={{alignItems:'center'}}>
            <div className={styles.trophy}>🏆</div>
            <Match d={MATCHES.final} final={true} />
          </div>
          <Column rounds={MATCHES.right} side="right" />
        </div>
      </div>
    </>
  );
}