// pages/teams.js
import { useState } from "react";
import { useRouter } from "next/router";
import { connectToDatabase } from "../lib/mongodb";
import Player from "../models/Player";
import Team from "../models/Team";
import TeamJoinRequest from "../models/TeamJoinRequest";

// Supported games for UI and filtering
const SUPPORTED_GAMES = [
  { code: "VALORANT", label: "VALORANT" },
  { code: "HOK", label: "Honor of Kings" },
  // add more later, UI will scale
];

// cookie parser reused on server
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
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  const requestedGame = typeof query.game === "string" ? query.game : "";
  const allowedGameCodes = SUPPORTED_GAMES.map((g) => g.code);
  const initialSelectedGame = allowedGameCodes.includes(requestedGame)
    ? requestedGame
    : "ALL";

  // ---- My teams: where I am captain or member ----
  const myTeamsRaw = await Team.find({
    game: { $in: allowedGameCodes },
    $or: [{ captain: playerDoc._id }, { members: playerDoc._id }],
  })
    .sort({ createdAt: 1 })
    .lean();

  // ---- Public teams: for "Look for a team" ----
  const publicTeamsRaw = await Team.find({
    game: { $in: allowedGameCodes },
    isPublic: true,
  })
    .sort({ createdAt: 1 })
    .lean();

  // ---- Pending join requests for teams where I'm captain ----
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

  // ---- Pending join requests made by me ----
  const pendingByUserRaw = await TeamJoinRequest.find({
    playerId: playerDoc._id,
    status: "pending",
  }).lean();

  // ---- Collect all player ids we need names for ----
  const memberIdSet = new Set();

  function addId(id) {
    if (!id) return;
    memberIdSet.add(String(id));
  }

  myTeamsRaw.forEach((t) => {
    addId(t.captain);
    (t.members || []).forEach(addId);
  });

  publicTeamsRaw.forEach((t) => {
    addId(t.captain);
    (t.members || []).forEach(addId);
  });

  pendingForCaptainRaw.forEach((r) => addId(r.playerId));
  pendingByUserRaw.forEach((r) => addId(r.playerId));

  const allMemberIds = Array.from(memberIdSet);
  const memberDocs = allMemberIds.length
    ? await Player.find({ _id: { $in: allMemberIds } }).lean()
    : [];

  const nameMap = {};
  memberDocs.forEach((p) => {
    const key = String(p._id);
    nameMap[key] = p.username || p.discordUsername || "Player";
  });

  // ---- Group pending requests (for teams where I'm captain) by team ----
  const pendingForCaptainByTeam = {};
  pendingForCaptainRaw.forEach((r) => {
    const teamKey = String(r.teamId);
    if (!pendingForCaptainByTeam[teamKey]) {
      pendingForCaptainByTeam[teamKey] = [];
    }
    pendingForCaptainByTeam[teamKey].push({
      id: String(r._id),
      playerId: String(r.playerId),
      playerName: nameMap[String(r.playerId)] || "Player",
    });
  });

  // ---- Set of team ids where I have a pending request ----
  const pendingByUserSet = new Set(
    pendingByUserRaw.map((r) => String(r.teamId))
  );

  // ---- Format my teams for client ----
  const formattedMyTeams = myTeamsRaw.map((t) => {
    const teamIdStr = String(t._id);
    const captainId = String(t.captain);
    let memberIds = (t.members || []).map((m) => String(m));

    if (!memberIds.includes(captainId)) {
      memberIds.unshift(captainId);
    }

    const members = memberIds.map((mid) => ({
      id: mid,
      name: nameMap[mid] || "Player",
      isCaptain: mid === captainId,
    }));

    const iAmCaptain = captainId === String(playerDoc._id);

    return {
      id: teamIdStr,
      name: t.name,
      tag: t.tag || "",
      game: t.game,
      memberCount: members.length,
      isCaptain: iAmCaptain,
      isPublic: !!t.isPublic,
      maxSize: t.maxSize || 7,
      joinCode: t.joinCode || null,
      members,
      joinRequests: pendingForCaptainByTeam[teamIdStr] || [],
    };
  });

  // ---- Format public teams for "Look for a team" ----
  const formattedPublicTeams = publicTeamsRaw.map((t) => {
    const teamIdStr = String(t._id);
    const captainId = String(t.captain);
    let memberIds = (t.members || []).map((m) => String(m));

    if (!memberIds.includes(captainId)) {
      memberIds.unshift(captainId);
    }

    const members = memberIds.map((mid) => ({
      id: mid,
      name: nameMap[mid] || "Player",
      isCaptain: mid === captainId,
    }));

    const memberCount = members.length;
    const iAmCaptain = captainId === String(playerDoc._id);
    const iAmMember =
      iAmCaptain || memberIds.includes(String(playerDoc._id));
    const hasPendingRequestByMe = pendingByUserSet.has(teamIdStr);

    return {
      id: teamIdStr,
      name: t.name,
      tag: t.tag || "",
      game: t.game,
      memberCount,
      members,
      isPublic: !!t.isPublic,
      maxSize: t.maxSize || 7,
      iAmCaptain,
      iAmMember,
      hasPendingRequestByMe,
      isFull: memberCount >= (t.maxSize || 7),
    };
  });

  return {
    props: {
      player: {
        id: playerDoc._id.toString(),
        username: playerDoc.username || playerDoc.discordUsername || "Player",
      },
      initialTeams: formattedMyTeams,
      initialPublicTeams: formattedPublicTeams,
      initialSelectedGame,
      supportedGames: SUPPORTED_GAMES,
    },
  };
}

