// pages/account/team-registrations.js
import React, { useState } from "react";
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import Tournament from "../../models/Tournament";
import TeamTournamentRegistration from "../../models/TeamTournamentRegistration";

function parseCookies(header = "") {
  return Object.fromEntries(
    (header || "")
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const [k, ...rest] = c.split("=");
        return [k, decodeURIComponent(rest.join("=") || "")];
      })
  );
}

const GAME_LABELS = {
  VALORANT: "Valorant",
  HOK: "Honor of Kings",
  TFT: "Teamfight Tactics",
};

export async function getServerSideProps({ req }) {
  const cookies = parseCookies(req.headers.cookie || "");
  const playerId = cookies.playerId || null;

  if (!playerId) {
    return {
      redirect: {
        destination: "/api/auth/discord?next=/account/team-registrations",
        permanent: false,
      },
    };
  }

  await connectToDatabase();

  const player = await Player.findById(playerId).lean();
  if (!player) {
    return {
      redirect: {
        destination: "/api/auth/discord?next=/account/team-registrations",
        permanent: false,
      },
    };
  }

  // All team registrations this player is part of
  const regsRaw = await TeamTournamentRegistration.find({
    "members.player": player._id,
  }).lean();

  if (!regsRaw || regsRaw.length === 0) {
    return {
      props: {
        username: player.username || player.discordTag || "",
        registrations: [],
      },
    };
  }

  // ---- Load tournaments for labels ----
  const tournamentIds = [
    ...new Set(regsRaw.map((r) => r.tournamentId || "").filter(Boolean)),
  ];

  const tournaments = await Tournament.find({
    tournamentId: { $in: tournamentIds },
  }).lean();

  const tournamentMap = {};
  for (const t of tournaments) {
    tournamentMap[t.tournamentId] = {
      name: t.name || "Tournament",
      meta: t.meta || {},
    };
  }

  const myIdStr = player._id.toString();

  // ---- Collect all member playerIds so we can look up their Player docs ----
  const memberIdSet = new Set();
  regsRaw.forEach((r) => {
    (r.members || []).forEach((m) => {
      if (m.player) {
        memberIdSet.add(m.player.toString());
      }
    });
  });

  let playersById = {};
  if (memberIdSet.size > 0) {
    const memberIds = Array.from(memberIdSet);
    const memberDocs = await Player.find({
      _id: { $in: memberIds },
    }).lean();

    playersById = memberDocs.reduce((acc, p) => {
      acc[p._id.toString()] = p;
      return acc;
    }, {});
  }

  // Helper to compute display name for a member in a given registration
  function buildMemberDisplayName(memberDoc, regGameCode, memberRaw) {
    if (!memberDoc) {
      // fall back to whatever was stored on the registration doc
      return (
        memberRaw.username ||
        memberRaw.discordId ||
        "Unknown"
      );
    }

    const gameProfiles = memberDoc.gameProfiles || {};
    const gameProfile =
      gameProfiles[regGameCode] || gameProfiles[regGameCode?.toUpperCase()] || {};

    const ign = gameProfile.ign || "";
    const username = memberDoc.username || "";
    const discordTag = memberDoc.discordTag || memberDoc.discordId || "";

    return ign || username || discordTag || memberRaw.username || "Unknown";
  }

  const registrations = regsRaw.map((r) => {
    const tMeta = tournamentMap[r.tournamentId] || {};
    const tourName = tMeta.name || "Tournament";
    const gameCode = r.gameCode || "VALORANT";

    const me = (r.members || []).find(
      (m) => m.player && m.player.toString() === myIdStr
    );

    return {
      id: r._id.toString(),
      tournamentId: r.tournamentId,
      tournamentName: tourName,
      teamName: r.teamName || "Unnamed team",
      gameCode,
      modeKey: r.modeKey || "",
      status: r.status || "pending",
      myStatus: me ? me.status || "pending" : "pending",
      members: (r.members || []).map((m) => {
        const pid = m.player ? m.player.toString() : null;
        const memberDoc = pid ? playersById[pid] : null;
        const displayName = buildMemberDisplayName(
          memberDoc,
          gameCode,
          m
        );

        return {
          username: displayName,
          discordId: m.discordId || "",
          status: m.status || "pending",
        };
      }),
      createdAt: r.createdAt ? r.createdAt.toISOString() : null,
    };
  });

  // Sort newest first
  registrations.sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return {
    props: {
      username: player.username || player.discordTag || "",
      registrations,
    },
  };
}

