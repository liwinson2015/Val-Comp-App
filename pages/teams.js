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

  const captainTeams = [];
  const memberTeams = [];

  teams.forEach((t) => {
    const base = {
      id: t._id.toString(),
      name: t.name,
      tag: t.tag || "",
      game: t.game,
      memberCount: (t.members || []).length,
    };

    if (String(t.captain) === String(playerDoc._id)) {
      captainTeams.push({ ...base, isCaptain: true });
    } else {
      memberTeams.push({ ...base, isCaptain: false });
    }
  });

  return {
    props: {
      player: {
        id: playerDoc._id.toString(),
        username: playerDoc.username || playerDoc.discordUsername || "Player",
      },
      initialCaptainTeams: captainTeams,
      initialMemberTeams: memberTeams,
    },
  };
}

// ---------- CLIENT COMPONENT ----------
export default function TeamsPage({
  player,
  initialCaptainTeams,
  initialMemberTeams,
}) {
  const [captainTeams, setCaptainTeams] = useState(initialCaptainTeams || []);
  const [memberTeams] = useState(initialMemberTeams || []);
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
        // new team is always one you captain
        setCaptainTeams((prev) => [
          ...prev,
          {
            id: data.team.id,
            name: data.team.name,
            tag: data.team.tag || "",
            game: data.team.game,
            memberCount: data.team.memberCount || 1,
            isCaptain: true,
          },
        ]);
        setName("");
        setTag("");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const hasAnyTeams =
    (captainTeams && captainTeams.length > 0) ||
    (memberTeams && memberTeams.length > 0);

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
            <h1 style={{ margin: 0, fontSize: "1.7rem" }}>Teams</h1>
            <p style={{ margin: "0.35rem 0", color: "#9ca3af" }}>
              Logged in as <strong>{player.username}</strong>
            </p>
            <p
              style={{
                margin: 0,
                color: "#6b7280",
                fontSize: "0.9rem",
                maxWidth: "28rem",
              }}
            >
              Create VALORANT teams once and reuse them for different
              tournaments. Only teams you captain will show up when you register
              for squad events.
            </p>
          </div>
        </div>

        {/* Main layout: form on left, teams on right */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 320px) minmax(0, 1fr)",
            gap: "1.5rem",
          }}
        >
          {/* Create team card */}
          <div style={cardStyle}>
            <h2
              style={{
                marginTop: 0,
                marginBottom: "0.5rem",
                fontSize: "1.1rem",
              }}
            >
              Create a new team
            </h2>
            <p
              style={{
                marginTop: 0,
                marginBottom: "0.9rem",
                fontSize: "0.85rem",
                color: "#9ca3af",
              }}
            >
              Game: <strong>VALORANT</strong>. Team size will be checked when
              you register for a specific tournament (3v3, 5v5, etc).
            </p>

            <form onSubmit={handleCreate}>
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
                    fontSize: "0.85rem",
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
                    fontSize: "0.75rem",
                    color: "#6b7280",
                  }}
                >
                  Short label that can show before your team name.
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

          {/* Teams column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {!hasAnyTeams && (
              <div style={cardStyle}>
                <h2
                  style={{
                    marginTop: 0,
                    marginBottom: "0.4rem",
                    fontSize: "1.05rem",
                  }}
                >
                  No teams yet
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.9rem",
                    color: "#9ca3af",
                  }}
                >
                  You&apos;re not in any VALORANT teams right now. Use the form
                  on the left to create your first team. After that, you can use
                  it to register for tournaments as captain.
                </p>
              </div>
            )}

            {captainTeams && captainTeams.length > 0 && (
              <section>
                <h2 style={sectionTitleStyle}>Teams you captain</h2>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(230px, 1fr))",
                    gap: "0.75rem",
                  }}
                >
                  {captainTeams.map((team) => (
                    <div key={team.id} style={teamCardStyle}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.35rem",
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
                        <span style={captainBadgeStyle}>Captain</span>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.8rem",
                          color: "#9ca3af",
                        }}
                      >
                        Game: <strong>{team.game}</strong>
                      </p>
                      <p
                        style={{
                          margin: "0.25rem 0 0",
                          fontSize: "0.8rem",
                          color: "#9ca3af",
                        }}
                      >
                        Members: <strong>{team.memberCount}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {memberTeams && memberTeams.length > 0 && (
              <section>
                <h2 style={sectionTitleStyle}>Teams you&apos;re in</h2>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(230px, 1fr))",
                    gap: "0.75rem",
                  }}
                >
                  {memberTeams.map((team) => (
                    <div key={team.id} style={teamCardStyle}>
                      <h3
                        style={{
                          margin: 0,
                          marginBottom: "0.35rem",
                          fontSize: "1rem",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {team.tag ? `[${team.tag}] ` : ""}
                        {team.name}
                      </h3>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.8rem",
                          color: "#9ca3af",
                        }}
                      >
                        Game: <strong>{team.game}</strong>
                      </p>
                      <p
                        style={{
                          margin: "0.25rem 0 0",
                          fontSize: "0.8rem",
                          color: "#9ca3af",
                        }}
                      >
                        Members: <strong>{team.memberCount}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- styles -----
const cardStyle = {
  padding: "1rem",
  borderRadius: "12px",
  border: "1px solid rgba(148,163,184,0.35)",
  backgroundColor: "#020617",
};

const teamCardStyle = {
  padding: "0.8rem",
  borderRadius: "10px",
  border: "1px solid rgba(148,163,184,0.3)",
  background:
    "radial-gradient(circle at top left, #111827 0, #020617 55%, #020617 100%)",
};

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
