// pages/api/teams/join.js
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";
import Team from "../../../models/Team";
import TeamJoinRequest from "../../../models/TeamJoinRequest";

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed. Use POST." });
  }

  const cookies = parseCookies(req.headers.cookie || "");
  const playerId = cookies.playerId || null;

  if (!playerId) {
    return res.status(401).json({ ok: false, error: "Not logged in." });
  }

  const { joinCode, teamId } = req.body || {};

  if (!joinCode && !teamId) {
    return res.status(400).json({
      ok: false,
      error: "Provide either joinCode or teamId.",
    });
  }

  await connectToDatabase();

  const player = await Player.findById(playerId);
  if (!player) {
    return res.status(404).json({ ok: false, error: "Player not found." });
  }

  // UPDATED: Limit is now 7 (5 Starters + 2 Subs)
  const MAX_TEAM_SIZE = 7;

  // ---------- 1) JOIN BY INVITE CODE ----------
  if (joinCode) {
    const code = String(joinCode).trim().toUpperCase();
    if (!code || code.length !== 6) {
      return res
        .status(400)
        .json({ ok: false, error: "Invite code must be 6 characters." });
    }

    const team = await Team.findOne({ joinCode: code });
    if (!team) {
      return res
        .status(404)
        .json({ ok: false, error: "No team found with that invite code." });
    }

    const playerIdStr = String(player._id);
    const captainIdStr = String(team.captain);
    const isCaptain = captainIdStr === playerIdStr;
    const isMember = (team.members || []).some(
      (m) => String(m) === playerIdStr
    );

    if (isCaptain || isMember) {
      return res.status(400).json({
        ok: false,
        error: "You are already on this team.",
      });
    }

    const memberCount = (team.members || []).length + 1; 
    const effectiveLimit = team.maxSize || MAX_TEAM_SIZE;
    
    if (memberCount >= effectiveLimit) {
      return res.status(400).json({
        ok: false,
        error: `This team is full (Max ${effectiveLimit}).`,
      });
    }

    team.members = team.members || [];
    team.members.push(player._id);
    await team.save();

    // Populate full roster
    await team.populate([
      { path: "captain", select: "username discordUsername" },
      { path: "members", select: "username discordUsername" },
    ]);

    const membersFormatted = [];
    membersFormatted.push({
      id: String(team.captain._id),
      name: team.captain.username || team.captain.discordUsername || "Captain",
      isCaptain: true,
    });

    team.members.forEach((m) => {
      if (String(m._id) !== String(team.captain._id)) {
        membersFormatted.push({
          id: String(m._id),
          name: m.username || m.discordUsername || "Member",
          isCaptain: false,
        });
      }
    });

    return res.status(200).json({
      ok: true,
      joined: true,
      via: "code",
      team: {
        id: team._id.toString(),
        name: team.name,
        tag: team.tag || "",
        game: team.game,
        memberCount: membersFormatted.length,
        isPublic: !!team.isPublic,
        maxSize: effectiveLimit,
        joinCode: team.joinCode || null,
        members: membersFormatted,
      },
    });
  }

  // ---------- 2) REQUEST TO JOIN BY TEAM ID ----------
  const team = await Team.findById(teamId);
  if (!team) {
    return res.status(404).json({ ok: false, error: "Team not found." });
  }

  if (!team.isPublic) {
    return res.status(400).json({
      ok: false,
      error: "This team is not accepting public requests.",
    });
  }

  const playerIdStr = String(player._id);
  const captainIdStr = String(team.captain);
  const isCaptain = captainIdStr === playerIdStr;
  const isMember = (team.members || []).some(
    (m) => String(m) === playerIdStr
  );

  if (isCaptain || isMember) {
    return res.status(400).json({
      ok: false,
      error: "You are already on this team.",
    });
  }

  const memberCount = (team.members || []).length + 1;
  const effectiveLimit = team.maxSize || MAX_TEAM_SIZE;

  if (memberCount >= effectiveLimit) {
    return res.status(400).json({
      ok: false,
      error: "This team is full.",
    });
  }

  const existingPending = await TeamJoinRequest.findOne({
    teamId: team._id,
    playerId: player._id,
    status: "pending",
  });

  if (existingPending) {
    return res.status(400).json({
      ok: false,
      error: "You already have a pending request for this team.",
    });
  }

  const reqDoc = await TeamJoinRequest.create({
    teamId: team._id,
    playerId: player._id,
    status: "pending",
  });

  return res.status(200).json({
    ok: true,
    requested: true,
    via: "public-list",
    requestId: reqDoc._id.toString(),
  });
}