// pages/api/auth/discord.js
//
// This route starts the Discord login flow.
// When someone visits /api/auth/discord, we redirect them
// to Discord's OAuth2 "Authorize this app" screen.

export default function handler(req, res) {
  const clientId = process.env.DISCORD_CLIENT_ID;

  // IMPORTANT:
  // 1. Must be EXACTLY the same as in Discord Dev Portal redirect list
  // 2. Must be EXACTLY the same value used in callback.js
  // 3. Must be HTTPS in production
  const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI);

  // We just need to read basic user identity.
  const scope = encodeURIComponent("identify");

  const discordAuthUrl =
    "https://discord.com/api/oauth2/authorize" +
    `?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` +
    `&scope=${scope}`;

  res.redirect(discordAuthUrl);
}
