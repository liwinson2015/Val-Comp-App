// pages/teams/join.js
import { useState } from "react";
import { useRouter } from "next/router";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import Team from "../../models/Team";
import TeamJoinRequest from "../../models/TeamJoinRequest";
import styles from "../../styles/JoinTeams.module.css"; 

// Supported games for UI and filtering
const SUPPORTED_GAMES = [
  { code: "VALORANT", label: "VALORANT" },
  { code: "HOK", label: "Honor of Kings" },
];

function parseCookies(header = "") {
  return Object.fromEntries(
    (header || "").split(";").filter(Boolean).map((c) => {
        const [k, ...rest] = c.trim().split("=");
        return [k, decodeURIComponent(rest.join("=") || "")];
      })
  );
}

// ---------- SERVER SIDE ----------
export async function getServerSideProps({ req, query }) {
  const cookies = parseCookies(req.headers.cookie || "");
  const playerId = cookies.playerId || null;

  if (!playerId) {
    const next = "/teams/join";
    const encoded = encodeURIComponent(next);
    return {
      redirect: { destination: `/api/auth/discord?next=${encoded}`, permanent: false },
    };
  }

  await connectToDatabase();

  const playerDoc = await Player.findById(playerId).lean();
  if (!playerDoc) {
    return { redirect: { destination: "/", permanent: false } };
  }

  const requestedGame = typeof query.game === "string" ? query.game : "";
  const allowedGameCodes = SUPPORTED_GAMES.map((g) => g.code);
  const initialSelectedGame = allowedGameCodes.includes(requestedGame)
    ? requestedGame
    : "ALL";

  // Public teams logic...
  const publicTeamsRaw = await Team.find({
    isPublic: true,
    game: { $in: allowedGameCodes },
    captain: { $ne: playerDoc._id },
    members: { $ne: playerDoc._id },
  }).sort({ createdAt: 1 }).lean();

  // Pending requests logic...
  const pendingByUserRaw = await TeamJoinRequest.find({
    playerId: playerDoc._id,
    status: "pending",
  }).lean();

  const pendingByUserSet = new Set(pendingByUserRaw.map((r) => String(r.teamId)));

  const formattedPublicTeams = publicTeamsRaw.map((t) => {
    const teamIdStr = String(t._id);
    const memberCount = t.members ? t.members.length : 0;
    const maxSize = t.maxSize || 7;

    return {
      id: teamIdStr,
      name: t.name,
      tag: t.tag || "",
      game: t.game,
      memberCount,
      maxSize,
      isFull: memberCount >= maxSize,
      hasPendingRequestByMe: pendingByUserSet.has(teamIdStr),
    };
  });

  return {
    props: {
      player: {
        id: playerDoc._id.toString(),
        username: playerDoc.username || playerDoc.discordUsername || "Player",
      },
      initialPublicTeams: formattedPublicTeams,
      initialSelectedGame,
      supportedGames: SUPPORTED_GAMES,
    },
  };
}

