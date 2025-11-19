// pages/api/teams/join.js
import { connectToDatabase } from "../../../lib/mongodb";
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

// Instant join via invite code OR request to join a public team.
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
      error: "Missing joinCode or teamId.",
    });
  }

  await connectToDatabase();

  // ---------- PATH 1: JOIN BY INVITE CODE (INSTANT) ----------
  if (joinCode) {
    const code = String(joinCode).trim().toUpperCase();
    if (!code || code.length !== 6) {
      return res.status(400).json({
        ok: false,
        error: "Invalid invite code format.",
      });
    }

    const team = await Team.findOne({ joinCode: code });
    if (!team) {
      return res.status(404).json({
        ok: false,
        error: "No team found with that invite code.",
      });
    }

    // check if already captain or member
    const isCaptain = String(team.captain) === String(playerId);
    const isMember = (team.members || []).some(
      (m) => String(m) === String(playerId)
    );

    if (isCaptain || isMember) {
      return res.status(400).json({
        ok: false,
        error: "You are already on this team.",
      });
    }

    // capacity check
    const memberCount = (team.members || []).length;
    if (memberCount >= (team.maxSize || 7)) {
      return res.status(400).json({
        ok: false,
        error: "This team is full.",
      });
    }

    // add player to members
    team.members = team.members || [];
    team.members.push(playerId);
    await team.save();

    return res.status(200).json({
      ok: true,
      joined: true,
      team: {
        id: team._id.toString(),
        name: team.name,
        tag: team.tag || "",
        game: team.game,
        memberCount: team.members.length,
        isCaptain: false, // you just joined, not captain
        // members list will be re-fetched on page load; for now keep it minimal
      },
    });
  }

  // ---------- PATH 2: REQUEST TO JOIN PUBLIC TEAM ----------
  if (teamId) {
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        ok: false,
        error: "Team not found.",
      });
    }

    if (!team.isPublic) {
      return res.status(400).json({
        ok: false,
        error: "This team is not accepting public join requests.",
      });
    }

    // already on team?
    const isCaptain = String(team.captain) === String(playerId);
    const isMember = (team.members || []).some(
      (m) => String(m) === String(playerId)
    );
    if (isCaptain || isMember) {
      return res.status(400).json({
        ok: false,
        error: "You are already on this team.",
      });
    }

    // full?
    const memberCount = (team.members || []).length;
    if (memberCount >= (team.maxSize || 7)) {
      return res.status(400).json({
        ok: false,
        error: "This team is full.",
      });
    }

    // check for existing pending request
    const existing = await TeamJoinRequest.findOne({
      teamId: team._id,
      playerId,
      status: "pending",
    }).lean();

    if (existing) {
      return res.status(200).json({
        ok: true,
        requested: true,
        alreadyPending: true,
      });
    }

    const request = await TeamJoinRequest.create({
      teamId: team._id,
      playerId,
      status: "pending",
    });

    return res.status(200).json({
      ok: true,
      requested: true,
      requestId: request._id.toString(),
      teamId: team._id.toString(),
    });
  }

  // Should not reach here
  return res.status(400).json({ ok: false, error: "Invalid join request." });
}
