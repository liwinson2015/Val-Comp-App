// models/Tournament.js
import mongoose from "mongoose";

const { Schema } = mongoose;

// One match in a round
const MatchSchema = new Schema(
  {
    player1Id: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      default: null,
    },
    player2Id: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      default: null,
    },
    // For WB / LB matches, winnerId is whoever won that match
    winnerId: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      default: null,
    },
  },
  { _id: false }
);

// A round (either winners or losers)
const RoundSchema = new Schema(
  {
    roundNumber: { type: Number, required: true }, // 1, 2, 3...
    type: {
      type: String,
      enum: ["winners", "losers"],
      default: "winners",
    },
    matches: {
      type: [MatchSchema],
      default: [],
    },
  },
  { _id: false }
);

const BracketSchema = new Schema(
  {
    isPublished: { type: Boolean, default: false },

    // Winners-side rounds (Round of 16, QF, SF, etc.)
    rounds: {
      type: [RoundSchema],
      default: [],
    },

    // Losers-side rounds (LB R1, R2, R3...)
    losersRounds: {
      type: [RoundSchema],
      default: [],
    },
  },
  { _id: false }
);

const TournamentSchema = new Schema(
  {
    // Human-readable ID e.g. "VALO-SOLO-SKIRMISH-1"
    tournamentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Optional metadata (you can extend as you like)
    name: { type: String },
    game: { type: String }, // e.g. "valorant"
    capacity: { type: Number },

    // Anything else you might have stored before
    meta: { type: Schema.Types.Mixed },

    // Bracket data controlled by the admin tools
    bracket: {
      type: BracketSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    // allow extra fields so we don't break any older data
    strict: false,
  }
);

export default mongoose.models.Tournament ||
  mongoose.model("Tournament", TournamentSchema);
