import mongoose from "mongoose";

const RegistrationSchema = new mongoose.Schema({
  playerName: { type: String, required: true },
  discordTag: { type: String, required: true },
  rank: { type: String },
  email: { type: String },
  tournament: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// Reuse model if it already exists (important in Next.js dev)
export default mongoose.models.Registration ||
  mongoose.model("Registration", RegistrationSchema);
