// models/TeamJoinRequest.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const TeamJoinRequestSchema = new Schema(
  {
    // The team the player wants to join
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },

    // The player requesting to join
    playerId: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      required: true,
    },

    // pending = waiting for captain
    // approved = captain accepted, player should be added to members
    // rejected = captain declined
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Each player should only have one pending request per team
TeamJoinRequestSchema.index(
  { teamId: 1, playerId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export default mongoose.models.TeamJoinRequest ||
  mongoose.model("TeamJoinRequest", TeamJoinRequestSchema);
