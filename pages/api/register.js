// pages/api/register.js
import { withSessionRoute } from "../../lib/session";
import { connectToDatabase } from "../../lib/mongodb";
import Registration from "../../models/Registration";

export default withSessionRoute(async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectToDatabase();

    // 1. Make sure user is logged in
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const tournament = req.body.tournament;
    const { playerName, rank, email } = req.body;

    if (!playerName || !tournament) {
      return res.status(400).json({
        error: "Missing required fields (playerName or tournament)",
      });
    }

    // 2. Check if this discordId already signed up for this tournament
    const existing = await Registration.findOne({
      discordId: user.discordId,
      tournament,
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        alreadyRegistered: true,
        id: existing._id,
      });
    }

    // 3. Create a new registration
    const newReg = await Registration.create({
      discordId: user.discordId,
      playerName,
      discordTag: user.discordTag,
      rank,
      email,
      tournament,
    });

    return res.status(200).json({
      success: true,
      alreadyRegistered: false,
      id: newReg._id,
    });
  } catch (err) {
    // If it's a unique index violation, tell them they're already in
    if (err.code === 11000) {
      return res.status(200).json({
        success: true,
        alreadyRegistered: true,
        note: "Duplicate prevented by unique index",
      });
    }

    console.error("Register API error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});
