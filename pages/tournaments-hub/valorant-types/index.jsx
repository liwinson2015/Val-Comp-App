import Link from "next/link";

export default function ValorantTypesPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6 py-20 text-white">
      {/* Page Header */}
      <div className="text-center mb-14">
        <p className="text-red-500 uppercase text-sm tracking-[0.2em] mb-2">
          Valorant Tournament
        </p>
        <h1 className="text-5xl font-extrabold mb-3">Select a Format</h1>
        <p className="text-gray-400 max-w-lg mx-auto">
          Choose your preferred game mode below and join the next 5TQ competition.
        </p>
      </div>

      {/* Red glowing background card */}
      <div className="relative w-full max-w-5xl p-[2px] rounded-3xl bg-gradient-to-r from-red-600 via-red-800 to-red-600 shadow-[0_0_40px_rgba(255,0,0,0.3)]">
        <div className="bg-gradient-to-b from-[#1a0000] via-[#120000] to-[#0a0a0a] rounded-3xl py-14 px-8 sm:px-16">
          <div className="grid md:grid-cols-3 gap-8 text-center">

            {/* 1v1 CARD */}
            <Link
              href="/tournaments-hub/valorant-types/1v1"
              className="group rounded-2xl border border-red-800 bg-gradient-to-b from-[#300000] to-[#120000] p-10 shadow-[inset_0_0_20px_rgba(255,0,0,0.3)] hover:shadow-[0_0_30px_rgba(255,0,0,0.5)] transition-all duration-300 flex flex-col items-center justify-center"
            >
              <h2 className="text-3xl font-bold mb-2 group-hover:text-red-400 transition">
                VALORANT — 1v1
              </h2>
              <p className="text-gray-400 text-sm group-hover:text-gray-200">
                Solo duel format. Prove your aim.
              </p>
              <div className="mt-6">
                <span className="text-xs uppercase tracking-widest bg-red-700/40 border border-red-600 px-4 py-1 rounded-full text-red-300">
                  Open
                </span>
              </div>
            </Link>

            {/* 2v2 CARD */}
            <div className="rounded-2xl border border-gray-700 bg-gradient-to-b from-[#151515] to-[#0c0c0c] p-10 opacity-50 flex flex-col items-center justify-center cursor-not-allowed">
              <h2 className="text-3xl font-bold mb-2 text-gray-500">
                VALORANT — 2v2
              </h2>
              <p className="text-gray-600 text-sm">Coming soon</p>
              <div className="mt-6">
                <span className="text-xs uppercase tracking-widest bg-gray-800 border border-gray-700 px-4 py-1 rounded-full text-gray-400">
                  Locked
                </span>
              </div>
            </div>

            {/* 5v5 CARD */}
            <div className="rounded-2xl border border-gray-700 bg-gradient-to-b from-[#151515] to-[#0c0c0c] p-10 opacity-50 flex flex-col items-center justify-center cursor-not-allowed">
              <h2 className="text-3xl font-bold mb-2 text-gray-500">
                VALORANT — 5v5
              </h2>
              <p className="text-gray-600 text-sm">Coming soon</p>
              <div className="mt-6">
                <span className="text-xs uppercase tracking-widest bg-gray-800 border border-gray-700 px-4 py-1 rounded-full text-gray-400">
                  Locked
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Bottom Glow Effect */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-red-700/20 blur-[120px]"></div>
    </div>
  );
}
