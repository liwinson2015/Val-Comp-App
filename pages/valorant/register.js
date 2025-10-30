// pages/valorant/register.js
import * as cookie from "cookie";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import Registration from "../../models/Registration";
import { useState } from "react";

const TOURNAMENT_ID = "VALO-SOLO-SKIRMISH-1";

export async function getServerSideProps({ req }) {
  try {
    // 1️⃣ Parse cookies safely
    const cookies = cookie?.parse
      ? cookie.parse(req.headers.cookie || "")
      : {};
    const playerId = cookies.playerId || null;

    // 2️⃣ If not logged in → force Discord auth
    if (!playerId) {
      return { redirect: { destination: "/api/auth/discord", permanent: false } };
    }

    // 3️⃣ Connect to DB
    await connectToDatabase();

    // 4️⃣ Load player from DB
    const player = await Player.findById(playerId).lean();
    if (!player) {
      return { redirect: { destination: "/api/auth/discord", permanent: false } };
    }

    // 5️⃣ Check if this player already registered for this tourney
    // Registration collection: { tournament, discordTag }
    const regByCollection = await Registration.findOne({
      tournament: TOURNAMENT_ID,
      discordTag: player.discordId,
    }).lean();

    // Player.registeredFor array
    const regByPlayerArray = Array.isArray(player.registeredFor)
      ? player.registeredFor.some((r) => r?.tournamentId === TOURNAMENT_ID)
      : false;

    const alreadyRegistered = !!(regByCollection || regByPlayerArray);

    return {
      props: {
        username: player.username || "",
        discordId: player.discordId || "",
        avatar: player.avatar || "",
        playerId: player._id.toString(),
        alreadyRegistered,
      },
    };
  } catch (err) {
    console.error("[register/gssp] ERROR:", err?.stack || err);
    // Don’t 500 — render soft error instead
    return {
      props: {
        gsspError: true,
        errorMessage: err?.message || "Unknown server error",
      },
    };
  }
}

