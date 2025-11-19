// pages/teams/join.js
import { useState } from "react";
import { useRouter } from "next/router";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import Team from "../../models/Team";
import TeamJoinRequest from "../../models/TeamJoinRequest";

// Supported games for UI and filtering
const SUPPORTED_GAMES = [
  { code: "VALORANT", label: "VALORANT" },
  { code: "HOK", label: "Honor of Kings" },
  // add more later
];

function parseCookies(header = "") {
  return Object.fromEntries(
    (header || "")
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
    const next = "/teams/join";
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

  // Public teams that this player is NOT already captain or member of
  const publicTeamsRaw = await Team.find({
    isPublic: true,
    game: { $in: allowedGameCodes },
    captain: { $ne: playerDoc._id },
    members: { $ne: playerDoc._id },
  })
    .sort({ createdAt: 1 })
    .lean();

  // Join requests made by this player
  const pendingByUserRaw = await TeamJoinRequest.find({
    playerId: playerDoc._id,
    status: "pending",
  }).lean();

  // Collect player ids for names
  const playerIdSet = new Set();

  function addId(id) {
    if (!id) return;
    playerIdSet.add(String(id));
  }

  publicTeamsRaw.forEach((t) => {
    addId(t.captain);
    (t.members || []).forEach(addId);
  });

  const allIds = Array.from(playerIdSet);
  const playerDocs = allIds.length
    ? await Player.find({ _id: { $in: allIds } }).lean()
    : [];

  const nameMap = {};
  playerDocs.forEach((p) => {
    const key = String(p._id);
    nameMap[key] = p.username || p.discordUsername || "Player";
  });

  const pendingByUserSet = new Set(
    pendingByUserRaw.map((r) => String(r.teamId))
  );

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
    const maxSize = t.maxSize || 7;

    return {
      id: teamIdStr,
      name: t.name,
      tag: t.tag || "",
      game: t.game,
      members,
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
  const [selectedGame, setSelectedGame] = useState(
    initialSelectedGame || "ALL"
  );
  const [search, setSearch] = useState("");
  const [requestingFor, setRequestingFor] = useState(null);

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
        pathname: "/teams/join",
        query,
      },
      undefined,
      { shallow: true }
    );
  }

  function handleSearchChange(e) {
    setSearch(e.target.value || "");
  }

  async function handleRequestJoin(publicTeam) {
    if (publicTeam.isFull || publicTeam.hasPendingRequestByMe) return;

    if (!window.confirm(`Request to join ${publicTeam.name}?`)) {
      return;
    }

    setRequestingFor(publicTeam.id);
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
    } finally {
      setRequestingFor(null);
    }
  }

  // Filter teams by game + search
  const searchLower = search.trim().toLowerCase();
  const filteredTeams = publicTeams.filter((t) => {
    if (selectedGame !== "ALL" && t.game !== selectedGame) return false;
    if (!searchLower) return true;
    const haystack = `${t.name} ${t.tag}`.toLowerCase();
    return haystack.includes(searchLower);
  });

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
            <h1 style={{ margin: 0, fontSize: "1.7rem" }}>Find a Team</h1>
            <p style={{ margin: "0.35rem 0", color: "#9ca3af" }}>
              Logged in as <strong>{player.username}</strong>
            </p>
            <p
              style={{
                margin: 0,
                color: "#6b7280",
                fontSize: "0.9rem",
                maxWidth: "34rem",
              }}
            >
              Browse public teams that are currently looking for players. Teams
              you&apos;re already on won&apos;t show up here. Use search and
              game filters to find the right fit, then send a join request to
              the captain.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/teams")}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "999px",
              border: "1px solid #4b5563",
              backgroundColor: "transparent",
              color: "#e5e7eb",
              fontWeight: 500,
              fontSize: "0.85rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            ← Back to My Teams
          </button>
        </div>

        {/* Filters row */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            alignItems: "flex-end",
            marginBottom: "1rem",
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

          {/* Search box */}
          <div style={{ minWidth: "260px", flex: 1 }}>
            <label
              htmlFor="team-search"
              style={{
                display: "block",
                marginBottom: "0.25rem",
                fontSize: "0.8rem",
                color: "#9ca3af",
              }}
            >
              Search teams
            </label>
            <input
              id="team-search"
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by team name or tag"
              style={inputStyle}
            />
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
          Found <strong>{filteredTeams.length}</strong> public team
          {filteredTeams.length === 1 ? "" : "s"} matching this view.
        </p>

        {/* Teams grid */}
        {filteredTeams.length === 0 ? (
          <div style={cardStyle}>
            <p
              style={{
                margin: 0,
                fontSize: "0.9rem",
                color: "#9ca3af",
              }}
            >
              No public teams found. Try switching games, adjusting your search,
              or ask a captain to make their team public. You can also join by
              invite code from the <strong>My Teams</strong> page.
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
            {filteredTeams.map((team) => (
              <PublicTeamCard
                key={team.id}
                team={team}
                onRequestJoin={handleRequestJoin}
                requesting={requestingFor === team.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- subcomponents ----------
function PublicTeamCard({ team, onRequestJoin, requesting }) {
  const slots = buildMemberSlots(team.members || []);

  let statusLabel = "";
  let statusStyle = {};

  if (team.hasPendingRequestByMe) {
    statusLabel = "Requested";
    statusStyle = { borderColor: "#3b82f6", color: "#bfdbfe" };
  } else if (team.isFull) {
    statusLabel = "Full";
    statusStyle = { borderColor: "#6b7280", color: "#d1d5db" };
  }

  const canRequest = !team.isFull && !team.hasPendingRequestByMe;

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
            disabled={!canRequest || requesting}
            style={{
              padding: "0.25rem 0.7rem",
              borderRadius: "999px",
              border: "1px solid #3b82f6",
              backgroundColor:
                canRequest && !requesting ? "#1d283a" : "transparent",
              color: "#bfdbfe",
              fontSize: "0.75rem",
              cursor: canRequest && !requesting ? "pointer" : "default",
              opacity: canRequest ? (requesting ? 0.7 : 1) : 0.6,
            }}
          >
            {requesting
              ? "Requesting..."
              : team.hasPendingRequestByMe
              ? "Requested"
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

const gameBadgeStyle = {
  fontSize: "0.7rem",
  padding: "2px 6px",
  borderRadius: "999px",
  border: "1px solid #4b5563",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};
