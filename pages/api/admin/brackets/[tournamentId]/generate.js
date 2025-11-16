// pages/api/admin/brackets/[tournamentId]/generate.js
import { getCurrentPlayerFromReq } from "../../../../../lib/getCurrentPlayer";
import { connectToDatabase } from "../../../../../lib/mongodb";
import Player from "../../../../../models/Player";
import Tournament from "../../../../../models/Tournament";

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check admin
  const player = await getCurrentPlayerFromReq(req);

  if (!player || !player.isAdmin) {
    return res.status(403).json({ error: "Not authorized" });
  }

  await connectToDatabase();

  const rawId = req.query.tournamentId;
  const tournamentId = decodeURIComponent(rawId);

  // 1️⃣ Get all players registered for this tournament
  const players = await Player.find({
    "registeredFor.tournamentId": tournamentId,
  }).lean();

  if (players.length < 2) {
    return res
      .status(400)
      .json({ error: "Not enough players to generate a bracket." });
  }

  // Extract minimal info for bracket
  let playerList = players.map((p) => ({
    id: p._id.toString(),
    username: p.username || "",
  }));

  // 2️⃣ Shuffle players
  playerList = playerList.sort(() => Math.random() - 0.5);

  // 3️⃣ Pair into matches (2 per match; odd player = bye)
  const matches = [];
  for (let i = 0; i < playerList.length; i += 2) {
    const p1 = playerList[i];
    const p2 = playerList[i + 1] || null; // if odd, second is null (bye)

    matches.push({
      player1Id: p1?.id || null,
      player2Id: p2?.id || null,
      winnerId: null, // to be filled later when you pick winners
    });
  }

  // 4️⃣ Save to Tournament collection (upsert)
  const bracketData = {
    rounds: [
      {
        roundNumber: 1,
        matches,
      },
    ],
    isPublished: false, // you can flip this later
  };

  await Tournament.findOneAndUpdate(
    { tournamentId },
    {
      tournamentId,
      bracket: bracketData,
    },
    { upsert: true }
  );

  // 5️⃣ Go back to the same admin page for this tournament
  return res.redirect(`/admin/brackets/${encodeURIComponent(tournamentId)}`);
}
