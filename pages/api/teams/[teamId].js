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

// Generate a unique 6-char join code (A-Z, 0-9)
async function generateUniqueJoinCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  while (true) {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    const existing = await Team.findOne({ joinCode: code }).lean();
    if (!existing) return code;
  }
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

  // ---------- DELETE: delete team (captain only) ----------
  if (req.method === "DELETE") {
    if (!isCaptain) {
      return res
        .status(403)
        .json({ ok: false, error: "Only the captain can delete this team." });
    }

    await Team.deleteOne({ _id: teamId });
    // Clean up pending join requests for this team
    await TeamJoinRequest.deleteMany({ teamId: team._id });

    return res.status(200).json({ ok: true, deleted: true });
  }

  // ---------- POST: actions ----------
  if (req.method === "POST") {
    const { action, targetPlayerId, isPublic } = req.body || {};

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

    // ----- SET VISIBILITY (public/private) -----
    if (action === "setVisibility") {
      if (!isCaptain) {
        return res.status(403).json({
          ok: false,
          error: "Only the captain can change team visibility.",
        });
      }

      const nextPublic = !!isPublic;
      team.isPublic = nextPublic;

      // --- UPDATED: Update Rank and Roles if provided ---
      if (nextPublic) {
         if (req.body.rank) team.rank = req.body.rank;
         if (req.body.rolesNeeded) team.rolesNeeded = req.body.rolesNeeded;
      }
      // --------------------------------------------------

      await team.save();

      // Optional: if making private, clear pending public join requests
      if (!nextPublic) {
        await TeamJoinRequest.updateMany(
          { teamId: team._id, status: "pending" },
          { $set: { status: "rejected" } }
        );
      }

      return res.status(200).json({
        ok: true,
        isPublic: team.isPublic,
        rank: team.rank,
        rolesNeeded: team.rolesNeeded
      });
    }

    // ----- REGENERATE JOIN CODE -----
    if (action === "regenJoinCode") {
      if (!isCaptain) {
        return res.status(403).json({
          ok: false,
          error: "Only the captain can regenerate the invite code.",
        });
      }

      const newCode = await generateUniqueJoinCode();
      team.joinCode = newCode;
      await team.save();

      return res.status(200).json({
        ok: true,
        joinCode: newCode,
      });
    }

    return res.status(400).json({ ok: false, error: "Unknown action." });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed." });
}