// /pages/api/registration/purge.js
// Hard-delete ALL registrations for the current user for a given tournament,
// regardless of legacy field names or value casing, and clean Player.registeredFor.

import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";
import Registration from "../../../models/Registration";

function normalizeTid(tid) {
  const t = String(tid || "").trim();
  const noHash = t.startsWith("#") ? t.slice(1) : t;
  const uppers = [t, noHash].map((s) => s.toUpperCase());
  return {
    raw: t,
    noHash,
    upper: noHash.toUpperCase(),
    variants: Array.from(new Set([t, noHash, ...uppers])),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    await connectToDatabase();

    const playerId = req.cookies?.playerId || null;
    const { tournamentId } = req.body || {};

    if (!playerId) return res.status(401).json({ ok: false, error: "Not authenticated" });
    if (!tournamentId) return res.status(400).json({ ok: false, error: "Missing tournamentId" });

    const player = await Player.findById(playerId);
    if (!player) return res.status(401).json({ ok: false, error: "Player not found" });

    const tid = normalizeTid(tournamentId);

    // Build a super-tolerant delete filter for legacy schemas:
    // Matches:
    //   - playerId + (tournamentId in variants OR tournament in variants)
    //   - OR discordId + ( ... )
    //   - OR discordTag/username + ( ... )
    const tournamentFieldFilters = [
      { tournamentId: { $in: tid.variants } },
      { tournament: { $in: tid.variants } },
    ];
    const identityFilters = [
      { playerId: player._id },
      ...(player.discordId ? [{ discordId: player.discordId }] : []),
      ...(player.discordTag ? [{ discordTag: player.discordTag }] : []),
      ...(player.username ? [{ discordTag: player.username }] : []), // old drafts
    ];

    const deleteFilter = {
      $and: [{ $or: tournamentFieldFilters }, { $or: identityFilters }],
    };

    const delResult = await Registration.deleteMany(deleteFilter);

    // Clean mirror on Player.registeredFor (supports id or tournamentId)
    if (Array.isArray(player.registeredFor)) {
      player.registeredFor = player.registeredFor.filter((r) => {
        const rid = String(r?.tournamentId || r?.id || "").replace(/^#/, "");
        return rid.toUpperCase() !== tid.upper;
      });
      await player.save();
    }

    // Return details for debugging in UI/console
    return res.status(200).json({
      ok: true,
      deletedCount: delResult?.deletedCount || 0,
      normalizedTournamentId: tid.variants,
    });
  } catch (err) {
    console.error("PURGE error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
