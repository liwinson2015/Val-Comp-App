// pages/api/checkRegistration.js
import { withSessionRoute } from "../../lib/session";
import { connectToDatabase } from "../../lib/mongodb";
import Registration from "../../models/Registration";

export default withSessionRoute(async function handler(req, res) {
  try {
    await connectToDatabase();

    const user = req.session.user;
    const tournament = req.query.tournament;

    if (!user) {
      return res.status(200).json({ loggedIn: false });
    }

    const existing = await Registration.findOne({
      discordId: user.discordId,
      tournament,
    });

    if (existing) {
      return res.status(200).json({
        loggedIn: true,
        alreadyRegistered: true,
        registrationId: existing._id,
      });
    } else {
      return res.status(200).json({
        loggedIn: true,
        alreadyRegistered: false,
      });
    }
  } catch (err) {
    console.error("checkRegistration error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});
