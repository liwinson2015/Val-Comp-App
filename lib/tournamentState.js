// lib/tournamentState.js
import { connectToDatabase } from "./mongodb";
import TournamentState from "../models/TournamentState";

export async function getTournamentState(tournamentId) {
  if (!tournamentId) return null;
  await connectToDatabase();

  const doc = await TournamentState.findOne({ tournamentId }).lean();
  if (!doc) return null;

  return {
    ...doc,
    _id: doc._id.toString(),
  };
}

export async function getAllTournamentStates() {
  await connectToDatabase();
  const docs = await TournamentState.find({}).lean();
  return docs.map((d) => ({
    ...d,
    _id: d._id.toString(),
  }));
}
