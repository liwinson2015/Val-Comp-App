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

    // Winners bracket final (upper final)
    winnersFinal: {
      type: MatchSchema,
      default: null,
    },

    // Losers bracket final
    losersFinal: {
      type: MatchSchema,
      default: null,
    },

    // True grand final (winner of WB vs winner of LB)
    grandFinal: {
      type: MatchSchema,
      default: null,
    },

    // Ranking / placements buckets
    // {
    //   first: ObjectId | null,
    //   second: ObjectId | null,
    //   third: ObjectId | null,
    //   fourth: ObjectId | null,
    //   fiveToSix: [ObjectId],
    //   sevenToEight: [ObjectId],
    //   nineToTwelve: [ObjectId],
    //   thirteenToSixteen: [ObjectId]
    // }
    ranking: {
      type: Schema.Types.Mixed,
      default: null,
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

    // Display name if you want
    name: { type: String },

    // ------------ NEW STRUCTURED FIELDS ------------

    // Which game this tournament is for
    // e.g. "valorant", "tft" (keep it consistent with what you send from admin)
    game: {
      type: String,
      default: "valorant",
      index: true,
    },

    // Which format / team size / queue type
    // Examples:
    //  valorant: "1v1", "2v2", "5v5"
    //  tft:      "solo", "doubleup"
    mode: {
      type: String,
      default: "1v1",
      index: true,
    },

    // How the bracket behaves
    // "single"  → single elimination tree
    // "double"  → winners + losers bracket (what you have now)
    // "lobby"   → TFT-style lobby / points format
    bracketStyle: {
      type: String,
      default: "double",
    },

    // ------------------------------------------------

    // Max players / teams
    capacity: { type: Number },

    // Only two statuses now: "ongoing" or "completed"
    status: {
      type: String,
      enum: ["ongoing", "completed"],
      default: "ongoing",
    },

    // Any extra display / config data
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
