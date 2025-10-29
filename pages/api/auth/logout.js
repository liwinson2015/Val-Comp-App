// pages/api/auth/logout.js
export default async function handler(req, res) {
  // expire the cookie
  const parts = [
    "playerId=; Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));

  // optionally redirect somewhere
  if (req.method === "GET") {
    res.writeHead(302, { Location: "/" });
    return res.end();
  }
  return res.status(200).json({ ok: true });
}
