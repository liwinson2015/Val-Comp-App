import { useEffect, useState } from "react";
import { getSession } from "../../lib/session";

export default function ValorantRegisterConfirmPage() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  // On load, check if the player is "logged in"
  useEffect(() => {
    const u = getSession();
    if (!u) {
      // Not logged in? Send them to /login.
      window.location.href = "/login";
    } else {
      setUser(u);
      setChecking(false);
    }
  }, []);

  function handleConfirm() {
    // This is where we will later call a real API (like /api/join)
    // and save them to the list of registered players.
    console.log("Player confirmed spot:", user);
    setConfirmed(true);
  }

  // While we're figuring out if the user is logged in or redirecting them:
  if (checking) {
    return (
      <main
        style={{
          minHeight: "100vh",
          backgroundColor: "#0f0f10",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: "0.9rem",
          }}
        >
          Checking login...
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f0f10",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
        }}
      >
        <h2
          style={{
            fontSize: "1.1rem",
            fontWeight: "600",
            marginBottom: "0.5rem",
            color: "#fff",
            textAlign: "center",
          }}
        >
          Confirm Registration
        </h2>

        <p
          style={{
            fontSize: "0.85rem",
            lineHeight: "1.4rem",
            color: "rgba(255,255,255,0.8)",
            textAlign: "center",
            marginBottom: "0.75rem",
          }}
        >
          You are about to register for{" "}
          <strong>VALORANT SOLO SKIRMISH #1</strong>.
        </p>

        <p
          style={{
            fontSize: "0.8rem",
            lineHeight: "1.3rem",
            color: "rgba(255,255,255,0.6)",
            textAlign: "center",
            marginBottom: "0.5rem",
          }}
        >
          Date: <strong>Nov 2 @ 7PM EST</strong>
          <br />
          Region: <strong>NA</strong>
        </p>

        <p
          style={{
            fontSize: "0.8rem",
            lineHeight: "1.3rem",
            color: "rgba(255,255,255,0.6)",
            textAlign: "center",
            marginBottom: "1rem",
          }}
        >
          You MUST be available at start time. No-shows can be replaced.
        </p>

        {/* Show who is signing up */}
        <div
          style={{
            backgroundColor: "#1f2532",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "6px",
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            fontSize: "0.8rem",
            lineHeight: "1.3rem",
            color: "#fff",
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              marginBottom: "0.25rem",
              fontWeight: 500,
            }}
          >
            Signing in as
          </div>

          <div
            style={{
              fontWeight: 600,
              fontSize: "0.9rem",
              color: "#fff",
            }}
          >
            {user?.username || "UnknownUser"}
          </div>

          <div
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: "0.7rem",
            }}
          >
            Discord ID: {user?.id || "N/A"}
          </div>
        </div>

        {/* Action buttons */}
        {!confirmed ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <button
              onClick={handleConfirm}
              style={{
                width: "100%",
                background:
                  "linear-gradient(to bottom, #ff4f5a 0%, #a3121c 100%)",
                border: "1px solid #ff4655",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.9rem",
                borderRadius: "6px",
                padding: "0.8rem 1rem",
                cursor: "pointer",
                boxShadow: "0 15px 40px rgba(255,70,85,0.4)",
              }}
            >
              Confirm My Spot
            </button>

            <a
              href="/valorant"
              style={{
                width: "100%",
                backgroundColor: "transparent",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "#fff",
                fontWeight: 500,
                fontSize: "0.9rem",
                borderRadius: "6px",
                padding: "0.8rem 1rem",
                textAlign: "center",
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              Go Back
            </a>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.4)",
              color: "rgb(16,185,129)",
              fontSize: "0.8rem",
              fontWeight: 500,
              textAlign: "center",
              borderRadius: "6px",
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
            }}
          >
            ✅ You're locked in. Check Discord for bracket + match assignments.
          </div>
        )}

        <p
          style={{
            fontSize: "0.7rem",
            color: "rgba(255,255,255,0.45)",
            marginTop: "1rem",
            lineHeight: "1.4rem",
            textAlign: "center",
          }}
        >
          After confirming, you'll appear on the bracket page.
          Staff can replace you if you don't check in.
        </p>

        <p
          style={{
            fontSize: "0.7rem",
            color: "rgba(255,255,255,0.45)",
            marginTop: "0.5rem",
            lineHeight: "1.4rem",
            textAlign: "center",
          }}
        >
          You MUST also be in{" "}
          <a
            href="https://discord.gg/yuGpPr6MAa"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#7886ff", fontWeight: 500, textDecoration: "none" }}
          >
            the 5TQ Discord
          </a>{" "}
          during the event or you will be replaced.
        </p>
      </div>
    </main>
  );
}
