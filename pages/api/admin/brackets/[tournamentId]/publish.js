// pages/api/admin/brackets/[tournamentId]/publish.js
import { getCurrentPlayerFromReq } from "../../../../../lib/getCurrentPlayer";
import { connectToDatabase } from "../../../../../lib/mongodb";
import Tournament from "../../../../../models/Tournament";

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
  const state = req.query.state === "publish" ? "publish" : "unpublish";

  let t = await Tournament.findOne({ tournamentId });

  if (!t) {
    // If no tournament doc yet, create an empty one just to set publish flag
    t = new Tournament({
      tournamentId,
      bracket: {
        rounds: [],
        isPublished: state === "publish",
      },
    });
  } else {
    const existing = t.bracket || { rounds: [] };
    t.bracket = {
      ...existing,
      isPublished: state === "publish",
    };
  }

  await t.save();

  // Redirect back to admin page
  return res.redirect(`/admin/brackets/${encodeURIComponent(tournamentId)}`);
}
