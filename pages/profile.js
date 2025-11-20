// pages/profile.js
import { useState } from "react";
import { connectToDatabase } from "../lib/mongodb";
import Player from "../models/Player";
import styles from "../styles/Profile.module.css";

/**
 * Expected (optional) shape for player.registeredFor items if you later populate it:
 * {
 *   id: "skirmish-1",
 *   name: "Valorant Skirmish #1",
 *   game: "VALORANT",
 *   mode: "1v1",
 *   date: "2025-11-02T23:00:00Z",
 *   placement: 5,
 *   result: "Round of 8"
 * }
 */

// ---------- Game config (UI only) ----------
// Alphabetical by label: HONOR OF KINGS, TEAMFIGHT TACTICS, VALORANT
const GAME_DEFS = [
  {
    code: "HOK",
    label: "HONOR OF KINGS",
    description: "Used for Honor of Kings teams and tournaments.",
    kind: "SINGLE_NAME", // one IGN field
    rankTiers: [
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
    ],
    defaultRegion: "NA",
    regions: ["NA", "EU", "SEA", "MENA", "Other"], // internal only
  },
  {
    code: "TFT",
    label: "TEAMFIGHT TACTICS",
    description: "Used for Teamfight Tactics tournaments and events.",
    kind: "TAGGED_ID", // name + tag
    rankTiers: [
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
    ],
    rankDivisions: ["1", "2", "3", "4"],
    defaultRegion: "NA",
    regions: ["NA", "EUW", "EUNE", "OCE", "KR", "BR", "Other"],
  },
  {
    code: "VALORANT",
    label: "VALORANT",
    description: "Used for VALORANT teams and tournaments.",
    kind: "TAGGED_ID", // name + tag
    rankTiers: [
      "Iron",
      "Bronze",
      "Silver",
      "Gold",
      "Platinum",
      "Diamond",
      "Ascendant",
      "Immortal",
      "Radiant",
    ],
    rankDivisions: ["1", "2", "3"],
    defaultRegion: "NA",
    regions: ["NA", "EU", "APAC", "KR", "LATAM", "BR", "Other"],
  },
];

const GAME_CODES = GAME_DEFS.map((g) => g.code);

// Adjust the paths here to match where you actually put the images
const GAME_ICON_PATHS = {
  HOK: "/icons/hok-icon.png",
  TFT: "/icons/tft-icon.png",
  VALORANT: "/icons/valorant-icon.png",
};

// HOK: per-tier division options (non-Grandmaster)
const HOK_DIVISIONS_BY_TIER = {
  Bronze: ["III", "II", "I"], // 3 sub-tiers
  Silver: ["III", "II", "I"],
  Gold: ["III", "II", "I"],
  Platinum: ["IV", "III", "II", "I"],
  Diamond: ["V", "IV", "III", "II", "I"],
  Master: ["V", "IV", "III", "II", "I"],
  // Grandmaster family uses stars instead of divisions
};

