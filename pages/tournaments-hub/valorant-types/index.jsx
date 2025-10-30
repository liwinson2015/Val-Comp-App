import Link from "next/link";

export default function ValorantTypesPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6 py-24 text-white relative overflow-hidden">
      {/* glowing red background overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#200000] via-black to-black opacity-90"></div>
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-red-700/20 rounded-full blur-[160px]"></div>

      {/* header */}
      <div className="relative text-center mb-16 z-10">
        <p className="text-red-500 uppercase tracking-[0.25em] text-sm">
          Valorant Tournament
        </p>
        <h1 className="text-5xl font-extrabold mt-2">Choose Your Format</h1>
        <p className="text-gray-400 mt-3 max-w-md mx-auto">
          Pick a match type below to explore or join the next 5TQ event.
        </p>
      </div>

      {/* 3 glowing cards */}
      <div className="relative z-10 grid sm:grid-cols-1 md:grid-cols-3 gap-10 w-full max-w-6xl">
        {/* 1v1 card */}
        <Link
          href="/tournaments-hub/valorant-types/1v1"
          className="group relative overflow-hidden rounded-2xl border border-red-900 bg-gradient-to-br from-[#2a0000] via-[#150000] to-black shadow-[0_0_35px_rgba(255,0,0,0.3)] hover:shadow-[0_0_50px_rgba(255,0,0,0.7)] transition-all duration-500 flex flex-col justify-center items-center p-12"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-red-900/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <h2 className="text-3xl font-extrabold tracking-wide mb-4 group-hover:text-red-400 transition-colors">
            VALORANT — 1v1
          </h2>
          <p className="text-gray-400 group-hover:text-gray-200 text-sm mb-6">
            Solo duel format. Prove your aim and dominate.
          </p>
          <div className="uppercase tracking-widest text-xs bg-red-700/30 border border-red-500 px-6 py-1 rounded-full group-hover:bg-red-700/50 transition">
            Open Bracket
          </div>
        </Link>

        {/* 2v2 card */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-700 bg-gradient-to-br from-[#1a1a1a] via-[#0f0f0f] to-black opacity-60 flex flex-col justify-center items-center p-12 cursor-not-allowed">
          <h2 className="text-3xl font-extrabold tracking-wide mb-4 text-gray-500">
            VALORANT — 2v2
          </h2>
          <p className="text-gray-600 text-sm mb-6">Coming soon</p>
          <div className="uppercase tracking-widest text-xs bg-gray-800 border border-gray-600 px-6 py-1 rounded-full text-gray-500">
            Locked
          </div>
        </div>

        {/* 5v5 card */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-700 bg-gradient-to-br from-[#1a1a1a] via-[#0f0f0f] to-black opacity-60 flex flex-col justify-center items-center p-12 cursor-not-allowed">
          <h2 className="text-3xl font-extrabold tracking-wide mb-4 text-gray-500">
            VALORANT — 5v5
          </h2>
          <p className="text-gray-600 text-sm mb-6">Coming soon</p>
          <div className="uppercase tracking-widest text-xs bg-gray-800 border border-gray-600 px-6 py-1 rounded-full text-gray-500">
            Locked
          </div>
        </div>
      </div>
    </div>
  );
}
