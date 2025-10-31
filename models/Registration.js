// models/Registration.js
import mongoose from "mongoose";

const RegistrationSchema = new mongoose.Schema({
  playerName: { type: String, required: true },
  discordTag: { type: String, required: true },
  rank: { type: String },
  email: { type: String },
  tournament: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// Reuse model if already compiled (Next.js dev mode protection)
export default mongoose.models.Registration ||
  mongoose.model("Registration", RegistrationSchema);
