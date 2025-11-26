// pages/api/admin/tournaments/details.js
import { getCurrentPlayerFromReq } from "../../../../lib/getCurrentPlayer";
import { connectToDatabase } from "../../../../lib/mongodb";
import Tournament from "../../../../models/Tournament";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    await connectToDatabase();

    // Admin check
    const player = await getCurrentPlayerFromReq(req);
    if (!player || !player.isAdmin) {
      return res
        .status(403)
        .json({ ok: false, error: "Admin access required." });
    }

    const {
      tournamentId,
      displayDescription,
      displayPrize,
      displayEntry,
      displayHost,
    } = req.body || {};

    if (!tournamentId || typeof tournamentId !== "string") {
      return res
        .status(400)
        .json({ ok: false, error: "tournamentId is required." });
    }

    // Write into Tournament.meta using findOneAndUpdate
    const update = {
      $set: {
        "meta.displayDescription": (displayDescription || "").trim(),
        "meta.displayPrize": (displayPrize || "").trim(),
        "meta.displayEntry": (displayEntry || "").trim(),
        "meta.displayHost": (displayHost || "").trim(),
      },
    };

    const doc = await Tournament.findOneAndUpdate(
      { tournamentId },
      update,
      { new: true }
    ).lean();

    if (!doc) {
      return res
        .status(404)
        .json({ ok: false, error: "Tournament not found." });
    }

    const meta = doc.meta || {};

    return res.json({
      ok: true,
      meta: {
        displayDescription: meta.displayDescription || "",
        displayPrize: meta.displayPrize || "",
        displayEntry: meta.displayEntry || "",
        displayHost: meta.displayHost || "",
      },
    });
  } catch (err) {
    console.error("[details] error:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Internal server error." });
  }
}
