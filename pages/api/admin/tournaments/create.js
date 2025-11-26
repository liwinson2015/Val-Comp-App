// pages/api/admin/tournaments/create.js

import { getCurrentPlayerFromReq } from "../../../../lib/getCurrentPlayer";
import { connectToDatabase } from "../../../../lib/mongodb";
import Tournament from "../../../../models/Tournament";
import TournamentState from "../../../../models/TournamentState";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // 1) Auth + admin check
    const player = await getCurrentPlayerFromReq(req);
    if (!player) {
      return res.status(401).json({ ok: false, error: "Not logged in" });
    }

    if (!player.isAdmin) {
      return res
        .status(403)
        .json({ ok: false, error: "Admin access required" });
    }

    await connectToDatabase();

    // 2) Read basic fields from body
    const {
      tournamentId,
      name,
      game,
      capacity,
      // homepage / display-ish fields
      displayName,
      displayDescription,
      displayTime,
      displayGameLabel,
      displayModeLabel,
      displayPrize,
      displayEntry,
      displayHost,
    } = req.body || {};

    // 3) Minimal validation
    if (!tournamentId || typeof tournamentId !== "string") {
      return res
        .status(400)
        .json({ ok: false, error: "tournamentId (string) is required" });
    }

    const trimmedId = tournamentId.trim();
    if (!trimmedId) {
      return res
        .status(400)
        .json({ ok: false, error: "tournamentId cannot be empty" });
    }

    // Check for duplicates in Tournament collection
    const existing = await Tournament.findOne({ tournamentId: trimmedId });
    if (existing) {
      return res.status(409).json({
        ok: false,
        error: `Tournament with ID "${trimmedId}" already exists`,
      });
    }

    // 4) Build the Tournament document
    const capacityValue =
      typeof capacity === "number" && capacity > 0 ? capacity : 16;

    const fallbackPrize =
      displayPrize ||
      "Skin / Gift Card (set in admin)";
    const fallbackEntry = displayEntry || "Free";
    const fallbackHost = displayHost || "5TQ";

    const tDoc = {
      tournamentId: trimmedId,
      name: name || displayName || trimmedId,
      game: game || "valorant",
      capacity: capacityValue,
      status: "upcoming",

      host: fallbackHost, // optional top-level host

      meta: {
        displayName: displayName || name || "",
        displayDescription:
          displayDescription ||
          "Solo skirmish duels hosted by 5TQ. Claim your slot and climb the bracket.",
        displayTime: displayTime || "",
        displayGameLabel: displayGameLabel || "VALORANT 1v1",
        displayModeLabel: displayModeLabel || "1v1 • Double Elimination",
        displayPrize: fallbackPrize,
        displayEntry: fallbackEntry,
        displayHost: fallbackHost,
      },
    };

    const createdTournament = await Tournament.create(tDoc);

    // 5) Create / upsert matching TournamentState
    const stateUpdate = {
      tournamentId: trimmedId,
      status: "upcoming",
      isEnded: false,
      endedAt: null,
      endNotes: "",

      displayName:
        displayName || name || createdTournament.name || trimmedId,
      displayDescription:
        displayDescription ||
        "Solo skirmish duels hosted by 5TQ. Claim your slot and climb the bracket.",
      displayHost: fallbackHost,
      displayTime: displayTime || "",
      displayGameLabel: displayGameLabel || "VALORANT • 1v1",
      displayModeLabel: displayModeLabel || "1v1 • Double Elimination",

      ctaPath: `/tournaments/${trimmedId}`,
    };

    const stateDoc = await TournamentState.findOneAndUpdate(
      { tournamentId: trimmedId },
      { $set: stateUpdate },
      { upsert: true, new: true }
    ).lean();

    // 6) Respond
    return res.status(200).json({
      ok: true,
      tournament: {
        ...createdTournament.toObject(),
        _id: createdTournament._id.toString(),
      },
      state: stateDoc
        ? {
            ...stateDoc,
            _id: stateDoc._id.toString(),
          }
        : null,
    });
  } catch (err) {
    console.error("Error creating tournament:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
