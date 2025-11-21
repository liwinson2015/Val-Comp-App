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
    ranks: [
      "Unranked",
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
    roles: ["Duelist", "Initiator", "Controller", "Sentinel", "Flex"],
  },
  HOK: {
    label: "Honor of Kings",
    ranks: [
      "Unranked",
      "Bronze",
      "Silver",
      "Gold",
      "Platinum",
      "Diamond",
      "Master",
      "Grandmaster",
    ],
    roles: ["Clash Lane", "Farm Lane", "Mid Lane", "Jungle", "Roamer"],
  },
};

const SUPPORTED_GAMES = Object.keys(GAME_META).map((code) => ({
  code,
  label: GAME_META[code].label,
}));

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

  // Grab IGNs from profiles (used on client to gate actions)
  const valorantIgn = playerDoc.gameProfiles?.VALORANT?.ign?.trim() || "";

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

  // Pending join requests for teams where I'm captain
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

  // Collect unique member IDs
  const memberIdSet = new Set();
  function addId(id) {
    if (id) memberIdSet.add(String(id));
  }

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
  const nameMap = {};
  memberDocs.forEach((p) => {
    const key = String(p._id);
    playerById[key] = p;
    nameMap[key] = p.username || p.discordUsername || "Player";
  });

  const pendingForCaptainByTeam = {};
  pendingForCaptainRaw.forEach((r) => {
    const teamKey = String(r.teamId);
    if (!pendingForCaptainByTeam[teamKey]) {
      pendingForCaptainByTeam[teamKey] = [];
    }
    pendingForCaptainByTeam[teamKey].push({
      id: String(r._id),
      playerId: String(r.playerId),
      // Join requests show regular Discord-style names
      playerName: nameMap[String(r.playerId)] || "Player",
    });
  });

  const formattedMyTeams = myTeamsRaw.map((t) => {
    const teamIdStr = String(t._id);
    const captainId = String(t.captain);
    let memberIds = (t.members || []).map((m) => String(m));

    // Ensure captain is first
    if (memberIds.indexOf(captainId) > 0) {
      memberIds = memberIds.filter((id) => id !== captainId);
      memberIds.unshift(captainId);
    } else if (!memberIds.includes(captainId)) {
      memberIds.unshift(captainId);
    }

    const members = memberIds.map((mid) => {
      const pDoc = playerById[mid];
      let displayName = nameMap[mid] || "Player";

      if (t.game === "VALORANT") {
        const ign = pDoc?.gameProfiles?.VALORANT?.ign?.trim();
        if (ign) displayName = ign; // IGN only, no tagline
      } else if (t.game === "HOK") {
        const ign = pDoc?.gameProfiles?.HOK?.ign?.trim();
        if (ign) displayName = ign;
      }

      return {
        id: mid,
        name: displayName,
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
        valorantIgn, // used on client to check profile
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
  const [selectedGame, setSelectedGame] = useState(
    initialSelectedGame || "ALL"
  );
  const [roleFilter, setRoleFilter] = useState("ALL");

  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinCodeError, setJoinCodeError] = useState("");
  const [joiningByCode, setJoiningByCode] = useState(false);

  // Create Modal State
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [game, setGame] = useState(
    initialSelectedGame !== "ALL"
      ? initialSelectedGame
      : supportedGames[0]?.code || "VALORANT"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Active Team Tab
  const [activeTeamId, setActiveTeamId] = useState(null);

  // "Go Public" Modal State
  const [showPublicModal, setShowPublicModal] = useState(false);
  const [pendingPublicTeam, setPendingPublicTeam] = useState(null);
  const [publicRank, setPublicRank] = useState("Unranked");
  const [publicRoles, setPublicRoles] = useState([]);

  // Do I have my Valorant IGN set?
  const hasValorantIgn = !!(player.valorantIgn && player.valorantIgn.trim());

  // Modal for "you don't have IGN yet"
  const [showMissingProfileModal, setShowMissingProfileModal] =
    useState(false);
  const [missingGame, setMissingGame] = useState(null);

  function handleGameSelect(e) {
    const newGame = e.target.value;
    setSelectedGame(newGame);
    const query = newGame === "ALL" ? {} : { game: newGame };
    router.push({ pathname: "/teams", query }, undefined, { shallow: true });
    if (newGame === "ALL")
      setGame(supportedGames[0]?.code || "VALORANT");
    else setGame(newGame);
  }

  function handleRoleSelect(e) {
    setRoleFilter(e.target.value);
  }

  function openModal() {
    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (submitting) return;
    setShowModal(false);
    setName("");
    setTag("");
  }

  function handleNameChange(e) {
    setName((e.target.value || "").toUpperCase());
  }

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

    // If making a VALORANT team and no Valorant IGN, show the popup screen
    if (game === "VALORANT" && !hasValorantIgn) {
      setMissingGame("VALORANT");
      setShowMissingProfileModal(true);
      return;
    }

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
        const displayNameForMe =
          game === "VALORANT" && hasValorantIgn
            ? player.valorantIgn
            : player.username;

        const newTeam = {
          id: data.team.id,
          name: data.team.name,
          tag: data.team.tag || "",
          game: data.team.game,
          rank: "Unranked",
          rolesNeeded: [],
          memberCount: 1,
          isCaptain: true,
          isPublic: false,
          maxSize: 7,
          joinCode: data.team.joinCode || null,
          members: [
            { id: player.id, name: displayNameForMe, isCaptain: true },
          ],
          joinRequests: [],
        };
        setTeams((prev) => [...prev, newTeam]);
        setActiveTeamId(newTeam.id);
        closeModal();
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
      setPublicRank(
        team.rank && team.rank !== "Unranked"
          ? team.rank
          : gameMeta?.ranks[0] || "Unranked"
      );
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
        setTeams((prev) =>
          prev.map((t) =>
            t.id === team.id
              ? {
                  ...t,
                  isPublic: !!data.isPublic,
                  rank: data.rank || t.rank,
                  rolesNeeded: data.rolesNeeded || t.rolesNeeded,
                }
              : t
          )
        );
      }
      setShowPublicModal(false);
      setPendingPublicTeam(null);
    } catch (err) {
      console.error(err);
    }
  }

  function submitPublicModal() {
    if (!pendingPublicTeam) return;
    confirmVisibilityChange(
      pendingPublicTeam,
      true,
      publicRank,
      publicRoles
    );
  }

  function togglePublicRole(role) {
    setPublicRoles((prev) => {
      if (prev.includes(role)) return prev.filter((r) => r !== role);
      return [...prev, role];
    });
  }

 async function handleJoinByCode(e) {
  e.preventDefault();
  setJoinCodeError("");

  const code = (joinCodeInput || "").trim().toUpperCase();
  if (!code || code.length !== 6) {
    return setJoinCodeError("Invite code must be 6 characters.");
  }

  setJoiningByCode(true);
  try {
    const res = await fetch("/api/teams/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinCode: code }),
    });
    const data = await res.json();

    // 🔒 API says: you need to update profile first
    if (data.requiresProfile && data.game === "VALORANT") {
      setMissingGame("VALORANT");
      setShowMissingProfileModal(true);
      return; // DO NOT join, do not add team
    }

    if (!data.ok) {
      setJoinCodeError(data.error || "Failed to join.");
      return;
    }

    if (data.joined && data.team) {
      const existing = teams.find((t) => t.id === data.team.id);
      if (!existing) {
        const newTeam = {
          ...data.team,
          memberCount: data.team.memberCount,
          isCaptain: false,
          maxSize: data.team.maxSize || 7,
          joinRequests: [],
          justJoined: true,
        };
        setTeams((prev) => [...prev, newTeam]);
        setActiveTeamId(newTeam.id);
      } else {
        setActiveTeamId(existing.id);
      }
      setJoinCodeInput("");
    }
  } catch (err) {
    console.error(err);
    setJoinCodeError("Something went wrong.");
  } finally {
    setJoiningByCode(false);
  }
}



  // --- Standard Actions ---
  async function handleDeleteTeam(team) {
    if (!window.confirm(`Delete ${team.name}? This cannot be undone.`))
      return;
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.ok) return alert(data.error);
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
      if (activeTeamId === team.id) setActiveTeamId(null);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleLeaveTeam(team) {
    const otherMembers = team.members.filter((m) => !m.isCaptain);
    if (team.isCaptain) {
      if (otherMembers.length > 0) {
        alert(
          "You are the Captain. Please promote another member to Captain before leaving."
        );
        return;
      } else {
        if (
          !window.confirm(
            "You are the last member. Leaving will delete the team. Continue?"
          )
        )
          return;
        return handleDeleteTeam(team);
      }
    }
    if (!window.confirm(`Leave ${team.name}?`)) return;
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave" }),
      });
      const data = await res.json();
      if (!data.ok) return alert(data.error);
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
      if (activeTeamId === team.id) setActiveTeamId(null);
    } catch (err) {
      console.error(err);
    }
  }

  async function handlePromote(team, member) {
    if (!window.confirm(`Promote ${member.name} to captain?`)) return;
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "promote",
          targetPlayerId: member.id,
        }),
      });
      const data = await res.json();
      if (!data.ok) return alert(data.error);
      setTeams((prev) =>
        prev.map((t) => {
          if (t.id !== team.id) return t;
          const newMembers = t.members.map((m) => ({
            ...m,
            isCaptain: m.id === data.newCaptainId,
          }));
          return {
            ...t,
            members: newMembers,
            isCaptain: data.newCaptainId === player.id,
          };
        })
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function handleKick(team, member) {
    if (!window.confirm(`Kick ${member.name}?`)) return;
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "kick",
          targetPlayerId: member.id,
        }),
      });
      const data = await res.json();
      if (!data.ok) return alert(data.error);
      setTeams((prev) =>
        prev.map((t) => {
          if (t.id !== team.id) return t;
          const newMembers = t.members.filter((m) => m.id !== member.id);
          return {
            ...t,
            members: newMembers,
            memberCount: newMembers.length,
          };
        })
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRegenJoinCode(team) {
    if (!window.confirm("Regenerate code?")) return;
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenJoinCode" }),
      });
      const data = await res.json();
      if (data.ok) {
        setTeams((prev) =>
          prev.map((t) =>
            t.id === team.id ? { ...t, joinCode: data.joinCode } : t
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleApproveRequest(team, req) {
    try {
      const res = await fetch(`/api/teams/requests/${req.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (!data.ok) return alert(data.error);
      setTeams((prev) =>
        prev.map((t) => {
          if (t.id !== team.id) return t;
          const newMembers = [
            ...t.members,
            { id: req.playerId, name: req.playerName, isCaptain: false },
          ];
          return {
            ...t,
            members: newMembers,
            memberCount: newMembers.length,
            joinRequests: t.joinRequests.filter((r) => r.id !== req.id),
          };
        })
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRejectRequest(team, req) {
    try {
      const res = await fetch(`/api/teams/requests/${req.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      const data = await res.json();
      if (!data.ok) return alert(data.error);
      setTeams((prev) =>
        prev.map((t) =>
          t.id === team.id
            ? {
                ...t,
                joinRequests: t.joinRequests.filter(
                  (r) => r.id !== req.id
                ),
              }
            : t
        )
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRosterSwap(team, memberId, toActive) {
    const teamClone = { ...team };
    const memberIndex = teamClone.members.findIndex(
      (m) => m.id === memberId
    );
    if (memberIndex === -1) return;
    const member = teamClone.members[memberIndex];
    const newMembers = [...teamClone.members];
    newMembers.splice(memberIndex, 1);
    if (toActive) {
      newMembers.splice(1, 0, member);
    } else {
      newMembers.push(member);
    }
    setTeams((prev) =>
      prev.map((t) =>
        t.id === team.id ? { ...t, members: newMembers } : t
      )
    );
    try {
      const res = await fetch("/api/teams/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: team.id,
          newMemberOrder: newMembers.map((m) => m.id),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert("Failed to save roster: " + data.error);
        setTeams((prev) =>
          prev.map((t) => (t.id === team.id ? team : t))
        );
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save roster.");
    }
  }

  const byGame =
    selectedGame === "ALL"
      ? teams
      : teams.filter((t) => t.game === selectedGame);
  const visibleTeams =
    roleFilter === "ALL"
      ? byGame
      : roleFilter === "CAPTAIN"
      ? byGame.filter((t) => t.isCaptain)
      : byGame.filter((t) => !t.isCaptain);

  useEffect(() => {
    if (!activeTeamId && visibleTeams.length > 0) {
      setActiveTeamId(visibleTeams[0].id);
    } else if (
      visibleTeams.length > 0 &&
      !visibleTeams.find((t) => t.id === activeTeamId)
    ) {
      setActiveTeamId(visibleTeams[0].id);
    }
  }, [visibleTeams, activeTeamId]);

  const activeTeam = visibleTeams.find((t) => t.id === activeTeamId);

  return (
    <div className={styles.shell}>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <span className={styles.userBadge}>
            Logged in as {player.username}
          </span>
          <h1 className={styles.title}>My Teams</h1>
          <p className={styles.subtitle}>
            Manage your squads, create new teams, or join existing ones.
          </p>
        </div>

        <div className={styles.controlBar}>
          <div className={styles.glassPanel}>
            <form
              onSubmit={handleJoinByCode}
              className={styles.inputGroup}
            >
              <span className={styles.label}>Join by code</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  value={joinCodeInput}
                  onChange={(e) =>
                    setJoinCodeInput(
                      (e.target.value || "").toUpperCase()
                    )
                  }
                  placeholder="ABC123"
                  maxLength={6}
                  className={styles.input}
                  style={{
                    width: "120px",
                    textAlign: "center",
                    letterSpacing: "2px",
                  }}
                />
                <button
                  type="submit"
                  disabled={joiningByCode}
                  className={styles.joinBtn}
                >
                  {joiningByCode ? "..." : "Join"}
                </button>
              </div>
              {joinCodeError && (
                <span className={styles.errorText}>
                  {joinCodeError}
                </span>
              )}
            </form>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Filter Game</label>
              <select
                value={selectedGame}
                onChange={handleGameSelect}
                className={styles.select}
              >
                <option value="ALL">All games</option>
                {supportedGames.map((g) => (
                  <option key={g.code} value={g.code}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Filter Role</label>
              <select
                value={roleFilter}
                onChange={handleRoleSelect}
                className={styles.select}
              >
                <option value="ALL">All roles</option>
                <option value="CAPTAIN">Captain teams</option>
                <option value="MEMBER">Joined teams</option>
              </select>
            </div>
          </div>
          <div className={styles.actionGroup}>
            <button
              onClick={() => router.push("/teams/join")}
              className={styles.primaryBtn}
            >
              Find a Team
            </button>
            <button onClick={openModal} className={styles.createBtn}>
              + Create
            </button>
          </div>
        </div>

        {visibleTeams.length > 0 && (
          <div className={styles.tabsContainer}>
            {visibleTeams.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTeamId(t.id)}
                className={
                  activeTeamId === t.id
                    ? styles.tabBtnActive
                    : styles.tabBtn
                }
              >
                <span className={styles.tabTag}>
                  {t.tag ? `${t.tag} | ` : ""}
                </span>{" "}
                {t.name}
              </button>
            ))}
          </div>
        )}

        {!activeTeam && visibleTeams.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>∅</div>
            <h3
              style={{
                color: "#fff",
                margin: "0 0 0.5rem",
              }}
            >
              No teams found
            </h3>
            <p style={{ margin: 0 }}>
              Adjust your filters or create a new team to get started.
            </p>
          </div>
        ) : (
          activeTeam && (
            <TeamCard
              key={activeTeam.id}
              team={activeTeam}
              currentUser={player}
              onDelete={handleDeleteTeam}
              onLeave={handleLeaveTeam}
              onPromote={handlePromote}
              onKick={handleKick}
              onToggleVisibility={handleToggleVisibility}
              onRegenJoinCode={handleRegenJoinCode}
              onApproveRequest={handleApproveRequest}
              onRejectRequest={handleRejectRequest}
              onRosterSwap={handleRosterSwap}
            />
          )
        )}
      </div>

      {/* --- CREATE TEAM MODAL --- */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModal}
              className={styles.closeModal}
            >
              &times;
            </button>
            <h2 className={styles.modalTitle}>Create a new Team</h2>
            <p
              style={{
                color: "#94a3b8",
                fontSize: "0.9rem",
                marginBottom: "1.5rem",
              }}
            >
              Assemble your squad. You will be assigned as the Captain.
            </p>
            <form onSubmit={handleCreate}>
              <div
                className={styles.inputGroup}
                style={{ marginBottom: "1rem" }}
              >
                <label className={styles.label}>Game</label>
                <select
                  value={game}
                  onChange={(e) => setGame(e.target.value)}
                  className={styles.select}
                  style={{ width: "100%" }}
                >
                  {supportedGames.map((g) => (
                    <option key={g.code} value={g.code}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
              <div
                className={styles.inputGroup}
                style={{ marginBottom: "1rem" }}
              >
                <label className={styles.label}>Team Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g. EDWARD GAMING"
                  className={styles.input}
                  style={{ width: "100%" }}
                />
              </div>
              <div
                className={styles.inputGroup}
                style={{ marginBottom: "1rem" }}
              >
                <label className={styles.label}>
                  Tag (Max 4 chars)
                </label>
                <input
                  type="text"
                  value={tag}
                  onChange={handleTagChange}
                  placeholder="EDG"
                  maxLength={4}
                  className={styles.input}
                  style={{ width: "100%" }}
                />
              </div>
              {error && (
                <p className={styles.errorText}>{error}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className={styles.createBtn}
                style={{
                  width: "100%",
                  justifyContent: "center",
                  marginTop: "1rem",
                }}
              >
                {submitting ? "Creating..." : "Confirm Creation"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- GO PUBLIC MODAL --- */}
      {showPublicModal && pendingPublicTeam && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowPublicModal(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowPublicModal(false)}
              className={styles.closeModal}
            >
              &times;
            </button>
            <h2 className={styles.modalTitle}>Make Team Public?</h2>
            <p
              style={{
                color: "#94a3b8",
                fontSize: "0.9rem",
                marginBottom: "1.5rem",
              }}
            >
              This will list{" "}
              <strong>{pendingPublicTeam.name}</strong> on the
              "Find a Team" page. Please help players find you by
              providing more details.
            </p>

            {/* Rank Selection */}
            <div
              className={styles.inputGroup}
              style={{ marginBottom: "1rem" }}
            >
              <label className={styles.label}>Average Rank</label>
              <select
                value={publicRank}
                onChange={(e) =>
                  setPublicRank(e.target.value)
                }
                className={styles.select}
                style={{ width: "100%" }}
              >
                {GAME_META[pendingPublicTeam.game]?.ranks.map(
                  (r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  )
                ) || (
                  <option value="Unranked">Unranked</option>
                )}
              </select>
            </div>

            {/* Roles Selection */}
            <div
              className={styles.inputGroup}
              style={{ marginBottom: "1rem" }}
            >
              <span className={styles.label}>
                Roles Needed (Optional)
              </span>
              <div className={styles.roleContainer}>
                {GAME_META[pendingPublicTeam.game]?.roles.map(
                  (r) => {
                    const isActive = publicRoles.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => togglePublicRole(r)}
                        className={`${styles.roleBadge} ${
                          isActive
                            ? styles.roleBadgeActive
                            : ""
                        }`}
                      >
                        {r}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => setShowPublicModal(false)}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={submitPublicModal}
                className={styles.confirmBtn}
              >
                Confirm & Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MISSING PROFILE MODAL (NO IGN) --- */}
      {showMissingProfileModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowMissingProfileModal(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowMissingProfileModal(false)}
              className={styles.closeModal}
            >
              &times;
            </button>
            <h2 className={styles.modalTitle}>IGN Required</h2>
            <p
              style={{
                color: "#94a3b8",
                fontSize: "0.9rem",
                marginBottom: "1.5rem",
              }}
            >
              You don't have your{" "}
              <strong>
                {missingGame === "VALORANT"
                  ? "VALORANT"
                  : "in-game"}
              </strong>{" "}
              name set yet. Please update your profile before
              creating or joining a team.
            </p>
            <div className={styles.modalActions}>
              <button
                onClick={() => setShowMissingProfileModal(false)}
                className={styles.cancelBtn}
              >
                Close
              </button>
              <button
                onClick={() => router.push("/profile")}
                className={styles.confirmBtn}
              >
                Go to Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- SUBCOMPONENT: TEAM CARD ----------

function TeamCard({
  team,
  currentUser,
  onDelete,
  onLeave,
  onPromote,
  onKick,
  onToggleVisibility,
  onRegenJoinCode,
  onApproveRequest,
  onRejectRequest,
  onRosterSwap,
}) {
  const [activeIds, setActiveIds] = useState(() => {
    return team.members.slice(0, 5).map((m) => m.id);
  });

  useEffect(() => {
    setActiveIds(team.members.slice(0, 5).map((m) => m.id));
  }, [team.id, team.members]);

  const activeMembers = team.members.filter((m) =>
    activeIds.includes(m.id)
  );
  const benchMembers = team.members.filter(
    (m) => !activeIds.includes(m.id)
  );
  const slots = buildMemberSlots(activeMembers);
  const otherMembers = team.members.filter((m) => !m.isCaptain);
  const hasRequests = (team.joinRequests || []).length > 0;
  const maxSize = team.maxSize || 7;
  const visibilityLabel = team.isPublic ? "Public" : "Private";
  const amIWaitlisted =
    currentUser &&
    benchMembers.some((m) => m.id === currentUser.id);

  function handleToggleActive(memberId) {
    const isActive = activeIds.includes(memberId);
    if (isActive) {
      setActiveIds((prev) => prev.filter((id) => id !== memberId));
      onRosterSwap(team, memberId, false);
    } else {
      if (activeIds.length >= 5) {
        alert("Active roster is full (5/5). Bench someone first.");
        return;
      }
      setActiveIds((prev) => [...prev, memberId]);
      onRosterSwap(team, memberId, true);
    }
  }

  function handleCopyCode() {
    if (!team.joinCode) return;
    navigator.clipboard
      .writeText(team.joinCode)
      .catch((err) => console.error("Copy failed", err));
  }

  function handleRegen() {
    onRegenJoinCode(team);
  }

  return (
    <div className={styles.teamCard}>
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <h3 className={styles.teamName}>
            <span className={styles.teamTag}>
              {team.tag ? `${team.tag} | ` : ""}
            </span>{" "}
            {team.name}
          </h3>

          {team.isPublic && (
            <div
              style={{
                marginTop: "4px",
                display: "flex",
                gap: "10px",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "#94a3b8",
                }}
              >
                Rank:{" "}
                <strong style={{ color: "#e2e8f0" }}>
                  {team.rank || "Unranked"}
                </strong>
              </span>

              {team.rolesNeeded &&
                team.rolesNeeded.length > 0 && (
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "#94a3b8",
                    }}
                  >
                    Looking for:{" "}
                    {team.rolesNeeded.map((r) => (
                      <span
                        key={r}
                        style={{
                          marginLeft: "6px",
                          color: "#60a5fa",
                          background: "rgba(30,41,59,0.5)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {r}
                      </span>
                    ))}
                  </span>
                )}
            </div>
          )}

          {benchMembers.length > 0 && (
            <span
              className={styles.subText}
              style={{ marginTop: "6px" }}
            >
              Substitutes:{" "}
              {benchMembers.map((m, i) => (
                <span
                  key={m.id}
                  className={
                    m.id === currentUser?.id
                      ? styles.slotMe
                      : ""
                  }
                  style={{
                    color:
                      m.id === currentUser?.id
                        ? "#4ade80"
                        : "inherit",
                    fontWeight:
                      m.id === currentUser?.id
                        ? "bold"
                        : "normal",
                  }}
                >
                  {i > 0 && ", "}
                  {m.name}
                </span>
              ))}
            </span>
          )}
        </div>

        <div className={styles.headerRight}>
          {team.isCaptain && (
            <div className={styles.compactCode}>
              <span className={styles.codeText}>
                {team.joinCode || "----"}
              </span>
              <button
                onClick={handleCopyCode}
                className={styles.iconBtn}
                title="Copy"
              >
                ❐
              </button>
              <button
                onClick={handleRegen}
                className={styles.iconBtn}
                title="Regenerate"
              >
                ↻
              </button>
            </div>
          )}
          <span className={styles.gameBadge}>{team.game}</span>
        </div>
      </div>

      <div className={styles.slotsContainer}>
        {slots.map((slot, idx) => {
          let slotClass = styles.slot;
          if (idx === 2) slotClass += ` ${styles.slotCaptain}`;
          if (slot) slotClass += ` ${styles.slotFilled}`;
          if (
            slot &&
            currentUser &&
            slot.id === currentUser.id
          )
            slotClass += ` ${styles.slotMe}`;

          return (
            <div
              key={idx}
              className={slotClass}
              title={slot?.name || "Open"}
            >
              {idx === 2 && (
                <div className={styles.captainStar}>★</div>
              )}
              <div className={styles.slotName}>
                {slot
                  ? `${team.tag ? `${team.tag} | ` : ""}${slot.name}`
                  : "-"}
              </div>
            </div>
          );
        })}
      </div>

      {team.isCaptain && (
        <div style={{ marginBottom: "1rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.75rem",
              color: "#64748b",
              marginBottom: "8px",
            }}
          >
            <span>Visibility</span>
            <select
              value={team.isPublic ? "public" : "private"}
              onChange={(e) =>
                onToggleVisibility(
                  team,
                  e.target.value === "public"
                )
              }
              style={{
                background: "none",
                border: "none",
                color: team.isPublic ? "#22c55e" : "#f59e0b",
                fontSize: "0.75rem",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </div>

          {otherMembers.length > 0 && (
            <div className={styles.rosterBox}>
              <div className={styles.rosterHeader}>
                Manage Roster
              </div>
              {otherMembers.map((m) => {
                const isActive = activeIds.includes(m.id);
                return (
                  <div
                    key={m.id}
                    className={styles.rosterRow}
                  >
                    <span
                      className={styles.rosterName}
                      style={{
                        opacity: isActive ? 1 : 0.5,
                      }}
                    >
                      {m.name} {isActive ? "" : "(Sub)"}
                    </span>
                    <div className={styles.rosterActions}>
                      <button
                        onClick={() =>
                          handleToggleActive(m.id)
                        }
                        className={styles.miniBtn}
                        style={{
                          color: isActive
                            ? "#fbbf24"
                            : "#4ade80",
                          borderColor: isActive
                            ? "#fbbf24"
                            : "#4ade80",
                        }}
                      >
                        {isActive ? "Bench" : "Start"}
                      </button>
                      <button
                        onClick={() => onPromote(team, m)}
                        className={styles.miniBtn}
                        style={{
                          color: "#60a5fa",
                          borderColor: "#1e40af",
                        }}
                      >
                        Promote
                      </button>
                      <button
                        onClick={() => onKick(team, m)}
                        className={styles.miniBtn}
                        style={{
                          color: "#f87171",
                          borderColor: "#7f1d1d",
                        }}
                      >
                        Kick
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {team.isPublic && hasRequests && (
            <div className={styles.requestsBox}>
              <div
                style={{
                  color: "#60a5fa",
                  fontWeight: "bold",
                }}
              >
                Join Requests ({team.joinRequests.length})
              </div>
              {team.joinRequests.map((req) => (
                <div key={req.id} className={styles.reqRow}>
                  <span className={styles.reqName}>
                    {req.playerName}
                  </span>
                  <div>
                    <button
                      onClick={() =>
                        onApproveRequest(team, req)
                      }
                      className={styles.miniBtn}
                      style={{
                        color: "#22c55e",
                        borderColor: "#22c55e",
                      }}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() =>
                        onRejectRequest(team, req)
                      }
                      className={styles.miniBtn}
                      style={{
                        color: "#ef4444",
                        borderColor: "#ef4444",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={styles.cardFooter}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span>
            Members: <strong>{team.memberCount}</strong> /{" "}
            {maxSize} · {visibilityLabel}
          </span>
          {!team.isCaptain && amIWaitlisted && (
            <span
              style={{
                fontSize: "0.7rem",
                color: "#fbbf24",
                border: "1px solid #fbbf24",
                padding: "2px 6px",
                borderRadius: "4px",
                fontWeight: "bold",
              }}
            >
              ⚠ WAITLISTED
            </span>
          )}
        </div>
        <div className={styles.footerBtns}>
          {team.isCaptain ? (
            <button
              onClick={() => onDelete(team)}
              className={styles.btnDanger}
            >
              Disband
            </button>
          ) : (
            <button
              onClick={() => onLeave(team)}
              className={styles.btnNeutral}
            >
              Leave
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function buildMemberSlots(members = []) {
  const MAX = 5;
  const slots = new Array(MAX).fill(null);
  if (!members.length) return slots;
  const captain =
    members.find((m) => m.isCaptain) || members[0] || null;
  const others = members.filter((m) => m !== captain);
  const positions = [2, 1, 3, 0, 4];
  if (captain) {
    slots[2] = captain;
  }
  let posIdx = 0;
  for (const m of others) {
    while (
      posIdx < positions.length &&
      slots[positions[posIdx]] !== null
    ) {
      posIdx++;
    }
    if (posIdx >= positions.length) break;
    slots[positions[posIdx]] = m;
    posIdx++;
  }
  return slots;
}
