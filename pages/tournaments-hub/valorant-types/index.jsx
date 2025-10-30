import Link from "next/link";

export default function ValorantTypesPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-6 py-20">
      {/* Header */}
      <div className="text-center mb-14">
        <p className="text-red-500 uppercase tracking-widest text-sm mb-2">
          Valorant Tournament
        </p>
        <h1 className="text-5xl font-extrabold">Select Your Format</h1>
        <p className="text-gray-400 mt-3 max-w-md mx-auto">
          Pick a Valorant match style below and jump into competitive play.
        </p>
      </div>

      {/* Red background container */}
      <div className="w-full max-w-5xl bg-gradient-to-br from-[#1a0000] via-[#250000] to-black border border-red-800/50 rounded-2xl shadow-[0_0_35px_rgba(255,0,0,0.3)] p-10">
        <div className="grid md:grid-cols-3 gap-8">
          {/* 1v1 */}
          <Link
            href="/tournaments-hub/valorant-types/1v1"
            className="group flex flex-col items-center justify-center text-center border border-red-600/50 rounded-2xl py-12 px-6 bg-gradient-to-b from-[#2b0000]/60 to-[#150000]/80 hover:from-[#ff0000]/20 hover:to-[#300000]/80 hover:border-red-500 transition-all duration-300 shadow-[inset_0_0_10px_rgba(255,0,0,0.3)] hover:shadow-[0_0_25px_rgba(255,0,0,0.6)]"
          >
            <h2 className="text-3xl font-bold text-white tracking-wide mb-3">
              VALORANT — 1v1
            </h2>
            <p className="text-gray-400 group-hover:text-gray-200 transition">
              Solo duels for true aim gods.
            </p>
          </Link>

          {/* 2v2 */}
          <div className="flex flex-col items-center justify-center text-center border border-gray-700 rounded-2xl py-12 px-6 bg-gradient-to-b from-[#1a1a1a]/60 to-[#0f0f0f]/80 opacity-60 cursor-not-allowed">
            <h2 className="text-3xl font-bold text-gray-500 tracking-wide mb-3">
              VALORANT — 2v2
            </h2>
            <p className="text-gray-600 text-sm">Coming soon</p>
          </div>

          {/* 5v5 */}
          <div className="flex flex-col items-center justify-center text-center border border-gray-700 rounded-2xl py-12 px-6 bg-gradient-to-b from-[#1a1a1a]/60 to-[#0f0f0f]/80 opacity-60 cursor-not-allowed">
            <h2 className="text-3xl font-bold text-gray-500 tracking-wide mb-3">
              VALORANT — 5v5
            </h2>
            <p className="text-gray-600 text-sm">Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
