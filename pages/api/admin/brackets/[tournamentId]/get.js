import { getCurrentPlayerFromReq } from "../../../../../lib/getCurrentPlayer";
import { connectToDatabase } from "../../../../../lib/mongodb";
import Tournament from "../../../../../models/Tournament";

export default async function handler(req, res) {
  const player = await getCurrentPlayerFromReq(req);

  if (!player || !player.isAdmin) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  await connectToDatabase();

  const id = decodeURIComponent(req.query.tournamentId);
  const t = await Tournament.findOne({ tournamentId: id }).lean();

  return res.status(200).json({
    bracket: t?.bracket || null,
  });
}
