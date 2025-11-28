import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";

export default function Navbar() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  // dropdown
  const [profileOpen, setProfileOpen] = useState(false);

  // Team invite count
  const [teamRegCount, setTeamRegCount] = useState(0);

  const profileRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const res = await fetch("/api/me", { credentials: "same-origin" });
        const data = await res.json();
        if (!ignore) {
          setLoggedIn(!!data.loggedIn);
          setUser(data.user || null);
          setLoading(false);
        }

        // Once we know the user is logged in, fetch team-invite summary
        if (!ignore && data.loggedIn) {
          try {
            const sumRes = await fetch(
              "/api/team-registrations/summary",
              { credentials: "same-origin" }
            );
            const sumData = await sumRes.json();
            if (!ignore && sumData && sumData.ok) {
              setTeamRegCount(sumData.activeCount || 0);
            }
          } catch (e) {
            console.error("[Navbar] team-registrations summary error:", e);
          }
        } else if (!ignore && !data.loggedIn) {
          setTeamRegCount(0);
        }
      } catch {
        if (!ignore) setLoading(false);
      }
    })();

    function handleOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }

    function handleEsc(e) {
      if (e.key === "Escape") {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      ignore = true;
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const avatarUrl =
    user?.avatar && user?.discordId
      ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=64`
      : null;

  const isAdmin = !!user?.isAdmin;

  // Label with count, like "Team Invites (2)"
  const teamRegLabel =
    teamRegCount > 0 ? `Team Invites (${teamRegCount})` : "Team Invites";

  return (
    <header
      className="nav-shell"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 2000,
        background: "transparent",
      }}
    >
      <div className="nav-inner" style={{ position: "relative" }}>
        {/* Brand / Logo */}
        <a href="/" className="brand-link">
          <div className="brand-mark">
            <span className="brand-logo-box">VC</span>
            <div className="brand-text">
              <div className="brand-line">
                <span className="brand-main">VALCOMP</span>
                <span className="brand-dot">•</span>
                <span className="brand-sub">5TQ</span>
              </div>
              <span className="brand-tagline">Gaming Tournaments</span>
            </div>
          </div>
        </a>

        {/* Links */}
        <nav
          className="nav-links"
          style={{ overflow: "visible", position: "relative", zIndex: 1 }}
        >
          <a href="/" className="nav-link">
            Home
          </a>

          {/* Simple Tournaments link (no dropdown) */}
          <a href="/tournaments-hub" className="nav-link">
            Tournaments
          </a>

          {/* My Teams (only when logged in) */}
          {!loading && loggedIn && (
            <a href="/teams" className="nav-link">
              My Teams
            </a>
          )}

          {/* Admin link: only visible if logged in AND admin */}
          {!loading && loggedIn && isAdmin && (
            <a href="/admin" className="nav-link">
              Admin
            </a>
          )}

          {/* Discord shortcut (only when logged in) */}
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
            <span className="nav-link" style={{ opacity: 0.6 }}>
              ...
            </span>
          ) : loggedIn ? (
            <div
              className="nav-link profile-dropdown"
              style={{ position: "relative", display: "inline-block" }}
              ref={profileRef}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileOpen((v) => !v);
                }}
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
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
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
                    minWidth: "200px",
                    zIndex: 3000,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <a
                    href="/profile"
                    className="nav-link"
                    style={dropdownItem}
                    onClick={() => setProfileOpen(false)}
                  >
                    View Profile
                  </a>
                  <a
                    href="/account/registrations"
                    className="nav-link"
                    style={dropdownItem}
                    onClick={() => setProfileOpen(false)}
                  >
                    Registrations
                  </a>
                  {/* Team Invites with count badge */}
                  <a
                    href="/account/team-registrations"
                    className="nav-link"
                    style={dropdownItem}
                    onClick={() => setProfileOpen(false)}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span>{teamRegLabel}</span>
                      {teamRegCount > 0 && (
                        <span
                          style={{
                            minWidth: 18,
                            padding: "0 6px",
                            borderRadius: "999px",
                            backgroundColor: "#ef4444",
                            color: "white",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            textAlign: "center",
                          }}
                        >
                          {teamRegCount}
                        </span>
                      )}
                    </span>
                  </a>
                  {/* Match Records / History */}
                  <a
                    href="/account/history"
                    className="nav-link"
                    style={dropdownItem}
                    onClick={() => setProfileOpen(false)}
                  >
                    Match History
                  </a>
                  <a
                    href="/api/auth/logout"
                    className="nav-link"
                    style={{ ...dropdownItem, color: "#ff4c4c" }}
                    onClick={() => setProfileOpen(false)}
                  >
                    Log out
                  </a>
                </div>
              )}
            </div>
          ) : (
            <a
              href={`/api/auth/discord?next=${encodeURIComponent(
                router.asPath || "/"
              )}`}
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
