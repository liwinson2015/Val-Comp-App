// lib/tournaments.js

// Catalog of tournaments keyed by unique ID.
// Static settings (capacity, start time, URLs) live here.
// Live data (registrations) comes from the database.
export const tournamentsById = {
  "VALO-SOLO-SKIRMISH-1": {
    id: "VALO-SOLO-SKIRMISH-1",
    // Keep both for compatibility with different UIs/APIs
    name: "Valorant — Solo Skirmish #1",
    title: "VALORANT — Solo Skirmish #1",

    game: "VALORANT",
    mode: "1v1",
    status: "open",

    // Total bracket slots (used for “registered / capacity”)
    capacity: 16,

    // Nov 2, 2025, 7:00 PM EST (explicit offset to avoid shifting)
    start: "2025-11-02T19:00:00-05:00",

    // Where to send users for details/register & bracket view
    detailsUrl: "/valorant",
    bracketUrl: "/valorant/bracket",
  },

  // Add future tournaments here:
  // "VALO-2V2-ELIM-1": {
  //   id: "VALO-2V2-ELIM-1",
  //   name: "Valorant — 2v2 Elimination #1",
  //   title: "VALORANT — 2v2 Elimination #1",
  //   game: "VALORANT",
  //   mode: "2v2",
  //   status: "scheduled",
  //   capacity: 32,
  //   start: "2025-12-10T19:00:00-05:00",
  //   detailsUrl: "/valorant",
  //   bracketUrl: "/valorant/bracket-2v2",
  // },
};

// Convenience helpers (optional)
export const allTournaments = Object.values(tournamentsById);

export function getTournament(id) {
  return tournamentsById[id] || null;
}

export function getCapacity(id, fallback = 16) {
  return (tournamentsById[id] && tournamentsById[id].capacity) ?? fallback;
}
