import mongoose from "mongoose";

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

    // 🔥 Tournament history
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
  },
  { timestamps: true }
);

export default mongoose.models.Player ||
  mongoose.model("Player", PlayerSchema);
