import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { connectToDatabase } from "../lib/mongodb";
import Player from "../models/Player";
import Team from "../models/Team";
import TeamJoinRequest from "../models/TeamJoinRequest";
import styles from "../styles/Teams.module.css";

// --- GAME CONFIGURATION ---
const GAME_META = {
  VALORANT: {
    label: "VALORANT",
    ranks: ["Unranked", "Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal", "Radiant"],
    roles: ["Duelist", "Initiator", "Controller", "Sentinel", "Flex"],
    color: "#ff4655" 
  },
  HOK: {
    label: "Honor of Kings",
    ranks: ["Unranked", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster"],
    roles: ["Clash Lane", "Farm Lane", "Mid Lane", "Jungle", "Roamer"],
    color: "#eab308"
  }
};

const SUPPORTED_GAMES = Object.keys(GAME_META).map(code => ({ code, label: GAME_META[code].label }));

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    (cookieHeader || "")
      .split(";")
      .filter(Boolean)
      .map((c) => {
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
    const next = "/teams";
    const encoded = encodeURIComponent(next);
    return {
      redirect: {
        destination: `/api/auth/discord?next=${encoded}`,
        permanent: false,
      },
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

  // My teams
  const myTeamsRaw = await Team.find({
    game: { $in: allowedGameCodes },
    $or: [{ captain: playerDoc._id }, { members: playerDoc._id }],
  })
    .sort({ createdAt: 1 })
    .lean();

  // Pending requests
  const captainTeamIds = myTeamsRaw
    .filter((t) => String(t.captain) === String(playerDoc._id))
    .map((t) => t._id);

  let pendingForCaptainRaw = [];
  if (captainTeamIds.length) {
    pendingForCaptainRaw = await TeamJoinRequest.find({
      teamId: { $in: captainTeamIds },
      status: "pending",
    }).lean();
  }

  const memberIdSet = new Set();
  function addId(id) { if (id) memberIdSet.add(String(id)); }

  myTeamsRaw.forEach((t) => {
    addId(t.captain);
    (t.members || []).forEach(addId);
  });
  pendingForCaptainRaw.forEach((r) => addId(r.playerId));

  const allMemberIds = Array.from(memberIdSet);
  const memberDocs = allMemberIds.length
    ? await Player.find({ _id: { $in: allMemberIds } }).lean()
    : [];

  const playerById = {};
  memberDocs.forEach((p) => {
    playerById[String(p._id)] = p;
  });

  function getDisplayNameForGame(playerObj, gameCode) {
    if (!playerObj) return "Player";
    const base = playerObj.username || playerObj.discordUsername || "Player";
    if (gameCode === "VALORANT") {
      const ign = playerObj.gameProfiles?.VALORANT?.ign && playerObj.gameProfiles.VALORANT.ign.trim();
      if (ign) return ign;
    } else if (gameCode === "HOK") {
      const ign = playerObj.gameProfiles?.HOK?.ign && playerObj.gameProfiles.HOK.ign.trim();
      if (ign) return ign;
    }
    return base;
  }

  const pendingForCaptainByTeam = {};
  pendingForCaptainRaw.forEach((r) => {
    const teamKey = String(r.teamId);
    if (!pendingForCaptainByTeam[teamKey]) pendingForCaptainByTeam[teamKey] = [];
    const pDoc = playerById[String(r.playerId)];
    const name = getDisplayNameForGame(pDoc, "VALORANT");
    pendingForCaptainByTeam[teamKey].push({
      id: String(r._id),
      playerId: String(r.playerId),
      playerName: name || "Player",
    });
  });

  const formattedMyTeams = myTeamsRaw.map((t) => {
    const teamIdStr = String(t._id);
    const captainId = String(t.captain);
    let memberIds = (t.members || []).map((m) => String(m));

    if (memberIds.indexOf(captainId) > 0) {
      memberIds = memberIds.filter(id => id !== captainId);
      memberIds.unshift(captainId);
    } else if (!memberIds.includes(captainId)) {
      memberIds.unshift(captainId);
    }

    const members = memberIds.map((mid) => {
      const pDoc = playerById[mid];
      return {
        id: mid,
        name: getDisplayNameForGame(pDoc, t.game),
        isCaptain: mid === captainId,
      };
    });

    const iAmCaptain = captainId === String(playerDoc._id);

    return {
      id: teamIdStr,
      name: t.name,
      tag: t.tag || "",
      game: t.game,
      rank: t.rank || "Unranked",
      rolesNeeded: t.rolesNeeded || [],
      memberCount: members.length,
      isCaptain: iAmCaptain,
      isPublic: !!t.isPublic,
      maxSize: t.maxSize || 7,
      joinCode: t.joinCode || null,
      members,
      joinRequests: pendingForCaptainByTeam[teamIdStr] || [],
    };
  });

  return {
    props: {
      player: {
        id: playerDoc._id.toString(),
        username: playerDoc.username || playerDoc.discordUsername || "Player",
      },
      initialTeams: formattedMyTeams,
      initialSelectedGame,
      supportedGames: SUPPORTED_GAMES,
    },
  };
}

// ---------- CLIENT COMPONENT ----------
export default function TeamsPage({
  player,
  initialTeams,
  initialSelectedGame,
  supportedGames,
}) {
  const router = useRouter();
  const [teams, setTeams] = useState(initialTeams || []);
  const [selectedGame, setSelectedGame] = useState(initialSelectedGame || "ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinCodeError, setJoinCodeError] = useState("");
  const [joiningByCode, setJoiningByCode] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [game, setGame] = useState(initialSelectedGame !== "ALL" ? initialSelectedGame : supportedGames[0]?.code || "VALORANT");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [activeTeamId, setActiveTeamId] = useState(null);

  // Public Modal
  const [showPublicModal, setShowPublicModal] = useState(false);
  const [pendingPublicTeam, setPendingPublicTeam] = useState(null);
  const [publicRank, setPublicRank] = useState("Unranked");
  const [publicRoles, setPublicRoles] = useState([]);

  function handleGameSelect(e) {
    const newGame = e.target.value;
    setSelectedGame(newGame);
    const query = newGame === "ALL" ? {} : { game: newGame };
    router.push({ pathname: "/teams", query }, undefined, { shallow: true });
    if (newGame === "ALL") setGame(supportedGames[0]?.code || "VALORANT");
    else setGame(newGame);
  }

  function handleRoleSelect(e) { setRoleFilter(e.target.value); }
  function openModal() { setError(""); setShowModal(true); }
  function closeModal() { if (submitting) return; setShowModal(false); setName(""); setTag(""); }
  function handleNameChange(e) { setName((e.target.value || "").toUpperCase()); }
  function handleTagChange(e) {
    const raw = e.target.value || "";
    const lettersOnly = raw.replace(/[^a-zA-Z]/g, "");
    setTag(lettersOnly.toUpperCase().slice(0, 4));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Team name is required.");
    if (!tag.trim()) return setError("Team tag is required.");
    if (tag.trim().length > 4) return setError("Tag too long.");
    if (!game) return setError("Select a game.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), tag: tag.trim(), game }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Failed to create team.");
      } else {
        router.reload(); 
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  // --- Visibility Logic ---
  function handleToggleVisibility(team, nextIsPublic) {
    if (nextIsPublic) {
      setPendingPublicTeam(team);
      const gameMeta = GAME_META[team.game];
      setPublicRank(team.rank && team.rank !== "Unranked" ? team.rank : (gameMeta?.ranks[0] || "Unranked"));
      setPublicRoles(team.rolesNeeded || []);
      setShowPublicModal(true);
    } else {
      confirmVisibilityChange(team, false, null, []);
    }
  }

  async function confirmVisibilityChange(team, isPublic, rank, rolesNeeded) {
    try {
      const body = { action: "setVisibility", isPublic };
      if (isPublic) {
        body.rank = rank;
        body.rolesNeeded = rolesNeeded;
      }
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        setTeams((prev) => prev.map((t) => 
          t.id === team.id 
          ? { ...t, isPublic: !!data.isPublic, rank: data.rank || t.rank, rolesNeeded: data.rolesNeeded || t.rolesNeeded } 
          : t
        ));
      }
      setShowPublicModal(false);
      setPendingPublicTeam(null);
    } catch (err) { console.error(err); }
  }

  function submitPublicModal() {
    if (!pendingPublicTeam) return;
    confirmVisibilityChange(pendingPublicTeam, true, publicRank, publicRoles);
  }

  function togglePublicRole(role) {
    setPublicRoles(prev => {
      if (prev.includes(role)) return prev.filter(r => r !== role);
      return [...prev, role];
    });
  }

  // ... Join By Code ...
  async function handleJoinByCode(e) {
    e.preventDefault();
    setJoinCodeError("");
    const code = (joinCodeInput || "").trim().toUpperCase();
    if (!code || code.length !== 6) return setJoinCodeError("Invite code must be 6 characters.");
    setJoiningByCode(true);
    try {
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: code }),
      });
      const data = await res.json();
      if (!data.ok) {
        setJoinCodeError(data.error || "Failed to join.");
        return;
      }
      router.reload();
    } catch (err) {
      console.error(err);
      setJoinCodeError("Something went wrong.");
    } finally {
      setJoiningByCode(false);
    }
  }

  // ... Actions ...
  async function handleDeleteTeam(team) {
    if (!window.confirm(`Delete ${team.name}? This cannot be undone.`)) return;
    try {
      await fetch(`/api/teams/${team.id}`, { method: "DELETE" });
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
      if (activeTeamId === team.id) setActiveTeamId(null);
    } catch (err) { console.error(err); }
  }
  async function handleLeaveTeam(team) {
    if (!window.confirm(`Leave ${team.name}?`)) return;
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave" }),
      });
      if (res.ok) {
        setTeams((prev) => prev.filter((t) => t.id !== team.id));
        if (activeTeamId === team.id) setActiveTeamId(null);
      }
    } catch (err) { console.error(err); }
  }
  
  // Wrapper functions for passing down
  const actions = {
    handlePromote: async (team, member) => {
        if (!window.confirm(`Promote ${member.name}?`)) return;
        await fetch(`/api/teams/${team.id}`, { method: "POST", body: JSON.stringify({ action: "promote", targetPlayerId: member.id }), headers:{"Content-Type":"application/json"}});
        router.reload();
    },
    handleKick: async (team, member) => {
        if (!window.confirm(`Kick ${member.name}?`)) return;
        await fetch(`/api/teams/${team.id}`, { method: "POST", body: JSON.stringify({ action: "kick", targetPlayerId: member.id }), headers:{"Content-Type":"application/json"}});
        router.reload(); 
    },
    handleRegenJoinCode: async (team) => {
        const res = await fetch(`/api/teams/${team.id}`, { method: "POST", body: JSON.stringify({ action: "regenJoinCode" }), headers:{"Content-Type":"application/json"}});
        const data = await res.json();
        if(data.ok) setTeams(prev => prev.map(t => t.id === team.id ? {...t, joinCode: data.joinCode} : t));
    },
    handleApprove: async (team, req) => {
        await fetch(`/api/teams/requests/${req.id}`, { method: "POST", body: JSON.stringify({ action: "approve" }), headers:{"Content-Type":"application/json"}});
        router.reload();
    },
    handleReject: async (team, req) => {
        await fetch(`/api/teams/requests/${req.id}`, { method: "POST", body: JSON.stringify({ action: "reject" }), headers:{"Content-Type":"application/json"}});
        router.reload();
    },
    handleRosterSwap: async (team, memberId, toActive) => {
        const teamClone = { ...team };
        const memberIndex = teamClone.members.findIndex(m => m.id === memberId);
        if (memberIndex === -1) return;
        const member = teamClone.members[memberIndex];
        const newMembers = [...teamClone.members];
        newMembers.splice(memberIndex, 1);
        if (toActive) newMembers.splice(1, 0, member);
        else newMembers.push(member);
        
        setTeams(prev => prev.map(t => t.id === team.id ? {...t, members: newMembers} : t));
        await fetch("/api/teams/roster", { method: "POST", body: JSON.stringify({ teamId: team.id, newMemberOrder: newMembers.map(m => m.id) }), headers:{"Content-Type":"application/json"}});
    }
  };

  const byGame = selectedGame === "ALL" ? teams : teams.filter((t) => t.game === selectedGame);
  const visibleTeams = roleFilter === "ALL" ? byGame : roleFilter === "CAPTAIN" ? byGame.filter((t) => t.isCaptain) : byGame.filter((t) => !t.isCaptain);

  useEffect(() => {
    if (!activeTeamId && visibleTeams.length > 0) setActiveTeamId(visibleTeams[0].id);
    else if (visibleTeams.length > 0 && !visibleTeams.find(t => t.id === activeTeamId)) setActiveTeamId(visibleTeams[0].id);
  }, [visibleTeams, activeTeamId]);

  const activeTeam = visibleTeams.find(t => t.id === activeTeamId);

  return (
    <div className={styles.shell}>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Teams</h1>
          <p className={styles.subtitle}>// COMMAND CENTER</p>
        </div>

        <div className={styles.controlBar}>
          <div className={styles.glassPanel}>
            <form onSubmit={handleJoinByCode} className={styles.inputGroup}>
              <span className={styles.label}>Join by code</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <input value={joinCodeInput} onChange={(e) => setJoinCodeInput((e.target.value || "").toUpperCase())} placeholder="ABC123" maxLength={6} className={styles.input} style={{ width: "120px", textAlign: "center", letterSpacing: "2px" }} />
                <button type="submit" disabled={joiningByCode} className={styles.joinBtn}>{joiningByCode ? "..." : "Join"}</button>
              </div>
              {joinCodeError && <span className={styles.errorText}>{joinCodeError}</span>}
            </form>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Filter Game</label>
              <select value={selectedGame} onChange={handleGameSelect} className={styles.select}>
                <option value="ALL">All games</option>
                {supportedGames.map((g) => (<option key={g.code} value={g.code}>{g.label}</option>))}
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Filter Role</label>
              <select value={roleFilter} onChange={handleRoleSelect} className={styles.select}>
                <option value="ALL">All roles</option>
                <option value="CAPTAIN">Captain teams</option>
                <option value="MEMBER">Joined teams</option>
              </select>
            </div>
          </div>
          <div className={styles.actionGroup}>
            <button onClick={() => router.push("/teams/join")} className={styles.primaryBtn}>Find a Team</button>
            <button onClick={openModal} className={styles.createBtn}>+ Create</button>
          </div>
        </div>

        {/* --- TABS --- */}
        {visibleTeams.length > 0 && (
          <div className={styles.tabsContainer}>
            {visibleTeams.map(t => {
              const rankColor = GAME_META[t.game]?.color || '#fff';
              return (
                <button 
                  key={t.id}
                  onClick={() => setActiveTeamId(t.id)}
                  className={activeTeamId === t.id ? styles.tabBtnActive : styles.tabBtn}
                  style={{'--rank-color': rankColor}}
                >
                  <span className={styles.tabTag}>{t.tag} |</span> {t.name}
                </button>
              )
            })}
          </div>
        )}

        {!activeTeam && visibleTeams.length === 0 ? (
          <div className={styles.emptyState}>
            <h3 style={{ color: "#fff", margin: "0 0 0.5rem" }}>NO TEAMS DETECTED</h3>
            <p style={{ margin: 0 }}>Initialize a new squad or join existing protocols.</p>
          </div>
        ) : (
          activeTeam && (
            <TeamCard
              key={activeTeam.id}
              team={activeTeam}
              currentUser={player}
              onDelete={handleDeleteTeam}
              onLeave={handleLeaveTeam}
              onToggleVisibility={handleToggleVisibility}
              actions={actions}
            />
          )
        )}
      </div>

      {/* --- CREATE MODAL --- */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={closeModal} className={styles.closeModal}>&times;</button>
            <h2 className={styles.modalTitle}>Create a new Team</h2>
            <form onSubmit={handleCreate}>
              <div className={styles.inputGroup} style={{ marginBottom: "1rem" }}>
                <label className={styles.label}>Game</label>
                <select value={game} onChange={(e) => setGame(e.target.value)} className={styles.select} style={{ width: "100%" }}>
                  {supportedGames.map((g) => (<option key={g.code} value={g.code}>{g.label}</option>))}
                </select>
              </div>
              <div className={styles.inputGroup} style={{ marginBottom: "1rem" }}>
                <label className={styles.label}>Team Name</label>
                <input type="text" value={name} onChange={handleNameChange} placeholder="e.g. EDWARD GAMING" className={styles.input} style={{ width: "100%" }} />
              </div>
              <div className={styles.inputGroup} style={{ marginBottom: "1rem" }}>
                <label className={styles.label}>Tag (Max 4 chars)</label>
                <input type="text" value={tag} onChange={handleTagChange} placeholder="EDG" maxLength={4} className={styles.input} style={{ width: "100%" }} />
              </div>
              {error && <p className={styles.errorText}>{error}</p>}
              <button type="submit" disabled={submitting} className={styles.createBtn} style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}>{submitting ? "Creating..." : "Confirm Creation"}</button>
            </form>
          </div>
        </div>
      )}

      {/* --- PUBLIC MODAL --- */}
      {showPublicModal && pendingPublicTeam && (
        <div className={styles.modalOverlay} onClick={() => setShowPublicModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>PUBLIC RECRUITMENT</h2>
            <p className={styles.modalText}>Configure recruitment parameters for {pendingPublicTeam.name}.</p>
            <div className={styles.inputGroup} style={{ marginBottom: "1rem" }}>
              <label className={styles.label}>Average Rank</label>
              <select value={publicRank} onChange={(e) => setPublicRank(e.target.value)} className={styles.select} style={{ width: "100%" }}>
                {GAME_META[pendingPublicTeam.game]?.ranks.map((r) => (<option key={r} value={r}>{r}</option>))}
              </select>
            </div>
            <div className={styles.inputGroup} style={{ marginBottom: "1rem" }}>
              <span className={styles.label}>Roles Needed</span>
              <div className={styles.roleContainer}>
                {GAME_META[pendingPublicTeam.game]?.roles.map((r) => {
                  const isActive = publicRoles.includes(r);
                  return (
                    <button type="button" key={r} onClick={() => togglePublicRole(r)} className={`${styles.roleBadge} ${isActive ? styles.roleBadgeActive : ''}`}>
                      {r}
                    </button>
                  )
                })}
              </div>
            </div>
            <div style={{display:'flex', gap:'10px'}}>
              <button onClick={() => setShowPublicModal(false)} className={styles.createBtn} style={{background:'#333', color:'#fff'}}>CANCEL</button>
              <button onClick={submitPublicModal} className={styles.createBtn}>CONFIRM</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- TEAM CARD (Dashboard Version) ----------
function TeamCard({ team, currentUser, onDelete, onLeave, onToggleVisibility, actions }) {
  // Local state for active members (Start/Bench logic)
  const [activeIds, setActiveIds] = useState(() => team.members.slice(0, 5).map(m => m.id));

  // Sync activeIds only when team ID changes
  useEffect(() => { setActiveIds(team.members.slice(0, 5).map(m => m.id)); }, [team.id]);

  const activeMembers = team.members.filter(m => activeIds.includes(m.id));
  const slots = buildMemberSlots(activeMembers);
  const otherMembers = team.members.filter((m) => !m.isCaptain);
  const hasRequests = (team.joinRequests || []).length > 0;
  const maxSize = team.maxSize || 7;
  
  const rankColor = GAME_META[team.game]?.color || '#3b82f6';

  function getDisplayName(name) {
    if (!name) return "";
    return name.split("#")[0]; 
  }

  function handleToggleActive(memberId) {
    const isActive = activeIds.includes(memberId);
    if (isActive) {
      setActiveIds(prev => prev.filter(id => id !== memberId));
      actions.handleRosterSwap(team, memberId, false);
    } else {
      if (activeIds.length >= 5) return alert("Active roster is full.");
      setActiveIds(prev => [...prev, memberId]);
      actions.handleRosterSwap(team, memberId, true);
    }
  }

  function handleCopyCode() {
    if (!team.joinCode) return;
    navigator.clipboard.writeText(team.joinCode).catch((err) => console.error(err));
  }

  return (
    <div className={styles.teamCard} style={{'--rank-color': rankColor}}>
      <div className={styles.rankStrip}></div>
      <div className={styles.cardContent}>
        <div className={styles.cardHeader}>
          <div className={styles.headerLeft}>
            <h3 className={styles.teamName}>
              <span className={styles.teamTag}>{team.tag} |</span> {team.name}
            </h3>
            <div className={styles.metaRow}>
               <div className={styles.metaItem}>STATUS: <strong style={{color: team.isPublic ? '#22c55e' : '#ef4444'}}>{team.isPublic ? 'ONLINE' : 'OFFLINE'}</strong></div>
               <div className={styles.metaItem}>RANK: <strong style={{color: rankColor}}>{team.rank || 'UNRANKED'}</strong></div>
            </div>
          </div>

          <div className={styles.headerRight}>
            {team.isCaptain && (
              <div className={styles.compactCode}>
                <span className={styles.codeText}>{team.joinCode || "----"}</span>
                <button onClick={handleCopyCode} className={styles.iconBtn}>❐</button>
                <button onClick={() => actions.handleRegenJoinCode(team)} className={styles.iconBtn}>↻</button>
              </div>
            )}
            <span className={styles.gameBadge}>{team.game}</span>
          </div>
        </div>

        {/* ROSTER VISUALIZER (Distinct Slots) */}
        <div className={styles.slotsContainer}>
          {slots.map((slot, idx) => {
            const isCenter = idx === 2;
            const isFilled = !!slot;
            const isMe = slot && currentUser && slot.id === currentUser.id;

            let slotClass = styles.slot;
            if (isCenter) slotClass += ` ${styles.slotCaptain}`;
            if (isFilled) slotClass += ` ${styles.slotFilled}`;
            if (isMe) slotClass += ` ${styles.slotMe}`;

            return (
              <div key={idx} className={slotClass}>
                {isCenter && slot && slot.isCaptain && (
                  <div className={styles.captainStar}>★</div>
                )}
                <span className={styles.slotName}>
                  {slot ? getDisplayName(slot.name) : "EMPTY"}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{textAlign:'center', marginTop:'-10px', marginBottom:'20px', fontSize:'0.7rem', color:'#666'}}>
          ACTIVE ROSTER: {activeMembers.length}/5
        </div>

        {/* TEAM ACTIONS */}
        {team.isCaptain && (
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#64748b", marginBottom: "8px" }}>
              <span className={styles.label}>RECRUITMENT STATUS</span>
              <button 
                onClick={() => onToggleVisibility(team, !team.isPublic)} 
                className={styles.visToggle}
                style={{color: team.isPublic ? '#22c55e' : '#ef4444'}}
              >
                {team.isPublic ? '● PUBLIC RECRUITMENT ON' : '○ PRIVATE'}
              </button>
            </div>

            {/* Roster Management */}
            {otherMembers.length > 0 && (
              <div className={styles.rosterBox}>
                <div className={styles.rosterHeader}>ROSTER MANAGEMENT</div>
                {otherMembers.map((m) => {
                  const isActive = activeIds.includes(m.id);
                  return (
                    <div key={m.id} className={styles.rosterRow}>
                      <div className={styles.memberName}>
                        <div className={styles.statusDot} style={{background: isActive ? '#22c55e' : '#444'}}></div>
                        <span style={{color: isActive ? '#fff' : '#ccc', fontWeight: isActive ? 'bold' : 'normal'}}>{getDisplayName(m.name)}</span>
                      </div>
                      <div className={styles.rosterActions}>
                        <button 
                          onClick={() => handleToggleActive(m.id)}
                          className={`${styles.actionBtn} ${isActive ? styles.btnBench : styles.btnStart}`}
                        >
                          {isActive ? "BENCH" : "START"}
                        </button>
                        <button onClick={() => actions.handlePromote(team, m)} className={`${styles.actionBtn} ${styles.btnPromote}`}>PROMOTE</button>
                        <button onClick={() => actions.handleKick(team, m)} className={`${styles.actionBtn} ${styles.btnKick}`}>KICK</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Join Requests */}
            {team.isPublic && hasRequests && (
              <div className={styles.rosterBox} style={{borderColor: '#06b6d4'}}>
                <div className={styles.rosterHeader} style={{color:'#06b6d4'}}>INCOMING REQUESTS ({team.joinRequests.length})</div>
                <div className={styles.rosterList} style={{borderColor:'#06b6d4'}}>
                  {team.joinRequests.map((req) => (
                    <div key={req.id} className={styles.rosterRow}>
                      <span className={styles.rosterName}>{getDisplayName(req.playerName)}</span>
                      <div className={styles.rosterActions}>
                        <button onClick={() => actions.handleApprove(team, req)} className={`${styles.actionBtn} ${styles.btnApprove}`}>ACCEPT</button>
                        <button onClick={() => actions.handleReject(team, req)} className={`${styles.actionBtn} ${styles.btnReject}`}>DENY</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className={styles.cardFooter}>
          <div className={styles.statusIndicator}>
            <div style={{width:'8px', height:'8px', background: team.isPublic ? '#22c55e' : '#444', borderRadius:'50%'}}></div>
            <span>{team.memberCount} / {maxSize} OPERATIVES ASSIGNED</span>
          </div>
          <div>
            {team.isCaptain ? (
              <button onClick={() => onDelete(team)} className={styles.btnDanger}>DISBAND UNIT</button>
            ) : (
              <button onClick={() => onLeave(team)} className={styles.btnNeutral}>LEAVE UNIT</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildMemberSlots(members = []) {
  const MAX = 5;
  const slots = new Array(MAX).fill(null);
  if (!members.length) return slots;
  const captain = members.find((m) => m.isCaptain) || members[0] || null;
  const others = members.filter((m) => m !== captain);
  const positions = [2, 1, 3, 0, 4];
  if (captain) slots[2] = captain;
  let posIdx = 0;
  for (const m of others) {
    while (posIdx < positions.length && slots[positions[posIdx]] !== null) posIdx++;
    if (posIdx >= positions.length) break;
    slots[positions[posIdx]] = m;
    posIdx++;
  }
  return slots;
}