import mongoose from "mongoose";

// Reusable sub-schema for per-game profiles (Valorant, HoK, TFT, etc.)
const GameProfileSchema = new mongoose.Schema(
  {
    // In-game name / Riot ID / account name for that game
    ign: {
      type: String,
      default: "",
    },

    // Main ranked ladder
    rankTier: {
      type: String,
      default: "",
    }, // e.g. "Iron", "Gold", "Master"
    rankDivision: {
      type: String,
      default: "",
    }, // e.g. "1", "2", "3" or "", "IV", "III", ...

    // Region/server (NA, EUW, SEA, etc.)
    region: {
      type: String,
      default: "",
    },

    // ---------- Honor of Kings extras ----------
    // Grandmaster star count (0–100+)
    hokStars: {
      type: Number,
      min: 0,
      max: 500,
    },

    // Peak Tournament score (1200–3000 range you care about)
    hokPeakScore: {
      type: Number,
      min: 1200,
      max: 3000,
    },

    // ---------- TFT Double Up extras ----------
    tftDoubleTier: {
      type: String,
      default: "",
    }, // same tiers as normal TFT
    tftDoubleDivision: {
      type: String,
      default: "",
    }, // "1"–"4" or ""

    // When this profile was last updated
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

    // email from Discord OAuth (if you ever request that scope)
    email: {
      type: String,
      default: null,
    },

    // Admin flag
    isAdmin: {
      type: Boolean,
      default: false,
    },

    // Admin-only notes
    adminNotes: {
      type: String,
      default: "",
    },

    // ACTIVE registrations for tournaments
    // (what you are currently using everywhere)
    registeredFor: [
      {
        tournamentId: String,

        // ign = name only (what your backend already uses)
        ign: String,

        // full Riot ID ("name#tagline") if you decide to store it
        fullIgn: String,

        rank: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // ✅ NEW: Completed / past tournaments
    // When you click "End Tournament" we will:
    // - copy the matching entry from registeredFor into here
    // - remove it from registeredFor
    tournamentHistory: [
      {
        tournamentId: String,
        ign: String,
        fullIgn: String,
        rank: String,

        // optional place to store placement like "1st", "Top 4" later
        placement: {
          type: String,
          default: "",
        },

        // when this tournament was moved to history
        endedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Per-game profiles (used for teams + future registrations)
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
      // add more games later, e.g.
      // LOL: { type: GameProfileSchema, default: {} },
    },

    // Which games the player wants to show as "featured" on their profile
    featuredGames: {
      type: [String], // e.g. ["VALORANT", "HOK"]
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.Player ||
  mongoose.model("Player", PlayerSchema);
