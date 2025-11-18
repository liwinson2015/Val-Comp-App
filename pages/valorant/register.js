// pages/valorant/register.js
import * as cookie from "cookie";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import Registration from "../../models/Registration";
import { useState } from "react";

const TOURNAMENT_ID = "VALO-SOLO-SKIRMISH-1";
const MAX_SLOTS = 16;

const VALORANT_RANK_TIERS = [
  "Iron",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Ascendant",
  "Immortal",
  "Radiant",
];

const VALORANT_DIVISIONS = ["1", "2", "3"];

// ---------- SERVER SIDE ----------
export async function getServerSideProps({ req }) {
  try {
    await connectToDatabase();

    const cookies = cookie.parse(req.headers.cookie || "");
    const playerId = cookies.playerId || null;

    // Require login via Discord
    if (!playerId) {
      const next = "/valorant/register";
      const encoded = encodeURIComponent(next);
      return {
        redirect: {
          destination: `/api/auth/discord?next=${encoded}`,
          permanent: false,
        },
      };
    }

    const player = await Player.findById(playerId).lean();
    if (!player) {
      const next = "/valorant/register";
      const encoded = encodeURIComponent(next);
      return {
        redirect: {
          destination: `/api/auth/discord?next=${encoded}`,
          permanent: false,
        },
      };
    }

    // ✅ Use Player collection to compute slots used
    const currentCount = await Player.countDocuments({
      "registeredFor.tournamentId": TOURNAMENT_ID,
    });

    // If full, ALWAYS redirect to "full" page (prevents manual URL entry)
    if (currentCount >= MAX_SLOTS) {
      return {
        redirect: {
          destination: "/tournaments-hub/valorant-types?full=1",
          permanent: false,
        },
      };
    }

    // Check if this player is already registered (Registration collection)
    const alreadyInRegistration = await Registration.findOne({
      discordTag: player.discordId,
      tournament: TOURNAMENT_ID,
    }).lean();

    // And also in Player.registeredFor array
    const alreadyInPlayerArray = (player.registeredFor || []).some(
      (entry) => entry.tournamentId === TOURNAMENT_ID
    );

    const alreadyRegistered = !!(alreadyInRegistration || alreadyInPlayerArray);

    return {
      props: {
        username: player.username || player.discordTag || "",
        discordId: player.discordId || "",
        avatar: player.avatar || player.discordAvatar || null,
        playerId: String(player._id),
        alreadyRegistered,
        gsspError: false,
        errorMessage: "",
      },
    };
  } catch (err) {
    console.error("[valorant/register] getServerSideProps error:", err);
    return {
      props: {
        username: "",
        discordId: "",
        avatar: null,
        playerId: null,
        alreadyRegistered: false,
        gsspError: true,
        errorMessage: String(err?.message || err),
      },
    };
  }
}

