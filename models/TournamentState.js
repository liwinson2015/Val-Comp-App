// models/TournamentState.js
import mongoose from "mongoose";

const TournamentStateSchema = new mongoose.Schema(
  {
    // Which tournament this state row belongs to
    tournamentId: { type: String, required: true, unique: true },

    // Homepage "featured" flag
    isFeatured: { type: Boolean, default: false },

    // Logical status of the tournament
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed"],
      default: "upcoming",
    },

    // End-tournament tracking
    isEnded: { type: Boolean, default: false },
    endedAt: { type: Date, default: null },
    endNotes: { type: String, default: "" },

    // --- HOMEPAGE DISPLAY FIELDS (editable from admin) ---

    // Big title on the homepage card
    displayName: { type: String, default: "" },

    // Short description text under the title
    displayDescription: { type: String, default: "" },

    // Host / organizer name
    displayHost: { type: String, default: "" },

    // Start time / date string (human readable)
    displayTime: { type: String, default: "" },

    // Little pill at the top, e.g. "VALORANT • 1v1"
    displayGameLabel: { type: String, default: "" },
    displayModeLabel: { type: String, default: "" },

    // Where the button should send players
    ctaPath: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.TournamentState ||
  mongoose.model("TournamentState", TournamentStateSchema);
