"use client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-6">
      <h1 className="text-3xl font-bold text-yellow-400">
        🙏 Ganesh Chaturthi Laddu Auction
      </h1>
      <p className="text-gray-400">Fun • Devotional • Everyone contributes</p>

      <div className="flex gap-4">
        <button
          onClick={() => router.push("/create")}
          className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 rounded-lg text-black font-semibold"
        >
          Create New Session
        </button>

        <button
          onClick={() => router.push("/join")}
          className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold"
        >
          Join Existing Session
        </button>
      </div>
    </main>
  );
}
