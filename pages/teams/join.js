// pages/teams/join.js
import { useState } from "react";
import { useRouter } from "next/router";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import Team from "../../models/Team";
import TeamJoinRequest from "../../models/TeamJoinRequest";
import styles from "../../styles/JoinTeams.module.css"; 

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

// Helper to strip tag line (e.g. "Winson#NA1" -> "Winson")
const getDisplayName = (fullName) => {
  if (!fullName) return "Unknown";
  return fullName.split('#')[0];
};

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

  // 1. Fetch Teams (public, excluding teams I'm already on)
  const publicTeamsRaw = await Team.find({
    isPublic: true,
    game: { $in: allowedGameCodes },
    captain: { $ne: playerDoc._id },
    members: { $ne: playerDoc._id },
  })
  .select('name tag game rank rolesNeeded maxSize captain members')
  .sort({ createdAt: -1 }).lean(); 

  // 2. Fetch Requests
  const pendingByUserRaw = await TeamJoinRequest.find({
    playerId: playerDoc._id,
    status: "pending",
  }).lean();
  const pendingByUserSet = new Set(pendingByUserRaw.map((r) => String(r.teamId)));

  // 3. FETCH MEMBER NAMES & CAPTAIN NAMES
  const allPlayerIds = new Set();
  publicTeamsRaw.forEach(t => {
    allPlayerIds.add(String(t.captain));
    if (t.members) t.members.forEach(m => allPlayerIds.add(String(m)));
  });

  const allPlayersDocs = await Player.find({ 
    _id: { $in: Array.from(allPlayerIds) } 
  }).select('username discordUsername gameProfiles').lean();

  const getPlayerDisplayInfo = (playerObj, gameCode) => {
    const baseName = playerObj.username || playerObj.discordUsername || "Player";
    let ign = baseName;

    if (gameCode === "VALORANT" && playerObj.gameProfiles?.VALORANT?.ign) {
        ign = playerObj.gameProfiles.VALORANT.ign.trim();
    } else if (gameCode === "HOK" && playerObj.gameProfiles?.HOK?.ign) {
        ign = playerObj.gameProfiles.HOK.ign.trim();
    }
    return ign;
  };


  const playerMap = {};
  allPlayersDocs.forEach(p => {
    playerMap[String(p._id)] = p;
  });

  const formattedPublicTeams = publicTeamsRaw.map((t) => {
    const teamIdStr = String(t._id);
    const memberCount = t.members ? t.members.length : 0;
    const gameCode = t.game;
    const captainId = String(t.captain);

    // Build member objects for display
    const membersDetails = (t.members || []).map(mId => {
      const pDoc = playerMap[String(mId)];
      return {
        name: getPlayerDisplayInfo(pDoc, gameCode),
        isCaptain: String(mId) === captainId
      };
    });

    const captainDoc = playerMap[captainId];
    const captainName = getPlayerDisplayInfo(captainDoc, gameCode);

    return {
      id: teamIdStr,
      name: t.name,
      tag: t.tag || "",
      game: gameCode,
      rank: t.rank || "Unranked",
      rolesNeeded: t.rolesNeeded || [],
      memberCount,
      maxSize: t.maxSize || 7,
      isFull: memberCount >= (t.maxSize || 7),
      hasPendingRequestByMe: pendingByUserSet.has(teamIdStr),
      captainName,    
      membersDetails, 
    };
  });

  return {
    props: {
      player: {
        id: playerDoc._id.toString(),
        username: playerDoc.username || playerDoc.discordUsername || "Player",
        hasCustomName: !!playerDoc.gameProfiles?.VALORANT?.ign || !!playerDoc.gameProfiles?.HOK?.ign 
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

  // --- JOIN REQUEST LOGIC ---
  function onRequestClick(team) {
    if (team.isFull || team.hasPendingRequestByMe) return;

    if (!player.hasCustomName) {
      const confirmRedirect = window.confirm(
        "You need to set your In-Game Name (Valorant/HoK ID) in your profile before joining a team.\n\nGo to Profile now?"
      );
      if (confirmRedirect) {
        router.push("/profile"); 
      }
      return;
    }

    setTeamToJoin(team);
  }

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
        prev.map((t) => t.id === team.id ? { ...t, hasPendingRequestByMe: true } : t)
      );
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    } finally {
      setRequestingFor(null);
    }
  }

  const searchLower = search.trim().toLowerCase();
  const filteredTeams = publicTeams.filter((t) => {
    if (selectedGame !== "ALL" && t.game !== selectedGame) return false;
    if (!searchLower) return true;
    const captainSearchable = getDisplayName(t.captainName).toLowerCase();
    const haystack = `${t.name} ${t.tag} ${captainSearchable}`.toLowerCase();
    return haystack.includes(searchLower);
  });

  return (
    <div className={styles.shell}>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <span className={styles.userBadge}>Logged in as {getDisplayName(player.username)}</span>
            <h1 className={styles.title}>Find a Team</h1>
            <p className={styles.subtitle}>Browse public teams. Join a squad that matches your rank and role.</p>
          </div>
          <button type="button" onClick={() => router.push("/teams")} className={styles.backBtn}>← My Teams</button>
        </div>

        <div className={styles.controlBar}>
          <div className={styles.glassPanel}>
            <div className={styles.inputGroup}>
              <label htmlFor="game-filter" className={styles.label}>Game</label>
              <select id="game-filter" value={selectedGame} onChange={handleGameSelect} className={styles.select}>
                <option value="ALL">All games</option>
                {supportedGames.map((g) => (<option key={g.code} value={g.code}>{g.label}</option>))}
              </select>
            </div>
            <div className={styles.inputGroup} style={{ flex: 1 }}>
              <label htmlFor="team-search" className={styles.label}>Search</label>
              <input id="team-search" type="text" value={search} onChange={handleSearchChange} placeholder="Search team or captain..." className={styles.input} />
            </div>
          </div>
        </div>

        <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "#64748b" }}>
          Found <strong>{filteredTeams.length}</strong> public team{filteredTeams.length === 1 ? "" : "s"}.
        </p>

        <div className={styles.grid}>
          {filteredTeams.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyTitle}>No public teams found</div>
              <p className={styles.emptyText}>Try adjusting your filters.</p>
            </div>
          ) : (
            filteredTeams.map((team) => (
              <PublicTeamCard key={team.id} team={team} onRequestJoin={onRequestClick} requesting={requestingFor === team.id} />
            ))
          )}
        </div>
      </div>

      {teamToJoin && (
        <div className={styles.modalOverlay} onClick={() => setTeamToJoin(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Join {teamToJoin.name}?</h3>
            <p className={styles.modalText}>Request to join <strong>{getDisplayName(teamToJoin.captainName)}'s</strong> team?</p>
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

// ---------- Subcomponent: Updated Card ----------
function PublicTeamCard({ team, onRequestJoin, requesting }) {
  const renderSlots = Array.from({ length: team.maxSize || 7 }, (_, i) => {
    return team.membersDetails[i] || null;
  });
  
  const rolesDisplay = team.rolesNeeded.slice(0, 4);

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
  const isStartingRosterFull = team.memberCount >= 5;

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
      
      {/* Captain and Meta Data Block */}
      <div className={styles.dataBlock}>
          {/* Captain Display */}
          <div className={styles.captainDisplay}>
            <span>Captain:</span> 
            <span className={styles.captainName}>{getDisplayName(team.captainName)}</span>
          </div>
          
          {/* Rank Badge */}
          <div className={styles.rankBadge} style={{marginTop: '0.5rem'}}>
             Rank: <strong>{team.rank}</strong>
          </div>
      </div>

      {/* Roles Row (Separated by border) */}
      <div className={styles.metaRow}>
           {/* Roles Needed Badges */}
           <div className={styles.rolesContainer}>
             <span style={{color: '#94a3b8', fontSize: '0.75rem'}}>LOOKING FOR:</span>
             {rolesDisplay.map(r => (
               <span key={r} className={styles.roleChip}>
                 {r}
               </span>
             ))}
             {team.rolesNeeded.length === 0 && <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>None listed</span>}
             {team.rolesNeeded.length > 4 && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>+{team.rolesNeeded.length - 4}</span>}
           </div>
      </div>
      
      {/* CAPACITY BAR (Firing Angle Style - Now just simple segments) */}
      <div className={styles.slotsContainer}>
          <div className={styles.capacityBar}>
            {renderSlots.map((member, idx) => {
              const isFilled = !!member;
              const isCap = member && member.isCaptain;
              
              let segmentType = 'slotEmpty';
              if (isCap) {
                  segmentType = 'slotCaptain';
              } else if (isFilled) {
                  segmentType = 'slotFilled';
              }
              
              return (
                <div 
                  key={idx} 
                  className={`${styles.capacitySegment} ${styles[segmentType]}`}
                  title={member ? `${getDisplayName(member.name)} (${isCap ? 'Captain' : 'Member'})` : "Open Slot"}
                >
                </div>
              );
            })}
          </div>
          <div className={styles.capacityText}>
              {team.maxSize > 5 ? '5 Starters + 2 Subs' : `${team.maxSize} Total Slots`}
          </div>
      </div>

      {/* Warning if Sub */}
      {canRequest && isStartingRosterFull ? (
        <div className={styles.subWarningBox}>
          <span className={styles.subIcon}>⚠</span> 
          <span>Starting roster full. Applying for bench.</span>
        </div>
      ) : (
        <div style={{ height: '41px' }}></div> 
      )}

      <div className={styles.cardFooter}>
        <span className={styles.memberCount}>
          {team.memberCount} / {team.maxSize || 7} Members
        </span>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {statusLabel && <span className={`${styles.statusBadge} ${statusClass}`}>{statusLabel}</span>}
          
          {canRequest && (
            <button
              type="button"
              onClick={() => onRequestClick(team)}
              disabled={requesting}
              className={styles.joinBtn}
            >
              {requesting ? "..." : "Request to Join"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}