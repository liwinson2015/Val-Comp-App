// pages/valorant/register.js

import { connectToDatabase } from "../../lib/mongodb";
import Player from "../../models/Player";

export async function getServerSideProps({ req }) {
  // Parse cookies manually
  const cookieHeader = req.headers.cookie || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, v] = c.trim().split("=");
      return [k, decodeURIComponent(v || "")];
    })
  );

  const playerId = cookies.playerId || null;

  // If no cookie, force login first
  if (!playerId) {
    return {
      redirect: {
        destination: "/api/auth/login",
        permanent: false,
      },
    };
  }

  await connectToDatabase();

  const player = await Player.findById(playerId).lean();

  if (!player) {
    // cookie is stale / user not found
    return {
      redirect: {
        destination: "/api/auth/login",
        permanent: false,
      },
    };
  }

  return {
    props: {
      username: player.username || "",
      discordId: player.discordId || "",
      avatar: player.avatar || "",
    },
  };
}

export default function ValorantRegisterPage({ username, discordId, avatar }) {
  return (
    <div className="card max-w-md mx-auto text-white bg-zinc-900/80 p-6 rounded-xl border border-zinc-700 mt-10">
      <h2 className="text-xl font-bold mb-2">
        VALORANT SOLO SKIRMISH #1
      </h2>

      <p className="text-sm text-zinc-300 mb-4">
        Welcome,{" "}
        <span className="font-semibold">{username}</span>{" "}
        (Discord ID{" "}
        <code className="text-zinc-100">{discordId}</code>)
      </p>

      {avatar ? (
        <img
          className="w-16 h-16 rounded-full border border-zinc-600 mb-4"
          src={`https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=128`}
          alt="discord avatar"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center mb-4 text-xs text-zinc-400">
          no avatar
        </div>
      )}

      <p className="text-sm text-zinc-400 mb-4">
        You are almost registered. Next step: tell us your in-game name and rank, then confirm.
      </p>

      <button className="bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-2 rounded-lg w-full">
        Continue
      </button>
    </div>
  );
}
