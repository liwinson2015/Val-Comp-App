import Link from "next/link";

export default function ValorantTypesPage() {
  return (
    <div className="min-h-screen bg-black text-white py-16 px-6">
      <div className="max-w-5xl mx-auto text-center">
        <p className="text-red-500 uppercase tracking-widest text-sm">
          Valorant Tournament
        </p>
        <h1 className="text-4xl font-extrabold mt-2">
          Choose Your Valorant Format
        </h1>
        <p className="text-gray-400 mt-3">
          Pick a tournament type to see upcoming events and join the action.
        </p>
      </div>

      {/* Three boxes */}
      <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-8 mt-16">
        {/* 1v1 */}
        <Link
          href="/tournaments-hub/valorant-types/1v1"
          className="relative group rounded-2xl overflow-hidden border border-red-700/40 bg-gradient-to-b from-red-900/40 to-black shadow-[0_0_25px_rgba(255,0,0,0.2)] hover:shadow-[0_0_40px_rgba(255,0,0,0.5)] transition-all duration-300 p-10 text-center"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-red-800/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <h2 className="text-2xl font-bold text-white tracking-wide">
            VALORANT — 1v1
          </h2>
          <p className="text-gray-400 mt-3 text-sm">
            Solo skirmish duels. Bragging rights await.
          </p>
        </Link>

        {/* 2v2 */}
        <div className="rounded-2xl border border-gray-700/60 bg-gradient-to-b from-gray-800/30 to-black p-10 text-center opacity-60 cursor-not-allowed">
          <h2 className="text-2xl font-bold text-white tracking-wide">
            VALORANT — 2v2
          </h2>
          <p className="text-gray-500 mt-3 text-sm">Coming soon.</p>
        </div>

        {/* 5v5 */}
        <div className="rounded-2xl border border-gray-700/60 bg-gradient-to-b from-gray-800/30 to-black p-10 text-center opacity-60 cursor-not-allowed">
          <h2 className="text-2xl font-bold text-white tracking-wide">
            VALORANT — 5v5
          </h2>
          <p className="text-gray-500 mt-3 text-sm">Coming soon.</p>
        </div>
      </div>
    </div>
  );
}
