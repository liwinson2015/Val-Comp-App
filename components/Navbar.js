export default function Navbar() {
  return (
    <header className="nav-shell">
      <div className="nav-inner">
        <div className="brand">
          <span className="brand-main">ValComp</span>
          <span className="brand-sub">5TQ</span>
        </div>

        <nav className="nav-links">
          <a href="/" className="nav-link">Home</a>
          <a href="/valorant" className="nav-link">Valorant</a>
          <a href="/valorant/bracket" className="nav-link">Bracket</a>
          <a
            href="https://discord.gg/yuGpPr6MAa"
            className="nav-link external"
            target="_blank"
            rel="noopener noreferrer"
          >
            Discord
          </a>
          <a href="/login" className="nav-link login-link">
            Login
          </a>
        </nav>
      </div>
    </header>
  );
}
