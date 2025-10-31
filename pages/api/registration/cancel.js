// /pages/api/registration/cancel.js
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";
import Registration from "../../../models/Registration";

// helper to build full Discord tag (old vs new usernames)
function buildDiscordTag(username, discriminator) {
  if (!username) return null;
  if (discriminator && discriminator !== "0") return `${username}#${discriminator}`;
  return username;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectToDatabase();

    const { tournamentId } = req.body || {};
    const playerId = req.cookies?.playerId;

    if (!tournamentId) return res.status(400).json({ error: "Missing tournamentId" });
    if (!playerId) return res.status(401).json({ error: "Not authenticated" });

    // find player by cookie id
    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ error: "Player not found" });

    // build possible discord tag matches
    const tagVariants = [];
    const tag1 = buildDiscordTag(player.username, player.discriminator);
    if (tag1) tagVariants.push(tag1);
    if (player.username) tagVariants.push(player.username);

    // --- 1. Hard delete from Registration collection ---
    const deleted = await Registration.deleteMany({
      tournament: tournamentId,
      discordTag: { $in: tagVariants },
    });

    // --- 2. Remove tournament entry from Player.registeredFor array ---
    if (Array.isArray(player.registeredFor)) {
      player.registeredFor = player.registeredFor.filter(
        (r) => r.tournamentId !== tournamentId
      );
      await player.save();
    }

    console.log(
      `[CANCEL] Removed ${deleted.deletedCount} entries for ${player.username} (${tournamentId})`
    );

    return res.status(200).json({
      success: true,
      deletedCount: deleted.deletedCount,
      playerUpdated: true,
    });
  } catch (err) {
    console.error("Cancel registration error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
