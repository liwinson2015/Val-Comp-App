// models/TeamTournamentRegistration.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const TeamMemberStatusSchema = new Schema(
  {
    player: { type: Schema.Types.ObjectId, ref: "Player", required: true },
    username: { type: String, default: "" },
    discordId: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
    respondedAt: { type: Date, default: null },
  },
  { _id: false }
);

const TeamTournamentRegistrationSchema = new Schema(
  {
    tournamentId: { type: String, required: true, index: true },
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    teamName: { type: String, required: true },
    gameCode: {
      type: String,
      enum: ["VALORANT", "HOK", "TFT"],
      required: true,
    },
    modeKey: { type: String, default: "" }, // e.g. "5v5", "doubleup"

    captain: { type: Schema.Types.ObjectId, ref: "Player", required: true },

    members: {
      type: [TeamMemberStatusSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

TeamTournamentRegistrationSchema.index(
  { tournamentId: 1, team: 1 },
  { unique: true }
);

export default mongoose.models.TeamTournamentRegistration ||
  mongoose.model(
    "TeamTournamentRegistration",
    TeamTournamentRegistrationSchema
  );
