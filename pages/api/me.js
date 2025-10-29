// pages/api/me.js
import { withSessionRoute } from "../../lib/session";

export default withSessionRoute(async function handler(req, res) {
  if (!req.session.user) {
    return res.status(200).json({ loggedIn: false });
  }

  return res.status(200).json({
    loggedIn: true,
    user: req.session.user,
  });
});
