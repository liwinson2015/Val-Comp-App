// pages/api/tournaments/metadata.js
import { connectToDatabase } from "../../../lib/mongodb";
import { getCurrentPlayerFromReq } from "../../../lib/getCurrentPlayer";
import TournamentState from "../../../models/TournamentState";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  await connectToDatabase();

  const player = await getCurrentPlayerFromReq(req);
  if (!player || !player.isAdmin) {
    return res.status(403).json({ ok: false, error: "Admin only" });
  }

  const {
    tournamentId,
    displayName,
    displayDescription,
    displayTime,
    displayGameLabel,
    displayModeLabel,
    ctaPath,
  } = req.body || {};

  if (!tournamentId) {
    return res.status(400).json({ ok: false, error: "Missing tournamentId" });
  }

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
    console.error("Error saving featured metadata:", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to save featured metadata",
    });
  }
}
