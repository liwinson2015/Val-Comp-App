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

// Check if player is missing IGN for this game's profile
function getMissingProfileGame(player, teamGame) {
  if (!player || !player.gameProfiles) return null;

  if (teamGame === "VALORANT") {
    const ign =
      player.gameProfiles?.VALORANT?.ign &&
      player.gameProfiles.VALORANT.ign.trim();
    if (!ign) return "VALORANT";
  }

  if (teamGame === "HOK") {
    const ign =
      player.gameProfiles?.HOK?.ign &&
      player.gameProfiles.HOK.ign.trim();
    if (!ign) return "HOK";
  }

  return null;
}

function missingProfileError(game) {
  if (game === "VALORANT") return "Missing VALORANT IGN on profile.";
  if (game === "HOK") return "Missing Honor of Kings IGN on profile.";
  return "Missing in-game name on profile.";
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

  const MAX_TEAM_SIZE = 7; // 5 starters + 2 subs

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

    // IGN gate for VALORANT / HOK
    const missingGame = getMissingProfileGame(player, team.game);
    if (missingGame) {
      return res.status(200).json({
        ok: false,
        requiresProfile: true,
        game: missingGame,
        error: missingProfileError(missingGame),
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

    const memberCount = (team.members || []).length + 1; // captain + members
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

    // Populate full roster and use IGN where available
    await team.populate([
      { path: "captain", select: "username discordUsername gameProfiles" },
      { path: "members", select: "username discordUsername gameProfiles" },
    ]);

    const membersFormatted = [];

    function getDisplayName(doc) {
      if (!doc) return "Player";
      let baseName = doc.username || doc.discordUsername || "Player";

      if (team.game === "VALORANT") {
        const ign =
          doc.gameProfiles?.VALORANT?.ign &&
          doc.gameProfiles.VALORANT.ign.trim();
        if (ign) return ign;
      } else if (team.game === "HOK") {
        const ign =
          doc.gameProfiles?.HOK?.ign &&
          doc.gameProfiles.HOK.ign.trim();
        if (ign) return ign;
      }

      return baseName;
    }

    // captain first
    membersFormatted.push({
      id: String(team.captain._id),
      name: getDisplayName(team.captain),
      isCaptain: true,
    });

    // other members
    team.members.forEach((m) => {
      if (String(m._id) !== String(team.captain._id)) {
        membersFormatted.push({
          id: String(m._id),
          name: getDisplayName(m),
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

  const missingGame = getMissingProfileGame(player, team.game);
  if (missingGame) {
    return res.status(200).json({
      ok: false,
      requiresProfile: true,
      game: missingGame,
      error: missingProfileError(missingGame),
    });
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
