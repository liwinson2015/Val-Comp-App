// pages/api/registration/team-start.js
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";
import Team from "../../../models/Team";
import Tournament from "../../../models/Tournament";
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

// helper to resolve gameCode from tournament doc
function resolveGameCodeFromTournament(doc) {
  if (!doc) return "VALORANT";

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

// determine required team size for this game+mode
function getExpectedTeamSize(gameCode, modeKey) {
  const g = (gameCode || "").toUpperCase();   // "VALORANT" | "HOK" | "TFT"
  const m = (modeKey || "").toLowerCase();    // "2v2", "5v5", "doubleup", etc.

  // Valorant 2v2 / 5v5
  if (g === "VALORANT" && m === "2v2") return 2;
  if (g === "VALORANT" && m === "5v5") return 5;

  // TFT Double Up (allow a couple of possible strings)
  if (
    g === "TFT" &&
    (m === "doubleup" || m === "double_up" || m === "double" || m === "duo")
  ) {
    return 2;
  }

  // Honor of Kings 5v5
  if (g === "HOK" && m === "5v5") return 5;

  // Anything else: no strict check
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const cookies = parseCookies(req.headers.cookie || "");
    const cookiePlayerId = cookies.playerId || null;

    if (!cookiePlayerId) {
      return res
        .status(401)
        .json({ ok: false, error: "Not logged in. Please re-login." });
    }

    const { playerId, teamId, tournamentId } = req.body || {};

    if (!teamId || !tournamentId) {
      return res.status(400).json({
        ok: false,
        error: "Missing teamId or tournamentId.",
      });
    }

    await connectToDatabase();

    // Logged-in player
    const player = await Player.findById(cookiePlayerId);
    if (!player) {
      return res
        .status(401)
        .json({ ok: false, error: "Player not found. Please re-login." });
    }

    // Optional: make sure body.playerId matches cookie
    if (playerId && playerId !== cookiePlayerId) {
      return res.status(403).json({
        ok: false,
        error: "Player mismatch. Please refresh and try again.",
      });
    }

    // Team
    const team = await Team.findById(teamId);
    if (!team) {
      return res
        .status(404)
        .json({ ok: false, error: "Team not found." });
    }

    // captain check (we assume a captain / captainId field exists)
    const captainField =
      team.captain ||
      team.captainId ||
      (team.owner && team.owner.player) ||
      null;

    if (
      !captainField ||
      captainField.toString() !== player._id.toString()
    ) {
      return res.status(403).json({
        ok: false,
        error: "Only the team captain can register this team.",
      });
    }

    // Tournament
    const tournament = await Tournament.findOne({ tournamentId }).lean();
    if (!tournament) {
      return res.status(404).json({
        ok: false,
        error: "Tournament not found.",
      });
    }

    // Avoid duplicates for same team + tournament (if not cancelled)
    const existing = await TeamTournamentRegistration.findOne({
      tournamentId,
      team: team._id,
      status: { $ne: "cancelled" },
    });

    if (existing) {
      return res.status(409).json({
        ok: false,
        error: "This team is already registered for this tournament.",
      });
    }

    const now = new Date();
    const gameCode = resolveGameCodeFromTournament(tournament);

    const modeKey = (
      tournament.mode ||
      (tournament.meta &&
        (tournament.meta.mode || tournament.meta.Mode)) ||
      ""
    )
      .toString()
      .toLowerCase()
      .trim();

    // ------- Build member list from team.members -------
    const memberDocs = [];
    const rawMembers = team.members || [];
    const playerIdStr = player._id.toString();

    function pushMember(playerObjId, isCaptain = false) {
      if (!playerObjId) return;
      memberDocs.push({
        player: playerObjId,
        status: isCaptain ? "accepted" : "pending",
        invitedAt: now,
        respondedAt: isCaptain ? now : undefined,
      });
    }

    for (const m of rawMembers) {
      if (!m) continue;

      if (m.player) {
        pushMember(
          m.player,
          m.player.toString() === playerIdStr
        );
      } else if (m.playerId) {
        pushMember(
          m.playerId,
          m.playerId.toString() === playerIdStr
        );
      } else {
        // might be stored as a bare ObjectId
        pushMember(m, m.toString() === playerIdStr);
      }
    }

    // Ensure captain is in members even if team.members didn't include them
    const hasCaptainInMembers = memberDocs.some(
      (m) => m.player.toString() === playerIdStr
    );
    if (!hasCaptainInMembers) {
      pushMember(player._id, true);
    }

    // ------- Enforce team size based on game + mode -------
    // Unique players only (in case of accidental duplicates in team.members)
    const uniqueMemberIds = Array.from(
      new Set(memberDocs.map((m) => m.player.toString()))
    );
    const memberCount = uniqueMemberIds.length;

    const expectedTeamSize = getExpectedTeamSize(gameCode, modeKey);

    if (expectedTeamSize !== null && memberCount !== expectedTeamSize) {
      let formatLabel;
      if (expectedTeamSize === 2) formatLabel = "2v2";
      else if (expectedTeamSize === 5) formatLabel = "5v5";
      else formatLabel = `${expectedTeamSize}-player`;

      return res.status(400).json({
        ok: false,
        error: `This is a ${formatLabel} tournament, but your team currently has ${memberCount} member${
          memberCount === 1 ? "" : "s"
        }. Please update your team to have exactly ${expectedTeamSize} players before registering.`,
      });
    }

    if (memberCount === 0) {
      return res.status(400).json({
        ok: false,
        error: "This team has no members. Add players to the team before registering.",
      });
    }

    // Save registration with teamName + teamTag for brackets
    const regDoc = await TeamTournamentRegistration.create({
      tournamentId,
      tournamentRef: tournament._id,
      gameCode,
      modeKey,
      team: team._id,
      teamName: team.name || team.teamName || "Unnamed team",
      teamTag: team.tag || team.teamTag || "",
      captain: player._id,
      status:
        memberDocs.length > 0 &&
        memberDocs.every((m) => m.status === "accepted")
          ? "active"
          : "pending",
      members: memberDocs,
    });

    return res.status(200).json({
      ok: true,
      teamRegistrationId: regDoc._id.toString(),
      status: regDoc.status,
    });
  } catch (err) {
    console.error("[registration/team-start] error:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error starting team registration.",
    });
  }
}
