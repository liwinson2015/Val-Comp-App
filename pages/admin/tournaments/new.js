// pages/admin/tournaments/new.js
import React, { useState } from "react";
import { useRouter } from "next/router";
import { getCurrentPlayerFromReq } from "../../../lib/getCurrentPlayer";

// ---- constants for dropdowns ----
const GAME_OPTIONS = [
  { value: "valorant", label: "VALORANT" },
  { value: "tft", label: "TFT" },
  { value: "hok", label: "HONOR OF KINGS" },
];

const MONTHS = [
  { value: 1, short: "Jan", label: "January" },
  { value: 2, short: "Feb", label: "February" },
  { value: 3, short: "Mar", label: "March" },
  { value: 4, short: "Apr", label: "April" },
  { value: 5, short: "May", label: "May" },
  { value: 6, short: "Jun", label: "June" },
  { value: 7, short: "Jul", label: "July" },
  { value: 8, short: "Aug", label: "August" },
  { value: 9, short: "Sep", label: "September" },
  { value: 10, short: "Oct", label: "October" },
  { value: 11, short: "Nov", label: "November" },
  { value: 12, short: "Dec", label: "December" },
];

const YEARS = Array.from({ length: 26 }, (_, i) => 2025 + i);
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = ["00", "15", "30", "45"];
const TIMEZONES = ["EST", "CST", "MST", "PST", "UTC"];

// ---- SERVER SIDE: admin gate ----
export async function getServerSideProps({ req }) {
  const player = await getCurrentPlayerFromReq(req);

  if (!player) {
    const next = "/admin/tournaments/new";
    return {
      redirect: {
        destination: `/api/auth/discord?next=${encodeURIComponent(next)}`,
        permanent: false,
      },
    };
  }

  if (!player.isAdmin) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return { props: {} };
}

