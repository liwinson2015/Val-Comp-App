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

    if (!tournamentId) {
      return res
        .status(400)
        .json({ ok: false, error: "tournamentId is required." });
    }

    const t = await Tournament.findOne({ tournamentId });
    if (!t) {
      return res
        .status(404)
        .json({ ok: false, error: "Tournament not found." });
    }

    // Ensure meta object exists
    t.meta = t.meta || {};

    // Update fields (trim on the client, but safe to do again)
    if (typeof displayDescription === "string") {
      t.meta.displayDescription = displayDescription.trim();
    }
    if (typeof displayPrize === "string") {
      t.meta.displayPrize = displayPrize.trim();
    }
    if (typeof displayEntry === "string") {
      t.meta.displayEntry = displayEntry.trim();
    }
    if (typeof displayHost === "string") {
      t.meta.displayHost = displayHost.trim();
    }

    await t.save();

    return res.json({
      ok: true,
      meta: {
        displayDescription: t.meta.displayDescription || "",
        displayPrize: t.meta.displayPrize || "",
        displayEntry: t.meta.displayEntry || "",
        displayHost: t.meta.displayHost || "",
      },
    });
  } catch (err) {
    console.error("[details] error:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Internal server error." });
  }
}