// ---------- SERVER SIDE ----------
export async function getServerSideProps({ req }) {
  // Parse cookie -> playerId
  const cookieHeader = req.headers.cookie || "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .filter(Boolean)
      .map((c) => {
        const [k, ...rest] = c.trim().split("=");
        return [k, decodeURIComponent(rest.join("=") || "")];
      })
  );

  const playerId = cookies.playerId || null;
  if (!playerId) {
    // Send user to Discord login and bounce back to /profile after
    return {
      redirect: {
        destination: "/api/auth/discord?next=/profile",
        permanent: false,
      },
    };
  }

  await connectToDatabase();
  const player = await Player.findById(playerId).lean();

  if (!player) {
    return {
      redirect: {
        destination: "/api/auth/discord?next=/profile",
        permanent: false,
      },
    };
  }

  // History source: use player.registeredFor if present.
  const history = Array.isArray(player.registeredFor)
    ? player.registeredFor
    : [];

  // Compute simple stats from history if placement exists
  const played = history.length;
  const wins = history.filter((h) => Number(h.placement) === 1).length;
  const top4 = history.filter(
    (h) => Number(h.placement) > 0 && Number(h.placement) <= 4
  ).length;
  const bestFinish =
    history.reduce((best, h) => {
      const p = Number(h.placement);
      if (!p || p <= 0) return best;
      return Math.min(best, p);
    }, Infinity) || null;

  // Normalize gameProfiles into a simple shape for the client (keyed by game code)
  const rawProfiles = player.gameProfiles || {};

  function normalizeProfile(code) {
    const p = rawProfiles[code] || {};
    return {
      ign: p.ign || "",
      rankTier: p.rankTier || "",
      rankDivision: p.rankDivision || "",
      region: p.region || "",
      // HoK extras
      hokStars:
        typeof p.hokStars === "number" ? p.hokStars : p.hokStars || "",
      hokPeakScore:
        typeof p.hokPeakScore === "number"
          ? p.hokPeakScore
          : p.hokPeakScore || "",
      // TFT Double Up
      tftDoubleTier: p.tftDoubleTier || "",
      tftDoubleDivision: p.tftDoubleDivision || "",
    };
  }

  const gameProfiles = {};
  GAME_CODES.forEach((code) => {
    gameProfiles[code] = normalizeProfile(code);
  });

  // featuredGames: keep only known games, max 3
  const rawFeatured = Array.isArray(player.featuredGames)
    ? player.featuredGames
    : [];
  const featuredGames = rawFeatured
    .filter((code) => GAME_CODES.includes(code))
    .slice(0, 3);

  return {
    props: {
      username: player.username || "",
      discordId: player.discordId || "",
      avatar: player.avatar || "",
      stats: {
        played,
        wins,
        top4,
        bestFinish: Number.isFinite(bestFinish) ? bestFinish : null,
      },
      history: history
        .map((h) => ({
          id: h.id || h.tournamentId || h.name || "tbd",
          name: h.name || h.tournament || "Tournament",
          game: h.game || "VALORANT",
          mode: h.mode || "—",
          date: h.date || h.start || null,
          placement:
            typeof h.placement === "number"
              ? h.placement
              : h.placement
              ? Number(h.placement)
              : null,
          result: h.result || null,
        }))
        .sort((a, b) => {
          const da = a.date ? new Date(a.date).getTime() : 0;
          const db = b.date ? new Date(b.date).getTime() : 0;
          return db - da;
        }),
      gameProfiles,
      initialFeaturedGames: featuredGames,
    },
  };
}

