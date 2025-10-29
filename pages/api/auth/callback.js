// pages/api/auth/callback.js
//
// Discord sends the user here after they click "Authorize".
// We take the ?code=... from Discord, exchange it for an access token,
// grab basic user info (to confirm it's real), and then
// redirect them to /valorant/register.
//
// This version is production-oriented for https://valcomp.vercel.app
// and will run on Vercel. No session storage yet.

export default async function handler(req, res) {
  try {
    // 1. Get the temporary code Discord sent us
    const code = req.query.code;

    if (!code) {
      console.error("No code in query");
      return res
        .status(400)
        .send("No 'code' found. Did you come here from Discord?");
    }

    // 2. Load secrets from environment
    // These MUST be set in your Vercel project settings
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri =
      process.env.DISCORD_REDIRECT_URI ||
      "https://valcomp.vercel.app/api/auth/callback"; // hard default to prod

    if (!clientId || !clientSecret) {
        console.error("Missing Discord OAuth env vars");
        return res.status(500).send("Server is missing Discord config.");
    }

    // 3. Exchange code -> access token
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
        .send("Login failed (token). Please try again.");
    }

    const accessToken = tokenJson.access_token;

    // 4. OPTIONAL: confirm the token actually works by asking Discord who this user is
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
        .send("Login failed (user). Please try again.");
    }

    // At this point:
    // - Discord login is valid
    // - `userJson` has their Discord account info
    //
    // NEXT STEP (future): save them in a session / db
    // For now we just redirect them to the tourney register page.

    return res.redirect(302, "/valorant/register");

  } catch (err) {
    console.error("OAuth callback error:", err);
    return res.status(500).send("Something went wrong in callback.");
  }
}