// ---------- CLIENT COMPONENT ----------
export default function TeamsPage({
  player,
  initialTeams,
  initialPublicTeams,
  initialSelectedGame,
  supportedGames,
}) {
  const router = useRouter();
  const [teams, setTeams] = useState(initialTeams || []);
  const [publicTeams, setPublicTeams] = useState(initialPublicTeams || []);
  const [selectedGame, setSelectedGame] = useState(
    initialSelectedGame || "ALL"
  );
  const [roleFilter, setRoleFilter] = useState("ALL"); // ALL | CAPTAIN | MEMBER

  // join-by-code box
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinCodeError, setJoinCodeError] = useState("");
  const [joiningByCode, setJoiningByCode] = useState(false);

  // create-team modal + form
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

  // ----- filters -----
  function handleGameSelect(e) {
    const newGame = e.target.value;
    setSelectedGame(newGame);

    const query =
      newGame === "ALL"
        ? {}
        : {
            game: newGame,
          };

    router.push(
      {
        pathname: "/teams",
        query,
      },
      undefined,
      { shallow: true }
    );

    if (newGame === "ALL") {
      setGame(supportedGames[0]?.code || "VALORANT");
    } else {
      setGame(newGame);
    }
  }

  function handleRoleSelect(e) {
    setRoleFilter(e.target.value);
  }

  // ----- modal helpers -----
  function openModal() {
    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (submitting) return;
    setShowModal(false);
    setError("");
    setName("");
    setTag("");
  }

  // Auto-uppercase team name on input
  function handleNameChange(e) {
    const raw = e.target.value || "";
    setName(raw.toUpperCase());
  }

  // Auto-uppercase, A–Z only, max 4 chars for tag
  function handleTagChange(e) {
    const raw = e.target.value || "";
    const lettersOnly = raw.replace(/[^a-zA-Z]/g, "");
    const upper = lettersOnly.toUpperCase().slice(0, 4);
    setTag(upper);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");

    const nameTrimmed = (name || "").trim();
    if (!nameTrimmed) {
      setError("Team name is required.");
      return;
    }

    const tagTrimmed = (tag || "").trim();
    if (!tagTrimmed) {
      setError("Team tag is required.");
      return;
    }
    if (tagTrimmed.length > 4) {
      setError("Team tag must be 4 characters or fewer.");
      return;
    }

    if (!game) {
      setError("Please select a game.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: nameTrimmed,
          tag: tagTrimmed,
          game,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Failed to create team.");
      } else {
        const newTeam = {
          id: data.team.id,
          name: data.team.name,
          tag: data.team.tag || "",
          game: data.team.game,
          memberCount: data.team.memberCount || 1,
          isCaptain: true,
          isPublic: false,
          maxSize: data.team.maxSize || 7,
          joinCode: data.team.joinCode || null,
          members: [
            {
              id: player.id,
              name: player.username,
              isCaptain: true,
            },
          ],
          joinRequests: [],
        };
        setTeams((prev) => [...prev, newTeam]);
        closeModal();
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  // ----- join by invite code (works for public and private) -----
  async function handleJoinByCode(e) {
    e.preventDefault();
    setJoinCodeError("");

    const code = (joinCodeInput || "").trim().toUpperCase();
    if (!code || code.length !== 6) {
      setJoinCodeError("Invite code must be 6 characters.");
      return;
    }

    setJoiningByCode(true);
    try {
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ joinCode: code }),
      });
      const data = await res.json();
      if (!data.ok) {
        setJoinCodeError(data.error || "Failed to join with this code.");
        return;
      }

      if (data.joined && data.team) {
        const existing = teams.find((t) => t.id === data.team.id);
        if (!existing) {
          const newTeam = {
            id: data.team.id,
            name: data.team.name,
            tag: data.team.tag || "",
            game: data.team.game,
            memberCount: data.team.memberCount || 1,
            isCaptain: false,
            isPublic: !!data.team.isPublic,
            maxSize: data.team.maxSize || 7,
            joinCode: data.team.joinCode || null,
            members: [
              {
                id: player.id,
                name: player.username,
                isCaptain: false,
              },
            ],
            joinRequests: [],
          };
          setTeams((prev) => [...prev, newTeam]);
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

  // ---- delete / leave / promote / kick handlers ----
  async function handleDeleteTeam(team) {
    if (
      !window.confirm(
        `Delete team ${team.tag ? `[${team.tag}] ` : ""}${team.name}? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error || "Failed to delete team.");
        return;
      }
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
      setPublicTeams((prev) => prev.filter((t) => t.id !== team.id));
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    }
  }

  async function handleLeaveTeam(team) {
    const otherMembers = (team.members || []).filter((m) => !m.isCaptain);

    if (team.isCaptain) {
      if (otherMembers.length > 0) {
        alert(
          "You are the captain. Promote another member to captain before leaving this team."
        );
        return;
      } else {
        alert(
          "You are the only member on this team. Delete the team instead if you want to remove it."
        );
        return;
      }
    }

    // normal member can leave
    if (
      !window.confirm(
        `Leave team ${team.tag ? `[${team.tag}] ` : ""}${team.name}?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "leave" }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error || "Failed to leave team.");
        return;
      }

      // once you leave, this team no longer shows under "My Teams"
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    }
  }

  async function handlePromote(team, member) {
    if (
      !window.confirm(
        `Promote ${member.name} to captain of ${team.tag ? `[${team.tag}] ` : ""}${
          team.name
        }?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "promote",
          targetPlayerId: member.id,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error || "Failed to promote member.");
        return;
      }

      const newCaptainId = data.newCaptainId;

      setTeams((prev) =>
        prev.map((t) => {
          if (t.id !== team.id) return t;
          const newMembers = (t.members || []).map((m) => ({
            ...m,
            isCaptain: m.id === newCaptainId,
          }));
          return {
            ...t,
            members: newMembers,
            isCaptain: newCaptainId === player.id,
          };
        })
      );
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    }
  }

  async function handleKick(team, member) {
    if (
      !window.confirm(
        `Kick ${member.name} from ${team.tag ? `[${team.tag}] ` : ""}${
          team.name
        }?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "kick",
          targetPlayerId: member.id,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error || "Failed to kick member.");
        return;
      }

      setTeams((prev) =>
        prev.map((t) => {
          if (t.id !== team.id) return t;
          const newMembers = (t.members || []).filter(
            (m) => m.id !== member.id
          );
          return {
            ...t,
            members: newMembers,
            memberCount: newMembers.length,
          };
        })
      );

      setPublicTeams((prev) =>
        prev.map((t) => {
          if (t.id !== team.id) return t;
          const newMembers = (t.members || []).filter(
            (m) => m.id !== member.id
          );
          const memberCount = newMembers.length;
          return {
            ...t,
            members: newMembers,
            memberCount,
            isFull: memberCount >= (t.maxSize || 7),
          };
        })
      );
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    }
  }

  // ----- visibility toggle (private/public) -----
  async function handleToggleVisibility(team, nextIsPublic) {
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "setVisibility",
          isPublic: nextIsPublic,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error || "Failed to update visibility.");
        return;
      }

      const isPublic = !!data.isPublic;

      // update my teams
      setTeams((prev) =>
        prev.map((t) =>
          t.id === team.id
            ? {
                ...t,
                isPublic,
              }
            : t
        )
      );

      // update publicTeams
      setPublicTeams((prev) => {
        const existing = prev.find((t) => t.id === team.id);
        if (isPublic) {
          const memberCount = team.memberCount || (team.members || []).length;
          const maxSize = team.maxSize || 7;
          const baseTeam = {
            id: team.id,
            name: team.name,
            tag: team.tag,
            game: team.game,
            memberCount,
            members: team.members || [],
            isPublic: true,
            maxSize,
            iAmCaptain: team.isCaptain,
            iAmMember: true,
            hasPendingRequestByMe: false,
            isFull: memberCount >= maxSize,
          };
          if (existing) {
            return prev.map((t) => (t.id === team.id ? baseTeam : t));
          }
          return [...prev, baseTeam];
        } else {
          // making private -> remove from public list
          return prev.filter((t) => t.id !== team.id);
        }
      });
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    }
  }

  // ----- regenerate invite code -----
  async function handleRegenJoinCode(team) {
    if (
      !window.confirm(
        `Regenerate invite code for ${team.tag ? `[${team.tag}] ` : ""}${
          team.name
        }? Old codes will stop working.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "regenJoinCode",
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error || "Failed to regenerate invite code.");
        return;
      }

      const newCode = data.joinCode || null;
      setTeams((prev) =>
        prev.map((t) =>
          t.id === team.id
            ? {
                ...t,
                joinCode: newCode,
              }
            : t
        )
      );
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    }
  }

  // ----- captain approve / reject join requests -----
  async function handleApproveRequest(team, req) {
    if (
      !window.confirm(
        `Approve join request from ${req.playerName} for ${
          team.tag ? `[${team.tag}] ` : ""
        }${team.name}?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/teams/requests/${req.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error || "Failed to approve request.");
        return;
      }

      // Update my teams
      setTeams((prev) =>
        prev.map((t) => {
          if (t.id !== team.id) return t;
          const newMembers = [
            ...(t.members || []),
            {
              id: req.playerId,
              name: req.playerName,
              isCaptain: false,
            },
          ];
          const remainingRequests = (t.joinRequests || []).filter(
            (r) => r.id !== req.id
          );
          return {
            ...t,
            members: newMembers,
            memberCount: newMembers.length,
            joinRequests: remainingRequests,
          };
        })
      );

      // Update public teams
      setPublicTeams((prev) =>
        prev.map((t) => {
          if (t.id !== team.id) return t;
          const newMembers = [
            ...(t.members || []),
            {
              id: req.playerId,
              name: req.playerName,
              isCaptain: false,
            },
          ];
          const memberCount = newMembers.length;
          return {
            ...t,
            members: newMembers,
            memberCount,
            isFull: memberCount >= (t.maxSize || 7),
          };
        })
      );
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    }
  }

  async function handleRejectRequest(team, req) {
    if (
      !window.confirm(
        `Reject join request from ${req.playerName} for ${
          team.tag ? `[${team.tag}] ` : ""
        }${team.name}?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/teams/requests/${req.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "reject" }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error || "Failed to reject request.");
        return;
      }

      setTeams((prev) =>
        prev.map((t) => {
          if (t.id !== team.id) return t;
          const remaining = (t.joinRequests || []).filter(
            (r) => r.id !== req.id
          );
          return {
            ...t,
            joinRequests: remaining,
          };
        })
      );
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    }
  }

  // ----- request to join public team -----
  async function handleRequestJoinPublic(publicTeam) {
    if (publicTeam.iAmMember || publicTeam.iAmCaptain) {
      return;
    }

    if (publicTeam.isFull) {
      alert("This team is full.");
      return;
    }

    if (!window.confirm(`Request to join ${publicTeam.name}?`)) {
      return;
    }

    try {
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ teamId: publicTeam.id }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error || "Failed to request to join.");
        return;
      }

      setPublicTeams((prev) =>
        prev.map((t) =>
          t.id === publicTeam.id
            ? {
                ...t,
                hasPendingRequestByMe: true,
              }
            : t
        )
      );
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    }
  }

  // --------- apply filters (my teams) ----------
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

  const hasAnyVisibleTeams = visibleTeams.length > 0;

  // public teams view filtered by game
  const visiblePublicTeams =
    selectedGame === "ALL"
      ? publicTeams
      : publicTeams.filter((t) => t.game === selectedGame);

  return (
    <div className="shell">
      <div className="contentWrap">
        {/* Header */}
        <div
          style={{
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "1.7rem" }}>My Teams</h1>
            <p style={{ margin: "0.35rem 0", color: "#9ca3af" }}>
              Logged in as <strong>{player.username}</strong>
            </p>
            <p
              style={{
                margin: 0,
                color: "#6b7280",
                fontSize: "0.9rem",
                maxWidth: "30rem",
              }}
            >
              Teams are tied to a game (like VALORANT or Honor of Kings). Public
              teams show up in &quot;Look for a team&quot;. Invite codes work
              for both public and private teams.
            </p>
          </div>
        </div>

        {/* Join-by-code + filters row */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            marginBottom: "1.2rem",
          }}
        >
          {/* Join a private/public team by code */}
          <form
            onSubmit={handleJoinByCode}
            style={{
              padding: "0.8rem 1rem",
              borderRadius: "12px",
              border: "1px solid rgba(148,163,184,0.4)",
              backgroundColor: "#020617",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: "180px" }}>
              <div
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  marginBottom: "0.2rem",
                }}
              >
                Join a team by code
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#9ca3af",
                }}
              >
                Enter a 6-character invite code from the team captain.
              </div>
            </div>
            <input
              value={joinCodeInput}
              onChange={(e) =>
                setJoinCodeInput((e.target.value || "").toUpperCase())
              }
              placeholder="ABC123"
              maxLength={6}
              style={{
                ...inputStyle,
                maxWidth: "140px",
                textAlign: "center",
                letterSpacing: "0.2em",
              }}
            />
            <button
              type="submit"
              disabled={joiningByCode}
              style={{
                padding: "0.4rem 0.9rem",
                borderRadius: "999px",
                border: "1px solid #22c55e",
                background:
                  "linear-gradient(135deg, #22c55e 0%, #16a34a 40%, #0f172a 100%)",
                color: "white",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: joiningByCode ? "default" : "pointer",
                opacity: joiningByCode ? 0.7 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {joiningByCode ? "Joining..." : "Join"}
            </button>
            {joinCodeError && (
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#fca5a5",
                  flexBasis: "100%",
                }}
              >
                {joinCodeError}
              </div>
            )}
          </form>

          {/* Filter bar */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
              alignItems: "flex-end",
            }}
          >
            {/* Game filter */}
            <div style={{ minWidth: "200px" }}>
              <label
                htmlFor="game-filter"
                style={{
                  display: "block",
                  marginBottom: "0.25rem",
                  fontSize: "0.8rem",
                  color: "#9ca3af",
                }}
              >
                Game
              </label>
              <select
                id="game-filter"
                value={selectedGame}
                onChange={handleGameSelect}
                style={filterSelectStyle}
              >
                <option value="ALL">All games</option>
                {supportedGames.map((g) => (
                  <option key={g.code} value={g.code}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Role filter */}
            <div style={{ minWidth: "200px" }}>
              <label
                htmlFor="role-filter"
                style={{
                  display: "block",
                  marginBottom: "0.25rem",
                  fontSize: "0.8rem",
                  color: "#9ca3af",
                }}
              >
                Role
              </label>
              <select
                id="role-filter"
                value={roleFilter}
                onChange={handleRoleSelect}
                style={filterSelectStyle}
              >
                <option value="ALL">All roles</option>
                <option value="CAPTAIN">Captain teams</option>
                <option value="MEMBER">Joined teams</option>
              </select>
            </div>

            <div style={{ flex: 1 }} />

            <button
              type="button"
              onClick={openModal}
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: "999px",
                border: "1px solid #22c55e",
                background:
                  "linear-gradient(135deg, #22c55e 0%, #16a34a 40%, #0f172a 100%)",
                color: "white",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
                alignSelf: "flex-end",
              }}
            >
              + Create team
            </button>
          </div>
        </div>

        {/* Count */}
        <p
          style={{
            margin: "0 0 0.75rem",
            fontSize: "0.9rem",
            color: "#9ca3af",
          }}
        >
          You have <strong>{visibleTeams.length}</strong> team
          {visibleTeams.length === 1 ? "" : "s"} in this view.
        </p>

        {/* My Teams list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {!hasAnyVisibleTeams && (
            <div style={cardStyle}>
              <h2
                style={{
                  marginTop: 0,
                  marginBottom: "0.4rem",
                  fontSize: "1.05rem",
                }}
              >
                No teams match this filter
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.9rem",
                  color: "#9ca3af",
                }}
              >
                Try switching the game or role filters above, join a team using
                an invite code, or create a new team with the{" "}
                <strong>Create team</strong> button.
              </p>
            </div>
          )}

          {hasAnyVisibleTeams && (
            <section>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                {visibleTeams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    onDelete={handleDeleteTeam}
                    onLeave={handleLeaveTeam}
                    onPromote={handlePromote}
                    onKick={handleKick}
                    onToggleVisibility={handleToggleVisibility}
                    onRegenJoinCode={handleRegenJoinCode}
                    onApproveRequest={handleApproveRequest}
                    onRejectRequest={handleRejectRequest}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Look for a team */}
        <section style={{ marginTop: "2.5rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.4rem" }}>
            Look for a team
          </h2>
          <p
            style={{
              margin: 0,
              marginBottom: "0.8rem",
              fontSize: "0.9rem",
              color: "#9ca3af",
            }}
          >
            Public teams are listed here. Request to join a team for the selected
            game. Invite codes from captains always work, even for public teams.
          </p>

          {visiblePublicTeams.length === 0 ? (
            <div style={cardStyle}>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.9rem",
                  color: "#9ca3af",
                }}
              >
                No public teams found for this view. Try switching games or ask
                a captain to make their team public.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {visiblePublicTeams.map((team) => (
                <PublicTeamCard
                  key={team.id}
                  team={team}
                  onRequestJoin={handleRequestJoinPublic}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Create team modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 4000,
          }}
          onClick={closeModal}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "420px",
              margin: "0 1rem",
              borderRadius: "16px",
              border: "1px solid rgba(148,163,184,0.5)",
              background:
                "radial-gradient(circle at top left, #111827 0, #020617 60%)",
              padding: "1.2rem 1.3rem 1.1rem",
              boxShadow: "0 20px 45px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.15rem",
                }}
              >
                Create a team
              </h2>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  color: "#9ca3af",
                  cursor: submitting ? "default" : "pointer",
                  fontSize: "1.1rem",
                  padding: "0 0 0 0.25rem",
                }}
                aria-label="Close"
                disabled={submitting}
              >
                ✕
              </button>
            </div>

            <p
              style={{
                margin: "0 0 0.9rem",
                fontSize: "0.85rem",
                color: "#9ca3af",
              }}
            >
              Choose a game, give your team a name and a short tag (up to 4
              letters). The tag is what will show up in brackets in the bracket
              view, like [EDG].
            </p>

            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: "0.75rem" }}>
                <label
                  htmlFor="team-game"
                  style={{
                    display: "block",
                    marginBottom: "0.25rem",
                    fontSize: "0.85rem",
                  }}
                >
                  Game *
                </label>
                <select
                  id="team-game"
                  value={game}
                  onChange={(e) => setGame(e.target.value)}
                  style={inputStyle}
                >
                  {supportedGames.map((g) => (
                    <option key={g.code} value={g.code}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "0.75rem" }}>
                <label
                  htmlFor="team-name"
                  style={{
                    display: "block",
                    marginBottom: "0.25rem",
                    fontSize: "0.85rem",
                  }}
                >
                  Team name *
                </label>
                <input
                  id="team-name"
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g. EDWARD GAMING"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: "0.75rem" }}>
                <label
                  htmlFor="team-tag"
                  style={{
                    display: "block",
                    marginBottom: "0.25rem",
                    fontSize: "0.85rem",
                  }}
                >
                  Tag * (1–4 letters)
                </label>
                <input
                  id="team-tag"
                  type="text"
                  value={tag}
                  onChange={handleTagChange}
                  placeholder="e.g. EDG"
                  maxLength={4}
                  style={inputStyle}
                />
                <p
                  style={{
                    margin: "0.25rem 0 0",
                    fontSize: "0.75rem",
                    color: "#6b7280",
                  }}
                >
                  Only A–Z letters are allowed. This tag shows in brackets in
                  the bracket view.
                </p>
              </div>

              {error && (
                <p
                  style={{
                    color: "#fca5a5",
                    marginTop: "0.25rem",
                    marginBottom: "0.5rem",
                    fontSize: "0.8rem",
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: "0.5rem",
                  padding: "0.5rem 1rem",
                  borderRadius: "8px",
                  border: "none",
                  background:
                    "linear-gradient(135deg, #22c55e 0%, #16a34a 40%, #0f172a 100%)",
                  color: "white",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: submitting ? "default" : "pointer",
                  opacity: submitting ? 0.7 : 1,
                  width: "100%",
                }}
              >
                {submitting ? "Creating..." : "Create team"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- subcomponents ----------
function TeamCard({
  team,
  onDelete,
  onLeave,
  onPromote,
  onKick,
  onToggleVisibility,
  onRegenJoinCode,
  onApproveRequest,
  onRejectRequest,
}) {
  const slots = buildMemberSlots(team.members || []);
  const otherMembers = (team.members || []).filter((m) => !m.isCaptain);
  const hasRequests = (team.joinRequests || []).length > 0;

  const visibilityLabel = team.isPublic ? "Public" : "Private";

  function handleCopyCode() {
    if (!team.joinCode) return;
    navigator.clipboard
      .writeText(team.joinCode)
      .catch((err) => console.error("Copy failed", err));
  }

  return (
    <div style={teamCardStyle}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.35rem",
          gap: "0.5rem",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "1rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {team.tag ? `[${team.tag}] ` : ""}
          {team.name}
        </h3>
        <span style={gameBadgeStyle}>{team.game}</span>
      </div>

      {/* Visibility + invite code (captain only) */}
      {team.isCaptain && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.5rem",
            fontSize: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ color: "#9ca3af" }}>Visibility:</span>
            <select
              value={team.isPublic ? "public" : "private"}
              onChange={(e) =>
                onToggleVisibility(team, e.target.value === "public")
              }
              style={{
                ...miniSelectStyle,
                textTransform: "capitalize",
              }}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              flexWrap: "wrap",
            }}
          >
            <span style={{ color: "#9ca3af" }}>Invite code:</span>
            <span
              style={{
                padding: "0.1rem 0.5rem",
                borderRadius: "999px",
                border: "1px dashed rgba(148,163,184,0.6)",
                fontFamily: "monospace",
                letterSpacing: "0.15em",
                fontSize: "0.75rem",
              }}
            >
              {team.joinCode || "------"}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              disabled={!team.joinCode}
              style={smallSecondaryButtonStyle}
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => onRegenJoinCode(team)}
              style={smallSecondaryButtonStyle}
            >
              Regenerate
            </button>
          </div>
        </div>
      )}

      {/* Member slots (5, captain in the middle) */}
      <div
        style={{
          marginTop: "0.2rem",
          display: "flex",
          gap: "0.35rem",
          justifyContent: "space-between",
        }}
      >
        {slots.map((slot, idx) => (
          <div
            key={idx}
            style={{
              flex: 1,
              minWidth: 0,
              padding: "0.3rem 0.35rem",
              borderRadius: "999px",
              border: `1px solid ${
                slot?.isCaptain ? "#f97316" : "rgba(148,163,184,0.35)"
              }`,
              backgroundColor: slot ? "#020617" : "rgba(15,23,42,0.8)",
              fontSize: "0.7rem",
              textAlign: "center",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {slot ? (
              <>
                {slot.name}
                {slot.isCaptain ? " (C)" : ""}
              </>
            ) : (
              <span style={{ color: "#6b7280" }}>Open slot</span>
            )}
          </div>
        ))}
      </div>

      {/* Manage members (captain only) */}
      {team.isCaptain && otherMembers.length > 0 && (
        <div
          style={{
            marginTop: "0.6rem",
            padding: "0.4rem 0.45rem",
            borderRadius: "8px",
            border: "1px dashed rgba(148,163,184,0.4)",
            backgroundColor: "rgba(15,23,42,0.8)",
            fontSize: "0.75rem",
          }}
        >
          <div
            style={{
              marginBottom: "0.25rem",
              color: "#9ca3af",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>Manage members</span>
            <span style={{ fontSize: "0.7rem", color: "#6b7280" }}>
              Promote a new captain or kick players
            </span>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}
          >
            {otherMembers.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {m.name}
                </span>
                <div style={{ display: "flex", gap: "0.3rem" }}>
                  <button
                    type="button"
                    onClick={() => onPromote(team, m)}
                    style={smallPrimaryButtonStyle}
                  >
                    Promote
                  </button>
                  <button
                    type="button"
                    onClick={() => onKick(team, m)}
                    style={smallDangerButtonStyle}
                  >
                    Kick
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Join requests (captain of public team) */}
      {team.isCaptain && team.isPublic && hasRequests && (
        <div
          style={{
            marginTop: "0.6rem",
            padding: "0.4rem 0.45rem",
            borderRadius: "8px",
            border: "1px dashed rgba(59,130,246,0.6)",
            backgroundColor: "rgba(15,23,42,0.9)",
            fontSize: "0.75rem",
          }}
        >
          <div
            style={{
              marginBottom: "0.25rem",
              color: "#93c5fd",
              fontWeight: 500,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>Join requests</span>
            <span
              style={{
                fontSize: "0.7rem",
                color: "#60a5fa",
              }}
            >
              {team.joinRequests.length} pending
            </span>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}
          >
            {team.joinRequests.map((req) => (
              <div
                key={req.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {req.playerName}
                </span>
                <div style={{ display: "flex", gap: "0.3rem" }}>
                  <button
                    type="button"
                    onClick={() => onApproveRequest(team, req)}
                    style={smallPrimaryButtonStyle}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => onRejectRequest(team, req)}
                    style={smallSecondaryButtonStyle}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members + actions row */}
      <div
        style={{
          marginTop: "0.6rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.8rem",
          color: "#9ca3af",
        }}
      >
        <span>
          Members: <strong>{team.memberCount}</strong>{" "}
          <span style={{ color: "#6b7280" }}>
            / {team.maxSize || 7} · {visibilityLabel}
          </span>
        </span>

        <div style={{ display: "flex", gap: "0.35rem" }}>
          {team.isCaptain && (
            <button
              type="button"
              onClick={() => onDelete(team)}
              style={dangerButtonStyle}
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={() => onLeave(team)}
            style={secondaryButtonStyle}
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}

function PublicTeamCard({ team, onRequestJoin }) {
  const slots = buildMemberSlots(team.members || []);

  let statusLabel = "";
  let statusStyle = {};

  if (team.iAmCaptain) {
    statusLabel = "Captain";
    statusStyle = { borderColor: "#f97316", color: "#fed7aa" };
  } else if (team.iAmMember) {
    statusLabel = "Joined";
    statusStyle = { borderColor: "#22c55e", color: "#bbf7d0" };
  } else if (team.hasPendingRequestByMe) {
    statusLabel = "Requested";
    statusStyle = { borderColor: "#3b82f6", color: "#bfdbfe" };
  } else if (team.isFull) {
    statusLabel = "Full";
    statusStyle = { borderColor: "#6b7280", color: "#d1d5db" };
  }

  const canRequest =
    !team.iAmCaptain &&
    !team.iAmMember &&
    !team.hasPendingRequestByMe &&
    !team.isFull;

  return (
    <div style={teamCardStyle}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.35rem",
          gap: "0.5rem",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "1rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {team.tag ? `[${team.tag}] ` : ""}
          {team.name}
        </h3>
        <span style={gameBadgeStyle}>{team.game}</span>
      </div>

      {/* Member slots */}
      <div
        style={{
          marginTop: "0.2rem",
          display: "flex",
          gap: "0.35rem",
          justifyContent: "space-between",
        }}
      >
        {slots.map((slot, idx) => (
          <div
            key={idx}
            style={{
              flex: 1,
              minWidth: 0,
              padding: "0.3rem 0.35rem",
              borderRadius: "999px",
              border: `1px solid ${
                slot?.isCaptain ? "#f97316" : "rgba(148,163,184,0.35)"
              }`,
              backgroundColor: slot ? "#020617" : "rgba(15,23,42,0.8)",
              fontSize: "0.7rem",
              textAlign: "center",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {slot ? (
              <>
                {slot.name}
                {slot.isCaptain ? " (C)" : ""}
              </>
            ) : (
              <span style={{ color: "#6b7280" }}>Open slot</span>
            )}
          </div>
        ))}
      </div>

      {/* Footer row */}
      <div
        style={{
          marginTop: "0.6rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.8rem",
          color: "#9ca3af",
        }}
      >
        <span>
          Members: <strong>{team.memberCount}</strong>{" "}
          <span style={{ color: "#6b7280" }}>/ {team.maxSize || 7}</span>
        </span>
        <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
          {statusLabel && (
            <span
              style={{
                fontSize: "0.7rem",
                padding: "2px 8px",
                borderRadius: "999px",
                border: "1px solid",
                ...statusStyle,
              }}
            >
              {statusLabel}
            </span>
          )}
          <button
            type="button"
            onClick={() => canRequest && onRequestJoin(team)}
            disabled={!canRequest}
            style={{
              padding: "0.25rem 0.7rem",
              borderRadius: "999px",
              border: "1px solid #3b82f6",
              backgroundColor: canRequest ? "#1d283a" : "transparent",
              color: "#bfdbfe",
              fontSize: "0.75rem",
              cursor: canRequest ? "pointer" : "default",
              opacity: canRequest ? 1 : 0.6,
            }}
          >
            {team.hasPendingRequestByMe
              ? "Requested"
              : team.iAmMember || team.iAmCaptain
              ? "Joined"
              : team.isFull
              ? "Full"
              : "Request to join"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Build 5 slots with captain forced to center (index 2)
function buildMemberSlots(members = []) {
  const MAX = 5;
  const slots = new Array(MAX).fill(null);
  if (!members.length) return slots;

  const captain = members.find((m) => m.isCaptain) || members[0] || null;
  const others = members.filter((m) => m !== captain);

  // position order: middle, left, right, far-left, far-right
  const positions = [2, 1, 3, 0, 4];

  if (captain) {
    slots[2] = captain;
  }

  let posIdx = 0;
  for (const m of others) {
    while (posIdx < positions.length && slots[positions[posIdx]] !== null) {
      posIdx++;
    }
    if (posIdx >= positions.length) break;
    slots[positions[posIdx]] = m;
    posIdx++;
  }

  return slots;
}

// ---------- styles ----------
const cardStyle = {
  padding: "1rem",
  borderRadius: "12px",
  border: "1px solid rgba(148,163,184,0.35)",
  backgroundColor: "#020617",
};

const teamCardStyle = {
  padding: "0.9rem",
  borderRadius: "12px",
  border: "1px solid rgba(148,163,184,0.3)",
  background:
    "radial-gradient(circle at top left, #020617 0, #020617 40%, #020617 100%)",
};

const inputStyle = {
  width: "100%",
  padding: "0.4rem 0.6rem",
  borderRadius: "8px",
  border: "1px solid #4b5563",
  backgroundColor: "#020617",
  color: "white",
  fontSize: "0.9rem",
  outline: "none",
};

const filterSelectStyle = {
  ...inputStyle,
  height: "2.1rem",
  paddingRight: "2rem",
};

const miniSelectStyle = {
  padding: "0.15rem 0.4rem",
  borderRadius: "999px",
  border: "1px solid #4b5563",
  backgroundColor: "#020617",
  color: "#e5e7eb",
  fontSize: "0.7rem",
};

const dangerButtonStyle = {
  padding: "0.25rem 0.6rem",
  borderRadius: "999px",
  border: "1px solid #f97373",
  backgroundColor: "transparent",
  color: "#fca5a5",
  fontSize: "0.75rem",
  cursor: "pointer",
};

const secondaryButtonStyle = {
  padding: "0.25rem 0.6rem",
  borderRadius: "999px",
  border: "1px solid #4b5563",
  backgroundColor: "transparent",
  color: "#e5e7eb",
  fontSize: "0.75rem",
  cursor: "pointer",
};

const smallPrimaryButtonStyle = {
  padding: "0.15rem 0.5rem",
  borderRadius: "999px",
  border: "1px solid #22c55e",
  backgroundColor: "transparent",
  color: "#bbf7d0",
  fontSize: "0.7rem",
  cursor: "pointer",
};

const smallDangerButtonStyle = {
  padding: "0.15rem 0.5rem",
  borderRadius: "999px",
  border: "1px solid #f97373",
  backgroundColor: "transparent",
  color: "#fecaca",
  fontSize: "0.7rem",
  cursor: "pointer",
};

const smallSecondaryButtonStyle = {
  padding: "0.15rem 0.5rem",
  borderRadius: "999px",
  border: "1px solid #4b5563",
  backgroundColor: "transparent",
  color: "#e5e7eb",
  fontSize: "0.7rem",
  cursor: "pointer",
};

const gameBadgeStyle = {
  fontSize: "0.7rem",
  padding: "2px 6px",
  borderRadius: "999px",
  border: "1px solid #4b5563",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

function getGameLabel(code, supportedGames) {
  const found = supportedGames.find((g) => g.code === code);
  return found ? found.label : code;
}
