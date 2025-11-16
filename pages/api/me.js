// pages/api/me.js
import { getCurrentPlayerFromReq } from "../../lib/getCurrentPlayer";

export default async function handler(req, res) {
  const player = await getCurrentPlayerFromReq(req);

  if (!player) {
    return res.status(200).json({
      loggedIn: false,
      user: null,
    });
  }

  const {
    _id,
    username,
    avatar,
    discriminator,
    discordId,
    isAdmin,
  } = player;

  return res.status(200).json({
    loggedIn: true,
    user: {
      _id,
      username,
      avatar,
      discriminator,
      discordId,
      isAdmin: !!isAdmin,
    },
  });
}
