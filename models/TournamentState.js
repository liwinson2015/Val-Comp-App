// models/TournamentState.js
import mongoose from "mongoose";

const TournamentStateSchema = new mongoose.Schema(
  {
    // This should match the string id you use in your tournaments catalog (tournamentsById)
    tournamentId: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },

    // "upcoming" | "ongoing" | "completed"
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed"],
      default: "ongoing",
    },

    // Optional: winning team (store as string _id for simplicity)
    winnerTeamId: {
      type: String,
      default: null,
    },

    // Is this the one currently featured on the homepage / announcement?
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    featuredAt: {
      type: Date,
      default: null,
    },

    // Audit info for ending
    endedAt: {
      type: Date,
      default: null,
    },
    endedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.TournamentState ||
  mongoose.model("TournamentState", TournamentStateSchema);
