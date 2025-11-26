// pages/api/tournaments/metadata.js
import { connectToDatabase } from "../../../lib/mongodb";
import { getCurrentPlayerFromReq } from "../../../lib/getCurrentPlayer";
import TournamentState from "../../../models/TournamentState";
import Tournament from "../../../models/Tournament";

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
    // ---------------------------------------------
    // 1) Update TournamentState (featured / hero data)
    // ---------------------------------------------
    const stateUpdate = {
      displayName: displayName ?? "",
      displayDescription: displayDescription ?? "",
      displayTime: displayTime ?? "",
      displayGameLabel: displayGameLabel ?? "",
      displayModeLabel: displayModeLabel ?? "",
      ctaPath: ctaPath ?? "",
    };

    const stateDoc = await TournamentState.findOneAndUpdate(
      { tournamentId },
      { $set: stateUpdate },
      { upsert: true, new: true }
    ).lean();

    // ---------------------------------------------
    // 2) Keep Tournament document in sync
    //    (used by 1v1 hub + /tournaments/[id])
    // ---------------------------------------------
    const metaSet = {};

    if (displayName !== undefined && displayName !== null) {
      metaSet.name = displayName; // internal name
      metaSet["meta.displayName"] = displayName;
    }
    if (displayDescription !== undefined && displayDescription !== null) {
      metaSet["meta.displayDescription"] = displayDescription;
    }
    if (displayTime !== undefined && displayTime !== null) {
      metaSet["meta.displayTime"] = displayTime;
    }
    if (displayGameLabel !== undefined && displayGameLabel !== null) {
      metaSet["meta.displayGameLabel"] = displayGameLabel;
    }
    if (displayModeLabel !== undefined && displayModeLabel !== null) {
      metaSet["meta.displayModeLabel"] = displayModeLabel;
    }
    if (ctaPath !== undefined && ctaPath !== null) {
      // on Tournament we store the details page url as meta.detailsUrl
      metaSet["meta.detailsUrl"] = ctaPath;
    }

    if (Object.keys(metaSet).length > 0) {
      await Tournament.updateOne(
        { tournamentId },
        { $set: metaSet }
      );
    }

    return res.json({ ok: true, state: stateDoc });
  } catch (err) {
    console.error("Error saving tournament metadata:", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to save tournament metadata",
    });
  }
}
