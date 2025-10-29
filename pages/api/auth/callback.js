import { serializeSessionCookie } from "../../../lib/session";

// pages/api/auth/callback.js
//
// This version logs the user in with Discord
// and then immediately redirects them to /valorant/register.
// No session storage yet, just redirect.
// This version logs the user in with Discord, stores their Discord profile in a
// session cookie, and then redirects them to /valorant/register so the client
// can finish registration with the saved data.

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
    const redirectUri =
      process.env.DISCORD_REDIRECT_URI ||
      "http://valcomp.vercel.app/api/auth/callback";

    // 1. Exchange code for access token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
@@ -40,35 +42,39 @@ export default async function handler(req, res) {
    if (!tokenResponse.ok || !tokenJson.access_token) {
      console.error("Token exchange failed:", tokenJson);
      return res
        .status(500)
        .send("Failed to exchange code for token. Check console.");
    }

    const accessToken = tokenJson.access_token;

    // 2. (Optional) Ask Discord for user info so we know it's valid
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userJson = await userResponse.json();

    if (!userResponse.ok) {
      console.error("User fetch failed:", userJson);
      return res
        .status(500)
        .send("Failed to fetch user info. Check console.");
    }

    // 3. Redirect player to the registration confirm page
    // 3. Store the Discord user in a session cookie so the client can read it later.
    const sessionCookie = serializeSessionCookie(userJson);
    res.setHeader("Set-Cookie", sessionCookie);

    // 4. Redirect player to the registration confirm page
    console.log("callback ok — redirecting", userJson?.id);
    res.writeHead(302, { Location: "/valorant/register" });
    res.end();
    // return res.redirect(302, "/valorant/register");
  } catch (err) {
    console.error("OAuth callback error:", err);
    return res.status(500).send("Something went wrong in callback.");
  }
}