// ---------- CLIENT SIDE ----------
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

  const [riotName, setRiotName] = useState("");
  const [riotTag, setRiotTag] = useState("");
  const [peakRankTier, setPeakRankTier] = useState("");
  const [peakRankDivision, setPeakRankDivision] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  if (gsspError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f0f0f",
          color: "white",
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
          Something went wrong
        </h1>
        <p style={{ opacity: 0.8 }}>Please refresh in a few seconds.</p>
        <pre
          style={{
            marginTop: 12,
            fontSize: 12,
            opacity: 0.7,
            whiteSpace: "pre-wrap",
          }}
        >
          {errorMessage}
        </pre>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (alreadyRegistered) return;

    const nameTrimmed = riotName.trim();
    const tagTrimmed = riotTag.trim();

    if (!nameTrimmed || !tagTrimmed || !peakRankTier || !peakRankDivision) {
      setMessage("Please fill in your Riot ID and peak rank.");
      return;
    }

    const ign = `${nameTrimmed}#${tagTrimmed}`; // e.g. "5TQ#NA1"
    const rank = `${peakRankTier} ${peakRankDivision}`; // e.g. "Gold 2"

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
        const text = await res.text();
        setMessage("Error: " + text);
      } else {
        window.location.href = "/valorant/success";
      }
    } catch (err) {
      console.error("registration submit error:", err);
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
            1v1 aim duels, bragging rights, prize TBD. Finish below to lock
            your spot.
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
            <div
              style={{ color: "white", fontWeight: 600, fontSize: "0.9rem" }}
            >
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

        {/* Form */}
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
          {/* Riot ID (IGN) split into name + tag */}
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
              Riot ID (IGN) *
              <span style={{ marginLeft: 4, color: "#9ca3af", fontSize: "0.75rem" }}>
                (Name and Tagline)
              </span>
            </label>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                required
                value={riotName}
                onChange={(e) => setRiotName(e.target.value)}
                placeholder="Name (e.g. 5TQ)"
                disabled={alreadyRegistered}
                style={{
                  flex: 2,
                  backgroundColor: "#0f0f10",
                  border: "1px solid #4b5563",
                  borderRadius: "0.5rem",
                  padding: "0.6rem 0.75rem",
                  color: alreadyRegistered ? "#6b7280" : "white",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
              <div
                style={{
                  color: "#9ca3af",
                  fontSize: "0.9rem",
                  paddingBottom: "0.1rem",
                }}
              >
                #
              </div>
              <input
                required
                value={riotTag}
                onChange={(e) => setRiotTag(e.target.value)}
                placeholder="Tag (e.g. NA1)"
                disabled={alreadyRegistered}
                style={{
                  flex: 1,
                  backgroundColor: "#0f0f10",
                  border: "1px solid #4b5563",
                  borderRadius: "0.5rem",
                  padding: "0.6rem 0.75rem",
                  color: alreadyRegistered ? "#6b7280" : "white",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Peak Rank: tier + division */}
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
              Peak rank (Valorant) *
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <select
                required
                value={peakRankTier}
                onChange={(e) => setPeakRankTier(e.target.value)}
                disabled={alreadyRegistered}
                style={{
                  flex: 2,
                  backgroundColor: "#0f0f10",
                  border: "1px solid #4b5563",
                  borderRadius: "0.5rem",
                  padding: "0.6rem 0.75rem",
                  color: alreadyRegistered ? "#6b7280" : "white",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              >
                <option value="">Select rank</option>
                {VALORANT_RANK_TIERS.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </select>

              <select
                required
                value={peakRankDivision}
                onChange={(e) => setPeakRankDivision(e.target.value)}
                disabled={alreadyRegistered || !peakRankTier}
                style={{
                  flex: 1,
                  backgroundColor: "#0f0f10",
                  border: "1px solid #4b5563",
                  borderRadius: "0.5rem",
                  padding: "0.6rem 0.75rem",
                  color:
                    alreadyRegistered || !peakRankTier ? "#6b7280" : "white",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              >
                <option value="">Div</option>
                {VALORANT_DIVISIONS.map((div) => (
                  <option key={div} value={div}>
                    {div}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || alreadyRegistered}
            style={{
              width: "100%",
              backgroundColor: alreadyRegistered
                ? "#4b5563"
                : submitting
                ? "#4b5563"
                : "#ff0046",
              color: "white",
              fontWeight: 600,
              fontSize: "0.9rem",
              border: "none",
              borderRadius: "0.6rem",
              padding: "0.75rem 1rem",
              cursor:
                submitting || alreadyRegistered ? "not-allowed" : "pointer",
              boxShadow: alreadyRegistered
                ? "none"
                : "0 15px 60px rgba(255,0,70,0.5), 0 4px 20px rgba(0,0,0,.8)",
              opacity: alreadyRegistered ? 0.6 : 1,
              transition: "background-color .15s",
            }}
          >
            {alreadyRegistered
              ? "Already Registered"
              : submitting
              ? "Submitting..."
              : "Confirm Registration"}
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
          By confirming, you agree to play at the scheduled time. No smurfing.
          No cheats. Clips may be streamed.
        </div>
      </div>
    </div>
  );
}
