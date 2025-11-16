import mongoose from "mongoose";

const MatchSchema = new mongoose.Schema(
  {
    player1Id: String,
    player2Id: String,
    winnerId: { type: String, default: null },
  },
  { _id: false }
);

const RoundSchema = new mongoose.Schema(
  {
    roundNumber: Number,
    matches: [MatchSchema],
  },
  { _id: false }
);

const TournamentSchema = new mongoose.Schema(
  {
    tournamentId: { type: String, unique: true }, // same ID used in registrations
    bracket: {
      rounds: [RoundSchema],
      isPublished: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export default mongoose.models.Tournament ||
  mongoose.model("Tournament", TournamentSchema);
