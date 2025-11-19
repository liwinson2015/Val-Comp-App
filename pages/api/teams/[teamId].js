// pages/api/teams/[teamId].js
import { connectToDatabase } from "../../../lib/mongodb";
import Team from "../../../models/Team";

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
  const { teamId } = req.query || {};
  if (!teamId) {
    return res.status(400).json({ ok: false, error: "Missing team id." });
  }

  const cookies = parseCookies(req.headers.cookie || "");
  const playerId = cookies.playerId || null;

  if (!playerId) {
    return res.status(401).json({ ok: false, error: "Not logged in." });
  }

  await connectToDatabase();

  const team = await Team.findById(teamId);
  if (!team) {
    return res.status(404).json({ ok: false, error: "Team not found." });
  }

  const isCaptain = String(team.captain) === String(playerId);
  const isMember = (team.members || []).some(
    (m) => String(m) === String(playerId)
  );

  // DELETE = delete team (captain only)
  if (req.method === "DELETE") {
    if (!isCaptain) {
      return res
        .status(403)
        .json({ ok: false, error: "Only the captain can delete this team." });
    }

    await Team.deleteOne({ _id: teamId });
    return res.status(200).json({ ok: true, deleted: true });
  }

  // POST = actions: leave, promote, kick
  if (req.method === "POST") {
    const { action, targetPlayerId } = req.body || {};

    // ----- LEAVE -----
    if (action === "leave") {
      if (!isCaptain && !isMember) {
        return res
          .status(403)
          .json({ ok: false, error: "You are not on this team." });
      }

      if (isCaptain) {
        const otherMembers = (team.members || []).filter(
          (m) => String(m) !== String(playerId)
        );

        if (otherMembers.length > 0) {
          // captain must promote manually before leaving
          return res.status(400).json({
            ok: false,
            error:
              "You must promote another member to captain before leaving this team.",
          });
        } else {
          // solo captain: must delete
          return res.status(400).json({
            ok: false,
            error:
              "You are the only member on this team. Delete the team instead.",
          });
        }
      }

      // normal member leaving
      if (!isMember) {
        return res
          .status(400)
          .json({ ok: false, error: "You are not a member of this team." });
      }

      team.members = (team.members || []).filter(
        (m) => String(m) !== String(playerId)
      );
      await team.save();

      return res.status(200).json({ ok: true, left: true });
    }

    // ----- PROMOTE -----
    if (action === "promote") {
      if (!isCaptain) {
        return res
          .status(403)
          .json({ ok: false, error: "Only the captain can promote members." });
      }

      if (!targetPlayerId) {
        return res
          .status(400)
          .json({ ok: false, error: "Missing target player id." });
      }

      if (String(targetPlayerId) === String(team.captain)) {
        return res
          .status(400)
          .json({ ok: false, error: "That player is already captain." });
      }

      const isTargetMember = (team.members || []).some(
        (m) => String(m) === String(targetPlayerId)
      );
      if (!isTargetMember) {
        return res.status(400).json({
          ok: false,
          error: "You can only promote a current team member.",
        });
      }

      team.captain = targetPlayerId;
      // ensure new captain is in members list
      if (
        !(team.members || []).some(
          (m) => String(m) === String(targetPlayerId)
        )
      ) {
        team.members.push(targetPlayerId);
      }

      await team.save();

      return res.status(200).json({
        ok: true,
        newCaptainId: String(targetPlayerId),
      });
    }

    // ----- KICK -----
    if (action === "kick") {
      if (!isCaptain) {
        return res
          .status(403)
          .json({ ok: false, error: "Only the captain can kick members." });
      }

      if (!targetPlayerId) {
        return res
          .status(400)
          .json({ ok: false, error: "Missing target player id." });
      }

      if (String(targetPlayerId) === String(team.captain)) {
        return res.status(400).json({
          ok: false,
          error: "You cannot kick yourself. Use leave or delete the team.",
        });
      }

      const isTargetMember = (team.members || []).some(
        (m) => String(m) === String(targetPlayerId)
      );
      if (!isTargetMember) {
        return res.status(400).json({
          ok: false,
          error: "That player is not a member of this team.",
        });
      }

      team.members = (team.members || []).filter(
        (m) => String(m) !== String(targetPlayerId)
      );
      await team.save();

      return res.status(200).json({
        ok: true,
        kickedPlayerId: String(targetPlayerId),
      });
    }

    return res.status(400).json({ ok: false, error: "Unknown action." });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed." });
}
