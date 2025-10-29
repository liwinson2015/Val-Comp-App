import dbConnect from "../../../lib/mongodb";
import Registration from "../../../models/Registration";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Connect to MongoDB
    await dbConnect();

    // Read the data sent from the frontend
    const { playerName, discordTag, rank, email, tournament } = req.body;

    // Basic validation
    if (!playerName || !discordTag || !tournament) {
      return res.status(400).json({
        error:
          "Missing required fields (playerName, discordTag, or tournament)",
      });
    }

    // Save the registration to MongoDB
    const newReg = await Registration.create({
      playerName,
      discordTag,
      rank,
      email,
      tournament,
    });

    // Respond with success
    return res.status(200).json({
      success: true,
      id: newReg._id,
    });
  } catch (err) {
    console.error("❌ Error saving registration:", err);
    return res.status(500).json({ error: "Failed to save registration" });
  }
}
