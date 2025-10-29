// pages/profile.js
import { connectToDatabase } from "../lib/mongodb";
import Player from "../models/Player";

export async function getServerSideProps({ req }) {
  const cookieHeader = req.headers.cookie || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, v] = c.trim().split("=");
      return [k, decodeURIComponent(v || "")];
    })
  );
  const playerId = cookies.playerId || null;
  if (!playerId) {
    return { redirect: { destination: "/api/auth/discord", permanent: false } };
  }

  await connectToDatabase();
  const player = await Player.findById(playerId).lean();
  if (!player) {
    return { redirect: { destination: "/api/auth/discord", permanent: false } };
  }

  return {
    props: {
      username: player.username || "",
      discordId: player.discordId || "",
      avatar: player.avatar || "",
    },
  };
}

export default function Profile({ username, discordId, avatar }) {
  const avatarUrl =
    avatar && discordId
      ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=128`
      : null;

  return (
    <div style={{ color: "white", background: "#0f1923", minHeight: "100vh", padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Your Profile</h1>
      {avatarUrl && <img src={avatarUrl} alt="avatar" width={96} height={96} style={{ borderRadius: 12 }} />}
      <p style={{ marginTop: 12 }}>Username: {username}</p>
      <p>Discord ID: {discordId}</p>
    </div>
  );
}
