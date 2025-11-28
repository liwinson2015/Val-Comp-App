// pages/tournaments/[tournamentId]/register.js
import * as cookie from "cookie";
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";
import Tournament from "../../../models/Tournament";
import Registration from "../../../models/Registration";
import { useState } from "react";

const FALLBACK_CAPACITY = 16;

const GAME_LABELS = {
  VALORANT: "Valorant",
  HOK: "Honor of Kings",
  TFT: "Teamfight Tactics",
};

// Extract per-game profile info from Player.gameProfiles[gameCode]
function extractGameProfile(player, gameCode) {
  if (!player) {
    return {
      ignFromProfile: "",
      tagFromProfile: "",
      rankTierFromProfile: "",
      rankDivisionFromProfile: "",
      regionFromProfile: "",
      hokPeakScoreFromProfile: null,
    };
  }

  const profiles = player.gameProfiles || {};
  const profile = profiles[gameCode] || {};

  let ignFromProfile = "";
  let tagFromProfile = "";

  // VALORANT stores "Name#Tag" in ign; others use ign = name only
  if (gameCode === "VALORANT") {
    const storedIgn = profile.ign || "";
    if (storedIgn) {
      const parts = storedIgn.split("#");
      ignFromProfile = (parts[0] || "").trim();
      tagFromProfile = (parts[1] || "").trim();
    }
  } else {
    ignFromProfile = profile.ign || "";
    tagFromProfile = "";
  }

  const rankTierFromProfile = profile.rankTier || "";
  const rankDivisionFromProfile = profile.rankDivision || "";
  const regionFromProfile = profile.region || "";
  const hokPeakScoreFromProfile =
    typeof profile.hokPeakScore === "number" ? profile.hokPeakScore : null;

  return {
    ignFromProfile,
    tagFromProfile,
    rankTierFromProfile,
    rankDivisionFromProfile,
    regionFromProfile,
    hokPeakScoreFromProfile,
  };
}

// ---------- SERVER SIDE ----------
export async function getServerSideProps({ req, params }) {
  const { tournamentId } = params;

  try {
    await connectToDatabase();

    const cookies = cookie.parse(req.headers.cookie || "");
    const playerId = cookies.playerId || null;

    // Require login via Discord
    if (!playerId) {
      const next = `/tournaments/${encodeURIComponent(
        tournamentId
      )}/register`;
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
      const next = `/tournaments/${encodeURIComponent(
        tournamentId
      )}/register`;
      const encoded = encodeURIComponent(next);
      return {
        redirect: {
          destination: `/api/auth/discord?next=${encoded}`,
          permanent: false,
        },
      };
    }

    // Load tournament
    const tournamentDoc = await Tournament.findOne({
      tournamentId,
    }).lean();

    if (!tournamentDoc) {
      return { notFound: true };
    }

    const capacity =
      typeof tournamentDoc.capacity === "number"
        ? tournamentDoc.capacity
        : FALLBACK_CAPACITY;

    // Check if THIS player is already registered
    const alreadyInRegistration = await Registration.findOne({
      discordTag: player.discordId,
      tournament: tournamentId,
    }).lean();

    const alreadyInPlayerArray = (player.registeredFor || []).some(
      (entry) => entry.tournamentId === tournamentId
    );

    const alreadyRegistered = !!(alreadyInRegistration || alreadyInPlayerArray);

    // Use Player collection as source of truth for slots
    const currentSlotsUsed = await Player.countDocuments({
      "registeredFor.tournamentId": tournamentId,
    });

    // If full AND user is not already registered → block access to register
    if (currentSlotsUsed >= capacity && !alreadyRegistered) {
      return {
        redirect: {
          destination: "/tournaments-hub/valorant-types?full=1",
          permanent: false,
        },
      };
    }

    const meta = tournamentDoc.meta || {};

    const displayName = tournamentDoc.name || "Tournament";
    const heroBadge = meta.displayGameLabel || "Tournament";

    const gameCode = tournamentDoc.gameCode || "VALORANT";
    const registrationType = tournamentDoc.registrationType || "SOLO";

    const {
      ignFromProfile,
      tagFromProfile,
      rankTierFromProfile,
      rankDivisionFromProfile,
      regionFromProfile,
      hokPeakScoreFromProfile,
    } = extractGameProfile(player, gameCode);

    return {
      props: {
        username: player.username || player.discordTag || "",
        discordId: player.discordId || "",
        avatar: player.avatar || player.discordAvatar || null,
        playerId: String(player._id),
        alreadyRegistered,
        gsspError: false,
        errorMessage: "",
        tournamentId,
        displayName,
        heroBadge,
        gameCode,
        registrationType,
        ignFromProfile: ignFromProfile || "",
        tagFromProfile: tagFromProfile || "",
        rankTierFromProfile: rankTierFromProfile || "",
        rankDivisionFromProfile: rankDivisionFromProfile || "",
        regionFromProfile: regionFromProfile || "",
        hokPeakScoreFromProfile:
          hokPeakScoreFromProfile !== null ? hokPeakScoreFromProfile : "",
      },
    };
  } catch (err) {
    console.error(
      "[tournaments/[tournamentId]/register] getServerSideProps error:",
      err
    );
    return {
      props: {
        username: "",
        discordId: "",
        avatar: null,
        playerId: null,
        alreadyRegistered: false,
        gsspError: true,
        errorMessage: String(err?.message || err),
        tournamentId: params.tournamentId || "",
        displayName: "Tournament",
        heroBadge: "Tournament",
        gameCode: "VALORANT",
        registrationType: "SOLO",
        ignFromProfile: "",
        tagFromProfile: "",
        rankTierFromProfile: "",
        rankDivisionFromProfile: "",
        regionFromProfile: "",
        hokPeakScoreFromProfile: "",
      },
    };
  }
}

