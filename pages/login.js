export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f0f10",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div
        style={{
          backgroundColor: "#1a1c20",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "8px",
          maxWidth: "400px",
          width: "100%",
          padding: "2rem",
          boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <h1
          style={{
            fontSize: "1.1rem",
            fontWeight: "600",
            marginBottom: "0.5rem",
            color: "#fff",
            textAlign: "center",
          }}
        >
          Sign in to ValComp
        </h1>

        <p
          style={{
            fontSize: "0.9rem",
            lineHeight: "1.4rem",
            color: "rgba(255,255,255,0.6)",
            textAlign: "center",
            marginBottom: "1.5rem",
          }}
        >
          Use your Discord account so we know who’s signing up and so we can DM
          you match info.
        </p>

        {/* This button will later trigger real Discord OAuth.
           For now it just links to your Discord as a temp stand-in. */}
        <a
          href="https://discord.gg/yuGpPr6MAa"
          style={{
            display: "block",
            width: "100%",
            backgroundColor: "#5865F2", // Discord blurple
            border: "1px solid rgba(0,0,0,0.4)",
            borderRadius: "6px",
            padding: "0.75rem 1rem",
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "#fff",
            textAlign: "center",
            textDecoration: "none",
            boxShadow: "0 12px 30px rgba(88,101,242,0.4)",
          }}
        >
          Sign in with Discord
        </a>

        <p
          style={{
            fontSize: "0.7rem",
            color: "rgba(255,255,255,0.4)",
            marginTop: "1rem",
            textAlign: "center",
          }}
        >
          After you sign in, you’ll be able to claim a tournament slot.
        </p>
      </div>
    </div>
  );
}
