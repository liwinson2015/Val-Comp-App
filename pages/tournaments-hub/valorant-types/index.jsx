import Link from "next/link";

export default function Valorant1v1ListPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Valorant 1v1 Tournaments</h1>
      <p className="mt-2 text-gray-600">
        Browse upcoming Valorant 1v1 tournaments below.
      </p>

      <div className="mt-8 grid gap-6">
        {/* Example tournament card */}
        <div className="rounded-2xl border p-6 shadow-sm hover:shadow-md transition">
          <h2 className="text-xl font-semibold">
            Valorant Skirmish Tournament #1
          </h2>
          <p className="mt-2 text-gray-600">
            Hosted by 5TQ • Starts November 2nd, 2025
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Format: 1v1 • Single Elimination
          </p>

          <div className="mt-4 flex gap-3">
            <Link
              href="/valorant/register?t=valorant-skirmish-1"
              className="inline-block bg-black text-white px-4 py-2 rounded-lg text-sm hover:opacity-90"
            >
              Register
            </Link>
            <Link
              href="/tournaments-hub/valorant-types"
              className="inline-block border px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              Back
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
