// pages/teams.js
import { useState } from "react";
import { useRouter } from "next/router";
import { connectToDatabase } from "../lib/mongodb";
import Player from "../models/Player";
import Team from "../models/Team";

// Supported games for UI and filtering
const SUPPORTED_GAMES = [
  { code: "VALORANT", label: "VALORANT" },
  { code: "HOK", label: "Honor of Kings" },
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

  const teams = await Team.find({
    game: { $in: allowedGameCodes },
    $or: [{ captain: playerDoc._id }, { members: playerDoc._id }],
  })
    .sort({ createdAt: 1 })
    .lean();

  const formattedTeams = teams.map((t) => ({
    id: t._id.toString(),
    name: t.name,
    tag: t.tag || "",
    game: t.game,
    memberCount: (t.members || []).length,
    isCaptain: String(t.captain) === String(playerDoc._id),
  }));

  return {
    props: {
      player: {
        id: playerDoc._id.toString(),
        username: playerDoc.username || playerDoc.discordUsername || "Player",
      },
      initialTeams: formattedTeams,
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
  const [roleFilter, setRoleFilter] = useState("ALL"); // ALL | CAPTAIN | MEMBER

  // modal + form state
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

  function handleFilterChange(newGame) {
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

  function handleRoleFilterChange(newRole) {
    setRoleFilter(newRole);
  }

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

  // Apply game filter first
  const byGame =
    selectedGame === "ALL"
      ? teams
      : teams.filter((t) => t.game === selectedGame);

  // Then apply role filter
  const visibleTeams =
    roleFilter === "ALL"
      ? byGame
      : roleFilter === "CAPTAIN"
      ? byGame.filter((t) => t.isCaptain)
      : byGame.filter((t) => !t.isCaptain);

  const hasAnyVisibleTeams = visibleTeams.length > 0;

  const selectedGameLabel =
    selectedGame === "ALL"
      ? "these games"
      : getGameLabel(selectedGame, supportedGames);

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
              Teams are tied to a game (like VALORANT or Honor of Kings). When
              you register for a tournament, only teams from that game where
              you&apos;re captain will show up.
            </p>
          </div>
        </div>

        {/* Game filter pills */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: "0.75rem",
          }}
        >
          <FilterPill
            label="All games"
            active={selectedGame === "ALL"}
            onClick={() => handleFilterChange("ALL")}
          />
          {supportedGames.map((g) => (
            <FilterPill
              key={g.code}
              label={g.label}
              active={selectedGame === g.code}
              onClick={() => handleFilterChange(g.code)}
            />
          ))}
        </div>

        {/* Role filter pills */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <FilterPill
            label="All roles"
            active={roleFilter === "ALL"}
            onClick={() => handleRoleFilterChange("ALL")}
          />
          <FilterPill
            label="Captain teams"
            active={roleFilter === "CAPTAIN"}
            onClick={() => handleRoleFilterChange("CAPTAIN")}
          />
          <FilterPill
            label="Joined teams"
            active={roleFilter === "MEMBER"}
            onClick={() => handleRoleFilterChange("MEMBER")}
          />
        </div>

        {/* Top bar with create button */}
        <div
          style={{
            marginBottom: "1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.9rem",
              color: "#9ca3af",
            }}
          >
            You have <strong>{visibleTeams.length}</strong> team
            {visibleTeams.length === 1 ? "" : "s"} in this view.
          </p>
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
            }}
          >
            + Create team
          </button>
        </div>

        {/* Teams list */}
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
                Try switching the game or role filters above, or create a new
                team using the <strong>Create team</strong> button.
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
                  <TeamCard key={team.id} team={team} isCaptain={team.isCaptain} />
                ))}
              </div>
            </section>
          )}
        </div>
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
function FilterPill({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "0.3rem 0.75rem",
        borderRadius: "999px",
        border: active ? "1px solid #f97316" : "1px solid #4b5563",
        backgroundColor: active ? "#111827" : "#020617",
        color: active ? "#f9fafb" : "#d1d5db",
        fontSize: "0.8rem",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function TeamCard({ team, isCaptain }) {
  return (
    <div style={teamCardStyle}>
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "0.2rem",
          fontSize: "0.8rem",
          color: "#9ca3af",
        }}
      >
        <span>
          Members: <strong>{team.memberCount}</strong>
        </span>
        {isCaptain && <span style={captainBadgeStyle}>Captain</span>}
      </div>
    </div>
  );
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

const sectionTitleStyle = {
  margin: "0 0 0.4rem",
  fontSize: "0.95rem",
  fontWeight: 600,
  color: "#e5e7eb",
};

const captainBadgeStyle = {
  fontSize: "0.7rem",
  padding: "2px 6px",
  borderRadius: "999px",
  border: "1px solid #f97316",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
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