// ---------- CLIENT SIDE ----------
export default function DynamicRegisterPage(props) {
  const {
    username,
    discordId,
    avatar,
    playerId,
    alreadyRegistered,
    gsspError,
    errorMessage,
    tournamentId,
    displayName,
    heroBadge,
    gameCode,
    registrationType,
    ignFromProfile,
    tagFromProfile,
    rankTierFromProfile,
    rankDivisionFromProfile,
    regionFromProfile,
    hokPeakScoreFromProfile,
  } = props || {};

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  // Combined rank string for non-Valorant games (e.g. "King 50 stars")
  const combinedRankFromProfile =
    rankTierFromProfile && rankDivisionFromProfile
      ? `${rankTierFromProfile} ${rankDivisionFromProfile}`
      : rankTierFromProfile || "";

  // --- VALORANT state ---
  const [riotName, setRiotName] = useState(
    gameCode === "VALORANT" ? ignFromProfile || "" : ""
  );
  const [riotTag, setRiotTag] = useState(
    gameCode === "VALORANT" ? tagFromProfile || "" : ""
  );
  const [peakRankTier, setPeakRankTier] = useState(
    gameCode === "VALORANT" ? rankTierFromProfile || "" : ""
  );
  const [peakRankDivision, setPeakRankDivision] = useState(
    gameCode === "VALORANT" ? rankDivisionFromProfile || "" : ""
  );

  // --- HOK state ---
  const [hokIgn, setHokIgn] = useState(
    gameCode === "HOK" ? ignFromProfile || "" : ""
  );
  const [hokRegion, setHokRegion] = useState(
    gameCode === "HOK" ? regionFromProfile || "" : ""
  );
  const [hokRank, setHokRank] = useState(
    gameCode === "HOK" ? combinedRankFromProfile || "" : ""
  );
  const [hokPeakScore, setHokPeakScore] = useState(
    gameCode === "HOK" ? hokPeakScoreFromProfile || "" : ""
  );

  // --- TFT state ---
  const [tftIgn, setTftIgn] = useState(
    gameCode === "TFT" ? ignFromProfile || "" : ""
  );
  const [tftRegion, setTftRegion] = useState(
    gameCode === "TFT" ? regionFromProfile || "" : ""
  );
  const [tftRank, setTftRank] = useState(
    gameCode === "TFT" ? combinedRankFromProfile || "" : ""
  );

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

  // For now, we only handle SOLO registration with this page
  if (registrationType !== "SOLO") {
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
          Team registration not configured yet
        </h1>
        <p style={{ opacity: 0.8 }}>
          This tournament uses team registration. The new captain + pending flow
          will go here later.
        </p>
      </div>
    );
  }

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

  const hasProfileIgn = !!ignFromProfile;
  const hasProfileRank = !!rankTierFromProfile;
  const hasAnyProfileData = hasProfileIgn || hasProfileRank;

  const gameLabel = GAME_LABELS[gameCode] || "Game";

  async function handleSubmit(e) {
    e.preventDefault();
    if (alreadyRegistered) return;

    let payload = {
      playerId,
      tournamentId,
      gameCode,
    };

    // --- VALORANT SOLO ---
    if (gameCode === "VALORANT") {
      const nameTrimmed = riotName.trim();
      const tagTrimmed = riotTag.trim();
      const needsDivision = peakRankTier && peakRankTier !== "Radiant";

      if (
        !nameTrimmed ||
        !tagTrimmed ||
        !peakRankTier ||
        (needsDivision && !peakRankDivision)
      ) {
        setMessage("Please fill in your Riot ID and peak rank.");
        return;
      }

      const ign = nameTrimmed; // name only
      const fullIgn = `${nameTrimmed}#${tagTrimmed}`; // name#tag

      const rank =
        peakRankTier === "Radiant"
          ? "Radiant"
          : `${peakRankTier} ${peakRankDivision}`;

      payload.ign = ign;
      payload.fullIgn = fullIgn;
      payload.rank = rank;
    }

    // --- HONOR OF KINGS SOLO ---
    else if (gameCode === "HOK") {
      const ignTrimmed = hokIgn.trim();
      const rankTrimmed = hokRank.trim();
      const regionTrimmed = hokRegion.trim();

      if (!ignTrimmed || !rankTrimmed) {
        setMessage(
          "Please fill in your IGN and rank for Honor of Kings."
        );
        return;
      }

      payload.ign = ignTrimmed; // name only
      payload.fullIgn = ignTrimmed; // for history; no tag concept
      payload.rank = rankTrimmed;
      if (regionTrimmed) {
        payload.region = regionTrimmed;
      }

      const peakScoreNum =
        hokPeakScore === "" ? NaN : Number(hokPeakScore);
      if (!Number.isNaN(peakScoreNum)) {
        payload.hokPeakScore = peakScoreNum;
      }
    }

    // --- TFT SOLO ---
    else if (gameCode === "TFT") {
      const ignTrimmed = tftIgn.trim();
      const rankTrimmed = tftRank.trim();
      const regionTrimmed = tftRegion.trim();

      if (!ignTrimmed || !rankTrimmed) {
        setMessage(
          "Please fill in your IGN and peak rank for Teamfight Tactics."
        );
        return;
      }

      payload.ign = ignTrimmed; // name only
      payload.fullIgn = ignTrimmed; // no tag concept
      payload.rank = rankTrimmed;
      if (regionTrimmed) {
        payload.region = regionTrimmed;
      }
    }

    // Unsupported game
    else {
      setMessage(
        "This game's registration form is not configured yet."
      );
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const res = await fetch("/api/registration/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          updateProfileFromRegistration: true,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        setMessage("Error: " + text);
      } else {
        window.location.href = `/tournaments/${encodeURIComponent(
          tournamentId
        )}/success`;
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

  const isRadiant = gameCode === "VALORANT" && peakRankTier === "Radiant";

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
            {heroBadge}
          </div>
          <div
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              lineHeight: 1.2,
              color: "white",
            }}
          >
            {displayName}
          </div>
          <div
            style={{
              fontSize: "0.8rem",
              lineHeight: 1.4,
              color: "#9ca3af",
              marginTop: "0.5rem",
            }}
          >
            Tournament Registration (ID: {tournamentId})
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

        {/* Info / warning about profile */}
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.6rem 0.75rem",
            borderRadius: "0.6rem",
            backgroundColor: "#111827",
            border: "1px solid #374151",
            fontSize: "0.8rem",
            lineHeight: 1.4,
            color: "#e5e7eb",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
            Make sure this matches your in-game {gameLabel} account.
          </div>
          <div style={{ color: "#9ca3af" }}>
            {hasAnyProfileData ? (
              <>
                We pre-filled some details from your {gameLabel} profile.
                Updating them here will also keep your profile in sync.
              </>
            ) : (
              <>
                We weren’t able to find {gameLabel} details on your profile.
                Please fill everything in carefully — these values will be used
                as your profile info for this game and must match your in-game
                details, otherwise you may not be able to play.
              </>
            )}
          </div>
        </div>

        {/* Section label */}
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
          Your {gameLabel} info
        </div>

        <form onSubmit={handleSubmit}>
          {/* VALORANT FORM */}
          {gameCode === "VALORANT" && (
            <>
              {/* Riot ID */}
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
                  <span
                    style={{
                      marginLeft: 4,
                      color: "#9ca3af",
                      fontSize: "0.75rem",
                    }}
                  >
                    (Name and Tagline)
                  </span>
                </label>
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                  }}
                >
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
                <div
                  style={{
                    marginTop: "0.35rem",
                    fontSize: "0.75rem",
                    color: "#9ca3af",
                  }}
                >
                  {hasProfileIgn
                    ? "Loaded IGN from your Valorant profile. Update it here if it’s outdated."
                    : "We couldn’t find your Riot ID on your Valorant profile, so we’ll use what you enter here."}
                </div>
              </div>

              {/* Peak rank */}
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
                    onChange={(e) => {
                      const v = e.target.value;
                      setPeakRankTier(v);
                      if (v === "Radiant") {
                        setPeakRankDivision("");
                      }
                    }}
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
                    value={peakRankDivision}
                    onChange={(e) =>
                      setPeakRankDivision(e.target.value)
                    }
                    disabled={
                      alreadyRegistered || !peakRankTier || isRadiant
                    }
                    style={{
                      flex: 1,
                      backgroundColor: "#0f0f10",
                      border: "1px solid #4b5563",
                      borderRadius: "0.5rem",
                      padding: "0.6rem 0.75rem",
                      color:
                        alreadyRegistered ||
                        !peakRankTier ||
                        isRadiant
                          ? "#6b7280"
                          : "white",
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  >
                    <option value="">
                      {isRadiant ? "N/A" : "Div"}
                    </option>
                    {!isRadiant &&
                      VALORANT_DIVISIONS.map((div) => (
                        <option key={div} value={div}>
                          {div}
                        </option>
                      ))}
                  </select>
                </div>

                {isRadiant && (
                  <div
                    style={{
                      marginTop: "0.3rem",
                      fontSize: "0.75rem",
                      color: "#9ca3af",
                    }}
                  >
                    Radiant has no divisions. We’ll store your rank as{" "}
                    <span style={{ color: "#e5e7eb" }}>“Radiant”</span>.
                  </div>
                )}

                {!isRadiant && (
                  <div
                    style={{
                      marginTop: "0.35rem",
                      fontSize: "0.75rem",
                      color: "#9ca3af",
                    }}
                  >
                    {hasProfileRank
                      ? "Peak rank was loaded from your Valorant profile. Make sure this is still correct."
                      : "We couldn’t find a peak rank on your Valorant profile, so we’ll use what you enter here."}
                  </div>
                )}
              </div>
            </>
          )}

          {/* HOK FORM */}
          {gameCode === "HOK" && (
            <>
              {/* IGN */}
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
                  In-game Name (Honor of Kings) *
                </label>
                <input
                  required
                  value={hokIgn}
                  onChange={(e) => setHokIgn(e.target.value)}
                  placeholder="Your Honor of Kings IGN"
                  disabled={alreadyRegistered}
                  style={{
                    width: "100%",
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
                    marginTop: "0.35rem",
                    fontSize: "0.75rem",
                    color: "#9ca3af",
                  }}
                >
                  {hasProfileIgn
                    ? "Loaded IGN from your Honor of Kings profile."
                    : "We couldn’t find your Honor of Kings IGN on your profile, so we’ll use what you enter here."}
                </div>
              </div>

              {/* Region / Server */}
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
                  Region / Server
                </label>
                <input
                  value={hokRegion}
                  onChange={(e) => setHokRegion(e.target.value)}
                  placeholder="e.g. SEA, Asia, CN, etc."
                  disabled={alreadyRegistered}
                  style={{
                    width: "100%",
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

              {/* Rank */}
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
                  Rank (Honor of Kings) *
                </label>
                <input
                  required
                  value={hokRank}
                  onChange={(e) => setHokRank(e.target.value)}
                  placeholder="e.g. King 50 stars"
                  disabled={alreadyRegistered}
                  style={{
                    width: "100%",
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
                    marginTop: "0.35rem",
                    fontSize: "0.75rem",
                    color: "#9ca3af",
                  }}
                >
                  {hasProfileRank
                    ? "Loaded your current rank from your Honor of Kings profile."
                    : "We couldn’t find your rank on your Honor of Kings profile, so we’ll use what you enter here."}
                </div>
              </div>

              {/* Peak tournament score */}
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
                  Peak Tournament Score (optional)
                </label>
                <input
                  type="number"
                  value={hokPeakScore}
                  onChange={(e) => setHokPeakScore(e.target.value)}
                  placeholder="e.g. 1200–3000"
                  disabled={alreadyRegistered}
                  style={{
                    width: "100%",
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
            </>
          )}

          {/* TFT FORM */}
          {gameCode === "TFT" && (
            <>
              {/* IGN */}
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
                  In-game Name (TFT) *
                </label>
                <input
                  required
                  value={tftIgn}
                  onChange={(e) => setTftIgn(e.target.value)}
                  placeholder="Your TFT IGN"
                  disabled={alreadyRegistered}
                  style={{
                    width: "100%",
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
                    marginTop: "0.35rem",
                    fontSize: "0.75rem",
                    color: "#9ca3af",
                  }}
                >
                  {hasProfileIgn
                    ? "Loaded IGN from your TFT profile."
                    : "We couldn’t find your TFT IGN on your profile, so we’ll use what you enter here."}
                </div>
              </div>

              {/* Region */}
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
                  Region
                </label>
                <input
                  value={tftRegion}
                  onChange={(e) => setTftRegion(e.target.value)}
                  placeholder="e.g. NA, EUW, SEA"
                  disabled={alreadyRegistered}
                  style={{
                    width: "100%",
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

              {/* Peak Rank */}
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
                  Peak rank (TFT) *
                </label>
                <input
                  required
                  value={tftRank}
                  onChange={(e) => setTftRank(e.target.value)}
                  placeholder="e.g. Diamond IV, Master"
                  disabled={alreadyRegistered}
                  style={{
                    width: "100%",
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
                    marginTop: "0.35rem",
                    fontSize: "0.75rem",
                    color: "#9ca3af",
                  }}
                >
                  {hasProfileRank
                    ? "Loaded your current rank from your TFT profile."
                    : "We couldn’t find your rank on your TFT profile, so we’ll use what you enter here."}
                </div>
              </div>
            </>
          )}

          {/* Submit */}
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
