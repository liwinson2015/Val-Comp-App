// pages/tournaments/[tournamentId]/success.js
import React, { useEffect, useState } from "react";
import styles from "../../../styles/Valorant.module.css";
import { connectToDatabase } from "../../../lib/mongodb";
import Tournament from "../../../models/Tournament";
import TournamentState from "../../../models/TournamentState";

export async function getServerSideProps({ params }) {
  const { tournamentId } = params;

  try {
    await connectToDatabase();

    const tDoc = await Tournament.findOne({ tournamentId }).lean();
    const sDoc = await TournamentState.findOne({ tournamentId }).lean();

    // Name
    const name =
      sDoc?.displayName ||
      tDoc?.name ||
      tournamentId ||
      "Tournament";

    // Start time text (prefer TournamentState.displayTime, then Tournament.meta.displayTime)
    let startText = "TBD";
    const rawTime =
      sDoc?.displayTime ||
      tDoc?.meta?.displayTime ||
      null;

    if (rawTime) {
      const d = new Date(rawTime);
      if (!Number.isNaN(d.getTime())) {
        startText = d.toLocaleString("en-US", {
          timeZone: "America/New_York",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      } else {
        // if it's just a string like "NOV 30 • 7PM ET"
        startText = rawTime;
      }
    }

    // Basic info for the page
    return {
      props: {
        event: {
          id: tournamentId,
          name,
          startText,
          // default URLs
          detailsUrl: `/tournaments/${encodeURIComponent(tournamentId)}`,
        },
      },
    };
  } catch (err) {
    console.error("[tournaments/[tournamentId]/success] GSSP error:", err);
    return {
      props: {
        event: {
          id: tournamentId,
          name: tournamentId || "Tournament",
          startText: "TBD",
          detailsUrl: `/tournaments/${encodeURIComponent(tournamentId)}`,
        },
      },
    };
  }
}

export default function TournamentSuccess({ event }) {
  const [me, setMe] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/whoami", { credentials: "same-origin" });
        const data = await res.json();
        if (data?.user) setMe(data.user);
      } catch {
        // ignore
      }
    })();
  }, []);

  const avatarUrl =
    me?.avatar && me?.discordId
      ? `https://cdn.discordapp.com/avatars/${me.discordId}/${me.avatar}.png?size=64`
      : null;

  return (
    <div className={styles.shell}>
      <div className={styles.contentWrap}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className="success-badge">Registration Complete</div>
            <h1 className={styles.heroTitle}>{event.name}</h1>
            <p className={styles.heroSubtitle}>
              You’re locked in. We’ll DM you on Discord with check-in and bracket details.
            </p>
          </div>
        </section>

        {/* Success card */}
        <section className="success-card">
          <div className="row">
            <div className="left">
              <div className="pill pill-green">
                <span className="dot" /> Confirmed
              </div>

              <div className="event-name">{event.name}</div>

              <div className="meta">
                <div>
                  <div className="label">Tournament ID</div>
                  <div className="value">#{event.id}</div>
                </div>
                <div>
                  <div className="label">Starts (ET)</div>
                  <div className="value">{event.startText}</div>
                </div>
                <div>
                  <div className="label">Format</div>
                  <div className="value">1v1 • Double Elimination</div>
                </div>
              </div>

              <div className="cta-row">
                <a href="/account/registrations" className="btn primary">
                  View my registrations
                </a>
                <a href={event.detailsUrl} className="btn outline">
                  Event details
                </a>
                <a href="/" className="btn ghost">
                  Return Home
                </a>
              </div>
            </div>

            <div className="right">
              <div className="mini-card">
                <div className="mini-title">Player</div>
                <div className="player">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="avatar" />
                  ) : (
                    <div className="avatar placeholder" />
                  )}
                  <div className="pinfo">
                    <div className="uname">{me?.username || "Logged in"}</div>
                    <div className="uid">
                      {me?.discordId ? `Discord ID: ${me.discordId}` : " "}
                    </div>
                  </div>
                </div>
                <div className="tip">
                  Check-in opens 15 minutes before start in{" "}
                  <strong>#check-in</strong> on Discord.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Optional notes card */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>What happens next?</h2>
          </div>
          <ul className={styles.rulesList}>
            <li>Join the Discord and watch for pings from admins.</li>
            <li>Be online at the posted start time; no-shows may be replaced by subs.</li>
            <li>
              Report your score in <strong>#match-report</strong> with a screenshot.
            </li>
          </ul>
        </section>
      </div>

      {/* Scoped styles (copied from your old success page) */}
      <style jsx>{`
        .success-badge {
          display: inline-block;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #b6f3c8;
          border: 1px solid rgba(60, 255, 140, 0.45);
          border-radius: 999px;
          background: rgba(60, 255, 140, 0.08);
          box-shadow: 0 8px 30px rgba(60, 255, 140, 0.18);
        }

        .success-card {
          position: relative;
          padding: 20px;
          border-radius: 18px;
          background:
            radial-gradient(
              1400px 240px at 50% -60%,
              rgba(60, 255, 140, 0.14),
              rgba(0, 0, 0, 0) 60%
            ),
            linear-gradient(
              180deg,
              rgba(18, 24, 20, 0.92),
              rgba(14, 16, 14, 0.96)
            );
          border: 1px solid rgba(60, 255, 140, 0.25);
          box-shadow:
            0 0 0 1px rgba(60, 255, 140, 0.12) inset,
            0 18px 60px rgba(0, 0, 0, 0.45);
          margin-top: 8px;
        }

        .row {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 18px;
        }
        @media (max-width: 820px) {
          .row {
            grid-template-columns: 1fr;
          }
        }

        .pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.05em;
          border: 1px solid transparent;
        }
        .pill-green {
          color: #b6f3c8;
          background: rgba(60, 255, 140, 0.1);
          border-color: rgba(60, 255, 140, 0.35);
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #3cff8c;
          box-shadow: 0 0 12px rgba(60, 255, 140, 0.7);
        }

        .event-name {
          margin-top: 10px;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 0.02em;
          color: #ffffff;
        }

        .meta {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        @media (max-width: 640px) {
          .meta {
            grid-template-columns: 1fr;
          }
        }
        .label {
          color: #8b93a7;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
        }
        .value {
          color: #e6e7eb;
          font-size: 14px;
          margin-top: 2px;
        }

        .cta-row {
          margin-top: 16px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .btn {
          display: inline-block;
          text-decoration: none;
          font-weight: 800;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
        }
        .primary {
          background: #ff0046;
          color: #fff;
          box-shadow: 0 10px 30px rgba(255, 0, 70, 0.35);
        }
        .outline {
          background: #1a1a1f;
          color: #e6e7eb;
          border: 1px solid #2b2f37;
        }
        .ghost {
          background: transparent;
          color: #c4c7d0;
          border: 1px dashed #2b2f37;
        }

        .mini-card {
          background: rgba(10, 10, 14, 0.6);
          border: 1px solid #262938;
          border-radius: 12px;
          padding: 14px;
          height: 100%;
        }
        .mini-title {
          color: #8b93a7;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 800;
          margin-bottom: 8px;
        }
        .player {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .avatar {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          object-fit: cover;
          border: 1px solid #2e2e2e;
        }
        .avatar.placeholder {
          background: #2e2e2e;
        }
        .pinfo .uname {
          color: #e6e7eb;
          font-weight: 800;
        }
        .pinfo .uid {
          color: #9aa2b2;
          font-size: 12px;
        }
        .tip {
          margin-top: 10px;
          color: #b6b8be;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}
