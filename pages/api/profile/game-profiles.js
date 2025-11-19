// pages/api/profile/game-profiles.js
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";

const ALLOWED_GAMES = ["VALORANT", "HOK", "TFT"];

function parseCookies(header = "") {
  return Object.fromEntries(
    (header || "")
      .split(";")
      .map((v) => v.trim())
      .filter(Boolean)
      .map((kv) => {
        const i = kv.indexOf("=");
        const k = i >= 0 ? kv.slice(0, i) : kv;
        const v = i >= 0 ? kv.slice(i + 1) : "";
        try {
          return [k, decodeURIComponent(v)];
        } catch {
          return [k, v];
        }
      })
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const cookies = parseCookies(req.headers.cookie || "");
  const playerId = cookies.playerId || null;

  if (!playerId) {
    return res
      .status(401)
      .json({ ok: false, error: "Not logged in (no playerId cookie)" });
  }

  const { game, profile } = req.body || {};

  if (!game || typeof game !== "string") {
    return res.status(400).json({ ok: false, error: "Missing game code" });
  }

  const gameKey = game.toUpperCase();
  if (!ALLOWED_GAMES.includes(gameKey)) {
    return res
      .status(400)
      .json({ ok: false, error: "Unsupported game for profiles" });
  }

  await connectToDatabase();

  const player = await Player.findById(playerId);
  if (!player) {
    return res
      .status(401)
      .json({ ok: false, error: "Player not found or not logged in" });
  }

  if (!player.gameProfiles) {
    player.gameProfiles = {};
  }

  const incoming = profile || {};

  // Basic string trimming
  const cleanString = (v) =>
    typeof v === "string" ? v.trim() : v === null ? "" : "";

  const cleanProfile = {
    ign: cleanString(incoming.ign),
    rankTier: cleanString(incoming.rankTier),
    rankDivision: cleanString(incoming.rankDivision),
    region: cleanString(incoming.region),

    // HoK extras
    hokStars:
      incoming.hokStars === null || incoming.hokStars === ""
        ? undefined
        : Number.isFinite(Number(incoming.hokStars)) &&
          Number(incoming.hokStars) >= 0
        ? Number(incoming.hokStars)
        : undefined,

    hokPeakScore:
      incoming.hokPeakScore === null || incoming.hokPeakScore === ""
        ? undefined
        : Number.isFinite(Number(incoming.hokPeakScore)) &&
          Number(incoming.hokPeakScore) >= 1200 &&
          Number(incoming.hokPeakScore) <= 3000
        ? Number(incoming.hokPeakScore)
        : undefined,

    // TFT Double Up extras
    tftDoubleTier: cleanString(incoming.tftDoubleTier),
    tftDoubleDivision: cleanString(incoming.tftDoubleDivision),

    lastUpdated: new Date(),
  };

  // Merge with any existing profile for that game so we don't blow away fields
  const existing =
    (player.gameProfiles[gameKey] &&
      player.gameProfiles[gameKey].toObject &&
      player.gameProfiles[gameKey].toObject()) ||
    player.gameProfiles[gameKey] ||
    {};

  const updatedProfile = {
    ...existing,
    ...cleanProfile,
  };

  // For certain tiers, we don't keep division (handled already in UI, but just in case)
  if (gameKey === "VALORANT") {
    if (
      updatedProfile.rankTier === "Immortal" ||
      updatedProfile.rankTier === "Radiant"
    ) {
      updatedProfile.rankDivision = "";
    }
  }

  if (gameKey === "TFT") {
    const highTiers = ["Master", "Grandmaster", "Challenger"];
    if (highTiers.includes(updatedProfile.rankTier)) {
      updatedProfile.rankDivision = "";
    }
    if (highTiers.includes(updatedProfile.tftDoubleTier)) {
      updatedProfile.tftDoubleDivision = "";
    }
  }

  if (gameKey === "HOK") {
    // Grandmaster uses stars instead of division
    if (updatedProfile.rankTier === "Grandmaster") {
      updatedProfile.rankDivision = "";
    }
  }

  player.gameProfiles.set
    ? player.gameProfiles.set(gameKey, updatedProfile)
    : (player.gameProfiles[gameKey] = updatedProfile);

  await player.save();

  return res.status(200).json({
    ok: true,
    profile: {
      ign: updatedProfile.ign || "",
      rankTier: updatedProfile.rankTier || "",
      rankDivision: updatedProfile.rankDivision || "",
      region: updatedProfile.region || "",
      hokStars:
        typeof updatedProfile.hokStars === "number"
          ? updatedProfile.hokStars
          : null,
      hokPeakScore:
        typeof updatedProfile.hokPeakScore === "number"
          ? updatedProfile.hokPeakScore
          : null,
      tftDoubleTier: updatedProfile.tftDoubleTier || "",
      tftDoubleDivision: updatedProfile.tftDoubleDivision || "",
    },
  });
}
