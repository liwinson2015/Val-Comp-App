// pages/tournaments/[tournamentId]/register.js
import * as cookie from "cookie";
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";
import Tournament from "../../../models/Tournament";
import Registration from "../../../models/Registration";
import Team from "../../../models/Team";
import { useState } from "react";

const FALLBACK_CAPACITY = 16;

// For text/labels
const GAME_LABELS = {
  VALORANT: "Valorant",
  HOK: "Honor of Kings",
  TFT: "Teamfight Tactics",
};

// Simple game themes so TFT / HOK look different from Valorant
const GAME_THEMES = {
  valorant: {
    key: "valorant",
    badgeBorder: "1px solid rgba(248,113,113,0.4)",
    badgeColor: "#f87171",
    badgeBg: "rgba(248,113,113,0.06)",
    cardGradient:
      "radial-gradient(circle at 10% 0%, rgba(255,0,70,0.18) 0%, rgba(15,15,15,1) 55%)",
    primaryButton: "#ff0046",
    primaryShadow:
      "0 30px 120px rgba(255,0,70,0.25), 0 10px 40px rgba(0,0,0,.8)",
  },
  tft: {
    key: "tft",
    badgeBorder: "1px solid rgba(34,197,94,0.6)",
    badgeColor: "#4ade80",
    badgeBg: "rgba(34,197,94,0.12)",
    cardGradient:
      "radial-gradient(circle at 10% 0%, rgba(34,197,94,0.22) 0%, rgba(15,15,15,1) 55%)",
    primaryButton: "#22c55e",
    primaryShadow:
      "0 30px 120px rgba(34,197,94,0.25), 0 10px 40px rgba(0,0,0,.8)",
  },
  hok: {
    key: "hok",
    badgeBorder: "1px solid rgba(56,189,248,0.6)",
    badgeColor: "#38bdf8",
    badgeBg: "rgba(56,189,248,0.12)",
    cardGradient:
      "radial-gradient(circle at 10% 0%, rgba(56,189,248,0.22) 0%, rgba(15,15,15,1) 55%)",
    primaryButton: "#38bdf8",
    primaryShadow:
      "0 30px 120px rgba(56,189,248,0.25), 0 10px 40px rgba(0,0,0,.8)",
  },
};

const DEFAULT_THEME = GAME_THEMES.valorant;

// ---------- helpers ----------

// Extract per-game profile info from Player.gameProfiles[gameCode]
function extractGameProfile(player, gameCode) {
  if (!player) {
    return {
      ignFromProfile: "",
      tagFromProfile: "",
      rankTierFromProfile: "",
      rankDivisionFromProfile: "",
      regionFromProfile: "",
      hokPeakScoreFromProfile: "",
    };
  }

  const profiles = player.gameProfiles || {};
  const profile = profiles[gameCode] || {};

  let ignFromProfile = "";
  let tagFromProfile = "";

  // VALORANT & TFT store "Name#Tag" in ign; HOK uses plain name
  if (gameCode === "VALORANT" || gameCode === "TFT") {
    const storedIgn = profile.ign || "";
    if (storedIgn && storedIgn.includes("#")) {
      const idx = storedIgn.indexOf("#");
      ignFromProfile = storedIgn.slice(0, idx).trim();
      tagFromProfile = storedIgn.slice(idx + 1).trim();
    } else {
      ignFromProfile = storedIgn || "";
      tagFromProfile = "";
    }
  } else {
    ignFromProfile = profile.ign || "";
    tagFromProfile = "";
  }

  const rankTierFromProfile = profile.rankTier || "";
  const rankDivisionFromProfile = profile.rankDivision || "";
  const regionFromProfile = profile.region || "";
  const hokPeakScoreFromProfile =
    typeof profile.hokPeakScore === "number" ? profile.hokPeakScore : "";

  return {
    ignFromProfile,
    tagFromProfile,
    rankTierFromProfile,
    rankDivisionFromProfile,
    regionFromProfile,
    hokPeakScoreFromProfile,
  };
}

// Map tournamentDoc.game / meta.game → "VALORANT" | "HOK" | "TFT"
function resolveGameCodeFromDoc(doc) {
  const meta = doc.meta || {};
  const raw = (
    doc.game ||
    meta.game ||
    meta.Game ||
    ""
  )
    .toString()
    .toLowerCase()
    .trim();

  if (raw === "valorant") return "VALORANT";
  if (raw === "hok" || raw === "honorofkings" || raw === "honor_of_kings")
    return "HOK";
  if (
    raw === "tft" ||
    raw === "teamfighttactics" ||
    raw === "teamfight_tactics"
  )
    return "TFT";

  // fallback: treat as Valorant so old data doesn't break
  return "VALORANT";
}

