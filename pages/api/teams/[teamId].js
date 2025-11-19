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

  // POST = actions (leave team for now)
  if (req.method === "POST") {
    const { action } = req.body || {};

    if (action === "leave") {
      if (!isCaptain && !isMember) {
        return res
          .status(403)
          .json({ ok: false, error: "You are not on this team." });
      }

      // Captain leaving: must promote someone else if possible
      if (isCaptain) {
        const otherMembers = (team.members || []).filter(
          (m) => String(m) !== String(playerId)
        );

        if (otherMembers.length === 0) {
          return res.status(400).json({
            ok: false,
            error:
              "You are the only member on this team. Delete the team instead.",
          });
        }

        const newCaptainId = otherMembers[0]; // auto-promote first other member

        team.captain = newCaptainId;
        team.members = (team.members || []).filter(
          (m) => String(m) !== String(playerId)
        );
        await team.save();

        return res.status(200).json({
          ok: true,
          left: true,
          newCaptainId: String(newCaptainId),
        });
      }

      // Normal member leaving
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

    return res.status(400).json({ ok: false, error: "Unknown action." });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed." });
}
