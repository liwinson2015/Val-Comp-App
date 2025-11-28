// pages/api/registration/team-start.js
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";
import Team from "../../../models/Team";
import Tournament from "../../../models/Tournament";
import TeamTournamentRegistration from "../../../models/TeamTournamentRegistration";

// Helpers copied from the register page logic
function resolveGameCodeFromDoc(doc) {
  const meta = doc.meta || {};
  const raw = (
    doc.game ||
    meta.game ||
    meta.Game ||
    ""
  )
    .toString()
    .toLowerCase()
    .trim();

  if (raw === "valorant") return "VALORANT";
  if (raw === "hok" || raw === "honorofkings" || raw === "honor_of_kings")
    return "HOK";
  if (
    raw === "tft" ||
    raw === "teamfighttactics" ||
    raw === "teamfight_tactics"
  )
    return "TFT";

  return "VALORANT";
}

function isTeamMode(gameKey, modeKey) {
  const g = (gameKey || "").toLowerCase();
  const m = (modeKey || "").toLowerCase();

  if (g === "valorant" && (m === "2v2" || m === "5v5")) return true;
  if (g === "tft" && m === "doubleup") return true;
  if (g === "hok" && m === "5v5") return true;

  return false;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { playerId, teamId, tournamentId } = req.body || {};

    if (!playerId || !teamId || !tournamentId) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing playerId, teamId, or tournamentId" });
    }

    await connectToDatabase();

    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ ok: false, error: "Player not found" });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ ok: false, error: "Team not found" });
    }

    const tournament = await Tournament.findOne({ tournamentId }).lean();
    if (!tournament) {
      return res
        .status(404)
        .json({ ok: false, error: "Tournament not found" });
    }

    const gameCode = resolveGameCodeFromDoc(tournament); // "VALORANT" | "HOK" | "TFT"
    let gameKey = "valorant";
    if (gameCode === "TFT") gameKey = "tft";
    if (gameCode === "HOK") gameKey = "hok";

    const meta = tournament.meta || {};
    const modeKey = (
      tournament.mode ||
      meta.mode ||
      meta.Mode ||
      ""
    )
      .toString()
      .toLowerCase()
      .trim() || "1v1";

    if (!isTeamMode(gameKey, modeKey)) {
      return res.status(400).json({
        ok: false,
        error: "This tournament uses solo registration, not team registration.",
      });
    }

    const playerIdStr = player._id.toString();

    // --- Check membership ---
    let membersList = [];
    let isMember = false;

    if (Array.isArray(team.members)) {
      for (const m of team.members) {
        if (!m) continue;
        let pid = null;

        if (typeof m === "string") {
          pid = m;
        } else if (m._id) {
          pid = m._id.toString();
        } else if (m.player) {
          pid = m.player.toString();
        } else if (m.playerId) {
          pid = m.playerId.toString();
        }

        if (!pid) continue;
        membersList.push(pid);
        if (pid === playerIdStr) {
          isMember = true;
        }
      }
    }

    if (!isMember) {
      return res.status(403).json({
        ok: false,
        error: "You are not a member of this team.",
      });
    }

    // --- Determine captain ---
    let captainId = null;

    if (team.captain) {
      captainId = team.captain.toString();
    } else if (team.captainId) {
      captainId = team.captainId.toString();
    } else if (team.owner) {
      captainId = team.owner.toString();
    } else if (team.captainPlayer) {
      captainId = team.captainPlayer.toString();
    } else if (team.captainDiscordId && player.discordId) {
      // Fallback for Discord-based captain
      if (team.captainDiscordId === player.discordId) {
        captainId = playerIdStr;
      }
    }

    if (!captainId && membersList.length > 0) {
      // last fallback: treat first member as captain
      captainId = membersList[0];
    }

    const isCaptain = captainId === playerIdStr;

    if (!isCaptain) {
      return res.status(403).json({
        ok: false,
        error: "Only the team captain can register the team for a tournament.",
      });
    }

    // --- Check if this team is already registered for this tournament ---
    const existing = await TeamTournamentRegistration.findOne({
      tournamentId,
      team: team._id,
    });
    if (existing) {
      return res.status(409).json({
        ok: false,
        error: "This team is already registered (or pending) for this tournament.",
      });
    }

    // --- Build members array with statuses ---
    // Need Player docs for each memberId to get username + discordId
    const uniqueMemberIds = [...new Set(membersList)];
    const memberDocs = await Player.find({
      _id: { $in: uniqueMemberIds },
    });

    const memberMap = new Map(
      memberDocs.map((p) => [p._id.toString(), p])
    );

    const members = uniqueMemberIds.map((id) => {
      const p = memberMap.get(id);
      const isSelf = id === playerIdStr;
      return {
        player: p ? p._id : id,
        username: p ? p.username || p.discordTag || "" : "",
        discordId: p ? p.discordId || "" : "",
        status: isSelf ? "accepted" : "pending",
        respondedAt: isSelf ? new Date() : null,
      };
    });

    const regDoc = await TeamTournamentRegistration.create({
      tournamentId,
      team: team._id,
      teamName: team.name || team.teamName || "Unnamed team",
      gameCode,
      modeKey,
      captain: player._id,
      members,
    });

    return res.status(200).json({
      ok: true,
      teamRegistrationId: regDoc._id.toString(),
    });
  } catch (err) {
    console.error("[registration/team-start] error:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Server error starting team registration." });
  }
}
