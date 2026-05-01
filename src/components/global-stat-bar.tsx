import { StatMetric } from "@/types";

type GlobalStatBarProps = {
  metrics: StatMetric[];
};

export function GlobalStatBar({ metrics }: GlobalStatBarProps) {
  return (
    <section className="mb-5 grid gap-3 rounded-2xl border border-indigo-300/15 bg-slate-900/55 p-3 shadow-glass backdrop-blur-xl sm:grid-cols-3">
      {metrics.map((metric) => (
        <article
          key={metric.label}
          className="rounded-xl border border-white/10 bg-gradient-to-b from-white/10 to-transparent px-4 py-3"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-200/70">{metric.label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{metric.value}</p>
        </article>
      ))}
    </section>
  );
}