export default function ValorantRegisterPage(props) {
  const {
    username,
    discordId,
    avatar,
    playerId,
    alreadyRegistered,
    gsspError,
    errorMessage,
  } = props || {};

  const [ign, setIgn] = useState("");
  const [rank, setRank] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  // 6️⃣ Fallback error UI
  if (gsspError) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f0f0f", color: "white", padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Something went wrong</h1>
        <p style={{ opacity: 0.8 }}>Please refresh in a few seconds.</p>
        <pre style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>{errorMessage}</pre>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const res = await fetch("/api/registration/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          tournamentId: TOURNAMENT_ID,
          ign,
          rank,
        }),
      });

      if (!res.ok) {
        if (res.status === 409) {
          window.location.href = "/valorant/already";
          return;
        }
        const text = await res.text();
        setMessage("Error: " + text);
      } else {
        window.location.href = "/valorant/success";
        return;
      }
    } catch (err) {
      setMessage("Network error submitting registration.");
    } finally {
      setSubmitting(false);
    }
  }

  const avatarUrl =
    avatar && discordId
      ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=128`
      : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f0f0f",
        color: "white",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Inter", Roboto, sans-serif',
        padding: "2rem 1rem",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background:
            "radial-gradient(circle at 20% 20%, rgba(255,0,70,0.15) 0%, rgba(20,20,20,0) 60%), #1a1a1a",
          border: "1px solid #2d2d2d",
          borderRadius: "1rem",
          boxShadow:
            "0 30px 120px rgba(255,0,70,0.25), 0 10px 40px rgba(0,0,0,.8)",
          padding: "1.5rem 1.5rem 2rem",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.15em",
              fontWeight: 600,
              color: "#ff0046",
              textTransform: "uppercase",
              marginBottom: "0.4rem",
            }}
          >
            Valorant Solo Skirmish #1
          </div>
          <div
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              lineHeight: 1.2,
              color: "white",
            }}
          >
            Tournament Registration
          </div>
          <div
            style={{
              fontSize: "0.8rem",
              lineHeight: 1.4,
              color: "#9ca3af",
              marginTop: "0.5rem",
            }}
          >
            1v1 aim duels, bragging rights, prize TBD. Finish below to lock your spot.
          </div>
        </div>

        {/* Player card */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            backgroundColor: "#262626",
            border: "1px solid #3f3f46",
            borderRadius: "0.75rem",
            padding: "0.75rem 1rem",
            marginBottom: "1.5rem",
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="discord avatar"
              style={{
                borderRadius: "0.5rem",
                width: "56px",
                height: "56px",
                border: "1px solid #52525b",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                borderRadius: "0.5rem",
                width: "56px",
                height: "56px",
                backgroundColor: "#3f3f46",
                border: "1px solid #52525b",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: "0.6rem",
                color: "#a1a1aa",
              }}
            >
              no avatar
            </div>
          )}

          <div style={{ lineHeight: 1.3 }}>
            <div style={{ color: "white", fontWeight: 600, fontSize: "0.9rem" }}>
              {username}
            </div>
            <div
              style={{
                color: "#a1a1aa",
                fontSize: "0.7rem",
                wordBreak: "break-word",
              }}
            >
              Discord ID {discordId}
            </div>
          </div>
        </div>

        {/* CASE 1: already registered */}
        {alreadyRegistered ? (
          <>
            <div
              style={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "0.75rem",
                padding: "1rem",
                textAlign: "center",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "#fff",
                  marginBottom: "0.5rem",
                }}
              >
                You’re already locked in ✅
              </div>
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#9ca3af",
                  lineHeight: 1.4,
                }}
              >
                You are registered for this tournament. We’ll DM you on Discord with schedule / bracket.
              </div>
            </div>

            <a
              href="/"
              style={{
                display: "block",
                textAlign: "center",
                width: "100%",
                backgroundColor: "#ff0046",
                color: "white",
                fontWeight: 600,
                fontSize: "0.9rem",
                borderRadius: "0.6rem",
                padding: "0.75rem 1rem",
                textDecoration: "none",
                boxShadow:
                  "0 15px 60px rgba(255,0,70,0.5), 0 4px 20px rgba(0,0,0,.8)",
              }}
            >
              Return Home
            </a>
          </>
        ) : (
          <>
            {/* CASE 2: not registered yet: show form */}
            <div
              style={{
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "0.5rem",
              }}
            >
              Your tournament info
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    color: "#e5e7eb",
                    marginBottom: "0.4rem",
                  }}
                >
                  In-game name (IGN) *
                </label>
                <input
                  required
                  value={ign}
                  onChange={(e) => setIgn(e.target.value)}
                  placeholder="example: 5TQ#NA1"
                  style={{
                    width: "100%",
                    backgroundColor: "#0f0f10",
                    border: "1px solid #4b5563",
                    borderRadius: "0.5rem",
                    padding: "0.6rem 0.75rem",
                    color: "white",
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    color: "#e5e7eb",
                    marginBottom: "0.4rem",
                  }}
                >
                  Current rank *
                </label>
                <input
                  required
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  placeholder="Ascendant / Immortal / Radiant / etc"
                  style={{
                    width: "100%",
                    backgroundColor: "#0f0f10",
                    border: "1px solid #4b5563",
                    borderRadius: "0.5rem",
                    padding: "0.6rem 0.75rem",
                    color: "white",
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: "100%",
                  backgroundColor: submitting ? "#4b5563" : "#ff0046",
                  color: "white",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  border: "none",
                  borderRadius: "0.6rem",
                  padding: "0.75rem 1rem",
                  cursor: submitting ? "not-allowed" : "pointer",
                  boxShadow:
                    "0 15px 60px rgba(255,0,70,0.5), 0 4px 20px rgba(0,0,0,.8)",
                  transition: "background-color .15s",
                }}
              >
                {submitting ? "Submitting..." : "Confirm Registration"}
              </button>

              {message && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    fontSize: "0.8rem",
                    color: "#e5e7eb",
                    lineHeight: 1.4,
                    textAlign: "center",
                  }}
                >
                  {message}
                </div>
              )}
            </form>

            <div
              style={{
                marginTop: "1.5rem",
                fontSize: "0.7rem",
                lineHeight: 1.4,
                color: "#6b7280",
                textAlign: "center",
              }}
            >
              By confirming, you agree to play at the scheduled time. No smurfing. No cheats. Clips may be streamed.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
