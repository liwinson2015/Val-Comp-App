// pages/api/profile/save-from-game-form.js
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  try {
    const cookies = parseCookies(req.headers.cookie || "");
    const cookiePlayerId = cookies.playerId || null;

    if (!cookiePlayerId) {
      return res
        .status(401)
        .json({ ok: false, error: "Not logged in. Please re-login." });
    }

    const {
      playerId,
      gameCode,
      ign,
      fullIgn,
      rank,
      rankTier,
      rankDivision,
      region,
      hokPeakScore,
    } = req.body || {};

    // Optional safety: body.playerId must match cookie
    if (playerId && playerId !== cookiePlayerId) {
      return res.status(403).json({
        ok: false,
        error: "Player mismatch. Please refresh and try again.",
      });
    }

    if (!gameCode) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing gameCode." });
    }

    await connectToDatabase();

    const player = await Player.findById(cookiePlayerId);
    if (!player) {
      return res
        .status(404)
        .json({ ok: false, error: "Player not found." });
    }

    const code = String(gameCode || "VALORANT").toUpperCase();

    const profiles = player.gameProfiles || {};
    const existing = profiles[code] || {};

    const nextProfile = {
      ...existing,
    };

    // For VALORANT / TFT we store "Name#Tag" in ign
    if (code === "VALORANT" || code === "TFT") {
      if (typeof fullIgn === "string" && fullIgn.trim()) {
        nextProfile.ign = fullIgn.trim();
      } else if (typeof ign === "string" && ign.trim()) {
        nextProfile.ign = ign.trim();
      }
    } else {
      // HOK and others store plain IGN
      if (typeof ign === "string" && ign.trim()) {
        nextProfile.ign = ign.trim();
      }
    }

    if (typeof rank === "string" && rank.trim()) {
      nextProfile.rank = rank.trim();
    }
    if (typeof rankTier === "string" && rankTier.trim()) {
      nextProfile.rankTier = rankTier.trim();
    }
    if (typeof rankDivision === "string" && rankDivision.trim()) {
      nextProfile.rankDivision = rankDivision.trim();
    }

    if (typeof region === "string" && region.trim()) {
      nextProfile.region = region.trim();
    }

    if (hokPeakScore !== undefined && hokPeakScore !== null) {
      const num = Number(hokPeakScore);
      if (!Number.isNaN(num)) {
        nextProfile.hokPeakScore = num;
      }
    }

    profiles[code] = nextProfile;
    player.gameProfiles = profiles;
    await player.save();

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[profile/save-from-game-form] error:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error while saving game profile.",
    });
  }
}
