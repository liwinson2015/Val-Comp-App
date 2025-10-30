// pages/valorant/index.js  (or your event details page)
import { useEffect, useState } from "react";
import Link from "next/link";

export default function ValorantEventPage() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    // Lightweight check to toggle the button text/target
    fetch("/api/whoami")
      .then(r => r.json())
      .then(d => setLoggedIn(!!d.loggedIn))
      .catch(() => setLoggedIn(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#0f1923", color: "white", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>VALORANT SOLO SKIRMISH #1</h1>
      <p style={{ opacity: 0.8, marginBottom: 24 }}>
        1v1 aim duels. Bragging rights. Prize TBD. Limited slots.
      </p>

      {/* Details... date, rules, etc. */}

      {/* Register button: if logged in → go to /valorant/register, else → go to login */}
      {loggedIn ? (
        <Link href="/valorant/register" className="btn">
          Register
        </Link>
      ) : (
        <a href="/api/auth/discord" className="btn">
          Log in to Register
        </a>
      )}

      <style jsx>{`
        .btn {
          display: inline-block;
          margin-top: 16px;
          background: #ff0046;
          color: white;
          font-weight: 700;
          padding: 10px 16px;
          border-radius: 10px;
          text-decoration: none;
        }
        .btn:hover { opacity: 0.95; }
      `}</style>
    </div>
  );
}
