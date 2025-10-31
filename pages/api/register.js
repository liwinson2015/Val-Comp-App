// /pages/api/register.js
import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";
import Registration from "../../models/Registration";
import { tournamentsById } from "../../lib/tournaments";

const TOURNAMENT_ID = "VALO-SOLO-SKIRMISH-1";

function readCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .filter(Boolean)
      .map((c) => {
        const [k, ...rest] = c.trim().split("=");
        return [k, decodeURIComponent(rest.join("=") || "")];
      })
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    await connectToDatabase();

    // 1) Identify player via cookie
    const cookies = readCookies(req);
    const playerIdFromCookie = cookies.playerId || null;
    if (!playerIdFromCookie) {
      return res.status(401).json({ ok: false, error: "Not logged in" });
    }

    // 2) Verify player exists
    const player = await Player.findById(playerIdFromCookie);
    if (!player) {
      return res.status(401).json({ ok: false, error: "Invalid player" });
    }

    // 3) Form data
    const { ign, rank } = req.body || {};
    if (!ign || !rank) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing required fields (ign or rank)" });
    }

    // 4) UPSERT registration (create or update existing)
    const reg = await Registration.findOneAndUpdate(
      { playerId: player._id, tournamentId: TOURNAMENT_ID },
      {
        $set: {
          ign,
          rank,
          username: player.username || "",
          discordId: player.discordId || "",
          updatedAt: new Date(),
        },
        $setOnInsert: {
          playerId: player._id,
          tournamentId: TOURNAMENT_ID,
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    // 5) Mirror registration inside player document
    if (!Array.isArray(player.registeredFor)) player.registeredFor = [];

    const meta = tournamentsById[TOURNAMENT_ID] || {};
    const mirror = {
      id: TOURNAMENT_ID,
      tournamentId: TOURNAMENT_ID,
      name: meta.name || "Valorant Tournament",
      game: meta.game || "VALORANT",
      mode: meta.mode || "1v1",
      start: meta.start || null,
      status: meta.status || "open",
      detailsUrl: meta.detailsUrl || "/valorant",
      bracketUrl: meta.bracketUrl || "/bracket",
      updatedAt: new Date(),
    };

    const idx = player.registeredFor.findIndex(
      (r) => (r.id || r.tournamentId) === TOURNAMENT_ID
    );

    if (idx === -1) {
      player.registeredFor.push({ ...mirror, createdAt: new Date() });
    } else {
      player.registeredFor[idx] = { ...player.registeredFor[idx], ...mirror };
    }

    await player.save();

    // ✅ Respond success
    return res.status(200).json({
      ok: true,
      registrationId: reg._id.toString(),
      registeredFor: player.registeredFor,
    });
  } catch (err) {
    console.error("Register API error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
