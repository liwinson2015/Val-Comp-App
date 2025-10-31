// pages/api/auth/callback.js

import Player from "../../../models/Player.js";
import Registration from "../../../models/Registration.js";
import { connectToDatabase } from "../../../lib/mongodb.js";
import { CURRENT_TOURNAMENT } from "../../../lib/tournaments.js";

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

function makeCookie(name, value, days = 30) {
  const parts = [
    `${name}=${encodeURIComponent(value ?? "")}`,
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
      return res.status(400).send("No 'code' found. Did you come here from Discord?");
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
    const { access_token } = await tokenResponse.json();

    // 2) Get Discord user
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!userResponse.ok) {
      const errText = await userResponse.text();
      console.error("[callback] fetch discord user failed:", errText);
      return res.status(500).send("Failed to fetch Discord user");
    }
    const discordUser = await userResponse.json(); // { id, username, global_name, avatar, ... }

    // 3) DB
    await connectToDatabase();

    // 4) Upsert Player (keep your behavior)
    const update = {
      username: discordUser.global_name || discordUser.username || "",
      avatar: discordUser.avatar || "",
      discriminator: discordUser.discriminator || "",
    };
    const playerDoc = await Player.findOneAndUpdate(
      { discordId: discordUser.id },
      { $set: update, $setOnInsert: { discordId: discordUser.id, registeredFor: [] } },
      { upsert: true, new: true }
    );

    // 5) Read and clear post-login redirect cookie (your existing flow)
    const cookiesIn = parseCookies(req.headers.cookie);
    const next = cookiesIn.post_login_redirect || "/valorant"; // default to /valorant

    const clearPostLogin = [
      "post_login_redirect=;",
      "Path=/",
      "Max-Age=0",
      "SameSite=Lax",
      "HttpOnly",
      process.env.NODE_ENV === "production" ? "Secure" : null,
    ]
      .filter(Boolean)
      .join("; ");

    // 6) Set session cookies
    const setCookies = [
      makeCookie("playerId", playerDoc._id.toString()),      // your existing session id
      makeCookie("playerDiscordId", discordUser.id),         // useful for queries
      makeCookie("playerName", update.username || "Player"),
      makeCookie("playerAvatar", update.avatar || ""),
      clearPostLogin,
    ];
    res.setHeader("Set-Cookie", setCookies);

    // 7) If already registered for the current tourney, go to details page
    const existing = await Registration.findOne({
      discordId: discordUser.id,
      tournament: CURRENT_TOURNAMENT.slug,
    }).lean();

    if (existing) {
      res.writeHead(302, { Location: `/account/registrations?focus=${existing._id}` });
      return res.end();
    }

    // 8) Not registered → /valorant (or whatever post_login_redirect was)
    res.writeHead(302, { Location: next || "/valorant" });
    return res.end();
  } catch (err) {
    console.error("[callback] internal error:", err);
    return res.status(500).send("Internal server error in callback: " + err.message);
  }
}
