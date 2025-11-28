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
      ign,      // name only, e.g. "5TQ"
      fullIgn,  // name#tag, e.g. "5TQ#NA1"
      rank,     // e.g. "Gold 2" or "Radiant"
      // optional hint, but we always update profile anyway
      updateProfileFromRegistration,
    } = req.body;

    const cleanIgn = typeof ign === "string" ? ign.trim() : "";
    const cleanFullIgn = typeof fullIgn === "string" ? fullIgn.trim() : "";
    const cleanRank = typeof rank === "string" ? rank.trim() : "";

    // Same validation as before: playerId, tournamentId, ign, rank required
    if (!playerId || !tournamentId || !cleanIgn || !cleanRank) {
      return res.status(400).send("Missing required fields");
    }

    await connectToDatabase();

    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).send("Player not found");
    }

    // Check if already registered via Registration collection
    const alreadyInRegistration = await Registration.findOne({
      discordTag: player.discordId,
      tournament: tournamentId,
    }).lean();

    // Check if already registered via Player.registeredFor array
    const alreadyInPlayerArray = (player.registeredFor || []).some(
      (entry) => entry.tournamentId === tournamentId
    );

    if (alreadyInRegistration || alreadyInPlayerArray) {
      return res.status(409).json({
        ok: false,
        error: "Already registered for this tournament",
      });
    }

    // Create Registration document (same as before)
    const regDoc = await Registration.create({
      playerName: player.username,
      discordTag: player.discordId,
      rank: cleanRank,
      email: "",
      tournament: tournamentId,
      timestamp: new Date(),
    });

    // Store on Player.registeredFor (history of all tournaments)
    const registeredEntry = {
      tournamentId,
      ign: cleanIgn,         // name only
      rank: cleanRank,
      createdAt: new Date(),
    };

    if (cleanFullIgn) {
      registeredEntry.fullIgn = cleanFullIgn; // name#tag
    }

    player.registeredFor = player.registeredFor || [];
    player.registeredFor.push(registeredEntry);

    // ---- Update gameProfiles.VALORANT using existing schema ----
    // We always sync the profile when they register.
    const shouldUpdateProfile = true;

    if (shouldUpdateProfile) {
      if (!player.gameProfiles) {
        player.gameProfiles = {};
      }
      if (!player.gameProfiles.VALORANT) {
        player.gameProfiles.VALORANT = {};
      }

      const valorantProfile = player.gameProfiles.VALORANT;

      // IGN: store as "name#tag" when we have fullIgn, otherwise fallback to name only
      if (cleanFullIgn) {
        valorantProfile.ign = cleanFullIgn;       // e.g. "5TQ#NA1"
      } else if (cleanIgn) {
        valorantProfile.ign = cleanIgn;          // fallback: "5TQ"
      }

      // Parse rank string (e.g. "Gold 2", "Radiant") into tier + division
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

      if (cleanRank) {
        let tier = "";
        let division = "";

        const trimmedRank = cleanRank.trim();

        if (VALORANT_RANK_TIERS.includes(trimmedRank)) {
          // Exactly matches a tier like "Radiant"
          tier = trimmedRank;
          division = "";
        } else {
          // Try to split "Gold 2" → tier="Gold", division="2"
          const parts = trimmedRank.split(/\s+/);
          if (
            parts.length >= 1 &&
            VALORANT_RANK_TIERS.includes(parts[0])
          ) {
            tier = parts[0];
            division = parts[1] || "";
          } else {
            // Fallback: store whole string as tier if we don't recognize the format
            tier = trimmedRank;
            division = "";
          }
        }

        valorantProfile.rankTier = tier;
        valorantProfile.rankDivision = division;
      }

      valorantProfile.lastUpdated = new Date();
      player.gameProfiles.VALORANT = valorantProfile;
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
