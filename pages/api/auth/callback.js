// pages/api/auth/callback.js
//
// Discord sends the user HERE after they authorize your app.
// URL example: /api/auth/callback?code=12345
//
// We take that ?code and ask Discord:
//   "give us an access token and tell us who this user is."
//
// Later, we'll save that user in a session and redirect them
// somewhere nice. For now we just return JSON so you can see it work.

export default async function handler(req, res) {
  const code = req.query.code; // the ?code=xxxx Discord gave us

  if (!code) {
    return res
      .status(400)
      .send("No 'code' found. Did you come here from Discord?");
  }

  // These also come from .env.local
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri =
    process.env.DISCORD_REDIRECT_URI ||
    "http://localhost:3000/api/auth/callback";

  try {
    //
    // 1. Exchange that code for an access token
    //
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

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", tokenJson);
      return res
        .status(500)
        .send("Failed to exchange code for token. Check console.");
    }

    const accessToken = tokenJson.access_token;

    //
    // 2. Use that access token to ask Discord: who is this user?
    //
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

    // userJson will look like:
    // {
    //   id: "1234567890",
    //   username: "theirName",
    //   discriminator: "0420",
    //   avatar: "hashhere",
    //   ...etc
    // }

    // 🔥 THIS IS PROOF LOGIN WORKED.
    // For now we just show the data so you can confirm.
    // After we confirm this flow works, we'll:
    // - create a session cookie
    // - redirect them to /valorant/register
    return res.status(200).json({
      message: "Discord login successful",
      discordUser: userJson,
    });
  } catch (err) {
    console.error("OAuth callback error:", err);
    return res.status(500).send("Something went wrong in callback.");
  }
}
