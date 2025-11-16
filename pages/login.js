// pages/login.js
import * as cookie from "cookie";

export async function getServerSideProps({ req }) {
  // Read cookies safely (works on Vercel/Linux)
  const cookies = cookie?.parse ? cookie.parse(req.headers.cookie || "") : {};
  const playerId = cookies.playerId || null;

  // Already signed in → skip this page
  if (playerId) {
    return { redirect: { destination: "/profile", permanent: false } };
  }

  // Not signed in → render the login card below
  return { props: {} };
}

export default function LoginPage() {
  const discordLoginUrl = "/api/auth/discord";

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f0f11",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: "2rem",
      }}
    >
      <div
        style={{
          backgroundColor: "#1a1c23",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "10px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
          maxWidth: "360px",
          width: "100%",
          padding: "2rem",
        }}
      >
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            color: "#fff",
            marginBottom: "0.5rem",
            textAlign: "center",
          }}
        >
          Sign in to join the bracket
        </h1>

        <p
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: "0.9rem",
            lineHeight: 1.4,
            textAlign: "center",
            marginBottom: "1.5rem",
          }}
        >
          We’ll use your Discord username to lock in your tournament slot.
          No password, no forms.
        </p>

        <a
          href={discordLoginUrl}
          style={{
            width: "100%",
            backgroundColor: "#5865F2",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 600,
            fontSize: "0.95rem",
            borderRadius: "6px",
            padding: "0.75rem 1rem",
            textDecoration: "none",
            boxShadow: "0 10px 30px rgba(88,101,242,0.4)",
          }}
        >
          <span style={{ marginRight: "0.5rem", fontSize: "1.1rem", lineHeight: 1 }}>
            💬
          </span>
          Sign in with Discord
        </a>

        <p
          style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.4)",
            fontSize: "0.75rem",
            lineHeight: 1.4,
            marginTop: "1.5rem",
          }}
        >
          After you sign in, you’ll come back here and we’ll save your spot.
        </p>
      </div>
    </main>
  );
}
