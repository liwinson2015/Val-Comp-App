// pages/api/admin/update-registration.js
import { connectToDatabase } from "../../../lib/mongodb";
import Player from "../../../models/Player";
import Registration from "../../../models/Registration";
import * as cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    await connectToDatabase();

    // ---- check admin from cookie ----
    const cookies = cookie.parse(req.headers.cookie || "");
    const playerIdFromCookie = cookies.playerId || null;
    if (!playerIdFromCookie) {
      return res.status(401).send("Not logged in");
    }

    const me = await Player.findById(playerIdFromCookie);
    if (!me || !me.isAdmin) {
      return res.status(403).send("Admin only");
    }

    const { playerId, tournamentId, ign, fullIgn, rank } = req.body || {};

    if (!playerId || !tournamentId) {
      return res.status(400).send("Missing playerId or tournamentId");
    }

    const cleanIgn = (ign || "").trim();
    const cleanFullIgn = (fullIgn || "").trim();
    const cleanRank = (rank || "").trim();

    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).send("Player not found");
    }

    // find the matching registeredFor entry
    const idx = (player.registeredFor || []).findIndex(
      (r) => r.tournamentId === tournamentId
    );
    if (idx === -1) {
      return res.status(404).send("Registration entry not found");
    }

    // build $set update paths
    const setObj = {};
    if (cleanIgn) {
      setObj[`registeredFor.${idx}.ign`] = cleanIgn;
    }
    setObj[`registeredFor.${idx}.fullIgn`] = cleanFullIgn || undefined;
    if (cleanRank) {
      setObj[`registeredFor.${idx}.rank`] = cleanRank;
    }

    await Player.updateOne({ _id: playerId }, { $set: setObj });

    // optional: also update Registration.rank (log table)
    if (cleanRank) {
      await Registration.updateOne(
        { discordTag: player.discordId, tournament: tournamentId },
        { $set: { rank: cleanRank } }
      );
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[admin/update-registration] error:", err);
    return res.status(500).send("Server error updating registration");
  }
}
