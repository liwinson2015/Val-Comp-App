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

  return {
    ...playerDoc,
    _id: playerDoc._id.toString(),
  };
}
