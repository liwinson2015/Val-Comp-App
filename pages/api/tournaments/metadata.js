// pages/api/admin/featured-meta/[tournamentId].js
import { connectToDatabase } from "../../../../lib/mongodb";
import { getCurrentPlayerFromReq } from "../../../../lib/getCurrentPlayer";
import TournamentState from "../../../../models/TournamentState";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  await connectToDatabase();
  const player = await getCurrentPlayerFromReq(req);

  if (!player || !player.isAdmin) {
    return res.status(403).json({ ok: false, error: "Admin only" });
  }

  const { tournamentId } = req.query;
  const {
    displayName,
    displayDescription,
    displayTime,
    displayGameLabel,
    displayModeLabel,
    ctaPath,
  } = req.body || {};

  try {
    const doc = await TournamentState.findOneAndUpdate(
      { tournamentId },
      {
        $set: {
          displayName: displayName ?? "",
          displayDescription: displayDescription ?? "",
          displayTime: displayTime ?? "",
          displayGameLabel: displayGameLabel ?? "",
          displayModeLabel: displayModeLabel ?? "",
          ctaPath: ctaPath ?? "",
        },
      },
      { upsert: true, new: true }
    ).lean();

    return res.json({ ok: true, state: doc });
  } catch (err) {
    console.error("Error saving featured meta:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Failed to save featured metadata" });
  }
}
