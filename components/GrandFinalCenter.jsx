// components/GrandFinalCenter.jsx
import React from "react";
import styles from "../styles/Valorant.module.css";

export default function GrandFinalCenter({ wbChampion, lbChampion, champion }) {
  const grand = champion || "TBD";
  const wb = wbChampion || "TBD";
  const lb = lbChampion || "TBD";

  return (
    <section className={styles.card}>
      <div className="gfWrapper">
        {/* LEFT: paths (WB / LB champions) */}
        <div className="sideCol">
          <div className="pathBox">
            <div className="pathLabel">Winners Bracket Champion</div>
            <div className="pathName">{wb}</div>
          </div>
          <div className="pathBox">
            <div className="pathLabel">Losers Bracket Champion</div>
            <div className="pathName">{lb}</div>
          </div>
        </div>

        {/* CENTER: GRAND CHAMPION */}
        <div className="centerCol">
          <div className="gfTag">Grand Final</div>
          <div className="gfTitle">Tournament Champion</div>
          <div className="gfName">{grand}</div>
          <div className="gfSub">
            Winner of Winners Bracket vs Losers Bracket
          </div>
        </div>

        {/* RIGHT: simple summary */}
        <div className="sideCol rightCol">
          <div className="summaryBox">
            <div className="summaryLabel">Path to Glory</div>
            <ul className="summaryList">
              <li>Upper bracket winner: {wb}</li>
              <li>Lower bracket winner: {lb}</li>
              <li>Grand champion: {grand}</li>
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        .gfWrapper {
          display: grid;
          grid-template-columns: 1.2fr 1.6fr 1.2fr;
          gap: 20px;
          align-items: stretch;
        }
        @media (max-width: 980px) {
          .gfWrapper {
            grid-template-columns: 1fr;
          }
        }
        .sideCol {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .rightCol {
          align-items: stretch;
        }

        .pathBox {
          background: #050816;
          border-radius: 12px;
          border: 1px solid #1f2937;
          padding: 10px 12px;
        }
        .pathLabel {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #9ca3af;
          margin-bottom: 4px;
        }
        .pathName {
          font-size: 14px;
          font-weight: 700;
          color: #e5e7eb;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .centerCol {
          text-align: center;
          background: radial-gradient(circle at top, #1f2937 0, #020617 55%);
          border-radius: 16px;
          border: 1px solid #4b5563;
          padding: 18px 16px 20px;
          box-shadow: 0 0 20px rgba(15, 23, 42, 0.8);
        }
        .gfTag {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #93c5fd;
          margin-bottom: 4px;
        }
        .gfTitle {
          font-size: 15px;
          font-weight: 800;
          color: #e5e7eb;
          margin-bottom: 6px;
        }
        .gfName {
          font-size: 24px;
          font-weight: 900;
          color: #facc15;
          text-shadow: 0 0 10px rgba(250, 204, 21, 0.4);
          margin-bottom: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .gfSub {
          font-size: 12px;
          color: #9ca3af;
        }

        .summaryBox {
          background: #050816;
          border-radius: 12px;
          border: 1px solid #1f2937;
          padding: 10px 12px;
        }
        .summaryLabel {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #9ca3af;
          margin-bottom: 6px;
        }
        .summaryList {
          list-style: none;
          padding: 0;
          margin: 0;
          font-size: 12px;
          color: #e5e7eb;
        }
        .summaryList li + li {
          margin-top: 4px;
        }
      `}</style>
    </section>
  );
}
