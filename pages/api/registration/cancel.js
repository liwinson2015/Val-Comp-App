// /pages/api/registration/cancel.js
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";
import Registration from "../../../models/Registration";

function normalizeTid(tid) {
  if (!tid) return "";
  const t = String(tid).trim();
  const noHash = t.startsWith("#") ? t.slice(1) : t;
  return {
    raw: t,
    noHash,
    upper: noHash.toUpperCase(),
    variants: Array.from(new Set([
      t,                 // as sent
      noHash,            // without leading #
      t.toUpperCase(),   // uppercase as sent
      noHash.toUpperCase()
    ]))
  };
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

    const tid = normalizeTid(tournamentId);
    const pid = player._id;
    const discordId = player.discordId || player.discord?.id || null;
    const discordTag = player.discordTag || player.discord?.tag || player.username || null;

    // Build filters that cover legacy field names + value variants
    const tournamentFieldFilters = [
      { tournamentId: { $in: tid.variants } },
      { tournament:   { $in: tid.variants } },
    ];

    const identityFilters = [
      { playerId: pid },
      ...(discordId ? [{ discordId }] : []),
      ...(discordTag ? [{ discordTag }] : []),
    ];

    // $and: (ANY tournamentFieldFilter) AND (ANY identityFilter)
    const deleteFilter = {
      $and: [
        { $or: tournamentFieldFilters },
        { $or: identityFilters },
      ],
    };

    const delResult = await Registration.deleteMany(deleteFilter);

    // Also clean the mirror on Player.registeredFor (handles id/tournamentId fields)
    if (Array.isArray(player.registeredFor)) {
      player.registeredFor = player.registeredFor.filter((r) => {
        const rid = (r?.tournamentId || r?.id || "").replace(/^#/, "");
        return rid.toUpperCase() !== tid.upper;
      });
      await player.save();
    }

    // Helpful logs (visible in your server/Vercel logs)
    console.log("[CANCEL] player:", String(pid));
    console.log("[CANCEL] tournamentId received:", tournamentId, "normalized:", tid.variants);
    console.log("[CANCEL] deleteFilter:", JSON.stringify(deleteFilter));
    console.log("[CANCEL] deletedCount:", delResult?.deletedCount || 0);

    return res.status(200).json({
      success: true,
      deleted: delResult?.deletedCount || 0,
    });
  } catch (err) {
    console.error("Cancel registration error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
