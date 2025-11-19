// pages/api/profile/game-profiles.js
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";

function parseCookies(header = "") {
  return Object.fromEntries(
    (header || "")
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const [k, ...rest] = c.split("=");
        return [k, decodeURIComponent(rest.join("=") || "")];
      })
  );
}

// Only allow the games we actually support on the profile page
const ALLOWED_GAMES = ["VALORANT", "HOK", "TFT"];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { game, profile } = req.body || {};

  if (!game || !ALLOWED_GAMES.includes(game)) {
    return res
      .status(400)
      .json({ ok: false, error: "Invalid or missing game code." });
  }

  // Get current player from cookie (same pattern as /profile)
  const cookies = parseCookies(req.headers.cookie || "");
  const playerId = cookies.playerId || null;

  if (!playerId) {
    return res
      .status(401)
      .json({ ok: false, error: "Not logged in. Please re-login." });
  }

  await connectToDatabase();
  const player = await Player.findById(playerId);

  if (!player) {
    return res
      .status(401)
      .json({ ok: false, error: "Player not found. Please re-login." });
  }

  // Make sure gameProfiles exists
  if (!player.gameProfiles) {
    player.gameProfiles = {};
  }

  const existing = player.gameProfiles[game] || {};
  const safe = profile || {};

  // Base fields: used by all games
  const updated = {
    ign: (safe.ign || "").trim(),
    rankTier: (safe.rankTier || "").trim(),
    rankDivision: (safe.rankDivision || "").trim(),
    region: (safe.region || "").trim(),
    // we'll add game-specific stuff below
  };

  // ---- Honor of Kings extras ----
  if (game === "HOK") {
    let stars = safe.hokStars;
    let peak = safe.hokPeakScore;

    // normalise stars (can be null/empty)
    if (stars === "" || stars === null || typeof stars === "undefined") {
      stars = null;
    } else {
      const n = Number(stars);
      stars = Number.isNaN(n) ? null : n;
    }

    // normalise peak (1200–3000 or null)
    if (peak === "" || peak === null || typeof peak === "undefined") {
      peak = null;
    } else {
      const n = Number(peak);
      peak = Number.isNaN(n) ? null : Math.max(1200, Math.min(3000, n));
    }

    updated.hokStars = stars;
    updated.hokPeakScore = peak;
  } else {
    // keep old values for other games so we don't accidentally wipe them
    updated.hokStars =
      typeof existing.hokStars === "number" ? existing.hokStars : null;
    updated.hokPeakScore =
      typeof existing.hokPeakScore === "number" ? existing.hokPeakScore : null;
  }

  // ---- TFT Double Up extras ----
  if (game === "TFT") {
    const doubleTier = (safe.tftDoubleTier || "").trim();
    let doubleDiv = (safe.tftDoubleDivision || "").trim();

    const highTiers = ["Master", "Grandmaster", "Challenger"];
    if (highTiers.includes(doubleTier)) {
      // high tiers don't have divisions
      doubleDiv = "";
    }

    updated.tftDoubleTier = doubleTier;
    updated.tftDoubleDivision = doubleDiv;
  } else {
    // preserve any existing TFT fields on non-TFT profiles
    updated.tftDoubleTier = existing.tftDoubleTier || "";
    updated.tftDoubleDivision = existing.tftDoubleDivision || "";
  }

  // lastUpdated timestamp for this game profile
  updated.lastUpdated = new Date();

  // Merge with whatever was already there so we don’t drop unknown / future fields
  player.gameProfiles[game] = {
    ...existing.toObject?.() /* if it's a Mongoose subdoc */ || existing,
    ...updated,
  };

  await player.save();

  return res.status(200).json({
    ok: true,
    profile: player.gameProfiles[game],
  });
}
