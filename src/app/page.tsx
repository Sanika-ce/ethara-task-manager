import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 md:px-8">
      <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/50 px-5 py-4 shadow-glass backdrop-blur-xl">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-indigo-200/70">Syncro</p>
          <p className="mt-1 text-sm text-slate-300">High-Performance Team Orchestration</p>
        </div>
        <Link
          href="/auth/sign-in"
          className="rounded-lg border border-indigo-300/35 bg-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/35"
        >
          Login
        </Link>
      </header>

      <section className="mt-6 rounded-3xl border border-white/10 bg-slate-900/55 p-7 shadow-glass backdrop-blur-xl md:p-10">
        <p className="text-xs uppercase tracking-[0.2em] text-violet-300/80">Modern Operating Layer</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight text-white md:text-6xl">
          Move teams faster with clarity, control, and execution confidence.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-300">
          Syncro aligns strategy with day-to-day delivery across projects, owners, and live task execution.
          Designed for teams that value speed without chaos.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/workspace"
            className="rounded-lg border border-emerald-300/35 bg-emerald-500/20 px-5 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/35"
          >
            Enter Workspace
          </Link>
          <Link
            href="/admin"
            className="rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            Explore Admin View
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Workflow Velocity", "+23%"],
            ["Active Projects", "12"],
            ["Tasks Orchestrated", "1,420+"],
            ["Team Reliability", "99.9%"]
          ].map(([label, value]) => (
            <article
              key={label}
              className="rounded-xl border border-indigo-300/15 bg-gradient-to-b from-white/10 to-transparent p-4"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
