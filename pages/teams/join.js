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

  // 1. Fetch Teams
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

  // 3. Fetch Member Names
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
    if (gameCode === "VALORANT" && playerObj.gameProfiles?.VALORANT?.ign) ign = playerObj.gameProfiles.VALORANT.ign.trim();
    else if (gameCode === "HOK" && playerObj.gameProfiles?.HOK?.ign) ign = playerObj.gameProfiles.HOK.ign.trim();
    return ign;
  };

  const playerMap = {};
  allPlayersDocs.forEach(p => {
    playerMap[String(p._id)] = p;
  });

  // 4. Format and FILTER
  const formattedPublicTeams = publicTeamsRaw.map((t) => {
    const teamIdStr = String(t._id);
    const memberCount = t.members ? t.members.length : 0;
    const gameCode = t.game;
    const captainDoc = playerMap[String(t.captain)];
    
    return {
      id: teamIdStr,
      name: t.name,
      tag: t.tag || "",
      game: gameCode,
      rank: t.rank || "Unranked",
      rolesNeeded: t.rolesNeeded || [],
      memberCount,
      maxSize: t.maxSize || 7,
      // Calculate Full Status
      isFull: memberCount >= (t.maxSize || 7),
      hasPendingRequestByMe: pendingByUserSet.has(teamIdStr),
      captainName: getPlayerDisplayInfo(captainDoc, gameCode),
      
      // Pass member details for slots
      membersDetails: (t.members || []).map(mId => ({
        name: getPlayerDisplayInfo(playerMap[String(mId)], gameCode),
        isCaptain: String(mId) === String(t.captain)
      }))
    };
  })
  // --- THE FIX: Remove full teams from the list ---
  .filter(team => !team.isFull);
  // -----------------------------------------------

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
export default function JoinTeamsPage({ player, initialPublicTeams, initialSelectedGame, supportedGames }) {
  const router = useRouter();
  const [publicTeams, setPublicTeams] = useState(initialPublicTeams || []);
  const [selectedGame, setSelectedGame] = useState(initialSelectedGame || "ALL");
  const [search, setSearch] = useState("");
  
  const [requestingFor, setRequestingFor] = useState(null);
  const [teamToJoin, setTeamToJoin] = useState(null);
  const [joinError, setJoinError] = useState(""); 
  const [showProfileAlert, setShowProfileAlert] = useState(false);

  function handleGameSelect(e) {
    const newGame = e.target.value;
    setSelectedGame(newGame);
    const query = newGame === "ALL" ? {} : { game: newGame };
    router.push({ pathname: "/teams/join", query }, undefined, { shallow: true });
  }

  function handleSearchChange(e) {
    setSearch(e.target.value || "");
  }

  function onRequestClick(team) {
    if (team.isFull || team.hasPendingRequestByMe) return;
    if (!player.hasCustomName) {
      setShowProfileAlert(true);
      return;
    }
    setJoinError("");
    setTeamToJoin(team);
  }

  function closeJoinModal() {
    if (requestingFor) return; 
    setTeamToJoin(null);
    setJoinError("");
  }

  async function confirmJoin() {
    if (!teamToJoin) return;
    const team = teamToJoin;
    setRequestingFor(team.id);
    setJoinError("");

    try {
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.id }),
      });
      const data = await res.json();
      
      if (!data.ok) {
        setJoinError(data.error || "Request failed. Please try again.");
      } else {
        setPublicTeams((prev) =>
          prev.map((t) => t.id === team.id ? { ...t, hasPendingRequestByMe: true } : t)
        );
        setTeamToJoin(null);
      }
    } catch (err) {
      console.error(err);
      setJoinError("Network error. Check your connection.");
    } finally {
      setRequestingFor(null);
    }
  }

  const searchLower = search.trim().toLowerCase();
  const filteredTeams = publicTeams.filter((t) => {
    if (selectedGame !== "ALL" && t.game !== selectedGame) return false;
    if (!searchLower) return true;
    return `${t.name} ${t.tag} ${t.captainName}`.toLowerCase().includes(searchLower);
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
          <button onClick={() => router.push("/teams")} className={styles.backBtn}>← My Teams</button>
        </div>

        <div className={styles.controlBar}>
          <div className={styles.glassPanel}>
            <div className={styles.inputGroup}>
              <label htmlFor="game-filter" className={styles.label}>Game</label>
              <select id="game-filter" value={selectedGame} onChange={handleGameSelect} className={styles.select}>
                <option value="ALL">All games</option>
                {supportedGames.map(g => <option key={g.code} value={g.code}>{g.label}</option>))}
              </select>
            </div>
            <div className={styles.inputGroup} style={{ flex: 1 }}>
              <label htmlFor="team-search" className={styles.label}>Search</label>
              <input id="team-search" type="text" value={search} onChange={handleSearchChange} placeholder="Search team or captain..." className={styles.input} />
            </div>
          </div>
        </div>

        <div className={styles.grid}>
          {filteredTeams.length === 0 ? (
            <div className={styles.emptyState}>NO SQUADS FOUND.</div>
          ) : (
            filteredTeams.map((team) => (
              <PublicTeamCard key={team.id} team={team} onRequestJoin={onRequestClick} />
            ))
          )}
        </div>
      </div>

      {teamToJoin && (
        <div className={styles.modalOverlay} onClick={closeJoinModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>INITIATE JOIN?</h3>
            <p className={styles.modalText}>
              Requesting access to <strong>{teamToJoin.name}</strong>.<br/>
              Captain {getDisplayName(teamToJoin.captainName)} will be notified.
            </p>
            
            {joinError && (
              <div style={{color: '#ff3333', background: 'rgba(255,0,0,0.1)', border: '1px solid #ff3333', padding: '10px', marginBottom: '20px', fontSize: '0.8rem', fontFamily: 'monospace'}}>
                ⚠ ERROR: {joinError}
              </div>
            )}

            <div className={styles.modalActions}>
              <button onClick={closeJoinModal} className={styles.cancelBtn} disabled={!!requestingFor}>ABORT</button>
              <button onClick={confirmJoin} className={styles.confirmBtn} disabled={!!requestingFor}>
                {requestingFor ? "TRANSMITTING..." : "CONFIRM"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showProfileAlert && (
        <div className={styles.modalOverlay} onClick={() => setShowProfileAlert(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>MISSING ID</h3>
            <p className={styles.modalText}>You must register your In-Game Name in your profile before applying to squads.</p>
            <div className={styles.modalActions}>
              <button onClick={() => setShowProfileAlert(false)} className={styles.cancelBtn}>CLOSE</button>
              <button onClick={() => router.push('/profile')} className={styles.confirmBtn}>GO TO PROFILE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- NEW CYBER HUD CARD ----------
function PublicTeamCard({ team, onRequestJoin }) {
  const getTheme = (rank) => {
    const r = (rank || "").toLowerCase();
    if (r.includes('radiant') || r.includes('grandmaster')) return { hex: '#ffff00', dim: 'rgba(255, 255, 0, 0.2)' }; 
    if (r.includes('immortal') || r.includes('master')) return { hex: '#ff0055', dim: 'rgba(255, 0, 85, 0.2)' }; 
    if (r.includes('diamond') || r.includes('ascendant')) return { hex: '#d946ef', dim: 'rgba(217, 70, 239, 0.2)' }; 
    if (r.includes('platinum')) return { hex: '#06b6d4', dim: 'rgba(6, 182, 212, 0.2)' }; 
    if (r.includes('gold')) return { hex: '#f59e0b', dim: 'rgba(245, 158, 11, 0.2)' }; 
    return { hex: '#ffffff', dim: 'rgba(255,255,255,0.1)' }; 
  };

  const theme = getTheme(team.rank);
  
  // Use membersDetails if available, otherwise fallback
  const allSlots = team.membersDetails || [];
  const renderSlots = Array.from({ length: team.maxSize || 7 }, (_, i) => {
    return allSlots[i] || null;
  });

  let actionLabel = "";
  if (team.hasPendingRequestByMe) actionLabel = "PENDING";
  // isFull check is redundant here since we filter them out, but good for safety
  else if (team.isFull) actionLabel = "FULL";

  const canRequest = !team.isFull && !team.hasPendingRequestByMe;
  const willBeSub = team.memberCount >= 5;

  return (
    <div 
      className={styles.teamCard} 
      style={{ '--rank-color': theme.hex, '--rank-color-dim': theme.dim }}
    >
      <div className={styles.rankStrip}></div>
      <div className={styles.cardContent}>
        
        <div className={styles.topRow}>
          <div>
            <div className={styles.teamTag}>{team.tag}</div>
            <div className={styles.teamName}>{team.name}</div>
          </div>
          <div className={styles.gameDisplay}>
            <span className={styles.gameText}>{team.game}</span>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>Captain</span>
            <span className={styles.statValue}>{getDisplayName(team.captainName)}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>Avg Rank</span>
            <span className={styles.statValue} style={{color: 'var(--rank-color)'}}>{team.rank}</span>
          </div>
        </div>

        <div className={styles.rolesSection}>
          <span className={styles.statLabel}>Target Roles</span>
          <div style={{marginTop:'4px', display: 'flex', flexWrap: 'wrap'}}>
            {team.rolesNeeded.length > 0 ? (
              team.rolesNeeded.map(r => (
                <span key={r} className={styles.roleTag}>{r}</span>
              ))
            ) : (
              <span style={{color:'#444', fontSize:'0.7rem'}}>OPEN RECRUITMENT</span>
            )}
          </div>
        </div>

        <div className={styles.rosterSection}>
          <div className={styles.slotsRow}>
            {renderSlots.map((member, idx) => {
              const isFilled = !!member;
              // Fallback check for captain status
              const isCap = member && member.isCaptain;
              
              let segmentType = 'slotEmpty';
              if (isCap) segmentType = 'slotCaptain';
              else if (isFilled) segmentType = 'slotFilled';
              
              return (
                <div 
                  key={idx} 
                  className={`${styles.slot} ${styles[segmentType]}`}
                  title={member ? `${getDisplayName(member.name)}` : "Open Slot"}
                >
                </div>
              );
            })}
          </div>
          
          {canRequest && willBeSub ? (
            <div className={styles.cyberWarning}>
              <span>⚠ ROSTER FULL. JOINING AS SUB.</span>
            </div>
          ) : (
            <div className={styles.warningSpacer}></div>
          )}

          <div className={styles.rosterStatus} style={{marginTop: '10px'}}>
            <span className={styles.countText}>{team.memberCount}/{team.maxSize || 7} OPERATIVES</span>
            
            {actionLabel ? (
              <span className={styles.statusText} style={{color: actionLabel === 'FULL' ? '#ff3333' : '#0099ff'}}>
                {actionLabel}
              </span>
            ) : (
              <button 
                onClick={() => onRequestJoin(team)} 
                className={styles.joinBtn}
              >
                INITIALIZE JOIN
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}