export default function TeamRegistrationsPage({ username, registrations }) {
  const [items, setItems] = useState(registrations || []);
  const [busyId, setBusyId] = useState(null);
  const [globalMsg, setGlobalMsg] = useState("");

  async function handleRespond(regId, action) {
    // We now ONLY use this for "decline".
    if (action === "accept") {
      // Safety fallback (but normal Accept button does a direct redirect)
      window.location.href = `/team-invite/${regId}/accept`;
      return;
    }

    setBusyId(regId);
    setGlobalMsg("");

    try {
      const res = await fetch("/api/registration/team-respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamRegistrationId: regId, action }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setGlobalMsg(
          data.error || (await res.text()) || "Failed to update response."
        );
        setBusyId(null);
        return;
      }

      const newStatus = data.status;
      const memberStatus = data.memberStatus;

      setItems((prev) =>
        prev.map((r) => {
          if (r.id !== regId) return r;
          return {
            ...r,
            status: newStatus || r.status,
            myStatus: memberStatus || r.myStatus,
            members: r.members.map((m) => m),
          };
        })
      );
    } catch (err) {
      console.error("team-respond error", err);
      setGlobalMsg("Network error updating your response.");
    } finally {
      setBusyId(null);
    }
  }

  const hasAny = items && items.length > 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#020617",
        color: "#f9fafb",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Inter", Roboto, sans-serif',
        padding: "2.5rem 1rem 3rem",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 900 }}>
        <header
          style={{
            marginBottom: "1.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#9ca3af",
              fontWeight: 600,
            }}
          >
            ACCOUNT
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              margin: 0,
            }}
          >
            Team Tournament Registrations
          </h1>
          <div style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
            Signed in as <span style={{ fontWeight: 600 }}>{username}</span>.
            Here you can accept or decline team tournament entries you&apos;re
            part of.
          </div>
        </header>

        {!hasAny && (
          <div
            style={{
              borderRadius: "0.9rem",
              border: "1px dashed rgba(148,163,184,0.5)",
              padding: "1.5rem 1.25rem",
              background:
                "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.15), transparent 55%) #020617",
              fontSize: "0.9rem",
              color: "#e5e7eb",
            }}
          >
            You don&apos;t have any team tournament registrations yet. When a
            captain registers your team, it will show up here so you can accept
            or decline your spot.
          </div>
        )}

        {hasAny && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {items.map((reg) => (
              <TeamRegistrationCard
                key={reg.id}
                reg={reg}
                busy={busyId === reg.id}
                onRespond={handleRespond}
              />
            ))}
          </div>
        )}

        {globalMsg && (
          <div
            style={{
              marginTop: "1rem",
              fontSize: "0.8rem",
              color: "#fecaca",
            }}
          >
            {globalMsg}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamRegistrationCard({ reg, busy, onRespond }) {
  const gameLabel = GAME_LABELS[reg.gameCode] || reg.gameCode || "Game";

  const statusColor =
    reg.status === "active"
      ? "#4ade80"
      : reg.status === "cancelled"
      ? "#f97373"
      : "#eab308";

  const statusLabel =
    reg.status === "active"
      ? "Active (everyone accepted)"
      : reg.status === "cancelled"
      ? "Cancelled"
      : "Pending";

  const canRespond =
    reg.status === "pending" && reg.myStatus === "pending";

  function memberChipColor(status) {
    if (status === "accepted") return "#22c55e";
    if (status === "declined") return "#f97373";
    return "#eab308";
  }

  return (
    <div
      style={{
        borderRadius: "1rem",
        border: "1px solid rgba(31,41,55,0.9)",
        background:
          "radial-gradient(circle at 0% 0%, rgba(59,130,246,0.15), transparent 60%) #020617",
        padding: "1.1rem 1rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "0.75rem",
          alignItems: "baseline",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.8rem",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#9ca3af",
              marginBottom: "0.25rem",
            }}
          >
            {gameLabel} {reg.modeKey ? `• ${reg.modeKey.toUpperCase()}` : ""}
          </div>
          <div
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "#f9fafb",
            }}
          >
            {reg.tournamentName}
          </div>
          <div
            style={{
              fontSize: "0.85rem",
              color: "#cbd5f5",
              marginTop: "0.2rem",
            }}
          >
            Team: <span style={{ fontWeight: 600 }}>{reg.teamName}</span>
          </div>
        </div>

        <div
          style={{
            fontSize: "0.75rem",
            padding: "0.2rem 0.7rem",
            borderRadius: "999px",
            border: `1px solid ${statusColor}`,
            color: statusColor,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            whiteSpace: "nowrap",
          }}
        >
          {statusLabel}
        </div>
      </div>

      <div
        style={{
          marginTop: "0.4rem",
          borderTop: "1px solid rgba(31,41,55,0.9)",
          paddingTop: "0.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.45rem",
        }}
      >
        <div
          style={{
            fontSize: "0.78rem",
            color: "#9ca3af",
            textTransform: "uppercase",
            letterSpacing: "0.11em",
          }}
        >
          Team members
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.35rem",
          }}
        >
          {reg.members.map((m, idx) => (
            <div
              key={`${m.discordId || m.username || idx}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.25rem 0.55rem",
                borderRadius: "999px",
                border: "1px solid rgba(55,65,81,0.9)",
                backgroundColor: "#020617",
                fontSize: "0.75rem",
              }}
            >
              <span style={{ color: "#e5e7eb" }}>
                {m.username || m.discordId || "Unknown"}
              </span>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "999px",
                  backgroundColor: memberChipColor(m.status),
                }}
              />
              <span
                style={{
                  color: memberChipColor(m.status),
                  textTransform: "capitalize",
                }}
              >
                {m.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: "0.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          fontSize: "0.78rem",
          color: "#9ca3af",
        }}
      >
        <div>
          {reg.myStatus === "pending" && reg.status === "pending" && (
            <>
              Your status:{" "}
              <span style={{ color: "#eab308", fontWeight: 600 }}>
                Pending
              </span>
              . You need to accept or decline this spot.
            </>
          )}
          {reg.myStatus === "accepted" && (
            <>
              Your status:{" "}
              <span style={{ color: "#4ade80", fontWeight: 600 }}>
                Accepted
              </span>
              .
            </>
          )}
          {reg.myStatus === "declined" && (
            <>
              Your status:{" "}
              <span style={{ color: "#f97373", fontWeight: 600 }}>
                Declined
              </span>
              .
            </>
          )}
        </div>

        {canRespond && (
          <div
            style={{
              display: "flex",
              gap: "0.4rem",
              flexShrink: 0,
            }}
          >
            {/* Decline still uses API */}
            <button
              type="button"
              disabled={busy}
              onClick={() => onRespond(reg.id, "decline")}
              style={{
                padding: "0.35rem 0.7rem",
                borderRadius: "999px",
                border: "1px solid rgba(248,113,113,0.8)",
                backgroundColor: "transparent",
                color: "#fecaca",
                fontSize: "0.78rem",
                cursor: busy ? "default" : "pointer",
                opacity: busy ? 0.7 : 1,
              }}
            >
              Decline
            </button>

            {/* Accept now goes to the new per-invite form page */}
            <button
              type="button"
              onClick={() => {
                window.location.href = `/team-invite/${reg.id}/accept`;
              }}
              style={{
                padding: "0.35rem 0.9rem",
                borderRadius: "999px",
                border: "none",
                background:
                  "linear-gradient(135deg, #22c55e 0%, #16a34a 40%, #0f172a 100%)",
                color: "#f9fafb",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                opacity: 1,
              }}
            >
              Accept &amp; Fill Info
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
