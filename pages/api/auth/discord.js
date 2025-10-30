// pages/api/auth/discord.js
export default async function handler(req, res) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI; // must match Discord portal exactly
  const scope = "identify";

  // Figure out where to go AFTER login (e.g., /valorant/register or /valorant/bracket)
  const next = typeof req.query.next === "string" ? req.query.next : "/";

  // Save that target page temporarily in a cookie (10 minutes)
  res.setHeader("Set-Cookie", [
    `post_login_redirect=${encodeURIComponent(next)}; Path=/; Max-Age=600; SameSite=Lax; HttpOnly`,
  ]);

  // Build the OAuth URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    prompt: "none",
  });

  // Redirect to Discord
  res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
}
