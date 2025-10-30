// pages/api/auth/discord.js
// Starts the Discord OAuth flow and remembers where to return after login.

export default function handler(req, res) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI; // MUST match Discord portal exactly
  const scope = "identify";

  if (!clientId || !redirectUri) {
    return res.status(500).send("Discord OAuth is not configured.");
  }

  // Determine where to go AFTER login
  // Only allow same-site paths to avoid open redirects.
  const rawNext = typeof req.query.next === "string" ? req.query.next : "/";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  // Store the post-login target in a short-lived cookie (10 minutes)
  const isProd = process.env.NODE_ENV === "production";
  const postLoginCookie = [
    `post_login_redirect=${encodeURIComponent(next)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=600",
    isProd ? "Secure" : null,
  ]
    .filter(Boolean)
    .join("; ");

  res.setHeader("Set-Cookie", postLoginCookie);

  // Build the Discord authorize URL
  // URLSearchParams will handle proper encoding.
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    // Tip: while debugging token errors, omit prompt to see the consent screen.
    // prompt: "none",
  });

  const authUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  return res.redirect(authUrl);
}
