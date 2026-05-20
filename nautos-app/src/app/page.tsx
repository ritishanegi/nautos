export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          <span className="text-cyan-400">NAUTOS</span>{" "}
          <span className="text-slate-300">AI</span>
        </h1>
        <p className="mt-4 text-lg text-slate-400">
          Maritime Document Intelligence Platform
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <a
            href="/auth/login"
            className="rounded-lg bg-cyan-600 px-6 py-3 text-sm font-medium text-white hover:bg-cyan-500 transition-colors"
          >
            Sign In
          </a>
          <a
            href="/auth/register"
            className="rounded-lg border border-slate-700 px-6 py-3 text-sm font-medium text-slate-300 hover:border-slate-500 transition-colors"
          >
            Register
          </a>
        </div>
      </div>
    </main>
  );
}
