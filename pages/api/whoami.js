// pages/api/whoami.js
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";

export default async function handler(req, res) {
  try {
    await connectToDatabase();

    const cookieHeader = req.headers.cookie || "";
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [k, v] = c.trim().split("=");
        return [k, decodeURIComponent(v || "")];
      })
    );

    const playerId = cookies.playerId || null;
    if (!playerId) {
      return res.status(200).json({ loggedIn: false });
    }

    const player = await Player.findById(playerId).lean();
    if (!player) {
      return res.status(200).json({ loggedIn: false });
    }

    return res.status(200).json({
      loggedIn: true,
      user: {
        id: player._id.toString(),
        username: player.username || "",
        discordId: player.discordId || "",
        avatar: player.avatar || "",
      },
    });
  } catch (err) {
    console.error("[whoami] error:", err);
    return res.status(500).json({ loggedIn: false, error: "Server error" });
  }
}
