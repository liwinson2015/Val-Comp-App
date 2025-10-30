import Link from "next/link";

export default function ValorantTypesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Valorant Tournament Formats</h1>
      <p className="mt-2 text-gray-400">
        Choose a format to explore upcoming events.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {/* 1v1 active */}
        <Link
          href="/tournaments-hub/valorant-types/1v1"
          className="rounded-2xl border p-6 shadow-sm hover:shadow-md transition block"
        >
          <div className="text-sm uppercase tracking-wider text-gray-400">
            Format
          </div>
          <div className="mt-1 text-xl font-semibold">1v1 Duels</div>
          <p className="mt-2 text-sm text-gray-500">
            Solo aim battles — click to view tournaments.
          </p>
        </Link>

        {/* 2v2 coming soon */}
        <div className="rounded-2xl border p-6 shadow-sm opacity-60 cursor-not-allowed">
          <div className="text-sm uppercase tracking-wider text-gray-400">
            Format
          </div>
          <div className="mt-1 text-xl font-semibold">2v2</div>
          <p className="mt-2 text-sm text-gray-500">Coming soon</p>
        </div>

        {/* 5v5 coming soon */}
        <div className="rounded-2xl border p-6 shadow-sm opacity-60 cursor-not-allowed">
          <div className="text-sm uppercase tracking-wider text-gray-400">
            Format
          </div>
          <div className="mt-1 text-xl font-semibold">5v5</div>
          <p className="mt-2 text-sm text-gray-500">Coming soon</p>
        </div>
      </div>
    </div>
  );
}
