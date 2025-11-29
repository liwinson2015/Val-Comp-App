// pages/api/admin/brackets/[tournamentId]/generate.js
import { getCurrentPlayerFromReq } from "../../../../../lib/getCurrentPlayer";
import { connectToDatabase } from "../../../../../lib/mongodb";
import Player from "../../../../../models/Player";
import Tournament from "../../../../../models/Tournament";
import TeamTournamentRegistration from "../../../../../models/TeamTournamentRegistration"; // ⭐ CORRECT IMPORT

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

  // ---- LOAD TOURNAMENT ----
  const t = await Tournament.findOne({ tournamentId }).lean();
  if (!t) {
    return res.status(404).json({ error: "Tournament not found." });
  }

  // 1. ROBUST TEAM DETECTION (Matches your Frontend logic)
  const isTeamTournament =
    /-5V5-/i.test(tournamentId) ||
    t.mode === "5v5" ||
    t.modeKey === "5v5" ||
    t.type === "team" ||
    t.format === "team" ||
    t.meta?.isTeamTournament === true;

  let entrants = [];

  if (isTeamTournament) {
    // ========= TEAM TOURNAMENT =========
    // 1. Fetch Registrations (NOT Teams directly, to ensure we get registered teams)
    const registrations = await TeamTournamentRegistration.find({
      tournamentId,
      status: { $ne: "cancelled" },
    }).lean();

    // 2. Map to Entrants
    entrants = registrations.map((reg) => ({
      // ⭐ MATCHING ID: We use reg.team which is the Team ID
      id: reg.team.toString(), 
      name: reg.teamName || reg.teamTag || "Unnamed Team",
    }));

  } else {
    // ========= SOLO TOURNAMENT =========
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
      .json({ 
        error: `No ${isTeamTournament ? "teams" : "players"} found to generate a bracket.` 
      });
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

  // Return the matches (Admin UI will save them)
  return res.status(200).json({ matches, ok: true });
}