// models/Registration.js
import mongoose from "mongoose";

const RegistrationSchema = new mongoose.Schema({
  // Basic info you already had
  playerName: { type: String, required: true },
  discordTag: { type: String, required: true },
  rank: { type: String },
  email: { type: String },

  // OLD FIELD (still used)
  // You said this currently holds values like "VALO-SOLO-SKIRMISH-1"
  // We keep this so nothing breaks.
  tournament: { type: String, required: true },

  // NEW FIELD (optional alias for future clarity)
  // We can store the exact same string here as `tournament`,
  // so later we can standardize on `tournamentId`.
  tournamentId: { type: String },

  // Link back to Player (optional, for future stats/profile linking)
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Player",
  },

  // Status for "active vs history"
  // - "active"    = ongoing / registered
  // - "completed" = tournament ended
  // - "cancelled" = dropped / DQ / refund, etc.
  status: {
    type: String,
    enum: ["active", "completed", "cancelled"],
    default: "active",
    index: true,
  },

  // When this tournament was completed (from the player's POV)
  completedAt: { type: Date },

  // Original timestamp you had
  timestamp: { type: Date, default: Date.now },
});

// Reuse model if already compiled (Next.js dev mode protection)
export default mongoose.models.Registration ||
  mongoose.model("Registration", RegistrationSchema);
