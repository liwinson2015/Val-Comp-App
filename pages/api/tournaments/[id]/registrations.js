// /pages/api/tournaments/[id]/registrations.js
import { connectToDatabase } from "../../../../lib/mongodb";
import Registration from "../../../../models/Registration";
import { tournamentsById } from "../../../../lib/tournaments";

export default async function handler(req, res) {
  try {
    const { id } = req.query; // e.g. "VALO-SOLO-SKIRMISH-1"
    const tournament = tournamentsById[id];
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    await connectToDatabase();

    // Count by your current schema field name: "tournament"
    const registered = await Registration.countDocuments({ tournament: id });

    // Optionally return a lightweight list for seeding
    const players = await Registration.find(
      { tournament: id },
      { playerName: 1, discordTag: 1, rank: 1, _id: 0 }
    )
      .sort({ timestamp: 1 }) // earliest signups first
      .lean();

    const capacity = tournament.capacity ?? 16;
    return res.status(200).json({
      tournamentId: id,
      title: tournament.title,
      capacity,
      registered,
      remaining: Math.max(capacity - registered, 0),
      isFull: registered >= capacity,
      players,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load registrations" });
  }
}
