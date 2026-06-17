export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-8">
        <h1 className="text-2xl font-bold text-center">Sign in to ad-me</h1>
        <button className="w-full rounded-lg bg-white border border-gray-300 px-4 py-3 font-medium shadow-sm hover:bg-gray-50">
          Continue with Google
        </button>
      </div>
    </main>
  );
}
