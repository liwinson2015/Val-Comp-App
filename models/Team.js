// models/Team.js
import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

/**
 * game:
 *  - stored as a code like "VALORANT", "HOK"
 *  - UI will map code -> nice label (e.g. "Honor of Kings")
 */
const TeamSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    tag: {
      type: String,
      trim: true,
      maxlength: 8,
    },
    game: {
      type: String,
      required: true,
      default: "VALORANT",
    },
    captain: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      required: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "Player",
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default models.Team || model("Team", TeamSchema);
