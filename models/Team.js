import mongoose from "mongoose";

const { Schema } = mongoose;

const TeamSchema = new Schema(
  {
    // Display name for the team, e.g. "EDWARD GAMING"
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Short tag that shows in brackets, e.g. "EDG"
    tag: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 4,
    },

    // Game code, e.g. "VALORANT", "HOK"
    game: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    // --- NEW FIELDS FOR RECRUITMENT ---
    rank: {
      type: String,
      default: "Unranked",
    },
    rolesNeeded: {
      type: [String],
      default: [],
    },
    // ----------------------------------

    // Captain (owner) of the team
    captain: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      required: true,
    },

    // All members of the team (including captain)
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "Player",
      },
    ],

    // 6-character invite code (A–Z, 0–9). Used for private joins.
    joinCode: {
      type: String,
      unique: true, // no two teams share a code
      sparse: true, // allows null when not yet generated
      uppercase: true,
      minlength: 6,
      maxlength: 6,
    },

    // Whether this team is listed publicly in "Look for a team"
    isPublic: {
      type: Boolean,
      default: false,
    },

    // Max number of members allowed on this team
    maxSize: {
      type: Number,
      default: 7,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Optional: index by game for faster public queries later
TeamSchema.index({ game: 1, isPublic: 1 });

export default mongoose.models.Team || mongoose.model("Team", TeamSchema);