// Decide if this tournament should use team-based registration
function isTeamMode(gameKey, modeKey) {
  const g = (gameKey || "").toLowerCase();
  const m = (modeKey || "").toLowerCase();

  // Solo:  valorant 1v1, tft solo
  // Team:  valorant 2v2 & 5v5, tft doubleup, hok 5v5
  if (g === "valorant" && (m === "2v2" || m === "5v5")) return true;
  if (g === "tft" && m === "doubleup") return true;
  if (g === "hok" && m === "5v5") return true;

  return false;
}

// For "full" redirect per game
const FULL_REDIRECT_BY_GAME = {
  valorant: "/tournaments-hub/valorant-types",
  tft: "/tournaments-hub/tft-types",
  hok: "/tournaments-hub/hok-types",
};

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

    const meta = tournamentDoc.meta || {};

    // GAME + MODE classification
    const gameCode = resolveGameCodeFromDoc(tournamentDoc); // "VALORANT" | "HOK" | "TFT"
    let gameKey = "valorant";
    if (gameCode === "TFT") gameKey = "tft";
    if (gameCode === "HOK") gameKey = "hok";

    const rawMode = (
      tournamentDoc.mode ||
      meta.mode ||
      meta.Mode ||
      ""
    )
      .toString()
      .toLowerCase()
      .trim();
    const modeKey = rawMode || "1v1";

    const teamMode = isTeamMode(gameKey, modeKey);

    // Check if THIS player is already registered (solo logic; team mode will use new model later)
    const alreadyInRegistration = await Registration.findOne({
      discordTag: player.discordId,
      tournament: tournamentId,
    }).lean();

    const alreadyInPlayerArray = (player.registeredFor || []).some(
      (entry) => entry.tournamentId === tournamentId
    );

    const alreadyRegistered = !!(alreadyInRegistration || alreadyInPlayerArray);

    // Solo capacity gate: use Player collection as source of truth for slots
    let currentSlotsUsed = null;
    if (!teamMode) {
      currentSlotsUsed = await Player.countDocuments({
        "registeredFor.tournamentId": tournamentId,
      });

      // If full AND user is not already registered → block access to register
      if (currentSlotsUsed >= capacity && !alreadyRegistered) {
        const redirectBase =
          FULL_REDIRECT_BY_GAME[gameKey] || "/tournaments-hub";
        return {
          redirect: {
            destination: `${redirectBase}?full=1`,
            permanent: false,
          },
        };
      }
    }

    // Find teams this player is on (for team modes)
    let teamsForGame = [];
    if (teamMode) {
      const baseTeams = await Team.find({
        $or: [
          { members: player._id },
          { "members.player": player._id },
          { "members.playerId": player._id },
        ],
      }).lean();

      const gameUpper = gameCode; // "VALORANT", "HOK", "TFT"
      const gameRegex = new RegExp(gameUpper, "i");

      teamsForGame = baseTeams
        .filter((t) => {
          const g = (
            t.game ||
            t.gameCode ||
            t.gameName ||
            ""
          ).toString();
          if (!g) return true; // if team has no game field, still show
          return gameRegex.test(g);
        })
        .map((t) => ({
          id: t._id.toString(),
          name: t.name || t.teamName || "Unnamed team",
          tag: t.tag || t.teamTag || "", // ✅ include tag for "TAG | Name" label
        }));
    }

    const displayName = tournamentDoc.name || "Tournament";
    const heroBadge =
      meta.displayGameLabel ||
      GAME_LABELS[gameCode] ||
      "Tournament";

    const {
      ignFromProfile,
      tagFromProfile,
      rankTierFromProfile,
      rankDivisionFromProfile,
      regionFromProfile,
      hokPeakScoreFromProfile,
    } = extractGameProfile(player, gameCode);

    const theme = GAME_THEMES[gameKey] || DEFAULT_THEME;

    return {
      props: {
        username: player.username || player.discordTag || "",
        discordId: player.discordId || "",
        avatar: player.avatar || player.discordAvatar || null,
        playerId: String(player._id),
        alreadyRegistered: teamMode ? false : alreadyRegistered, // for team modes we handle separately
        gsspError: false,
        errorMessage: "",
        tournamentId,
        displayName,
        heroBadge,
        gameCode,
        gameKey,
        modeKey,
        teamMode,
        theme,
        teamsForGame,
        ignFromProfile: ignFromProfile || "",
        tagFromProfile: tagFromProfile || "",
        rankTierFromProfile: rankTierFromProfile || "",
        rankDivisionFromProfile: rankDivisionFromProfile || "",
        regionFromProfile: regionFromProfile || "",
        hokPeakScoreFromProfile: hokPeakScoreFromProfile || "",
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
        gameKey: "valorant",
        modeKey: "1v1",
        teamMode: false,
        theme: GAME_THEMES.valorant,
        teamsForGame: [],
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
    gameKey,
    modeKey,
    teamMode,
    theme,
    teamsForGame,
    ignFromProfile,
    tagFromProfile,
    rankTierFromProfile,
    rankDivisionFromProfile,
    regionFromProfile,
    hokPeakScoreFromProfile,
  } = props || {};

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  // Team-mode state
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [teamSubmitting, setTeamSubmitting] = useState(false);
  const [teamMessage, setTeamMessage] = useState("");

  const effectiveGameKey =
    gameKey ||
    (gameCode === "HOK"
      ? "hok"
      : gameCode === "TFT"
      ? "tft"
      : "valorant");
  const resolvedTheme =
    theme || GAME_THEMES[effectiveGameKey] || DEFAULT_THEME;

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

  const gameLabel = GAME_LABELS[gameCode] || "Game";

  const avatarUrl =
    avatar && discordId
      ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=128`
      : null;

  // ---------- TEAM MODE UI (VAL 2v2/5v5, TFT doubleup, HOK 5v5) ----------
  async function handleTeamSubmit(e) {
    e.preventDefault();
    if (!teamMode) return;

    if (!selectedTeamId) {
      setTeamMessage("Please select a team to register.");
      return;
    }

    setTeamSubmitting(true);
    setTeamMessage("");

    try {
      const res = await fetch("/api/registration/team-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          teamId: selectedTeamId,
          tournamentId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setTeamMessage(
          data.error || (await res.text()) || "Failed to register team."
        );
      } else {
        setTeamMessage(
          "Team registered as pending. Your teammates will need to confirm from their accounts."
        );
      }
    } catch (err) {
      console.error("team registration submit error:", err);
      setTeamMessage("Network error submitting team registration.");
    } finally {
      setTeamSubmitting(false);
    }
  }

  if (teamMode) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#050816",
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
            maxWidth: "520px",
            background: resolvedTheme.cardGradient,
            border: "1px solid #2d2d2d",
            borderRadius: "1rem",
            boxShadow: resolvedTheme.primaryShadow,
            padding: "1.6rem 1.6rem 2.1rem",
          }}
        >
          {/* header */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div
              style={{
                fontSize: "0.7rem",
                letterSpacing: "0.18em",
                fontWeight: 600,
                textTransform: "uppercase",
                marginBottom: "0.45rem",
                padding: "0.15rem 0.8rem",
                display: "inline-flex",
                borderRadius: "999px",
                border: resolvedTheme.badgeBorder,
                color: resolvedTheme.badgeColor,
                background: resolvedTheme.badgeBg,
              }}
            >
              {heroBadge}
            </div>
            <div
              style={{
                fontSize: "1.35rem",
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
              Team Tournament Registration (ID: {tournamentId})
            </div>
          </div>

          {/* player card */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "center",
              backgroundColor: "#111827",
              border: "1px solid #374151",
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
                style={{
                  color: "white",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                }}
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

          <div
            style={{
              marginBottom: "1rem",
              padding: "0.7rem 0.8rem",
              borderRadius: "0.7rem",
              backgroundColor: "#020617",
              border: "1px solid #1f2937",
              fontSize: "0.8rem",
              lineHeight: 1.5,
              color: "#e5e7eb",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
              Team-based registration.
            </div>
            <div style={{ color: "#9ca3af" }}>
              This is a team tournament for {gameLabel}. Only the{" "}
              <span style={{ fontWeight: 600 }}>team captain</span> can submit
              the team. When you register, every teammate will be marked as{" "}
              <span style={{ fontWeight: 600 }}>pending</span> until they
              confirm their spot.
            </div>
          </div>

          <form onSubmit={handleTeamSubmit}>
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
                Your team for this tournament
              </label>
              {teamsForGame && teamsForGame.length > 0 ? (
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
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
                >
                  <option value="">Select a team</option>
                  {teamsForGame.map((t) => {
                    const label = t.tag ? `${t.tag} | ${t.name}` : t.name; // ✅ TAG | Name
                    return (
                      <option key={t.id} value={t.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#fbbf24",
                    padding: "0.5rem 0.35rem",
                  }}
                >
                  You don&apos;t have any teams linked to this account for this
                  game yet. Create a team first, then come back to register.
                </div>
              )}
              {teamsForGame && teamsForGame.length > 0 && (
                <div
                  style={{
                    marginTop: "0.35rem",
                    fontSize: "0.75rem",
                    color: "#9ca3af",
                  }}
                >
                  We&apos;ll check that you are the captain of this team before
                  completing the registration.
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={
                teamSubmitting ||
                !teamsForGame ||
                teamsForGame.length === 0
              }
              style={{
                width: "100%",
                backgroundColor:
                  !teamsForGame || teamsForGame.length === 0
                    ? "#4b5563"
                    : teamSubmitting
                    ? "#4b5563"
                    : resolvedTheme.primaryButton,
                color: "white",
                fontWeight: 600,
                fontSize: "0.9rem",
                border: "none",
                borderRadius: "0.6rem",
                padding: "0.75rem 1rem",
                cursor:
                  !teamsForGame || teamsForGame.length === 0 || teamSubmitting
                    ? "not-allowed"
                    : "pointer",
                boxShadow:
                  !teamsForGame || teamsForGame.length === 0
                    ? "none"
                    : resolvedTheme.primaryShadow,
                opacity:
                  !teamsForGame || teamsForGame.length === 0 ? 0.6 : 1,
              }}
            >
              {teamSubmitting
                ? "Submitting..."
                : "Register team (pending approval)"}
            </button>

            {teamMessage && (
              <div
                style={{
                  marginTop: "0.75rem",
                  fontSize: "0.8rem",
                  color: "#e5e7eb",
                  lineHeight: 1.4,
                  textAlign: "center",
                }}
              >
                {teamMessage}
              </div>
            )}
          </form>

          <div
            style={{
              marginTop: "1.4rem",
              fontSize: "0.7rem",
              lineHeight: 1.4,
              color: "#6b7280",
              textAlign: "center",
            }}
          >
            Format:{" "}
            <span style={{ fontWeight: 600 }}>
              {gameKey.toUpperCase()} {modeKey.toUpperCase()}
            </span>
            . We&apos;ll add a confirmation screen for teammates so they can
            accept or decline their spot.
          </div>
        </div>
      </div>
    );
  }

  // ---------- SOLO MODE (VAL 1v1, TFT solo, etc.) ----------

  // VALORANT rank options
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

  // TFT rank options
  const TFT_RANK_TIERS = [
    "Iron",
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Emerald",
    "Diamond",
    "Master",
    "Grandmaster",
    "Challenger",
  ];
  const TFT_DIVISIONS = ["IV", "III", "II", "I"];

  // Profile flags
  const hasProfileIgn = !!ignFromProfile;
  const hasProfileRank = !!rankTierFromProfile;
  const hasAnyProfileData = hasProfileIgn || hasProfileRank;

  // ---- VALORANT state ----
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

  const isRadiant =
    gameCode === "VALORANT" && peakRankTier === "Radiant";

  // ---- HOK state ----
  const [hokIgn, setHokIgn] = useState(
    gameCode === "HOK" ? ignFromProfile || "" : ""
  );
  const [hokRegion, setHokRegion] = useState(
    gameCode === "HOK" ? regionFromProfile || "" : ""
  );
  const [hokRank, setHokRank] = useState(
    gameCode === "HOK"
      ? (rankTierFromProfile &&
          rankDivisionFromProfile &&
          `${rankTierFromProfile} ${rankDivisionFromProfile}`) ||
        rankTierFromProfile ||
        ""
      : ""
  );
  const [hokPeakScore, setHokPeakScore] = useState(
    gameCode === "HOK" ? hokPeakScoreFromProfile || "" : ""
  );

  // ---- TFT state (Riot-style, Name#Tag + tier/div) ----
  const [tftName, setTftName] = useState(
    gameCode === "TFT" ? ignFromProfile || "" : ""
  );
  const [tftTag, setTftTag] = useState(
    gameCode === "TFT" ? tagFromProfile || "" : ""
  );
  const [tftRankTier, setTftRankTier] = useState(
    gameCode === "TFT" ? rankTierFromProfile || "" : ""
  );
  const [tftRankDivision, setTftRankDivision] = useState(
    gameCode === "TFT" ? rankDivisionFromProfile || "" : ""
  );
  const isTftHighRank =
    gameCode === "TFT" &&
    ["Master", "Grandmaster", "Challenger"].includes(tftRankTier);

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
      payload.fullIgn = ignTrimmed; // no tag concept
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

    // --- TFT SOLO (Riot-style) ---
    else if (gameCode === "TFT") {
      const nameTrimmed = tftName.trim();
      const tagTrimmed = tftTag.trim();
      const needsDivision =
        tftRankTier &&
        !["Master", "Grandmaster", "Challenger"].includes(tftRankTier);

      if (
        !nameTrimmed ||
        !tagTrimmed ||
        !tftRankTier ||
        (needsDivision && !tftRankDivision)
      ) {
        setMessage(
          "Please fill in your Riot ID and peak rank for Teamfight Tactics."
        );
        return;
      }

      const ign = nameTrimmed; // name only
      const fullIgn = `${nameTrimmed}#${tagTrimmed}`;

      const rank = isTftHighRank
        ? tftRankTier
        : `${tftRankTier} ${tftRankDivision}`;

      payload.ign = ign;
      payload.fullIgn = fullIgn;
      payload.rank = rank;
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
          background: resolvedTheme.cardGradient,
          border: "1px solid #2d2d2d",
          borderRadius: "1rem",
          boxShadow: resolvedTheme.primaryShadow,
          padding: "1.5rem 1.5rem 2rem",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.18em",
              fontWeight: 600,
              textTransform: "uppercase",
              marginBottom: "0.45rem",
              padding: "0.15rem 0.8rem",
              display: "inline-flex",
              borderRadius: "999px",
              border: resolvedTheme.badgeBorder,
              color: resolvedTheme.badgeColor,
              background: resolvedTheme.badgeBg,
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
              color: "#e5e7eb",
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
            backgroundColor: "#111827",
            border: "1px solid #374151",
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
            backgroundColor: "#020617",
            border: "1px solid #1f2937",
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
                We weren&apos;t able to find {gameLabel} details on your
                profile. Please fill everything in carefully — these values
                will be used as your profile info for this game and must match
                your in-game details, otherwise you may not be able to play.
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
                    <span style={{ color: "#e5e7eb" }}>
                      “Radiant”
                    </span>
                    .
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

          {/* TFT FORM (solo, Riot-style) */}
          {gameCode === "TFT" && (
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
                  Riot ID (TFT) *
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
                    value={tftName}
                    onChange={(e) => setTftName(e.target.value)}
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
                    value={tftTag}
                    onChange={(e) => setTftTag(e.target.value)}
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
                    ? "Loaded Riot ID from your TFT profile. Update it here if it’s outdated."
                    : "We couldn’t find your TFT Riot ID on your profile, so we’ll use what you enter here."}
                </div>
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
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <select
                    required
                    value={tftRankTier}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTftRankTier(v);
                      if (
                        ["Master", "Grandmaster", "Challenger"].includes(
                          v
                        )
                      ) {
                        setTftRankDivision("");
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
                    {TFT_RANK_TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                  </select>

                  <select
                    value={tftRankDivision}
                    onChange={(e) =>
                      setTftRankDivision(e.target.value)
                    }
                    disabled={
                      alreadyRegistered ||
                      !tftRankTier ||
                      isTftHighRank
                    }
                    style={{
                      flex: 1,
                      backgroundColor: "#0f0f10",
                      border: "1px solid #4b5563",
                      borderRadius: "0.5rem",
                      padding: "0.6rem 0.75rem",
                      color:
                        alreadyRegistered ||
                        !tftRankTier ||
                        isTftHighRank
                          ? "#6b7280"
                          : "white",
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  >
                    <option value="">
                      {isTftHighRank ? "N/A" : "Div"}
                    </option>
                    {!isTftHighRank &&
                      TFT_DIVISIONS.map((div) => (
                        <option key={div} value={div}>
                          {div}
                        </option>
                      ))}
                  </select>
                </div>

                <div
                  style={{
                    marginTop: "0.35rem",
                    fontSize: "0.75rem",
                    color: "#9ca3af",
                  }}
                >
                  {hasProfileRank
                    ? "Peak rank was loaded from your TFT profile. Make sure this is still correct."
                    : "We couldn’t find a peak rank on your TFT profile, so we’ll use what you enter here."}
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
                : resolvedTheme.primaryButton,
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
                : resolvedTheme.primaryShadow,
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
