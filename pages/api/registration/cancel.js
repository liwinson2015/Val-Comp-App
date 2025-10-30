// /pages/api/registration/cancel.js
import { connectToDatabase } from "../../../lib/mongodb";
import Registration from "../../../models/Registration";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Connect to MongoDB
    await connectToDatabase();

    // Expect tournamentId and discordTag in body
    const { tournamentId, discordTag } = req.body;

    if (!tournamentId || !discordTag) {
      return res
        .status(400)
        .json({ error: "Missing tournamentId or discordTag" });
    }

    // Find the active (confirmed) registration for this player/tournament
    const registration = await Registration.findOne({
      tournament: tournamentId,
      discordTag,
      status: "confirmed",
    });

    if (!registration) {
      return res.status(404).json({ error: "No active registration found" });
    }

    // Mark registration as canceled
    registration.status = "canceled";
    await registration.save();

    console.log(
      `[CANCEL] ${discordTag} canceled registration for ${tournamentId}`
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Cancel registration error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
