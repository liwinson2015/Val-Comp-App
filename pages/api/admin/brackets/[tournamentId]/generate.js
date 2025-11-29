// pages/api/admin/brackets/[tournamentId]/generate.js
import { getCurrentPlayerFromReq } from "../../../../../lib/getCurrentPlayer";
import { connectToDatabase } from "../../../../../lib/mongodb";
import Player from "../../../../../models/Player";
import Tournament from "../../../../../models/Tournament";
import TeamTournamentRegistration from "../../../../../models/TeamTournamentRegistration";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ---- ADMIN CHECK ----
  const admin = await getCurrentPlayerFromReq(req);
  if (!admin || !admin.isAdmin) {
    return res.status(403).json({ error: "Not authorized" });
  }

  await connectToDatabase();

  const rawId = req.query.tournamentId;
  const tournamentId = decodeURIComponent(rawId || "");

  // ---- LOAD TOURNAMENT (to know if team vs solo) ----
  const t = await Tournament.findOne({ tournamentId }).lean();
  if (!t) {
    return res.status(404).json({ error: "Tournament not found." });
  }

  const game = t.game || "";
  const mode = t.mode || "";
  const isTeamTournament =
    (game === "valorant" || game === "hok") && mode === "5v5";

  let entrants = [];

  if (isTeamTournament) {
    // ========= TEAM TOURNAMENT (each entrant is a team) =========
    const teamRegs = await TeamTournamentRegistration.find({
      tournamentId,
      status: { $ne: "cancelled" }, // active / pending etc.
    }).lean();

    entrants = (teamRegs || []).map((r) => ({
      id: r._id.toString(),
      name: r.teamName || "Unnamed team",
    }));
  } else {
    // ========= SOLO TOURNAMENT (each entrant is a player) =========
    const players = await Player.find({
      "registeredFor.tournamentId": tournamentId,
    }).lean();

    entrants = (players || []).map((p) => ({
      id: p._id.toString(),
      name: p.username || "",
    }));
  }

  // Need at least ONE entrant to make sense
  if (entrants.length < 1) {
    return res
      .status(400)
      .json({ error: "No entrants found to generate a bracket." });
  }

  // ---- SHUFFLE ENTRANTS ----
  let shuffled = [...entrants];
  shuffled = shuffled.sort(() => Math.random() - 0.5);

  // ---- PAIR INTO MATCHES ----
  const matches = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    const e1 = shuffled[i] || null;
    const e2 = shuffled[i + 1] || null; // odd → bye

    matches.push({
      player1Id: e1 ? e1.id : null,
      player2Id: e2 ? e2.id : null,
      winnerId: null,
    });
  }

  // NOTE: We Do NOT save here. The admin editor decides when to save.
  return res.status(200).json({ matches });
}
