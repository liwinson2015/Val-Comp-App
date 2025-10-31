// pages/api/auth/callback.js
//
// Discord OAuth callback.
// - Exchanges ?code for an access token
// - Fetches Discord user
// - Sets lightweight session cookies (playerId, playerName, playerAvatar)
// - If user already registered for CURRENT_TOURNAMENT → redirect to details
// - Otherwise → redirect to /valorant (or ?state returnTo if provided)

import { connectToDatabase } from "../../../lib/mongodb";
import Registration from "../../../models/Registration";
import { CURRENT_TOURNAMENT } from "../../../lib/tournament";

function makeCookie(name, value, days = 30) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${60 * 60 * 24 * days}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export default async function handler(req, res) {
  try {
    const code = req.query.code;
    if (!code) {
      return res.status(400).send("Missing OAuth code.");
    }

    // Optional: where to send the user after login (passed via /api/auth/login?state=...)
    const returnTo =
      (req.query.state && decodeURIComponent(req.query.state)) || "/valorant";

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri =
      process.env.DISCORD_REDIRECT_URI ||
      "https://valcomp.vercel.app/api/auth/callback";

    // 1) Exchange code for token
    const tokenResp = await fetch("https://discord.com/api/oauth2/token", {
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

    if (!tokenResp.ok) {
      const t = await tokenResp.text();
      return res.status(400).send(`Token exchange failed: ${t}`);
    }
    const { access_token } = await tokenResp.json();

    // 2) Fetch user
    const userResp = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!userResp.ok) {
      const t = await userResp.text();
      return res.status(400).send(`Failed to fetch Discord user: ${t}`);
    }
    const user = await userResp.json(); // { id, username, global_name, avatar, ... }

    // 3) Set cookies
    res.setHeader("Set-Cookie", [
      makeCookie("playerId", user.id),
      makeCookie("playerName", user.global_name || user.username || "Player"),
      makeCookie("playerAvatar", user.avatar || ""),
    ]);

    // 4) Check if already registered for current tournament
    await connectToDatabase();
    const existing = await Registration.findOne({
      discordId: user.id,
      tournament: CURRENT_TOURNAMENT.slug,
    }).lean();

    if (existing) {
      // Send directly to View Details page
      res.writeHead(302, {
        Location: `/account/registrations?focus=${existing._id}`,
      });
      return res.end();
    }

    // 5) Not registered → send to Valorant main page (or returnTo if provided)
    res.writeHead(302, { Location: returnTo || "/valorant" });
    return res.end();
  } catch (err) {
    console.error("OAuth callback error:", err);
    return res.status(500).send("OAuth callback error.");
  }
}
