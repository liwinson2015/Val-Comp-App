// pages/tournaments/[tournamentId]/team-pending.js
import { connectToDatabase } from "../../../lib/mongodb";
import Tournament from "../../../models/Tournament";
import { GAME_LABELS as _GAME_LABELS } from "./register"; // if this import is awkward, you can just duplicate labels.

const GAME_LABELS = {
  VALORANT: "Valorant",
  HOK: "Honor of Kings",
  TFT: "Teamfight Tactics",
};

function resolveGameCodeFromDoc(doc) {
  const meta = doc.meta || {};
  const raw = (
    doc.game ||
    meta.game ||
    meta.Game ||
    ""
  )
    .toString()
    .toLowerCase()
    .trim();

  if (raw === "valorant") return "VALORANT";
  if (raw === "hok" || raw === "honorofkings" || raw === "honor_of_kings")
    return "HOK";
  if (
    raw === "tft" ||
    raw === "teamfighttactics" ||
    raw === "teamfight_tactics"
  )
    return "TFT";

  return "VALORANT";
}

export async function getServerSideProps({ params }) {
  const { tournamentId } = params;

  await connectToDatabase();
  const doc = await Tournament.findOne({ tournamentId }).lean();

  if (!doc) {
    return { notFound: true };
  }

  const meta = doc.meta || {};
  const gameCode = resolveGameCodeFromDoc(doc);
  const gameLabel = GAME_LABELS[gameCode] || "Game";

  const displayName =
    doc.name || meta.displayName || "Team Tournament";

  const heroBadge =
    meta.displayGameLabel || gameLabel || "Tournament";

  return {
    props: {
      tournamentId,
      displayName,
      heroBadge,
      gameLabel,
    },
  };
}

export default function TeamPendingPage({
  tournamentId,
  displayName,
  heroBadge,
  gameLabel,
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#020617",
        color: "#f9fafb",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Inter", Roboto, sans-serif',
        padding: "2.5rem 1rem 3rem",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 620 }}>
        {/* Badge / title */}
        <header
          style={{
            marginBottom: "1.75rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              padding: "0.18rem 0.9rem",
              borderRadius: "999px",
              border: "1px solid rgba(148,163,184,0.6)",
              fontSize: "0.7rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#e5e7eb",
              marginBottom: "0.6rem",
            }}
          >
            {heroBadge}
          </div>
          <h1
            style={{
              fontSize: "1.7rem",
              fontWeight: 700,
              margin: 0,
            }}
          >
            Team Registration Pending
          </h1>
          <p
            style={{
              marginTop: "0.55rem",
              fontSize: "0.9rem",
              color: "#9ca3af",
            }}
          >
            You registered your team for{" "}
            <span style={{ color: "#e5e7eb", fontWeight: 600 }}>
              {displayName}
            </span>{" "}
            ({gameLabel}). Your spot will be confirmed once all teammates
            accept their invites.
          </p>
        </header>

        {/* Card */}
        <section
          style={{
            borderRadius: "1rem",
            border: "1px solid rgba(31,41,55,0.9)",
            background:
              "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.18), transparent 55%) #020617",
            padding: "1.3rem 1.1rem 1.1rem",
          }}
        >
          <div
            style={{
              fontSize: "0.8rem",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#9ca3af",
              marginBottom: "0.5rem",
            }}
          >
            Next steps
          </div>
          <ol
            style={{
              paddingLeft: "1.1rem",
              margin: 0,
              fontSize: "0.9rem",
              color: "#e5e7eb",
              display: "flex",
              flexDirection: "column",
              gap: "0.45rem",
            }}
          >
            <li>
              Your teammates will see a{" "}
              <strong>Team Invites</strong> badge in the navbar and can review
              the invite under{" "}
              <strong>Account → Team Tournament Registrations</strong>.
            </li>
            <li>
              Each teammate must click{" "}
              <strong>Accept</strong> on their invite before the deadline. If
              anyone declines, the team registration will be cancelled.
            </li>
            <li>
              Once everyone accepts, your team&apos;s status will change to{" "}
              <strong>Active</strong> and your slot in the bracket is locked
              in.
            </li>
            <li>
              Join the 5TQ Discord and watch the tournament channel for
              bracket, check-in, and lobby details.
            </li>
          </ol>

          <div
            style={{
              marginTop: "1rem",
              paddingTop: "0.7rem",
              borderTop: "1px solid rgba(31,41,55,0.9)",
              fontSize: "0.8rem",
              color: "#9ca3af",
              lineHeight: 1.4,
            }}
          >
            Tournament ID:{" "}
            <span style={{ fontWeight: 600, color: "#e5e7eb" }}>
              {tournamentId}
            </span>
          </div>
        </section>

        {/* Buttons */}
        <div
          style={{
            marginTop: "1.4rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            justifyContent: "center",
          }}
        >
          <a
            href={`/account/team-registrations`}
            style={{
              padding: "0.7rem 1.2rem",
              borderRadius: "999px",
              border: "1px solid rgba(148,163,184,0.7)",
              color: "#f9fafb",
              fontSize: "0.85rem",
              textDecoration: "none",
            }}
          >
            View my Team Invites
          </a>
          <a
            href={`/tournaments/${encodeURIComponent(tournamentId)}`}
            style={{
              padding: "0.7rem 1.2rem",
              borderRadius: "999px",
              border: "none",
              background:
                "linear-gradient(135deg, #22c55e 0%, #16a34a 40%, #0f172a 100%)",
              color: "#f9fafb",
              fontSize: "0.85rem",
              textDecoration: "none",
              boxShadow:
                "0 18px 60px rgba(34,197,94,0.2), 0 8px 20px rgba(15,23,42,0.9)",
            }}
          >
            Back to Tournament Page
          </a>
        </div>
      </div>
    </div>
  );
}
