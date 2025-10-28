export default function ValorantRegisterConfirmPage() {
  return (
    <div className="card">
      <h2 className="section-title">Confirm Registration</h2>

      <p className="info-line">
        You are about to register for <strong>VALORANT SOLO SKIRMISH #1</strong>.
      </p>
      <p className="info-line">
        Date: <strong>Nov 2 @ 7PM EST</strong>
      </p>
      <p className="info-line">
        You MUST be available at start time. No-shows can be replaced.
      </p>

      <div className="button-row">
        {/* This will eventually call /api/join with your Discord ID */}
        <button className="btn">
          Confirm My Spot
        </button>

        <a className="btn secondary" href="/valorant">
          Go Back
        </a>
      </div>

      <p className="small-note">
        After confirming, you'll appear on the bracket page.
      </p>
    </div>
  );
}
