// pages/api/auth/callback.js

import Player from "../../../models/Player.js";
import { connectToDatabase } from "../../../lib/mongodb.js";

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((v) => v.trim())
      .filter(Boolean)
      .map((kv) => {
        const i = kv.indexOf("=");
        const k = i >= 0 ? kv.slice(0, i) : kv;
        const v = i >= 0 ? kv.slice(i + 1) : "";
        try {
          return [k, decodeURIComponent(v)];
        } catch {
          return [k, v];
        }
      })
  );
}

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
    const redirectUri = process.env.DISCORD_REDIRECT_URI; // must match Discord app exactly

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

    // 2) Get Discord user (now includes email if you requested "identify email" scope)
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userResponse.ok) {
      const errText = await userResponse.text();
      console.error("[callback] fetch discord user failed:", errText);
      return res.status(500).send("Failed to fetch Discord user");
    }

    const discordUser = await userResponse.json();

    // 3) DB
    await connectToDatabase();

    // 4) Upsert Player
    const update = {
      username: discordUser.global_name || discordUser.username || "",
      avatar: discordUser.avatar || "",
      discriminator: discordUser.discriminator || "",
    };

    // ✅ Only set email if Discord actually sent one
    // (prevents overwriting an existing email with undefined)
    if (discordUser.email) {
      update.email = discordUser.email;
    }

    const playerDoc = await Player.findOneAndUpdate(
      { discordId: discordUser.id },
      {
        $set: update,
        $setOnInsert: {
          discordId: discordUser.id,
          registeredFor: [],
        },
      },
      { upsert: true, new: true }
    );

    // 5) Set session cookie (persist 30 days; Secure only in prod)
    const isProd = process.env.NODE_ENV === "production";
    const sessionCookie = [
      `playerId=${encodeURIComponent(playerDoc._id.toString())}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=2592000", // 30 days
      isProd ? "Secure" : null,
    ]
      .filter(Boolean)
      .join("; ");

    const cookies = parseCookies(req.headers.cookie);
    const next = cookies.post_login_redirect || "/valorant";

    const clearPostLogin = [
      "post_login_redirect=;",
      "Path=/",
      "Max-Age=0",
      "SameSite=Lax",
      "HttpOnly",
      isProd ? "Secure" : null,
    ]
      .filter(Boolean)
      .join("; ");

    res.setHeader("Set-Cookie", [sessionCookie, clearPostLogin]);

    // Redirect back to where they were supposed to go
    res.writeHead(302, { Location: next });
    return res.end();
  } catch (err) {
    console.error("[callback] internal error:", err);
    return res
      .status(500)
      .send("Internal server error in callback: " + err.message);
  }
}
