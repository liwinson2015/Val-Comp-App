// pages/api/registration/team-respond.js
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";
import TeamTournamentRegistration from "../../../models/TeamTournamentRegistration";

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const cookies = parseCookies(req.headers.cookie || "");
    const playerId = cookies.playerId || null;

    if (!playerId) {
      return res
        .status(401)
        .json({ ok: false, error: "Not logged in. Please re-login." });
    }

    const { teamRegistrationId, action } = req.body || {};

    if (!teamRegistrationId || !["accept", "decline"].includes(action)) {
      return res.status(400).json({
        ok: false,
        error: "Missing teamRegistrationId or invalid action.",
      });
    }

    await connectToDatabase();

    const player = await Player.findById(playerId);
    if (!player) {
      return res
        .status(401)
        .json({ ok: false, error: "Player not found. Please re-login." });
    }

    const regDoc = await TeamTournamentRegistration.findById(
      teamRegistrationId
    );
    if (!regDoc) {
      return res
        .status(404)
        .json({ ok: false, error: "Team registration not found." });
    }

    // If already cancelled, no more changes
    if (regDoc.status === "cancelled") {
      return res.status(409).json({
        ok: false,
        error: "This team registration has been cancelled.",
      });
    }

    const playerIdStr = player._id.toString();
    const member = regDoc.members.find(
      (m) => m.player && m.player.toString() === playerIdStr
    );

    if (!member) {
      return res.status(403).json({
        ok: false,
        error: "You are not part of this team registration.",
      });
    }

    // If they already accepted/declined, you can just return current state
    if (member.status === "accepted" && action === "accept") {
      return res.status(200).json({
        ok: true,
        status: regDoc.status,
        memberStatus: member.status,
      });
    }
    if (member.status === "declined" && action === "decline") {
      return res.status(200).json({
        ok: true,
        status: regDoc.status,
        memberStatus: member.status,
      });
    }

    const now = new Date();

    if (action === "accept") {
      member.status = "accepted";
      member.respondedAt = now;

      // If everyone accepted → registration becomes active
      const allAccepted = regDoc.members.every(
        (m) => m.status === "accepted"
      );
      if (allAccepted) {
        regDoc.status = "active";
      }
    } else if (action === "decline") {
      member.status = "declined";
      member.respondedAt = now;
      regDoc.status = "cancelled";
    }

    await regDoc.save();

    return res.status(200).json({
      ok: true,
      status: regDoc.status,
      memberStatus: member.status,
    });
  } catch (err) {
    console.error("[registration/team-respond] error:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error handling team response.",
    });
  }
}
