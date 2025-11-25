// models/TournamentState.js
import mongoose from "mongoose";

const TournamentStateSchema = new mongoose.Schema(
  {
    // Same ID string you use everywhere, e.g. "VALO-SOLO-SKIRMISH-1"
    tournamentId: { type: String, required: true, unique: true, index: true },

    // "ongoing" or "completed"
    status: {
      type: String,
      enum: ["ongoing", "completed"],
      default: "ongoing",
      index: true,
    },

    // Whether this tournament is the one currently featured
    // on your homepage / announcements.
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Optional: who won (for team tournaments or solo)
    winnerTeamId: { type: String },

    // When it was ended + which admin ended it
    endedAt: { type: Date },
    endedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

export default mongoose.models.TournamentState ||
  mongoose.model("TournamentState", TournamentStateSchema);
