import mongoose from "mongoose";

// Reusable sub-schema for per-game profiles (Valorant, HoK, TFT, etc.)
const GameProfileSchema = new mongoose.Schema(
  {
    // In-game name / Riot ID / account name for that game
    ign: {
      type: String,
      default: "",
    },

    // Rank info (flexible strings so you can change later)
    rankTier: {
      type: String,
      default: "",
    }, // e.g. "Iron", "Gold", "Master"

    rankDivision: {
      type: String,
      default: "",
    }, // e.g. "1", "2", "3" or ""

    region: {
      type: String,
      default: "",
    }, // optional: "NA", "EUW", etc.

    lastUpdated: {
      type: Date,
    },
  },
  { _id: false }
);

const PlayerSchema = new mongoose.Schema(
  {
    discordId: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
    },
    discriminator: {
      type: String,
    },

    // ✅ New: email from Discord OAuth ("identify email" scope)
    email: {
      type: String,
      default: null,
    },

    // 🔥 Existing admin flag
    isAdmin: {
      type: Boolean,
      default: false,
    },

    // 🔥 Admin notes
    adminNotes: {
      type: String,
      default: "",
    },

    // 🔥 Tournament history (legacy per-tournament IGN snapshot)
    registeredFor: [
      {
        tournamentId: String,

        // ign = name only (what your backend already uses!)
        ign: String,

        // full Riot ID ("name#tagline")
        fullIgn: String,

        rank: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // ⭐ Per-game profiles (used for teams + future registrations)
    gameProfiles: {
      VALORANT: {
        type: GameProfileSchema,
        default: {},
      },
      HOK: {
        type: GameProfileSchema,
        default: {},
      },
      TFT: {
        type: GameProfileSchema,
        default: {},
      },
      // you can add more games later, e.g.
      // LOL: { type: GameProfileSchema, default: {} },
    },

    // ⭐ Featured games to display on the profile (up to 3, enforced in UI)
    // example value: ["VALORANT", "TFT", "HOK"]
    featuredGames: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.Player ||
  mongoose.model("Player", PlayerSchema);