// ---------- CLIENT COMPONENT ----------
export default function JoinTeamsPage({
  player,
  initialPublicTeams,
  initialSelectedGame,
  supportedGames,
}) {
  const router = useRouter();
  const [publicTeams, setPublicTeams] = useState(initialPublicTeams || []);
  const [selectedGame, setSelectedGame] = useState(initialSelectedGame || "ALL");
  const [search, setSearch] = useState("");
  const [requestingFor, setRequestingFor] = useState(null);
  
  // Modal State
  const [teamToJoin, setTeamToJoin] = useState(null);

  function handleGameSelect(e) {
    const newGame = e.target.value;
    setSelectedGame(newGame);
    const query = newGame === "ALL" ? {} : { game: newGame };
    router.push({ pathname: "/teams/join", query }, undefined, { shallow: true });
  }

  function handleSearchChange(e) {
    setSearch(e.target.value || "");
  }

  // User clicks "Request" -> Open Modal
  function onRequestClick(team) {
    if (team.isFull || team.hasPendingRequestByMe) return;
    setTeamToJoin(team);
  }

  // User confirms in Modal
  async function confirmJoin() {
    if (!teamToJoin) return;
    
    const team = teamToJoin;
    setRequestingFor(team.id);
    setTeamToJoin(null);

    try {
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.id }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error || "Failed to request to join.");
        return;
      }

      setPublicTeams((prev) =>
        prev.map((t) =>
          t.id === team.id ? { ...t, hasPendingRequestByMe: true } : t
        )
      );
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    } finally {
      setRequestingFor(null);
    }
  }

  // Filter teams
  const searchLower = search.trim().toLowerCase();
  const filteredTeams = publicTeams.filter((t) => {
    if (selectedGame !== "ALL" && t.game !== selectedGame) return false;
    if (!searchLower) return true;
    const haystack = `${t.name} ${t.tag}`.toLowerCase();
    return haystack.includes(searchLower);
  });

  return (
    <div className={styles.shell}>
      <div className={styles.wrap}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <span className={styles.userBadge}>Logged in as {player.username}</span>
            <h1 className={styles.title}>Find a Team</h1>
            <p className={styles.subtitle}>
              Browse public teams looking for players. Teams you're already on won't show up here.
            </p>
          </div>
          <button type="button" onClick={() => router.push("/teams")} className={styles.backBtn}>
            ← My Teams
          </button>
        </div>

        {/* Control Bar */}
        <div className={styles.controlBar}>
          <div className={styles.glassPanel}>
            <div className={styles.inputGroup}>
              <label htmlFor="game-filter" className={styles.label}>Game</label>
              <select id="game-filter" value={selectedGame} onChange={handleGameSelect} className={styles.select}>
                <option value="ALL">All games</option>
                {supportedGames.map((g) => (
                  <option key={g.code} value={g.code}>{g.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.inputGroup} style={{ flex: 1 }}>
              <label htmlFor="team-search" className={styles.label}>Search</label>
              <input
                id="team-search"
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search by team name or tag..."
                className={styles.input}
              />
            </div>
          </div>
        </div>

        <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "#64748b" }}>
          Found <strong>{filteredTeams.length}</strong> public team{filteredTeams.length === 1 ? "" : "s"}.
        </p>

        {/* Grid */}
        <div className={styles.grid}>
          {filteredTeams.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyTitle}>No public teams found</div>
              <p className={styles.emptyText}>
                Try adjusting your filters or ask a captain for an invite code.
              </p>
            </div>
          ) : (
            filteredTeams.map((team) => (
              <PublicTeamCard
                key={team.id}
                team={team}
                onRequestJoin={onRequestClick}
                requesting={requestingFor === team.id}
              />
            ))
          )}
        </div>
      </div>

      {/* --- CUSTOM MODAL --- */}
      {teamToJoin && (
        <div className={styles.modalOverlay} onClick={() => setTeamToJoin(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Join {teamToJoin.name}?</h3>
            <p className={styles.modalText}>
              This will send a request to the captain. <br/>
              You will be notified if they accept.
            </p>
            <div className={styles.modalActions}>
              <button onClick={() => setTeamToJoin(null)} className={styles.cancelBtn}>Cancel</button>
              <button onClick={confirmJoin} className={styles.confirmBtn}>Confirm Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Subcomponent ----------
function PublicTeamCard({ team, onRequestJoin, requesting }) {
  const maxSlots = 7;
  // Create array of slot types
  const bars = Array.from({ length: maxSlots }, (_, i) => {
    if (i === 0) return 'captain';
    if (i < team.memberCount) return 'filled';
    return 'empty';
  });

  let statusLabel = "";
  let statusClass = "";

  if (team.hasPendingRequestByMe) {
    statusLabel = "Requested";
    statusClass = styles.statusRequested;
  } else if (team.isFull) {
    statusLabel = "Full";
    statusClass = styles.statusFull;
  }

  const canRequest = !team.isFull && !team.hasPendingRequestByMe;
  
  // Logic: If memberCount >= 5, the next person joining is a sub.
  const isStartingRosterFull = team.memberCount >= 5;
  const showSubWarning = canRequest && isStartingRosterFull;

  return (
    <div className={styles.teamCard}>
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.teamName}>
            <span className={styles.teamTag}>{team.tag ? `${team.tag} | ` : ""}</span>
            {team.name}
          </h3>
        </div>
        <span className={styles.gameBadge}>{team.game}</span>
      </div>

      {/* Visual Slot Bars */}
      <div className={styles.slotsContainer}>
        {bars.map((type, idx) => (
          <div 
            key={idx} 
            className={`${styles.slot} ${
              type === 'captain' ? styles.slotCaptain : 
              type === 'filled' ? styles.slotFilled : 
              styles.slotEmpty
            }`} 
            title={idx < 5 ? "Starter Slot" : "Substitute Slot"}
          />
        ))}
      </div>

      {/* Warning Message if filling a Sub slot */}
      {showSubWarning ? (
        <div className={styles.subWarningBox}>
          <span className={styles.subIcon}>⚠</span> 
          <span>Starting roster full. Registering as substitute.</span>
        </div>
      ) : (
        // Invisible spacer to keep card heights consistent
        <div style={{ height: '41px', marginBottom: '0' }}></div>
      )}

      <div className={styles.cardFooter}>
        <span className={styles.memberCount}>
          {team.memberCount} / {team.maxSize || 7} Members
        </span>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {statusLabel && (
            <span className={`${styles.statusBadge} ${statusClass}`}>
              {statusLabel}
            </span>
          )}
          
          <button
            type="button"
            onClick={() => canRequest && onRequestJoin(team)}
            disabled={!canRequest || requesting}
            className={styles.joinBtn}
            style={{ display: canRequest ? 'block' : 'none' }}
          >
            {requesting ? "..." : "Request to Join"}
          </button>
        </div>
      </div>
    </div>
  );
}