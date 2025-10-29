// pages/valorant/already.js
export default function ValorantAlreadyRegisteredPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#0f1923] text-white">
      <div className="max-w-lg text-center p-6 rounded-2xl bg-[#1a2634] shadow-lg">
        <h1 className="text-3xl font-bold mb-4">You’re Already Registered ✅</h1>
        <p className="text-lg mb-6">
          You’ve already signed up for <strong>VALORANT SOLO SKIRMISH #1</strong>.
        </p>
        <p className="text-sm text-gray-300 mb-6">
          If you need to update your information or withdraw, please contact an admin in the Discord server.
        </p>
        <a
          href="/"
          className="mt-6 inline-block bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition"
        >
          Return Home
        </a>
      </div>
    </div>
  );
}
