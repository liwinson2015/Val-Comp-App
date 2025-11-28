// pages/api/registration/confirm.js
import { connectToDatabase } from "../../../lib/mongodb.js";
import Player from "../../../models/Player.js";
import Registration from "../../../models/Registration.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    const {
      playerId,
      tournamentId,
      ign,       // name only
      fullIgn,   // VALORANT: name#tag, others: can be same as ign
      rank,      // peak rank string
      gameCode,  // "VALORANT" | "HOK" | "TFT"
      region,    // optional region/server (HOK/TFT)
      hokPeakScore, // optional number for HOK
    } = req.body;

    const cleanIgn = typeof ign === "string" ? ign.trim() : "";
    const cleanFullIgn = typeof fullIgn === "string" ? fullIgn.trim() : "";
    const cleanRank = typeof rank === "string" ? rank.trim() : "";

    let rawGameCode =
      typeof gameCode === "string" ? gameCode.trim().toUpperCase() : "";
    const allowedGameCodes = ["VALORANT", "HOK", "TFT"];
    if (!allowedGameCodes.includes(rawGameCode)) {
      rawGameCode = "VALORANT"; // default for old data
    }
    const effectiveGameCode = rawGameCode;

    if (!playerId || !tournamentId || !cleanIgn || !cleanRank) {
      return res.status(400).send("Missing required fields");
    }

    await connectToDatabase();

    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).send("Player not found");
    }

    // Check if already registered
    const alreadyInRegistration = await Registration.findOne({
      discordTag: player.discordId,
      tournament: tournamentId,
    }).lean();

    const alreadyInPlayerArray = (player.registeredFor || []).some(
      (entry) => entry.tournamentId === tournamentId
    );

    if (alreadyInRegistration || alreadyInPlayerArray) {
      return res.status(409).json({
        ok: false,
        error: "Already registered for this tournament",
      });
    }

    // Create Registration document
    const regDoc = await Registration.create({
      playerName: player.username,
      discordTag: player.discordId,
      rank: cleanRank,
      email: "",
      tournament: tournamentId,
      timestamp: new Date(),
    });

    // Store on Player.registeredFor
    const registeredEntry = {
      tournamentId,
      ign: cleanIgn,
      rank: cleanRank,
      createdAt: new Date(),
    };
    if (cleanFullIgn) {
      registeredEntry.fullIgn = cleanFullIgn;
    }

    player.registeredFor = player.registeredFor || [];
    player.registeredFor.push(registeredEntry);

    // ---- Update the correct game profile ----
    const shouldUpdateProfile = true;

    if (shouldUpdateProfile) {
      if (!player.gameProfiles) {
        player.gameProfiles = {};
      }
      if (!player.gameProfiles[effectiveGameCode]) {
        player.gameProfiles[effectiveGameCode] = {};
      }

      const profile = player.gameProfiles[effectiveGameCode];

      // IGN:
      //  - VALORANT: use fullIgn (name#tag) when available
      //  - others: just use ign
      if (effectiveGameCode === "VALORANT") {
        if (cleanFullIgn) {
          profile.ign = cleanFullIgn; // "Name#Tag"
        } else if (cleanIgn) {
          profile.ign = cleanIgn;
        }
      } else {
        if (cleanIgn) {
          profile.ign = cleanIgn;
        }
      }

      // Region (for HOK/TFT)
      if (region && typeof region === "string") {
        const cleanRegion = region.trim();
        if (cleanRegion) {
          profile.region = cleanRegion;
        }
      }

      // HOK peak score
      if (
        effectiveGameCode === "HOK" &&
        typeof hokPeakScore !== "undefined"
      ) {
        const num = Number(hokPeakScore);
        if (!Number.isNaN(num)) {
          profile.hokPeakScore = num;
        }
      }

      // Rank parsing
      if (cleanRank) {
        if (effectiveGameCode === "VALORANT") {
          const VALORANT_RANK_TIERS = [
            "Iron",
            "Bronze",
            "Silver",
            "Gold",
            "Platinum",
            "Diamond",
            "Ascendant",
            "Immortal",
            "Radiant",
          ];

          let tier = "";
          let division = "";

          const trimmedRank = cleanRank.trim();

          if (VALORANT_RANK_TIERS.includes(trimmedRank)) {
            tier = trimmedRank;
            division = "";
          } else {
            const parts = trimmedRank.split(/\s+/);
            if (
              parts.length >= 1 &&
              VALORANT_RANK_TIERS.includes(parts[0])
            ) {
              tier = parts[0];
              division = parts[1] || "";
            } else {
              // Fallback
              tier = trimmedRank;
              division = "";
            }
          }

          profile.rankTier = tier;
          profile.rankDivision = division;
        } else {
          // Generic parse: first word = tier, rest = division
          const parts = cleanRank.split(/\s+/);
          profile.rankTier = parts[0] || "";
          profile.rankDivision = parts.slice(1).join(" ") || "";
        }
      }

      profile.lastUpdated = new Date();
      player.gameProfiles[effectiveGameCode] = profile;
    }

    await player.save();

    return res.status(200).json({
      ok: true,
      registrationId: regDoc._id.toString(),
    });
  } catch (err) {
    console.error("[registration/confirm] error:", err);
    return res.status(500).send("Server error saving registration");
  }
}
