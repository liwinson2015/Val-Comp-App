// pages/api/admin/brackets/[tournamentId]/generate.js
import { getCurrentPlayerFromReq } from "../../../../../lib/getCurrentPlayer";
import { connectToDatabase } from "../../../../../lib/mongodb";
import Player from "../../../../../models/Player";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = await getCurrentPlayerFromReq(req);
  if (!admin || !admin.isAdmin) {
    return res.status(403).json({ error: "Not authorized" });
  }

  await connectToDatabase();

  const rawId = req.query.tournamentId;
  const tournamentId = decodeURIComponent(rawId);

  // Get all players registered for this tournament
  const players = await Player.find({
    "registeredFor.tournamentId": tournamentId,
  }).lean();

  if (players.length < 2) {
    return res
      .status(400)
      .json({ error: "Not enough players to generate a bracket." });
  }

  // Build list of minimal player info
  let playerList = players.map((p) => ({
    id: p._id.toString(),
    username: p.username || "",
  }));

  // Shuffle
  playerList = playerList.sort(() => Math.random() - 0.5);

  // Pair into matches
  const matches = [];
  for (let i = 0; i < playerList.length; i += 2) {
    const p1 = playerList[i];
    const p2 = playerList[i + 1] || null; // odd → bye

    matches.push({
      player1Id: p1?.id || null,
      player2Id: p2?.id || null,
      winnerId: null,
    });
  }

  // 🔥 IMPORTANT: do NOT save to DB here
  // Just return the suggested matches for the editor to use
  return res.status(200).json({ matches });
}
