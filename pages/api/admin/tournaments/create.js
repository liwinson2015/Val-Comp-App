// pages/api/admin/tournaments/create.js

import { getCurrentPlayerFromReq } from "../../../../lib/getCurrentPlayer";
import { connectToDatabase } from "../../../../lib/mongodb";
import Tournament from "../../../../models/Tournament";
import TournamentState from "../../../../models/TournamentState";

function normalizeGame(game) {
  if (!game || typeof game !== "string") return "valorant";
  const g = game.toLowerCase();
  if (g === "tft" || g === "teamfight tactics") return "tft";
  if (g === "valorant" || g === "val") return "valorant";
  return g;
}

function defaultModeForGame(game) {
  if (game === "tft") return "solo";    // TFT default = solo queue
  return "1v1";                         // Valorant default = 1v1
}

function normalizeMode(mode, game) {
  if (!mode || typeof mode !== "string") {
    return defaultModeForGame(game);
  }
  const m = mode.toLowerCase();
  // Valorant modes
  if (m === "1v1" || m === "solo") return "1v1";
  if (m === "2v2" || m === "duo") return "2v2";
  if (m === "5v5" || m === "team") return "5v5";
  // TFT modes
  if (m === "doubleup" || m === "double up" || m === "2v2") return "doubleup";
  if (m === "solo" || m === "ffa") return "solo";
  return m;
}

function normalizeBracketStyle(bracketStyle, game) {
  if (typeof bracketStyle !== "string") {
    // default by game
    if (game === "tft") return "lobby";     // TFT uses lobby/points-style
    return "double";                        // Valorant default: double elim
  }
  const b = bracketStyle.toLowerCase();
  if (b === "single" || b === "single_elim") return "single";
  if (b === "double" || b === "double_elim") return "double";
  if (b === "lobby" || b === "ffa") return "lobby";
  // Fallback by game again
  if (game === "tft") return "lobby";
  return "double";
}

function getDefaultGameLabel(game, mode) {
  if (game === "valorant") {
    if (mode === "1v1") return "VALORANT • 1v1";
    if (mode === "2v2") return "VALORANT • 2v2";
    if (mode === "5v5") return "VALORANT • 5v5";
    return "VALORANT";
  }
  if (game === "tft") {
    if (mode === "solo") return "TFT • SOLO";
    if (mode === "doubleup") return "TFT • DOUBLE UP";
    return "TEAMFIGHT TACTICS";
  }
  return "TOURNAMENT";
}

function getDefaultModeLabel(game, mode, bracketStyle) {
  if (game === "valorant") {
    if (mode === "1v1") return "1v1 • Double Elimination";
    if (mode === "2v2") return "2v2 • Double Elimination";
    if (mode === "5v5") {
      return bracketStyle === "double"
        ? "5v5 • Double Elimination"
        : "5v5 • Single Elimination";
    }
    return "Valorant Bracket";
  }

  if (game === "tft") {
    if (mode === "solo") return "Solo • FFA Lobbies";
    if (mode === "doubleup") return "Double Up • Duo Lobbies";
    return "TFT Lobbies";
  }

  return "Tournament Format";
}

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
      mode,
      bracketStyle,
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

    // ---- NEW: normalize game / mode / bracketStyle ----
    const normalizedGame = normalizeGame(game);
    const normalizedMode = normalizeMode(mode, normalizedGame);
    const normalizedBracketStyle = normalizeBracketStyle(
      bracketStyle,
      normalizedGame
    );

    // 4) Build the Tournament document
    const capacityValue =
      typeof capacity === "number" && capacity > 0 ? capacity : 16;

    const fallbackPrize =
      displayPrize || "Skin / Gift Card (set in admin)";
    const fallbackEntry = displayEntry || "Free";
    const fallbackHost = displayHost || "5TQ";

    const fallbackGameLabel =
      displayGameLabel || getDefaultGameLabel(normalizedGame, normalizedMode);

    const fallbackModeLabel =
      displayModeLabel ||
      getDefaultModeLabel(
        normalizedGame,
        normalizedMode,
        normalizedBracketStyle
      );

    const tDoc = {
      tournamentId: trimmedId,
      name: name || displayName || trimmedId,

      // 🔹 structured routing fields
      game: normalizedGame,          // "valorant" | "tft"
      mode: normalizedMode,          // "1v1" | "2v2" | "5v5" | "solo" | "doubleup"
      bracketStyle: normalizedBracketStyle, // "single" | "double" | "lobby"

      capacity: capacityValue,

      // 🔹 status is now only "ongoing" or "completed". New tournaments start as "ongoing"
      status: "ongoing",

      host: fallbackHost, // optional top-level host

      meta: {
        displayName: displayName || name || "",
        displayDescription:
          displayDescription ||
          "Solo skirmish duels hosted by 5TQ. Claim your slot and climb the bracket.",
        displayTime: displayTime || "",
        displayGameLabel: fallbackGameLabel,
        displayModeLabel: fallbackModeLabel,
        displayPrize: fallbackPrize,
        displayEntry: fallbackEntry,
        displayHost: fallbackHost,
      },
    };

    const createdTournament = await Tournament.create(tDoc);

    // 5) Create / upsert matching TournamentState
    const stateUpdate = {
      tournamentId: trimmedId,

      // 🔹 match the new enum: "ongoing" | "completed"
      status: "ongoing",
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

      // use same labeling logic as tournament.meta
      displayGameLabel: fallbackGameLabel,
      displayModeLabel: fallbackModeLabel,

      // Button sends players straight to the dynamic tournament page
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
