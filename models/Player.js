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

    // 🔥 NEW FIELD (admin control)
    isAdmin: {
      type: Boolean,
      default: false,
    },

    // 🔥 NEW FIELD — notes added by admins
    adminNotes: {
      type: String,
      default: "",
    },

    registeredFor: [
      {
        tournamentId: String,
        ign: String,
        rank: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Player ||
  mongoose.model("Player", PlayerSchema);
