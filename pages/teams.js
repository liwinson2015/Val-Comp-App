// pages/teams.js
import { useState } from "react";
import { connectToDatabase } from "../lib/mongodb";
import Player from "../models/Player";
import Team from "../models/Team";

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
export async function getServerSideProps({ req }) {
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

  const teams = await Team.find({
    game: "VALORANT",
    $or: [{ captain: playerDoc._id }, { members: playerDoc._id }],
  })
    .sort({ createdAt: 1 })
    .lean();

  const initialTeams = teams.map((t) => ({
    id: t._id.toString(),
    name: t.name,
    tag: t.tag || "",
    game: t.game,
    isCaptain: String(t.captain) === String(playerDoc._id),
    memberCount: (t.members || []).length,
  }));

  return {
    props: {
      player: {
        id: playerDoc._id.toString(),
        username: playerDoc.username || playerDoc.discordUsername || "Player",
      },
      initialTeams,
    },
  };
}

// ---------- CLIENT COMPONENT ----------
export default function TeamsPage({ player, initialTeams }) {
  const [teams, setTeams] = useState(initialTeams || []);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Team name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, tag }),
      });

      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Failed to create team.");
      } else {
        setTeams((prev) => [...prev, data.team]);
        setName("");
        setTag("");
        setShowForm(false);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const hasTeams = teams && teams.length > 0;

  return (
    <div className="shell">
      <div className="contentWrap">
        <div
          style={{
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "1.6rem" }}>My Teams</h1>
            <p style={{ margin: "0.25rem 0", color: "#9ca3af" }}>
              Logged in as <strong>{player.username}</strong>
            </p>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              Teams are per game. Right now this page shows{" "}
              <strong>VALORANT</strong> teams only.
            </p>
          </div>

          <button
            onClick={() => setShowForm((v) => !v)}
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: "8px",
              border: "1px solid #374151",
              background:
                "linear-gradient(135deg, #ef4444 0%, #b91c1c 50%, #111827 100%)",
              color: "white",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {showForm ? "Cancel" : "Create Team"}
          </button>
        </div>

        {/* Empty state */}
        {!hasTeams && !showForm && (
          <div
            style={{
              padding: "1.5rem",
              borderRadius: "12px",
              border: "1px dashed rgba(148,163,184,0.4)",
              background:
                "radial-gradient(circle at top left, #1f2937 0, #020617 55%)",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: "0.5rem" }}>
              No teams formed yet
            </h2>
            <p style={{ marginTop: 0, marginBottom: "0.75rem", color: "#9ca3af" }}>
              You&apos;re not in any VALORANT teams. Create a team and invite
              your friends so you can register for squad tournaments as captain.
            </p>
            <button
              onClick={() => setShowForm(true)}
              style={{
                padding: "0.55rem 1rem",
                borderRadius: "8px",
                border: "1px solid #f97316",
                background:
                  "linear-gradient(135deg, #f97316 0%, #ea580c 50%, #111827 100%)",
                color: "white",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              Create your first team
            </button>
          </div>
        )}

        {/* Create team form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            style={{
              marginTop: hasTeams ? "0" : "1.5rem",
              marginBottom: "1.5rem",
              padding: "1.25rem",
              borderRadius: "12px",
              border: "1px solid rgba(148,163,184,0.35)",
              backgroundColor: "#020617",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: "0.75rem" }}>
              Create a new VALORANT team
            </h2>

            <div style={{ marginBottom: "0.75rem" }}>
              <label
                htmlFor="team-name"
                style={{
                  display: "block",
                  marginBottom: "0.25rem",
                  fontSize: "0.9rem",
                }}
              >
                Team name *
              </label>
              <input
                id="team-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 5TQ Demons"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <label
                htmlFor="team-tag"
                style={{
                  display: "block",
                  marginBottom: "0.25rem",
                  fontSize: "0.9rem",
                }}
              >
                Tag (optional)
              </label>
              <input
                id="team-tag"
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="e.g. 5TQ"
                style={inputStyle}
              />
              <p
                style={{
                  margin: "0.25rem 0 0",
                  fontSize: "0.8rem",
                  color: "#6b7280",
                }}
              >
                Short label that appears before your team name in some places.
              </p>
            </div>

            {error && (
              <p
                style={{
                  color: "#fca5a5",
                  marginTop: "0.25rem",
                  marginBottom: "0.5rem",
                  fontSize: "0.85rem",
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
                padding: "0.5rem 1.1rem",
                borderRadius: "8px",
                border: "none",
                background:
                  "linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #0f172a 100%)",
                color: "white",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: submitting ? "default" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Creating..." : "Create team"}
            </button>
          </form>
        )}

        {/* Teams list */}
        {hasTeams && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1rem",
            }}
          >
            {teams.map((team) => (
              <div
                key={team.id}
                style={{
                  padding: "1rem",
                  borderRadius: "12px",
                  border: "1px solid rgba(148,163,184,0.35)",
                  background:
                    "radial-gradient(circle at top left, #111827 0, #020617 55%)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.5rem",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                    {team.tag ? `[${team.tag}] ` : ""}
                    {team.name}
                  </h3>
                  {team.isCaptain && (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "2px 6px",
                        borderRadius: "999px",
                        border: "1px solid #f97316",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Captain
                    </span>
                  )}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.85rem",
                    color: "#9ca3af",
                  }}
                >
                  Game: <strong>{team.game}</strong>
                </p>
                <p
                  style={{
                    margin: "0.25rem 0 0",
                    fontSize: "0.85rem",
                    color: "#9ca3af",
                  }}
                >
                  Members: <strong>{team.memberCount}</strong>
                </p>
                {/* Future: manage members, delete team, etc. */}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "0.4rem 0.6rem",
  borderRadius: "6px",
  border: "1px solid #4b5563",
  backgroundColor: "#020617",
  color: "white",
  fontSize: "0.9rem",
  outline: "none",
};
