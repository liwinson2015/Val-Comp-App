// pages/api/auth/callback.js
//
// This version does 3 things:
// 1. Exchanges the Discord "code" for an access token
// 2. Uses the token to fetch the Discord user info
// 3. Redirects the user to /valorant/register (302)
// No session saving yet. We just prove redirect works.

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
      "http://localhost:3000/api/auth/callback";

    // 1. Exchange code for access token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenJson = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenJson.access_token) {
      console.error("Token exchange failed:", tokenJson);
      return res
        .status(500)
        .send("Failed to exchange code for token. Check console.");
    }

    const accessToken = tokenJson.access_token;

    // 2. Ask Discord who this user is
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

    // 3. Redirect them to /valorant/register
    res.writeHead(302, { Location: "/valorant/register" });
    res.end();
  } catch (err) {
    console.error("OAuth callback error:", err);
    return res.status(500).send("Something went wrong in callback.");
  }
}
