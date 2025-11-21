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
  if (!playerDoc) return { redirect: { destination: "/", permanent: false } };

  const requestedGame = typeof query.game === "string" ? query.game : "";
  const allowedGameCodes = SUPPORTED_GAMES.map((g) => g.code);
  const initialSelectedGame = allowedGameCodes.includes(requestedGame) ? requestedGame : "ALL";

  // Fetch Teams
  const publicTeamsRaw = await Team.find({
    isPublic: true,
    game: { $in: allowedGameCodes },
    captain: { $ne: playerDoc._id },
    members: { $ne: playerDoc._id },
  })
  .select('name tag game rank rolesNeeded maxSize captain members')
  .sort({ createdAt: -1 }).lean(); 

  const pendingByUserRaw = await TeamJoinRequest.find({
    playerId: playerDoc._id,
    status: "pending",
  }).lean();
  const pendingByUserSet = new Set(pendingByUserRaw.map((r) => String(r.teamId)));

  const allPlayerIds = new Set();
  publicTeamsRaw.forEach(t => {
    allPlayerIds.add(String(t.captain));
    if (t.members) t.members.forEach(m => allPlayerIds.add(String(m)));
  });

  const allPlayersDocs = await Player.find({ _id: { $in: Array.from(allPlayerIds) } })
    .select('username discordUsername gameProfiles').lean();

  const getPlayerDisplayInfo = (playerObj, gameCode) => {
    const baseName = playerObj.username || playerObj.discordUsername || "Player";
    let ign = baseName;
    if (gameCode === "VALORANT" && playerObj.gameProfiles?.VALORANT?.ign) ign = playerObj.gameProfiles.VALORANT.ign.trim();
    else if (gameCode === "HOK" && playerObj.gameProfiles?.HOK?.ign) ign = playerObj.gameProfiles.HOK.ign.trim();
    return ign;
  };

  const playerMap = {};
  allPlayersDocs.forEach(p => playerMap[String(p._id)] = p);

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
      isFull: memberCount >= (t.maxSize || 7),
      hasPendingRequestByMe: pendingByUserSet.has(teamIdStr),
      captainName: getPlayerDisplayInfo(captainDoc, gameCode),    
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
export default function JoinTeamsPage({ player, initialPublicTeams, initialSelectedGame, supportedGames }) {
  const router = useRouter();
  const [publicTeams, setPublicTeams] = useState(initialPublicTeams || []);
  const [selectedGame, setSelectedGame] = useState(initialSelectedGame || "ALL");
  const [search, setSearch] = useState("");
  
  const [requestingFor, setRequestingFor] = useState(null);
  const [teamToJoin, setTeamToJoin] = useState(null);
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
      if (!data.ok) return alert(data.error || "Failed.");
      
      setPublicTeams((prev) =>
        prev.map((t) => t.id === team.id ? { ...t, hasPendingRequestByMe: true } : t)
      );
    } catch (err) {
      console.error(err);
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
            <h1 className={styles.title}>FIND SQUAD</h1>
            <p className={styles.subtitle}>// DEPLOYMENT READY</p>
          </div>
          <button onClick={() => router.push("/teams")} className={styles.backBtn}>&lt; MY TEAMS</button>
        </div>

        <div className={styles.controlBar}>
          <div className={styles.inputGroup}>
            <span className={styles.label}>Target Game</span>
            <select className={styles.select} value={selectedGame} onChange={handleGameSelect}>
              <option value="ALL">ALL PROTOCOLS</option>
              {supportedGames.map(g => <option key={g.code} value={g.code}>{g.label.toUpperCase()}</option>)}
            </select>
          </div>
          <div className={styles.inputGroup} style={{flex:1}}>
            <span className={styles.label}>Search Database</span>
            <input className={styles.input} value={search} onChange={e=>setSearch(e.target.value)} placeholder="SEARCH ID..." />
          </div>
        </div>

        <div className={styles.grid}>
          {filteredTeams.length === 0 ? (
            <div className={styles.emptyState}>NO SIGNALS FOUND.</div>
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
            <h3 className={styles.modalTitle}>INITIATE JOIN?</h3>
            <p className={styles.modalText}>Requesting access to {teamToJoin.name}. Captain {getDisplayName(teamToJoin.captainName)} will be notified.</p>
            <div className={styles.modalActions}>
              <button onClick={() => setTeamToJoin(null)} className={styles.cancelBtn}>ABORT</button>
              <button onClick={confirmJoin} className={styles.confirmBtn}>CONFIRM</button>
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
function PublicTeamCard({ team, onRequestJoin, requesting }) {
  // Determine Theme Color based on Rank
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
  
  // Create slots for visual bar
  const slots = Array.from({ length: team.maxSize || 7 }, (_, i) => i < team.memberCount);

  let actionLabel = "";
  if (team.hasPendingRequestByMe) actionLabel = "PENDING";
  else if (team.isFull) actionLabel = "FULL";

  // Check if sub warning is needed
  const canRequest = !team.isFull && !team.hasPendingRequestByMe;
  const willBeSub = team.memberCount >= 5;

  return (
    <div 
      className={styles.teamCard} 
      style={{ '--rank-color': theme.hex, '--rank-color-dim': theme.dim }}
    >
      <div className={styles.rankStrip}></div>
      <div className={styles.cardContent}>
        
        {/* Top Row: Name, Tag, Game */}
        <div className={styles.topRow}>
          <div>
            <div className={styles.teamTag}>{team.tag}</div>
            <div className={styles.teamName}>{team.name}</div>
          </div>
          <div className={styles.gameDisplay}>
            <span className={styles.gameText}>{team.game}</span>
          </div>
        </div>

        {/* Data Grid: Captain & Rank */}
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

        {/* Roles Section - Full List with Wrap */}
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

        {/* Roster / Capacity Bar */}
        <div className={styles.rosterSection}>
          <div className={styles.slotsRow}>
            {slots.map((filled, i) => (
              <div key={i} className={`${styles.slot} ${filled ? styles.slotFilled : styles.slotEmpty}`} />
            ))}
          </div>
          
          {/* --- CYBER WARNING FOR SUB --- */}
          {canRequest && willBeSub && (
            <div className={styles.cyberWarning}>
              <span>⚠ ROSTER FULL. JOINING AS SUB.</span>
            </div>
          )}

          <div className={styles.rosterStatus} style={{marginTop: '10px'}}>
            <span className={styles.countText}>{team.memberCount}/{team.maxSize || 7} OPERATIVES</span>
            
            {actionLabel ? (
              <span className={styles.statusText} style={{color: actionLabel === 'FULL' ? '#ff3333' : '#0099ff'}}>
                {actionLabel}
              </span>
            ) : (
              <button 
                onClick={() => onRequestClick(team)} 
                disabled={requesting}
                className={styles.joinBtn}
              >
                {requesting ? "PROCESSING..." : "INITIALIZE JOIN"}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}