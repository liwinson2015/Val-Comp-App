import Link from "next/link";

export default function ValorantTypesPage() {
  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white flex flex-col items-center py-20 px-6">
      {/* Title */}
      <div className="text-center mb-12">
        <p className="text-red-500 uppercase tracking-widest text-sm mb-2">
          Valorant Tournament
        </p>
        <h1 className="text-5xl font-extrabold">Choose Your Format</h1>
        <p className="text-gray-400 mt-3 max-w-md mx-auto">
          Pick a match type to explore upcoming events.
        </p>
      </div>

      {/* Red glowing container */}
      <div className="w-full max-w-5xl bg-gradient-to-br from-[#220000] via-[#160000] to-[#0b0b0b] border border-red-900/50 rounded-2xl shadow-[0_0_35px_rgba(255,0,0,0.3)] p-10">
        <div className="grid md:grid-cols-3 gap-10">
          {/* 1v1 Card */}
          <Link
            href="/tournaments-hub/valorant-types/1v1"
            className="relative group flex flex-col items-center justify-center text-center border border-red-800 rounded-2xl bg-gradient-to-b from-[#2b0000] to-[#120000] py-16 px-6 shadow-[inset_0_0_15px_rgba(255,0,0,0.3)] hover:shadow-[0_0_25px_rgba(255,0,0,0.6)] transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-red-800/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
            <h2 className="text-3xl font-bold tracking-wide mb-3">
              VALORANT — 1v1
            </h2>
            <p className="text-gray-400 group-hover:text-gray-200 transition">
              Solo duels for true aim gods.
            </p>
          </Link>

          {/* 2v2 Coming Soon */}
          <div className="flex flex-col items-center justify-center text-center border border-gray-700 rounded-2xl py-16 px-6 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] opacity-60 cursor-not-allowed">
            <h2 className="text-3xl font-bold text-gray-500 mb-3">
              VALORANT — 2v2
            </h2>
            <p className="text-gray-600 text-sm">Coming soon</p>
          </div>

          {/* 5v5 Coming Soon */}
          <div className="flex flex-col items-center justify-center text-center border border-gray-700 rounded-2xl py-16 px-6 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] opacity-60 cursor-not-allowed">
            <h2 className="text-3xl font-bold text-gray-500 mb-3">
              VALORANT — 5v5
            </h2>
            <p className="text-gray-600 text-sm">Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