// ---- CLIENT SIDE PAGE ----
export default function AdminCreateTournamentPage() {
  const router = useRouter();

  const [tournamentId, setTournamentId] = useState("");
  // capacity starts EMPTY; you must type something
  const [capacity, setCapacity] = useState("");

  // game + mode + type (start empty so nothing is prepopulated)
  const [game, setGame] = useState("");        // "valorant", "tft", ...
  const [mode, setMode] = useState("");        // "1v1", "2v2", "5v5"
  const [elimType, setElimType] = useState(""); // "single" | "double"

  // display name + description + prize
  const [displayName, setDisplayName] = useState("");
  const [displayDescription, setDisplayDescription] = useState(
    "Solo skirmish duels hosted by 5TQ. Claim your slot and climb the bracket."
  );
  const [prize, setPrize] = useState(""); // required, but not prepopulated

  // date / time pieces (empty initially)
  const [month, setMonth] = useState("");   // 1–12
  const [day, setDay] = useState("");       // 1–31
  const [year, setYear] = useState("");     // 2025–2050
  const [hour, setHour] = useState("");     // 1–12
  const [minute, setMinute] = useState(""); // "00", "15", "30", "45"
  const [ampm, setAmpm] = useState("");     // "AM" | "PM"
  const [timezone, setTimezone] = useState(""); // "EST" etc.

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [createdId, setCreatedId] = useState("");

  // ── helpers ──────────────────────────────────────────────────────
  function buildDisplayTimePreview() {
    if (
      !month ||
      !day ||
      !year ||
      !hour ||
      !minute ||
      !ampm ||
      !timezone
    ) {
      return "—";
    }

    const mInfo = MONTHS.find((m) => m.value === Number(month));
    const shortMonth = mInfo ? mInfo.short : "???";

    const d = Number(day) || 1;
    const y = Number(year);
    const h = Number(hour);
    const mm = minute.toString().padStart(2, "0");
    const tz = timezone;
    const ap = ampm;

    return `${shortMonth} ${d}, ${y} • ${h}:${mm}${ap} ${tz}`;
  }

  function buildDisplayTimeFinal() {
    const preview = buildDisplayTimePreview();
    if (preview === "—") return "";
    return preview;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setCreatedId("");

    // required-field checks
    if (!tournamentId.trim()) {
      setErrorMsg("Tournament ID is required.");
      return;
    }
    if (!capacity.toString().trim()) {
      setErrorMsg("Capacity is required.");
      return;
    }
    const capNum = Number(capacity);
    if (!Number.isFinite(capNum) || capNum <= 0) {
      setErrorMsg("Capacity must be a positive number.");
      return;
    }

    if (!displayName.trim()) {
      setErrorMsg("Display Name is required.");
      return;
    }
    if (!displayDescription.trim()) {
      setErrorMsg("Display Description is required.");
      return;
    }
    if (!prize.trim()) {
      setErrorMsg("Prize is required.");
      return;
    }
    if (!game) {
      setErrorMsg("Game is required.");
      return;
    }
    if (!mode) {
      setErrorMsg("Mode is required.");
      return;
    }
    if (!elimType) {
      setErrorMsg("Type (single/double elim) is required.");
      return;
    }
    if (
      !month ||
      !day ||
      !year ||
      !hour ||
      !minute ||
      !ampm ||
      !timezone
    ) {
      setErrorMsg("Please complete the date, time, and time zone.");
      return;
    }

    const trimmedId = tournamentId.trim();
    const displayTime = buildDisplayTimeFinal();

    // Game label: JUST the game (no mode)
    const gameOpt = GAME_OPTIONS.find((g) => g.value === game);
    const gameLabel = gameOpt ? gameOpt.label : game.toUpperCase();
    const displayGameLabel = gameLabel;

    // Mode label: mode • type
    const elimText =
      elimType === "double" ? "Double Elimination" : "Single Elimination";
    const displayModeLabel = `${mode} • ${elimText}`;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/tournaments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: trimmedId,
          // no separate internal name: use displayName
          name: displayName.trim(),
          game,
          capacity: capNum,
          displayName: displayName.trim(),
          displayDescription: displayDescription.trim(),
          displayTime,
          displayGameLabel,
          displayModeLabel,
          displayPrize: prize.trim(), // ⭐ NEW: send prize to backend
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setErrorMsg(data.error || "Failed to create tournament.");
      } else {
        const tid = data.tournament?.tournamentId || trimmedId;
        setCreatedId(tid);
        setSuccessMsg(`Tournament "${tid}" created successfully.`);
      }
    } catch (err) {
      console.error("Create tournament error:", err);
      setErrorMsg("Server error while creating tournament.");
    } finally {
      setSubmitting(false);
    }
  }

  const previewTime = buildDisplayTimePreview();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050816",
        color: "#f9fafb",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: "3rem 1rem",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "720px",
          background:
            "radial-gradient(circle at 0% 0%, rgba(255,0,70,0.2), #0b0f19 55%)",
          borderRadius: "1.25rem",
          border: "1px solid rgba(148,163,184,0.3)",
          padding: "1.75rem 1.75rem 2rem",
          boxShadow:
            "0 30px 120px rgba(15,23,42,0.9), 0 0 0 1px rgba(15,23,42,0.8)",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#a5b4fc",
              marginBottom: "0.4rem",
            }}
          >
            // ADMIN_PANEL
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.6rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            Create New Tournament
          </h1>
          <p
            style={{
              margin: "0.35rem 0 0",
              fontSize: "0.9rem",
              color: "#9ca3af",
            }}
          >
            Fill in the fields and save. The event will show on the 1v1 hub and
            get its own details page automatically.
          </p>
        </div>

        {/* Messages */}
        {errorMsg && (
          <div
            style={{
              marginBottom: "0.8rem",
              padding: "0.6rem 0.75rem",
              borderRadius: "0.5rem",
              backgroundColor: "#450a0a",
              color: "#fecaca",
              fontSize: "0.85rem",
            }}
          >
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              marginBottom: "0.8rem",
              padding: "0.6rem 0.75rem",
              borderRadius: "0.5rem",
              backgroundColor: "#052e16",
              color: "#bbf7d0",
              fontSize: "0.85rem",
            }}
          >
            <div>{successMsg}</div>
            {createdId && (
              <div style={{ marginTop: "0.3rem" }}>
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/tournaments/${encodeURIComponent(createdId)}`)
                  }
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#a5b4fc",
                    textDecoration: "underline",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: "0.85rem",
                  }}
                >
                  View details page →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
          {/* Row: tournamentId + capacity */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2.2fr 0.8fr",
              gap: "0.75rem",
            }}
          >
            <div>
              <label
                style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}
              >
                Tournament ID
              </label>
              <input
                type="text"
                value={tournamentId}
                onChange={(e) => setTournamentId(e.target.value)}
                placeholder="VALO-SOLO-SKIRMISH-2"
                style={inputStyle}
              />
            </div>
            <div>
              <label
                style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}
              >
                Capacity
              </label>
              <input
                type="number"
                min={2}
                max={128}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="16"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Row: game + mode + type */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1.1fr 1.1fr",
              gap: "0.75rem",
            }}
          >
            <div>
              <label
                style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}
              >
                Game
              </label>
              <select
                value={game}
                onChange={(e) => setGame(e.target.value)}
                style={inputStyle}
              >
                <option value="">Select game</option>
                {GAME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}
              >
                Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                style={inputStyle}
              >
                <option value="">Select mode</option>
                <option value="1v1">1v1</option>
                <option value="2v2">2v2</option>
                <option value="5v5">5v5</option>
              </select>
            </div>

            <div>
              <label
                style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}
              >
                Type
              </label>
              <select
                value={elimType}
                onChange={(e) => setElimType(e.target.value)}
                style={inputStyle}
              >
                <option value="">Select type</option>
                <option value="single">Single Elimination</option>
                <option value="double">Double Elimination</option>
              </select>
            </div>
          </div>

          {/* Display name */}
          <div>
            <label
              style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}
            >
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Valorant Skirmish Tournament #2"
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label
              style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}
            >
              Display Description
            </label>
            <textarea
              value={displayDescription}
              onChange={(e) => setDisplayDescription(e.target.value)}
              rows={3}
              style={{
                ...inputStyle,
                resize: "vertical",
                minHeight: "80px",
              }}
            />
          </div>

          {/* Prize */}
          <div>
            <label
              style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}
            >
              Prize
            </label>
            <input
              type="text"
              value={prize}
              onChange={(e) => setPrize(e.target.value)}
              placeholder="$20 Valorant Gift Card / Skin / Cash prize"
              style={inputStyle}
            />
          </div>

          {/* Display Time: Date */}
          <div>
            <label
              style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}
            >
              Display Time
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 0.8fr 0.8fr",
                gap: "0.75rem",
                marginBottom: "0.5rem",
              }}
            >
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                style={inputStyle}
              >
                <option value="">Month</option>
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={31}
                value={day}
                onChange={(e) => setDay(e.target.value)}
                style={inputStyle}
                placeholder="Day"
              />
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                style={inputStyle}
              >
                <option value="">Year</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Time row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.8fr 1.2fr 1.8fr",
                gap: "0.75rem",
              }}
            >
              {/* Hour:Minute + AM/PM */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.1fr 1.1fr 1.4fr",
                  gap: "0.4rem",
                }}
              >
                <select
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                  style={{ ...inputStyle, minWidth: "72px" }}
                >
                  <option value="">Hr</option>
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <select
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                  style={{ ...inputStyle, minWidth: "72px" }}
                >
                  <option value="">Min</option>
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={ampm}
                  onChange={(e) => setAmpm(e.target.value)}
                  style={{ ...inputStyle, minWidth: "96px" }} // ⭐ wider AM/PM
                >
                  <option value="">AM/PM</option>
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>

              {/* Timezone */}
              <div>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  style={{ ...inputStyle, minWidth: "110px" }}
                >
                  <option value="">Time zone</option>
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#9ca3af",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                Saved as:&nbsp;
                <span style={{ fontWeight: 500 }}>{previewTime}</span>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              marginTop: "0.5rem",
            }}
          >
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                padding: "0.55rem 1rem",
                borderRadius: "0.6rem",
                border: "1px solid #4b5563",
                background: "transparent",
                color: "#e5e7eb",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "0.55rem 1.2rem",
                borderRadius: "0.6rem",
                border: "none",
                backgroundColor: submitting ? "#4b5563" : "#ef4444",
                color: "#f9fafb",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: submitting ? "not-allowed" : "pointer",
                boxShadow: submitting
                  ? "none"
                  : "0 10px 40px rgba(239,68,68,0.5)",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Creating…" : "Create Tournament"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// shared inline style
const inputStyle = {
  width: "100%",
  padding: "0.5rem 0.6rem",
  borderRadius: "0.55rem",
  border: "1px solid #4b5563",
  backgroundColor: "#020617",
  color: "#e5e7eb",
  fontSize: "0.85rem",
  outline: "none",
};