// ---------- MAIN COMPONENT ----------
export default function Profile({
  username,
  discordId,
  avatar,
  stats,
  history,
  gameProfiles,
  initialFeaturedGames,
}) {
  const avatarUrl =
    avatar && discordId
      ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=256`
      : null;

  const [profiles, setProfiles] = useState(gameProfiles || {});
  const [featuredGames, setFeaturedGames] = useState(
    initialFeaturedGames || []
  );

  // always start on the first game in GAME_DEFS (HONOR OF KINGS)
  const [selectedGame, setSelectedGame] = useState(GAME_DEFS[0].code);

  function getGameDef(code) {
    return GAME_DEFS.find((g) => g.code === code) || GAME_DEFS[0];
  }

  function handleSelectGame(e) {
    setSelectedGame(e.target.value);
  }

  function handleProfileSaved(gameCode, profile) {
    setProfiles((prev) => ({
      ...prev,
      [gameCode]: {
        ...(prev[gameCode] || {}),
        ...profile,
      },
    }));
  }

  async function handleToggleFeatured(gameCode) {
    const already = featuredGames.includes(gameCode);
    let next;

    if (already) {
      next = featuredGames.filter((c) => c !== gameCode);
    } else {
      if (featuredGames.length >= 3) {
        alert("You can only feature up to 3 games.");
        return;
      }
      next = [...featuredGames, gameCode];
    }

    try {
      const res = await fetch("/api/profile/featured-games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ featuredGames: next }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error || "Failed to update featured games.");
        return;
      }
      setFeaturedGames(next);
    } catch (err) {
      console.error(err);
      alert("Something went wrong updating featured games.");
    }
  }

  function handleFeaturedCardClick(code) {
    setSelectedGame(code);
  }

  const selectedDef = getGameDef(selectedGame);
  const selectedProfile = profiles[selectedGame] || {
    ign: "",
    rankTier: "",
    rankDivision: "",
    region: "",
    hokStars: "",
    hokPeakScore: "",
    tftDoubleTier: "",
    tftDoubleDivision: "",
  };
  const isSelectedFeatured = featuredGames.includes(selectedGame);

  return (
    <div className={styles.shell}>
      <div className={styles.wrap}>
        {/* Hero / Header */}
        <section className={styles.headerCard}>
          <div className={styles.headerLeft}>
            <div className={styles.avatarRing}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className={styles.avatarImg} />
              ) : (
                <div className={styles.avatarFallback} />
              )}
            </div>
            <div>
              <div className={styles.badge}>PLAYER PROFILE</div>
              <h1 className={styles.title}>{username || "Unknown Player"}</h1>
              <div className={styles.subtle}>
                Discord ID: <span className={styles.mono}>{discordId}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Tournaments</div>
              <div className={styles.statValue}>{stats.played}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Wins</div>
              <div className={styles.statValue}>{stats.wins}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Top 4</div>
              <div className={styles.statValue}>{stats.top4}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Best Finish</div>
              <div className={styles.statValue}>
                {stats.bestFinish ? `#${stats.bestFinish}` : "—"}
              </div>
            </div>
          </div>
        </section>

        {/* Game Profiles */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>GAME PROFILES</h2>
          </div>
          <p className={styles.gameIntro}>
            These profiles store your in-game names and ranks for different
            games. We use this info to auto-fill team and tournament forms.
            Make sure it matches what you actually use in-game.
          </p>

          <div className={styles.gameLayout}>
            {/* LEFT SIDEBAR */}
            <aside className={styles.featuredSidebar}>
              <div className={styles.featuredSidebarHeader}>
                <div className={styles.featuredSidebarTitle}>FEATURED GAMES</div>
                <div className={styles.featuredSidebarSub}>
                  Up to 3 profiles shown on your player card.
                </div>
              </div>

              <div className={styles.featuredList}>
                {featuredGames.map((code) => (
                  <FeaturedGameCard
                    key={code}
                    code={code}
                    profile={profiles[code] || {}}
                    selected={selectedGame === code}
                    onClick={() => handleFeaturedCardClick(code)}
                  />
                ))}

                {/* Empty slots */}
                {featuredGames.length < 3 &&
                  Array.from({ length: 3 - featuredGames.length }).map(
                    (_, idx) => (
                      <div key={`empty-${idx}`} className={styles.featuredEmpty}>
                        <div className={styles.featuredEmptyTitle}>
                          Empty slot
                        </div>
                        <div>
                          Choose a game in the editor on the right and mark it
                          as featured to show it here.
                        </div>
                      </div>
                    )
                  )}
              </div>
            </aside>

            {/* RIGHT EDITOR */}
            <div className={styles.gameMain}>
              <div className={styles.gameEditorTopRow}>
                <div className={styles.gameSelectWrap}>
                  <label
                    htmlFor="game-select"
                    className={styles.gameSelectLabel}
                  >
                    Select game to edit
                  </label>
                  <select
                    id="game-select"
                    value={selectedGame}
                    onChange={handleSelectGame}
                    className={styles.gameSelect}
                  >
                    {GAME_DEFS.map((g) => (
                      <option key={g.code} value={g.code}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleFeatured(selectedGame)}
                  className={`${styles.featureToggle} ${
                    isSelectedFeatured ? styles.featureToggleActive : ""
                  }`}
                >
                  {isSelectedFeatured ? "Unfeature game" : "Feature this game"}
                </button>
              </div>

              <GameProfileEditor
                key={selectedGame}
                gameDef={selectedDef}
                profile={selectedProfile}
                onProfileSaved={handleProfileSaved}
              />
            </div>
          </div>
        </section>

        {/* Tournament History */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>TOURNAMENT HISTORY</h2>
            {history?.length ? (
              <span className={styles.badgeSoft}>{history.length} entries</span>
            ) : null}
          </div>

          {history?.length ? (
            <div className={styles.tableWrap}>
              <div className={styles.tableHead}>
                <div>Event</div>
                <div>Game</div>
                <div>Mode</div>
                <div>Date</div>
                <div>Result</div>
                <div>Placement</div>
              </div>
              <div className={styles.tableBody}>
                {history.map((h) => {
                  const dateStr = h.date
                    ? new Date(h.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—";
                  return (
                    <div key={h.id} className={styles.tableRow}>
                      <div className={styles.eventCell}>
                        <div className={styles.eventName}>{h.name}</div>
                        <div className={styles.eventSubtle}>
                          #{h.id.toString().slice(0, 8)}
                        </div>
                      </div>
                      <div className={styles.cell}>{h.game}</div>
                      <div className={styles.cell}>{h.mode}</div>
                      <div className={styles.cell}>{dateStr}</div>
                      <div className={styles.cell}>{h.result || "—"}</div>
                      <div className={styles.cell}>
                        {typeof h.placement === "number" ? (
                          <span
                            className={
                              h.placement === 1
                                ? styles.placementGold
                                : styles.placement
                            }
                          >
                            {`#${h.placement}`}
                          </span>
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>No tournaments yet</div>
              <div className={styles.emptyText}>
                Join your first bracket to build your competitive profile.
              </div>
              <div className={styles.emptyActions}>
                <a href="/tournaments-hub" className={styles.primaryBtn}>
                  Browse Tournaments
                </a>
              </div>
            </div>
          )}
        </section>

        {/* Linked Accounts (Discord) */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>LINKED ACCOUNTS</h2>
          </div>
          <div className={styles.linkedGrid}>
            <div className={styles.linkedItem}>
              <div className={styles.linkedIcon} aria-hidden />
              <div>
                <div className={styles.linkedLabel}>Discord</div>
                <div className={styles.linkedValue}>
                  Connected as{" "}
                  <span className={styles.mono}>{username || "Unknown"}</span>
                </div>
              </div>
            </div>
            <div className={styles.linkedRight}>
              <a
                className={styles.secondaryBtn}
                href="/api/auth/logout"
                title="Log out"
              >
                Log out
              </a>
            </div>
          </div>
        </section>

        {/* Footer-ish small print */}
        <div className={styles.mutedFoot}>
          Stats update when brackets close. More analytics (W/L, K/D, streaks)
          coming soon.
        </div>
      </div>
    </div>
  );
}

// ---------- Featured game card ----------
function FeaturedGameCard({ code, profile, onClick, selected }) {
  const def = GAME_DEFS.find((g) => g.code === code);
  if (!def) return null;

  const ign = profile.ign || "IGN not set";

  const rank =
    profile.rankTier && profile.rankDivision
      ? `${profile.rankTier} ${profile.rankDivision}`
      : profile.rankTier || "Rank not set";

  const iconSrc = GAME_ICON_PATHS[code];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.featuredCard} ${
        selected ? styles.featuredCardActive : ""
      }`}
    >
      {iconSrc && (
        <div className={styles.featuredIcon}>
          <img
            src={iconSrc}
            alt={`${def.label} icon`}
            className={styles.featuredIconImg}
          />
        </div>
      )}
      <div className={styles.featuredText}>
        <div className={styles.featuredGameLabel}>{def.label}</div>
        <div className={styles.featuredIgn}>{ign}</div>
        <div className={styles.featuredRank}>{rank}</div>
      </div>
    </button>
  );
}

// ---------- Game profile editor ----------
function GameProfileEditor({ gameDef, profile, onProfileSaved }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Extra warning just for HoK stars/rank mismatch
  const [hokRankWarning, setHokRankWarning] = useState("");

  // For VAL & TFT we want region up next to Name#Tag
  const showRegionTop =
    gameDef.kind === "TAGGED_ID" &&
    (gameDef.code === "VALORANT" || gameDef.code === "TFT");

  // ----- derive initial fields based on kind -----
  let initialName = "";
  let initialTag = "";

  if (gameDef.kind === "TAGGED_ID") {
    if (profile.ign && profile.ign.includes("#")) {
      const idx = profile.ign.indexOf("#");
      initialName = profile.ign.slice(0, idx);
      initialTag = profile.ign.slice(idx + 1);
    } else if (profile.ign) {
      initialName = profile.ign;
      initialTag = "";
    }
  }

  const [namePart, setNamePart] = useState(initialName);
  const [tagPart, setTagPart] = useState(initialTag);
  const [singleIgn, setSingleIgn] = useState(
    gameDef.kind === "SINGLE_NAME" ? profile.ign || "" : ""
  );
  const [rankTier, setRankTier] = useState(profile.rankTier || "");
  const [rankDivision, setRankDivision] = useState(profile.rankDivision || "");
  const [region, setRegion] = useState(
    profile.region || gameDef.defaultRegion || ""
  );

  // HOK extras
  const [hokStars, setHokStars] = useState(
    profile.hokStars !== "" && profile.hokStars !== null
      ? String(profile.hokStars)
      : ""
  );
  const [hokPeakScore, setHokPeakScore] = useState(
    profile.hokPeakScore !== "" && profile.hokPeakScore !== null
      ? String(profile.hokPeakScore)
      : ""
  );

  // TFT Double Up
  const [tftDoubleTier, setTftDoubleTier] = useState(
    profile.tftDoubleTier || ""
  );
  const [tftDoubleDivision, setTftDoubleDivision] = useState(
    profile.tftDoubleDivision || ""
  );

  const isEmpty =
    !(profile.ign && profile.ign.trim()) &&
    !(profile.rankTier && profile.rankTier.trim());

  // whether division dropdown should be shown for current game/tier
  let showDivision = false;
  let divisionOptions = [];

  if (gameDef.code === "VALORANT") {
    showDivision =
      rankTier &&
      !["Immortal", "Radiant"].includes(rankTier) &&
      gameDef.rankDivisions.length > 0;
    divisionOptions = gameDef.rankDivisions;
  } else if (gameDef.code === "TFT") {
    showDivision =
      rankTier &&
      !["Master", "Grandmaster", "Challenger"].includes(rankTier) &&
      gameDef.rankDivisions.length > 0;
    divisionOptions = gameDef.rankDivisions;
  } else if (gameDef.code === "HOK") {
    // For HoK, we want a "sub-tier" slot even if nothing selected,
    // but for the Grandmaster family we use stars instead.
    if (
      rankTier === "Grandmaster" ||
      rankTier === "Grandmaster Mythic" ||
      rankTier === "Grandmaster Epic" ||
      rankTier === "Grandmaster Legend"
    ) {
      showDivision = false; // stars field will appear instead
    } else if (rankTier && HOK_DIVISIONS_BY_TIER[rankTier]) {
      showDivision = true;
      divisionOptions = HOK_DIVISIONS_BY_TIER[rankTier];
    } else {
      // No tier yet – still show an empty dropdown
      showDivision = true;
      divisionOptions = [];
    }
  } else if (gameDef.rankDivisions && gameDef.rankDivisions.length > 0) {
    showDivision = true;
    divisionOptions = gameDef.rankDivisions;
  }

  async function handleSave(e) {
    e.preventDefault();
    setMessage("");
    setHokRankWarning("");
    setSaving(true);

    // ----- Build IGN -----
    let finalIgn = "";
    if (gameDef.kind === "TAGGED_ID") {
      const n = (namePart || "").trim();
      const t = (tagPart || "").trim();
      if (n && t) {
        finalIgn = `${n}#${t}`;
      } else if (n) {
        finalIgn = n;
      } else {
        finalIgn = "";
      }
    } else {
      finalIgn = (singleIgn || "").trim();
    }

    // Work on a mutable copy of rankTier so we can adjust it
    let workingRankTier = (rankTier || "").trim();

    // ----- HoK stars → rank auto-correction -----
    let finalHokStars = null;
    let finalHokPeakScore = null;

    if (gameDef.code === "HOK") {
      const starsNum = hokStars === "" ? null : Number(hokStars);

      if (!Number.isNaN(starsNum) && starsNum !== null && starsNum >= 0) {
        finalHokStars = starsNum;

        // Only do the auto-mapping if the player is in the Grandmaster family
        const gmTiers = [
          "Grandmaster",
          "Grandmaster Mythic",
          "Grandmaster Epic",
          "Grandmaster Legend",
        ];

        if (gmTiers.includes(workingRankTier) || workingRankTier === "") {
          let expectedTier = "Grandmaster";
          if (starsNum >= 100) expectedTier = "Grandmaster Legend";
          else if (starsNum >= 50) expectedTier = "Grandmaster Epic";
          else if (starsNum >= 25) expectedTier = "Grandmaster Mythic";
          else expectedTier = "Grandmaster";

          if (workingRankTier !== expectedTier) {
            workingRankTier = expectedTier;
            setHokRankWarning(
              `Stars don't match that rank; your rank has been set to ${expectedTier}.`
            );
          }
        }
      }

      const peakNum = hokPeakScore === "" ? null : Number(hokPeakScore);
      if (!Number.isNaN(peakNum) && peakNum !== null) {
        finalHokPeakScore = peakNum;
      }
    }

    // ----- Division rules (uses workingRankTier) -----
    let finalDivision = (rankDivision || "").trim();
    if (
      (gameDef.code === "VALORANT" &&
        (workingRankTier === "Immortal" || workingRankTier === "Radiant")) ||
      (gameDef.code === "TFT" &&
        (workingRankTier === "Master" ||
          workingRankTier === "Grandmaster" ||
          workingRankTier === "Challenger")) ||
      (gameDef.code === "HOK" &&
        (workingRankTier === "Grandmaster" ||
          workingRankTier === "Grandmaster Mythic" ||
          workingRankTier === "Grandmaster Epic" ||
          workingRankTier === "Grandmaster Legend"))
    ) {
      finalDivision = "";
    }

    // ----- TFT Double Up -----
    let finalTftDoubleTier = "";
    let finalTftDoubleDivision = "";
    if (gameDef.code === "TFT") {
      finalTftDoubleTier = (tftDoubleTier || "").trim();
      finalTftDoubleDivision = (tftDoubleDivision || "").trim();

      const highTiers = ["Master", "Grandmaster", "Challenger"];
      if (highTiers.includes(finalTftDoubleTier)) {
        finalTftDoubleDivision = "";
      }
    }

    const payload = {
      ign: finalIgn,
      rankTier: workingRankTier,
      rankDivision: finalDivision,
      region: (region || "").trim(),
      hokStars: finalHokStars,
      hokPeakScore: finalHokPeakScore,
      tftDoubleTier: finalTftDoubleTier,
      tftDoubleDivision: finalTftDoubleDivision,
    };

    try {
      const res = await fetch("/api/profile/game-profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          game: gameDef.code,
          profile: payload,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setMessage(data.error || "Failed to save profile.");
      } else {
        const saved = data.profile || payload;

        // ---- Sync local state so UI updates immediately ----
        if (gameDef.kind === "TAGGED_ID") {
          const ignVal = saved.ign || "";
          if (ignVal.includes("#")) {
            const idx = ignVal.indexOf("#");
            setNamePart(ignVal.slice(0, idx));
            setTagPart(ignVal.slice(idx + 1));
          } else {
            setNamePart(ignVal);
            setTagPart("");
          }
        } else {
          setSingleIgn(saved.ign || "");
        }

        setRankTier(saved.rankTier || "");
        setRankDivision(saved.rankDivision || "");
        setRegion(saved.region || gameDef.defaultRegion || "");

        if (gameDef.code === "HOK") {
          setHokStars(
            saved.hokStars === null || saved.hokStars === undefined
              ? ""
              : String(saved.hokStars)
          );
          setHokPeakScore(
            saved.hokPeakScore === null || saved.hokPeakScore === undefined
              ? ""
              : String(saved.hokPeakScore)
          );
        }

        if (gameDef.code === "TFT") {
          setTftDoubleTier(saved.tftDoubleTier || "");
          setTftDoubleDivision(saved.tftDoubleDivision || "");
        }

        setMessage("Profile saved.");
        if (onProfileSaved) {
          onProfileSaved(gameDef.code, saved);
        }
      }
    } catch (err) {
      console.error(err);
      setMessage("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSave}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.45rem",
      }}
    >
      <div>
        <div
          style={{
            fontSize: "0.85rem",
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          {gameDef.label}
        </div>
        <div
          style={{
            fontSize: "0.8rem",
            color: "#9ca3af",
            marginTop: "0.2rem",
          }}
        >
          {gameDef.description}
        </div>
      </div>

      {/* IGN row */}
      {gameDef.kind === "TAGGED_ID" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: showRegionTop
              ? "2fr auto 1fr 1.3fr"
              : "2fr auto 1fr",
            gap: "0.4rem",
            alignItems: "flex-end",
            marginTop: "0.2rem",
          }}
        >
          <Field
            label="Name"
            placeholder="EDG WINSON"
            value={namePart}
            onChange={setNamePart}
          />
          <div
            style={{
              textAlign: "center",
              paddingBottom: "0.4rem",
              fontSize: "1rem",
              color: "#9ca3af",
            }}
          >
            #
          </div>
          <Field
            label="Tag"
            placeholder="NA1"
            value={tagPart}
            onChange={setTagPart}
          />

          {showRegionTop &&
            (gameDef.regions && gameDef.regions.length > 0 ? (
              <SelectField
                label="Region"
                value={region}
                onChange={setRegion}
                options={gameDef.regions}
                placeholder="Select"
              />
            ) : (
              <Field
                label="Region"
                placeholder="e.g. NA, EUW, SEA"
                value={region}
                onChange={setRegion}
              />
            ))}
        </div>
      ) : (
        <div
          style={{
            marginTop: "0.2rem",
          }}
        >
          <Field
            label="In-game name"
            placeholder={
              gameDef.code === "HOK" ? "Your HoK name" : "In-game name"
            }
            value={singleIgn}
            onChange={setSingleIgn}
          />
        </div>
      )}

      {/* Rank + region / peak row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            gameDef.code === "HOK"
              ? "minmax(0, 2fr) minmax(0, 1.2fr) minmax(0, 1.4fr)"
              : showDivision
              ? "minmax(0, 2fr) minmax(0, 1fr)" +
                (!showRegionTop ? " minmax(0, 1.3fr)" : "")
              : "minmax(0, 2fr)" +
                (!showRegionTop ? " minmax(0, 1.3fr)" : ""),
          gap: "0.5rem",
          marginTop: "0.1rem",
        }}
      >
        <SelectField
          label="Rank tier"
          value={rankTier}
          onChange={(value) => {
            setRankTier(value);
            setRankDivision("");
          }}
          options={gameDef.rankTiers}
          placeholder="Select rank"
        />

        {/* HoK: either division or stars in this middle slot */}
        {gameDef.code === "HOK" ? (
          rankTier === "Grandmaster" ||
          rankTier === "Grandmaster Mythic" ||
          rankTier === "Grandmaster Epic" ||
          rankTier === "Grandmaster Legend" ? (
            <Field
              label="Grandmaster stars (0 - 500)"
              placeholder="0"
              value={hokStars}
              onChange={setHokStars}
            />
          ) : (
            <SelectField
              label="Sub-tier / Division"
              value={rankDivision}
              onChange={setRankDivision}
              options={divisionOptions}
              placeholder="—"
              allowEmpty
            />
          )
        ) : (
          showDivision && (
            <SelectField
              label="Division"
              value={rankDivision}
              onChange={setRankDivision}
              options={divisionOptions}
              placeholder="—"
              allowEmpty
            />
          )
        )}

        {/* Third column: Peak score for HoK, or Region when not already shown */}
        {!showRegionTop &&
          (gameDef.code === "HOK" ? (
            <Field
              label="Peak Tournament score (1200 - 3000)"
              placeholder="1200"
              value={hokPeakScore}
              onChange={setHokPeakScore}
            />
          ) : gameDef.regions && gameDef.regions.length > 0 ? (
            <SelectField
              label="Region"
              value={region}
              onChange={setRegion}
              options={gameDef.regions}
              placeholder="Select"
            />
          ) : (
            !showRegionTop && (
              <Field
                label="Region"
                placeholder="e.g. NA, EUW, SEA"
                value={region}
                onChange={setRegion}
              />
            )
          ))}
      </div>

      {/* HoK stars/rank warning */}
      {gameDef.code === "HOK" && hokRankWarning && (
        <div
          style={{
            marginTop: "0.2rem",
            fontSize: "0.75rem",
            color: "#fbbf24",
          }}
        >
          {hokRankWarning}
        </div>
      )}

      {/* TFT Double Up extras */}
      {gameDef.code === "TFT" && (
        <div
          style={{
            marginTop: "0.5rem",
            paddingTop: "0.5rem",
            borderTop: "1px solid rgba(55,65,81,0.7)",
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
            gap: "0.5rem",
          }}
        >
          <SelectField
            label="Double Up rank tier"
            value={tftDoubleTier}
            onChange={(value) => {
              setTftDoubleTier(value);
              setTftDoubleDivision("");
            }}
            options={gameDef.rankTiers}
            placeholder="Select rank"
          />
          <SelectField
            label="Double Up division"
            value={tftDoubleDivision}
            onChange={setTftDoubleDivision}
            options={gameDef.rankDivisions}
            placeholder="—"
            allowEmpty
          />
        </div>
      )}

      {/* Bottom explanatory text – per game, talking about future tournaments */}
      <div
        style={{
          marginTop: "0.25rem",
          fontSize: "0.75rem",
          color: isEmpty ? "#fbbf24" : "#9ca3af",
        }}
      >
        {(() => {
          let usageLine = "";

          if (gameDef.code === "VALORANT") {
            usageLine =
              "This information will be used when you sign up for VALORANT tournaments. Make sure it matches your in-game details.";
          } else if (gameDef.code === "TFT") {
            usageLine =
              "This information will be used when you sign up for Teamfight Tactics tournaments. Make sure it matches your in-game details.";
          } else if (gameDef.code === "HOK") {
            usageLine =
              "This information will be used when you sign up for Honor of Kings tournaments. Make sure it matches your in-game details.";
          } else {
            usageLine =
              "This information will be used when you sign up for tournaments. Make sure it matches your in-game details.";
          }

          if (isEmpty) {
            return (
              <>
                You haven&apos;t set your {gameDef.label} profile yet.{" "}
                {usageLine}
              </>
            );
          }

          return (
            <>
              {usageLine} If it&apos;s wrong, you might not be able to play.
            </>
          );
        })()}
      </div>

      <div
        style={{
          marginTop: "0.4rem",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "0.35rem 0.85rem",
            borderRadius: "999px",
            border: "none",
            background:
              "linear-gradient(135deg, #22c55e 0%, #16a34a 40%, #0f172a 100%)",
            color: "#f9fafb",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: saving ? "default" : "pointer",
            opacity: saving ? 0.75 : 1,
          }}
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
        {message && (
          <span
            style={{
              fontSize: "0.75rem",
              color: message.includes("saved") ? "#bbf7d0" : "#fecaca",
            }}
          >
            {message}
          </span>
        )}
      </div>
    </form>
  );
}

// ---------- Small helpers ----------
function Field({ label, value, onChange, placeholder }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.15rem",
        fontSize: "0.8rem",
      }}
    >
      <span style={{ color: "#e5e7eb" }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "0.35rem 0.55rem",
          borderRadius: "8px",
          border: "1px solid #4b5563",
          backgroundColor: "#020617",
          color: "#f9fafb",
          fontSize: "0.8rem",
          outline: "none",
        }}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  allowEmpty,
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.15rem",
        fontSize: "0.8rem",
      }}
    >
      <span style={{ color: "#e5e7eb" }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "0.35rem 0.55rem",
          borderRadius: "8px",
          border: "1px solid #4b5563",
          backgroundColor: "#020617",
          color: "#f9fafb",
          fontSize: "0.8rem",
          outline: "none",
        }}
      >
        {allowEmpty ? (
          <option value="">{placeholder || "—"}</option>
        ) : (
          <option value="">{placeholder || "Select"}</option>
        )}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
