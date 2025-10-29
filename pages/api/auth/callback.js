// pages/api/auth/callback.js

import Player from "../../../models/Player.js"; // <-- needs to exist
import { connectToDatabase } from "../../../lib/mongodb.js";

export default async function handler(req, res) {
  try {
    const code = req.query.code;
    if (!code) {
      return res
        .status(400)
        .send("No 'code' found. Did you come here from Discord?");
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.DISCORD_REDIRECT_URI; 
    // e.g. "https://valcomp.vercel.app/api/auth/callback"

    // 1) Exchange code -> token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("[callback] token exchange failed:", errText);
      return res.status(500).send("Failed to exchange code for token");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2) Get Discord user
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userResponse.ok) {
      const errText = await userResponse.text();
      console.error("[callback] fetch discord user failed:", errText);
      return res.status(500).send("Failed to fetch Discord user");
    }

    const discordUser = await userResponse.json();
    // discordUser.id, discordUser.username, discordUser.avatar, etc.

    // 3) Connect DB
    await connectToDatabase();

    // 4) Upsert Player
    const update = {
      username: discordUser.global_name || discordUser.username,
      avatar: discordUser.avatar || "",
      discriminator: discordUser.discriminator || "",
    };

    const playerDoc = await Player.findOneAndUpdate(
      { discordId: discordUser.id },
      { $set: update, $setOnInsert: { discordId: discordUser.id } },
      { upsert: true, new: true }
    );

    // 5) Set cookie with player _id
    res.setHeader("Set-Cookie", [
      `playerId=${playerDoc._id.toString()}; Path=/; HttpOnly; Secure; SameSite=Lax`,
    ]);

    // 6) Redirect to register page
    res.writeHead(302, { Location: "/valorant/register" });
    return res.end();
  } catch (err) {
    console.error("[callback] internal error:", err);
    return res.status(500).send("Internal server error in callback");
  }
}
