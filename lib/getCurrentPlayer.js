// lib/getCurrentPlayer.js
import { parseCookies } from "./cookies";
import { connectToDatabase } from "./mongodb";
import Player from "../models/Player";

export async function getCurrentPlayerFromReq(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  const playerId = cookies.playerId || null;

  if (!playerId) return null;

  await connectToDatabase();

  const playerDoc = await Player.findById(playerId).lean();
  if (!playerDoc) return null;

  // ⭐ One-time forced re-login for old accounts without email
  // If this player doesn't have an email saved yet, we treat them as "not logged in"
  // -> any page that requires login will redirect them through Discord again
  // -> your callback will now capture discordUser.email and save it
  if (!playerDoc.email) {
    return null;
  }

  return {
    ...playerDoc,
    _id: playerDoc._id.toString(),
  };
}
