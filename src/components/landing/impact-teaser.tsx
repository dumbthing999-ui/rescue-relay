// Rescue Relay — Landing page impact teaser
// Tries the public /api/impact endpoint; falls back to neutral placeholders
// if the request fails or returns a non-ok envelope (no fake numbers).

import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface ImpactSummary {
  total_pounds: number;
  estimated_meals: number;
}

interface Kpi {
  label: string;
  value: string;
}

function formatPounds(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString("en-US");
}

async function loadKpis(): Promise<Kpi[]> {
  const result = await apiFetch<ImpactSummary>("/api/impact");
  if (!result.ok) return placeholders();
  const { total_pounds, estimated_meals } = result.data;
  // Only trust values when the system has actually recorded deliveries.
  if (total_pounds <= 0 && estimated_meals <= 0) return placeholders();
  return [
    { label: "Pounds rescued", value: `${formatPounds(total_pounds)} lbs` },
    { label: "Estimated meals", value: estimated_meals.toLocaleString("en-US") },
    { label: "Verified orgs", value: "6+" },
    { label: "Live neighborhoods", value: "6" },
  ];
}

function placeholders(): Kpi[] {
  return [
    { label: "Pounds rescued", value: "—" },
    { label: "Estimated meals", value: "—" },
    { label: "Verified orgs", value: "6" },
    { label: "Live neighborhoods", value: "6" },
  ];
}

export async function ImpactTeaser() {
  const kpis = await loadKpis();
  return (
    <section
      aria-labelledby="impact-teaser"
      className="border-t border-edge-subtle bg-surface-inset py-20"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-400">
              Live impact
           </p>
            <h2
              id="impact-teaser"
              className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Every pickup, audited end-to-end.
           </h2>
         </div>
          <Link
            href="/impact"
            className="hidden text-sm font-semibold text-brand-400 hover:text-brand-300 sm:inline"
          >
            See the full dashboard →
         </Link>
       </div>

        <dl className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-edge-subtle bg-surface-elevated p-6"
            >
              <dt className="text-sm text-ink-secondary">{label}</dt>
              <dd className="mt-2 text-3xl font-bold text-ink-primary">
                {value}
             </dd>
           </div>
          ))}
       </dl>
     </div>
   </section>
  );
}
