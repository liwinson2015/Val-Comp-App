// pages/team-invite/[teamRegistrationId]/accept.js
import { useState } from "react";
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";
import Tournament from "../../../models/Tournament";
import TeamTournamentRegistration from "../../../models/TeamTournamentRegistration";

const GAME_LABELS = {
  VALORANT: "Valorant",
  HOK: "Honor of Kings",
  TFT: "Teamfight Tactics",
};

// ---------- helpers ----------

function parseCookies(header = "") {
  return Object.fromEntries(
    (header || "")
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const [k, ...rest] = c.split("=");
        return [k, decodeURIComponent(rest.join("=") || "")];
      })
  );
}

function resolveGameCodeFromTournament(doc, regGameCode) {
  if (regGameCode) return regGameCode;

  if (!doc) return "VALORANT";
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

  return "VALORANT";
}

function gameKeyFromCode(gameCode) {
  if (gameCode === "TFT") return "tft";
  if (gameCode === "HOK") return "hok";
  return "valorant";
}

function extractGameProfile(player, gameCode) {
  if (!player) {
    return {
      ignFromProfile: "",
      tagFromProfile: "",
      rankTierFromProfile: "",
      rankDivisionFromProfile: "",
      regionFromProfile: "",
      hokPeakScoreFromProfile: "",
      hokStarsFromProfile: "",
    };
  }

  const profiles = player.gameProfiles || {};
  const profile = profiles[gameCode] || {};

  let ignFromProfile = "";
  let tagFromProfile = "";

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
  const hokStarsFromProfile =
    typeof profile.hokStars === "number" ? profile.hokStars : "";

  return {
    ignFromProfile,
    tagFromProfile,
    rankTierFromProfile,
    rankDivisionFromProfile,
    regionFromProfile,
    hokPeakScoreFromProfile,
    hokStarsFromProfile,
  };
}

// ---------- SERVER SIDE ----------
export async function getServerSideProps({ req, params }) {
  const { teamRegistrationId } = params;

  await connectToDatabase();

  const cookies = parseCookies(req.headers.cookie || "");
  const playerId = cookies.playerId || null;

  if (!playerId) {
    const next = `/team-invite/${encodeURIComponent(
      teamRegistrationId
    )}/accept`;
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
    const next = `/team-invite/${encodeURIComponent(
      teamRegistrationId
    )}/accept`;
    const encoded = encodeURIComponent(next);
    return {
      redirect: {
        destination: `/api/auth/discord?next=${encoded}`,
        permanent: false,
      },
    };
  }

  const reg = await TeamTournamentRegistration.findById(
    teamRegistrationId
  ).lean();

  if (!reg) {
    return { notFound: true };
  }

  const member = (reg.members || []).find(
    (m) => m.player && m.player.toString() === player._id.toString()
  );

  if (!member) {
    return {
      props: {
        forbidden: true,
        reason: "You are not part of this team registration.",
      },
    };
  }

  // If they already accepted, just send them back to the account page
  if (member.status === "accepted") {
    return {
      redirect: {
        destination: "/account/team-registrations",
        permanent: false,
      },
    };
  }

  const tournament = await Tournament.findOne({
    tournamentId: reg.tournamentId,
  }).lean();

  const gameCode = resolveGameCodeFromTournament(
    tournament,
    reg.gameCode
  );
  const gameKey = gameKeyFromCode(gameCode);
  const gameLabel = GAME_LABELS[gameCode] || "Game";

  const meta = (tournament && tournament.meta) || {};

  const displayName =
    (tournament && tournament.name) ||
    meta.displayName ||
    "Team Tournament";

  const heroBadge =
    meta.displayGameLabel || gameLabel || "Tournament";

  const {
    ignFromProfile,
    tagFromProfile,
    rankTierFromProfile,
    rankDivisionFromProfile,
    regionFromProfile,
    hokPeakScoreFromProfile,
    hokStarsFromProfile,
  } = extractGameProfile(player, gameCode);

  return {
    props: {
      forbidden: false,
      playerId: String(player._id),
      username: player.username || player.discordTag || "",
      discordId: player.discordId || "",
      avatar: player.avatar || player.discordAvatar || null,
      teamRegistrationId,
      tournamentId: reg.tournamentId,
      displayName,
      heroBadge,
      gameCode,
      gameKey,
      gameLabel,
      ignFromProfile: ignFromProfile || "",
      tagFromProfile: tagFromProfile || "",
      rankTierFromProfile: rankTierFromProfile || "",
      rankDivisionFromProfile: rankDivisionFromProfile || "",
      regionFromProfile: regionFromProfile || "",
      hokPeakScoreFromProfile:
        hokPeakScoreFromProfile === "" ? "" : String(hokPeakScoreFromProfile),
      hokStarsFromProfile:
        hokStarsFromProfile === "" ? "" : String(hokStarsFromProfile),
    },
  };
}

