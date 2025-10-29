// pages/api/auth/discord.js
//
// This route starts the Discord login flow.
// When someone visits /api/auth/discord, we redirect them
// to Discord's OAuth2 "Authorize this app" screen.

export default function handler(req, res) {
  // We read your Discord app info from environment variables.
  // You'll set these in .env.local.
  const clientId = process.env.DISCORD_CLIENT_ID;

  // This is where Discord should send the user BACK to after login.
  // It must exactly match what you add in the Discord Developer Portal.
  const redirectUri = encodeURIComponent(
    process.env.DISCORD_REDIRECT_URI || "http://valcomp.vercel.app/api/auth/callback"
  );

  // "identify" scope = we are allowed to get their username, ID, avatar.
  const scope = encodeURIComponent("identify");

  // Discord needs to know:
  // - which app is asking (client_id)
  // - where to send user back (redirect_uri)
  // - what we want access to (scope)
  // - how we want the response (code = normal OAuth flow)
  const discordAuthUrl =
    `https://discord.com/api/oauth2/authorize` +
    `?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` +
    `&scope=${scope}`;

  // Send the user to Discord to approve
  res.redirect(discordAuthUrl);
}
