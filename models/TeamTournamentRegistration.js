// models/TeamTournamentRegistration.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const MemberSchema = new Schema(
  {
    player: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
    },
  },
  { _id: false }
);

const TeamTournamentRegistrationSchema = new Schema(
  {
    // Tournament identity
    tournamentId: {
      type: String, // your public ID like "321"
      required: true,
    },
    tournamentRef: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
    },

    // Game + mode info (optional but helpful for brackets/filters)
    gameCode: {
      type: String, // "VALORANT" | "HOK" | "TFT"
      default: "VALORANT",
    },
    modeKey: {
      type: String, // "1v1", "2v2", "5v5", "doubleup", etc.
      default: "",
    },

    // Team identity
    team: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    teamName: {
      type: String, // e.g. "Edward Gaming"
    },
    teamTag: {
      type: String, // e.g. "EDG"
    },

    // Captain
    captain: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      required: true,
    },

    // Overall status of this team registration
    status: {
      type: String,
      enum: ["pending", "active", "cancelled"],
      default: "pending",
    },

    // One entry per player on the team
    members: [MemberSchema],

    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  }
);

export default mongoose.models.TeamTournamentRegistration ||
  mongoose.model(
    "TeamTournamentRegistration",
    TeamTournamentRegistrationSchema
  );