// ---------- CLIENT ----------
export default function TeamInviteAcceptPage(props) {
  const {
    forbidden,
    reason,
    playerId,
    username,
    discordId,
    avatar,
    teamRegistrationId,
    displayName,
    heroBadge,
    gameCode,
    gameKey,
    gameLabel,
    ignFromProfile,
    tagFromProfile,
    rankTierFromProfile,
    rankDivisionFromProfile,
    regionFromProfile, // unused for HoK on this page, but still passed through
    hokPeakScoreFromProfile,
    hokStarsFromProfile,
  } = props || {};

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  if (forbidden) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#020617",
          color: "#f9fafb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <h1
            style={{
              fontSize: "1.4rem",
              marginBottom: "0.6rem",
              fontWeight: 700,
            }}
          >
            Team Invite Not Available
          </h1>
          <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>{reason}</p>
        </div>
      </div>
    );
  }

  const effectiveGameKey =
    gameKey ||
    (gameCode === "TFT" ? "tft" : gameCode === "HOK" ? "hok" : "valorant");

  const avatarUrl =
    avatar && discordId
      ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=128`
      : null;

  // ---- Rank constants (match profile config) ----
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

  // HoK rank tiers & divisions as in profile.js
  const HOK_RANK_TIERS = [
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Diamond",
    "Master",
    "Grandmaster",
    "Grandmaster Mythic",
    "Grandmaster Epic",
    "Grandmaster Legend",
  ];

  const HOK_DIVISIONS_BY_TIER = {
    Bronze: ["III", "II", "I"],
    Silver: ["III", "II", "I"],
    Gold: ["III", "II", "I"],
    Platinum: ["IV", "III", "II", "I"],
    Diamond: ["V", "IV", "III", "II", "I"],
    Master: ["V", "IV", "III", "II", "I"],
    // Grandmaster family uses stars instead of divisions
  };

  const HOK_GM_TIERS = [
    "Grandmaster",
    "Grandmaster Mythic",
    "Grandmaster Epic",
    "Grandmaster Legend",
  ];

  // Initial state from profile
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

  // HOK state (IGN + tier/div/stars/peak score, NO server field on this page)
  const [hokIgn, setHokIgn] = useState(
    gameCode === "HOK" ? ignFromProfile || "" : ""
  );
  const [hokRankTier, setHokRankTier] = useState(
    gameCode === "HOK" ? rankTierFromProfile || "" : ""
  );
  const [hokRankDivision, setHokRankDivision] = useState(
    gameCode === "HOK" ? rankDivisionFromProfile || "" : ""
  );
  const [hokStars, setHokStars] = useState(
    gameCode === "HOK" && hokStarsFromProfile !== ""
      ? hokStarsFromProfile
      : ""
  );
  const [hokPeakScore, setHokPeakScore] = useState(
    gameCode === "HOK" && hokPeakScoreFromProfile !== ""
      ? hokPeakScoreFromProfile
      : ""
  );

  // TFT state
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

  const hasProfileIgn = !!ignFromProfile;
  const hasProfileRank = !!rankTierFromProfile;

  function buildGameProfilePayload() {
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
        return {
          ok: false,
          error: "Please fill in your Riot ID and peak Valorant rank.",
        };
      }

      const fullIgn = `${nameTrimmed}#${tagTrimmed}`;
      const rankString =
        peakRankTier === "Radiant"
          ? "Radiant"
          : `${peakRankTier} ${peakRankDivision}`;

      return {
        ok: true,
        profileData: {
          ign: fullIgn,
          rank: rankString,
          rankTier: peakRankTier,
          rankDivision: peakRankDivision,
        },
      };
    }

    if (gameCode === "HOK") {
      const ignTrimmed = hokIgn.trim();
      const tierTrimmed = hokRankTier.trim();
      const divTrimmed = hokRankDivision.trim();
      const starsTrimmed = hokStars.trim();
      const peakTrimmed = hokPeakScore.trim();

      if (!ignTrimmed || !tierTrimmed) {
        return {
          ok: false,
          error:
            "Please fill in your Honor of Kings IGN and peak rank.",
        };
      }

      const isGmTier = HOK_GM_TIERS.includes(tierTrimmed);
      const needsDivision =
        !isGmTier && !!tierTrimmed && !!HOK_DIVISIONS_BY_TIER[tierTrimmed];

      if (needsDivision && !divTrimmed) {
        return {
          ok: false,
          error: "Please select your division/sub-tier.",
        };
      }

      const starsNum =
        starsTrimmed === "" ? null : Number(starsTrimmed);
      const peakNum =
        peakTrimmed === "" ? null : Number(peakTrimmed);

      let rankString = tierTrimmed;
      if (isGmTier && starsTrimmed) {
        rankString = `${tierTrimmed} (${starsTrimmed}★)`;
      } else if (!isGmTier && divTrimmed) {
        rankString = `${tierTrimmed} ${divTrimmed}`;
      }

      return {
        ok: true,
        profileData: {
          ign: ignTrimmed,
          rank: rankString,
          rankTier: tierTrimmed,
          rankDivision: isGmTier ? "" : divTrimmed,
          hokStars:
            starsNum === null || Number.isNaN(starsNum)
              ? undefined
              : starsNum,
          hokPeakScore:
            peakNum === null || Number.isNaN(peakNum)
              ? undefined
              : peakNum,
        },
      };
    }

    if (gameCode === "TFT") {
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
        return {
          ok: false,
          error: "Please fill in your TFT Riot ID and peak rank.",
        };
      }

      const fullIgn = `${nameTrimmed}#${tagTrimmed}`;
      const rankString = isTftHighRank
        ? tftRankTier
        : `${tftRankTier} ${tftRankDivision}`;

      return {
        ok: true,
        profileData: {
          ign: fullIgn,
          rank: rankString,
          rankTier: tftRankTier,
          rankDivision: isTftHighRank ? "" : tftRankDivision,
        },
      };
    }

    return {
      ok: false,
      error: "This game's form is not configured.",
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    const result = buildGameProfilePayload();
    if (!result.ok) {
      setMessage(result.error);
      return;
    }

    const { profileData } = result;

    setSubmitting(true);

    try {
      // 1) save profile
      const resProfile = await fetch(
        "/api/profile/save-from-game-form",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId,
            gameCode,
            ...profileData,
          }),
        }
      );

      const jsonProfile = await resProfile.json().catch(() => ({}));
      if (!resProfile.ok || !jsonProfile.ok) {
        setMessage(
          jsonProfile.error ||
            "Failed to save your in-game profile information."
        );
        setSubmitting(false);
        return;
      }

      // 2) accept invite
      const resAccept = await fetch("/api/registration/team-respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamRegistrationId,
          action: "accept",
        }),
      });

      const jsonAccept = await resAccept.json().catch(() => ({}));
      if (!resAccept.ok || !jsonAccept.ok) {
        setMessage(
          jsonAccept.error ||
            "Failed to accept the team invite. Please try again."
        );
        setSubmitting(false);
        return;
      }

      // 3) success
      window.location.href = "/account/team-registrations";
    } catch (err) {
      console.error("[team invite accept] error:", err);
      setMessage(
        "Network error while accepting invite. Please try again."
      );
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#020617",
        color: "#f9fafb",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Inter", Roboto, sans-serif',
        padding: "2.5rem 1rem 3rem",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background:
            "radial-gradient(circle at 0% 0%, rgba(59,130,246,0.18), transparent 55%) #020617",
          borderRadius: "1rem",
          border: "1px solid #1f2937",
          padding: "1.7rem 1.5rem 2rem",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "1.4rem" }}>
          <div
            style={{
              display: "inline-flex",
              padding: "0.18rem 0.9rem",
              borderRadius: "999px",
              border: "1px solid rgba(148,163,184,0.6)",
              fontSize: "0.7rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#e5e7eb",
              marginBottom: "0.6rem",
            }}
          >
            {heroBadge}
          </div>
          <h1
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              margin: 0,
            }}
          >
            Accept Team Invite
          </h1>
          <p
            style={{
              marginTop: "0.4rem",
              fontSize: "0.86rem",
              color: "#9ca3af",
            }}
          >
            Before you accept, confirm your in-game{" "}
            <span style={{ color: "#e5e7eb", fontWeight: 600 }}>
              {gameLabel}
            </span>{" "}
            details. This info will be used for lobbies and bracket seeding.
          </p>
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
            marginBottom: "1.2rem",
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="discord avatar"
              style={{
                borderRadius: "0.5rem",
                width: "48px",
                height: "48px",
                border: "1px solid #52525b",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                borderRadius: "0.5rem",
                width: "48px",
                height: "48px",
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

        {/* Info text */}
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
          {hasProfileIgn || hasProfileRank ? (
            <>
              We pre-filled some details from your{" "}
              <span style={{ fontWeight: 600 }}>{gameLabel}</span> profile.
              Update anything that&apos;s outdated.{" "}
              <span style={{ color: "#9ca3af" }}>
                These values will also be saved to your profile for future
                tournaments.
              </span>
            </>
          ) : (
            <>
              We couldn&apos;t find any{" "}
              <span style={{ fontWeight: 600 }}>{gameLabel}</span> details
              saved on your profile yet. Please fill everything in carefully —
              we&apos;ll use this for lobbies and seeding.
            </>
          )}
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          {/* VALORANT */}
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
                    style={{
                      flex: 2,
                      backgroundColor: "#0f0f10",
                      border: "1px solid #4b5563",
                      borderRadius: "0.5rem",
                      padding: "0.6rem 0.75rem",
                      color: "white",
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
                    style={{
                      flex: 1,
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
                      if (v === "Radiant") setPeakRankDivision("");
                    }}
                    style={{
                      flex: 2,
                      backgroundColor: "#0f0f10",
                      border: "1px solid #4b5563",
                      borderRadius: "0.5rem",
                      padding: "0.6rem 0.75rem",
                      color: "white",
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
                    onChange={(e) => setPeakRankDivision(e.target.value)}
                    disabled={!peakRankTier || isRadiant}
                    style={{
                      flex: 1,
                      backgroundColor: "#0f0f10",
                      border: "1px solid #4b5563",
                      borderRadius: "0.5rem",
                      padding: "0.6rem 0.75rem",
                      color:
                        !peakRankTier || isRadiant ? "#6b7280" : "white",
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  >
                    <option value="">{isRadiant ? "N/A" : "Div"}</option>
                    {!isRadiant &&
                      VALORANT_DIVISIONS.map((div) => (
                        <option key={div} value={div}>
                          {div}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* HOK */}
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

              {/* Rank + stars + peak score */}
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
                  Peak rank (Honor of Kings) *
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(0, 1.3fr) minmax(0, 1.3fr) minmax(0, 1.6fr)",
                    gap: "0.5rem",
                  }}
                >
                  {/* Tier */}
                  <select
                    required
                    value={hokRankTier}
                    onChange={(e) => {
                      const v = e.target.value;
                      setHokRankTier(v);
                      setHokRankDivision("");
                    }}
                    style={{
                      backgroundColor: "#0f0f10",
                      border: "1px solid #4b5563",
                      borderRadius: "0.5rem",
                      padding: "0.6rem 0.75rem",
                      color: "white",
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  >
                    <option value="">Select rank</option>
                    {HOK_RANK_TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                  </select>

                  {/* Division OR Stars */}
                  {HOK_GM_TIERS.includes(hokRankTier) ? (
                    <input
                      type="number"
                      min="0"
                      max="500"
                      value={hokStars}
                      onChange={(e) => setHokStars(e.target.value)}
                      placeholder="Stars (0 - 500)"
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
                  ) : (
                    <select
                      value={hokRankDivision}
                      onChange={(e) => setHokRankDivision(e.target.value)}
                      style={{
                        backgroundColor: "#0f0f10",
                        border: "1px solid #4b5563",
                        borderRadius: "0.5rem",
                        padding: "0.6rem 0.75rem",
                        color: "white",
                        fontSize: "0.9rem",
                        outline: "none",
                      }}
                    >
                      <option value="">
                        {hokRankTier ? "Division" : "Division"}
                      </option>
                      {(HOK_DIVISIONS_BY_TIER[hokRankTier] || []).map(
                        (div) => (
                          <option key={div} value={div}>
                            {div}
                          </option>
                        )
                      )}
                    </select>
                  )}

                  {/* Peak Tournament score */}
                  <input
                    type="number"
                    value={hokPeakScore}
                    onChange={(e) => setHokPeakScore(e.target.value)}
                    placeholder="Peak score (1200 - 3000)"
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
              </div>
            </>
          )}

          {/* TFT */}
          {gameCode === "TFT" && (
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
                  Riot ID (TFT) *
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
                    placeholder="Name"
                    style={{
                      flex: 2,
                      backgroundColor: "#0f0f10",
                      border: "1px solid #4b5563",
                      borderRadius: "0.5rem",
                      padding: "0.6rem 0.75rem",
                      color: "white",
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
                    placeholder="Tag"
                    style={{
                      flex: 1,
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
                        ["Master", "Grandmaster", "Challenger"].includes(v)
                      ) {
                        setTftRankDivision("");
                      }
                    }}
                    style={{
                      flex: 2,
                      backgroundColor: "#0f0f10",
                      border: "1px solid #4b5563",
                      borderRadius: "0.5rem",
                      padding: "0.6rem 0.75rem",
                      color: "white",
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
                    onChange={(e) => setTftRankDivision(e.target.value)}
                    disabled={!tftRankTier || isTftHighRank}
                    style={{
                      flex: 1,
                      backgroundColor: "#0f0f10",
                      border: "1px solid #4b5563",
                      borderRadius: "0.5rem",
                      padding: "0.6rem 0.75rem",
                      color:
                        !tftRankTier || isTftHighRank
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
              </div>
            </>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              backgroundColor: submitting ? "#4b5563" : "#22c55e",
              color: "white",
              fontWeight: 600,
              fontSize: "0.9rem",
              border: "none",
              borderRadius: "0.6rem",
              padding: "0.75rem 1rem",
              cursor: submitting ? "not-allowed" : "pointer",
              marginTop: "0.5rem",
            }}
          >
            {submitting ? "Saving & Accepting..." : "Save Info & Accept Invite"}
          </button>

          {message && (
            <div
              style={{
                marginTop: "0.75rem",
                fontSize: "0.8rem",
                color: "#fecaca",
              }}
            >
              {message}
            </div>
          )}
        </form>

        <div
          style={{
            marginTop: "1.4rem",
            fontSize: "0.74rem",
            color: "#9ca3af",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          After you confirm, your status for this team will change to{" "}
          <span style={{ fontWeight: 600 }}>Accepted</span>. Once all
          teammates accept, the team&apos;s registration becomes{" "}
          <span style={{ fontWeight: 600 }}>Active</span> and is locked into
          the bracket.
        </div>
      </div>
    </div>
  );
}
