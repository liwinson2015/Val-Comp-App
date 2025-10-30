import { useEffect, useState, useRef } from "react";

export default function Navbar() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  // dropdowns
  const [profileOpen, setProfileOpen] = useState(false);
  const [tournOpen, setTournOpen] = useState(false);

  const profileRef = useRef(null);
  const tournRef = useRef(null);

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const res = await fetch("/api/whoami", { credentials: "same-origin" });
        const data = await res.json();
        if (!ignore) {
          setLoggedIn(!!data.loggedIn);
          setUser(data.user || null);
          setLoading(false);
        }
      } catch {
        if (!ignore) setLoading(false);
      }
    })();

    function handleOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (tournRef.current && !tournRef.current.contains(e.target)) {
        setTournOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => {
      ignore = true;
      document.removeEventListener("mousedown", handleOutside);
    };
  }, []);

  const avatarUrl =
    user?.avatar && user?.discordId
      ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=64`
      : null;

  return (
    <header className="nav-shell">
      <div className="nav-inner">
        {/* Brand */}
        <div className="brand">
          <span className="brand-main">ValComp</span>
          <span className="brand-sub">5TQ</span>
        </div>

        {/* Links */}
        <nav className="nav-links" style={{ overflow: "visible" }}>
          <a href="/" className="nav-link">Home</a>

          {/* Tournaments dropdown (click-only) */}
          <div
            ref={tournRef}
            style={{ position: "relative", display: "inline-block" }}
          >
            <button
              onClick={() => setTournOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={tournOpen}
              className="nav-link"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              Tournaments
              <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5.25 7.5L10 12.25L14.75 7.5H5.25Z" />
              </svg>
            </button>

            {tournOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: "calc(100% - 1px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: 8,
                  overflow: "hidden",
                  minWidth: "max-content",
                  whiteSpace: "nowrap",
                  zIndex: 1000,
                  boxShadow: "0 10px 30px rgba(0,0,0,.4)",
                }}
              >
                {/* Valorant tournaments link */}
                <a
                  href="/tournaments-hub/valorant-types"
                  className="nav-link"
                  style={dropdownItem}
                  onClick={() => setTournOpen(false)}
                >
                  Valorant
                </a>

                {/* Example future games */}
                <a
                  href="#"
                  className="nav-link"
                  style={{ ...dropdownItem, opacity: 0.5, cursor: "not-allowed" }}
                >
                  Honor of Kings (coming soon)
                </a>
              </div>
            )}
          </div>

          <a href="/valorant/bracket" className="nav-link">Bracket</a>

          {/* Discord only when logged in */}
          {!loading && loggedIn && (
            <a
              href="https://discord.gg/qUzCCK8nuc"
              className="nav-link external"
              target="_blank"
              rel="noopener noreferrer"
            >
              Discord
            </a>
          )}

          {/* Right side (Login or Profile) */}
          {loading ? (
            <span className="nav-link" style={{ opacity: 0.6 }}>...</span>
          ) : loggedIn ? (
            <div
              className="nav-link profile-dropdown"
              style={{ position: "relative", display: "inline-block" }}
              ref={profileRef}
            >
              <button
                onClick={() => setProfileOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "none",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "6px",
                      objectFit: "cover",
                      border: "1px solid #2e2e2e",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "6px",
                      background: "#2e2e2e",
                    }}
                  />
                )}
                <span>{user?.username || "Profile"}</span>
                <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5.25 7.5L10 12.25L14.75 7.5H5.25Z" />
                </svg>
              </button>

              {profileOpen && (
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 6px)",
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333",
                    borderRadius: "8px",
                    overflow: "hidden",
                    minWidth: "180px",
                    zIndex: 1000,
                  }}
                >
                  <a href="/profile" className="nav-link" style={dropdownItem}>
                    View Profile
                  </a>
                  <a href="/valorant/register" className="nav-link" style={dropdownItem}>
                    My Registration
                  </a>
                  <a
                    href="/api/auth/logout"
                    className="nav-link"
                    style={{ ...dropdownItem, color: "#ff4c4c" }}
                  >
                    Log out
                  </a>
                </div>
              )}
            </div>
          ) : (
            <a
              href="/api/auth/discord"
              className="nav-link login-link"
              style={{
                background: "#5865F2",
                padding: "6px 10px",
                borderRadius: "6px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Log in
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}

const dropdownItem = {
  display: "block",
  padding: "8px 12px",
  textDecoration: "none",
  color: "white",
  fontSize: "0.9rem",
  borderBottom: "1px solid #2e2e2e",
};
