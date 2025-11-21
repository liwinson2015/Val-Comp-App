// pages/api/teams/roster.js
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";
import Team from "../../../models/Team";

function parseCookies(header = "") {
  return Object.fromEntries(
    (header || "").split(";").filter(Boolean).map((c) => {
        const [k, ...rest] = c.trim().split("=");
        return [k, decodeURIComponent(rest.join("=") || "")];
      })
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const cookies = parseCookies(req.headers.cookie || "");
  const playerId = cookies.playerId || null;

  if (!playerId) {
    return res.status(401).json({ ok: false, error: "Not logged in" });
  }

  const { teamId, newMemberOrder } = req.body;

  if (!teamId || !newMemberOrder || !Array.isArray(newMemberOrder)) {
    return res.status(400).json({ ok: false, error: "Invalid data" });
  }

  await connectToDatabase();

  try {
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ ok: false, error: "Team not found" });
    }

    // Verify Captain
    if (String(team.captain) !== String(playerId)) {
      return res.status(403).json({ ok: false, error: "Only the captain can manage the roster" });
    }

    // Security check: Ensure newMemberOrder contains the same IDs as the current team
    // (prevents adding/removing players, only allows reordering)
    const currentIds = team.members.map(m => String(m)).sort();
    const newIds = newMemberOrder.map(m => String(m)).sort();

    if (JSON.stringify(currentIds) !== JSON.stringify(newIds)) {
      return res.status(400).json({ ok: false, error: "Member list mismatch. Refresh and try again." });
    }

    // Update the order
    team.members = newMemberOrder;
    await team.save();

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error("Roster update error:", error);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}