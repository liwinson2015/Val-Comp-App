// pages/api/teams/requests/[requestId].js
import { connectToDatabase } from "../../../../lib/mongodb";
import Team from "../../../../models/Team";
import TeamJoinRequest from "../../../../models/TeamJoinRequest";

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

  const { requestId } = req.query || {};
  if (!requestId) {
    return res.status(400).json({ ok: false, error: "Missing request id." });
  }

  const cookies = parseCookies(req.headers.cookie || "");
  const playerId = cookies.playerId || null;

  if (!playerId) {
    return res.status(401).json({ ok: false, error: "Not logged in." });
  }

  const { action } = req.body || {};
  if (!action || !["approve", "reject"].includes(action)) {
    return res.status(400).json({
      ok: false,
      error: "Invalid action. Use 'approve' or 'reject'.",
    });
  }

  await connectToDatabase();

  // Load the request
  const joinRequest = await TeamJoinRequest.findById(requestId);
  if (!joinRequest) {
    return res.status(404).json({ ok: false, error: "Request not found." });
  }

  if (joinRequest.status !== "pending") {
    return res.status(400).json({
      ok: false,
      error: "This request is no longer pending.",
    });
  }

  // Load the team for this request
  const team = await Team.findById(joinRequest.teamId);
  if (!team) {
    return res.status(404).json({ ok: false, error: "Team not found." });
  }

  // Only captain of this team can approve/reject
  const isCaptain = String(team.captain) === String(playerId);
  if (!isCaptain) {
    return res.status(403).json({
      ok: false,
      error: "Only the team captain can manage join requests.",
    });
  }

  if (action === "reject") {
    joinRequest.status = "rejected";
    await joinRequest.save();

    return res.status(200).json({
      ok: true,
      requestId: joinRequest._id.toString(),
      status: "rejected",
    });
  }

  // Approve
  const targetPlayerId = String(joinRequest.playerId);

  // Check if already on team
  const alreadyCaptain = String(team.captain) === targetPlayerId;
  const alreadyMember = (team.members || []).some(
    (m) => String(m) === targetPlayerId
  );
  if (alreadyCaptain || alreadyMember) {
    joinRequest.status = "approved";
    await joinRequest.save();
    return res.status(200).json({
      ok: true,
      requestId: joinRequest._id.toString(),
      status: "approved",
      alreadyMember: true,
    });
  }

  // Capacity check
  const memberCount = (team.members || []).length;
  const maxSize = team.maxSize || 7;
  if (memberCount >= maxSize) {
    return res.status(400).json({
      ok: false,
      error: "This team is full.",
    });
  }

  // Add player to members and approve request
  team.members = team.members || [];
  team.members.push(joinRequest.playerId);
  await team.save();

  joinRequest.status = "approved";
  await joinRequest.save();

  return res.status(200).json({
    ok: true,
    requestId: joinRequest._id.toString(),
    status: "approved",
    teamId: team._id.toString(),
    playerId: targetPlayerId,
  });
}
