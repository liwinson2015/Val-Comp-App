// /pages/api/registration/cancel.js
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";
import Registration from "../../../models/Registration";

function buildDiscordTag(username, discriminator) {
  // Discord moved to discriminator "0" for many users; older rows may still have #1234
  if (!username) return null;
  if (discriminator && discriminator !== "0") return `${username}#${discriminator}`;
  return username; // new-style tag without #
}

function normalizeTid(tid) {
  if (!tid) return [];
  const raw = String(tid).trim();
  const noHash = raw.startsWith("#") ? raw.slice(1) : raw;
  return Array.from(new Set([raw, noHash, raw.toUpperCase(), noHash.toUpperCase()]));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectToDatabase();

    const { tournamentId } = req.body || {};
    const playerId = req.cookies?.playerId || null;

    if (!playerId) return res.status(401).json({ error: "Not authenticated" });
    if (!tournamentId) return res.status(400).json({ error: "Missing tournamentId" });

    const player = await Player.findById(playerId);
    if (!player) return res.status(401).json({ error: "Player not found" });

    // Build match keys based on your actual Registration schema
    const tagExact = buildDiscordTag(player.username, player.discriminator);
    const tagVariants = Array.from(
      new Set([tagExact, player.username].filter(Boolean))
    );
    const tidVariants = normalizeTid(tournamentId);

    // 1) Hard-delete from Registration (schema: { tournament, discordTag, ... })
    const delResult = await Registration.deleteMany({
      $and: [
        { tournament: { $in: tidVariants } },        // match your 'tournament' field
        { discordTag: { $in: tagVariants } },        // match by computed tag or username
      ],
    });

    // 2) Remove mirror from Player.registeredFor (schema: { tournamentId, ign, rank, ... })
    if (Array.isArray(player.registeredFor)) {
      player.registeredFor = player.registeredFor.filter(
        (r) => r?.tournamentId !== tournamentId
      );
      await player.save();
    }

    return res.status(200).json({
      success: true,
      deleted: delResult?.deletedCount || 0,
      matchedDiscordTags: tagVariants,
      matchedTournamentValues: tidVariants,
    });
  } catch (err) {
    console.error("Cancel registration error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
