import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold">ad-me</h1>
      <p className="mt-4 text-lg text-gray-600">Earn money from AI thinking time</p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700"
        >
          Get Started
        </Link>
        <Link
          href="/earnings"
          className="rounded-lg border px-6 py-3 font-medium hover:bg-gray-50"
        >
          Dashboard
        </Link>
      </div>
    </main>
  );
}
