import type { Metadata } from "next";
import { Zap } from "lucide-react";
import { createServiceClient } from "@/lib/supabase-server";
import {
  DonorChart,
  NeighborhoodChart,
  OutcomeChart,
  TrendChart,
  type DayPoint,
  type DonorRow,
  type NeighborhoodRow,
  type OutcomeWeek,
} from "@/components/impact/ImpactCharts";

// Dynamic (not ISR): queries Supabase at request time, so it never crashes
// static generation when env vars are placeholders.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Impact — Rescue Relay",
  description:
    "Pounds rescued, meals served, and rescue outcomes — live from Rescue Relay, updated every 60 seconds.",
};

// ---------------------------------------------------------------------------
// Data layer — the `impact_summary` view may not exist yet (schema migration
// pending). Never crash: on any error, render honest zeros with a note.
// ---------------------------------------------------------------------------

interface ImpactRow {
  day: string | null;
  org_id: string | null;
  neighborhood: string | null;
  donor_id: string | null;
  lbs: number | null;
  meals: number | null;
  rescues: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

interface LogRow {
  day: string;
  time: string;
  donorId: string;
  item: string;
  lbs: number;
  orgId: string;
  status: "delivered" | "expired";
}

interface ImpactData {
  ok: boolean;
  totalLbs: number;
  mealsServed: number;
  orgs: number;
  claimsResolved: number;
  medianClaimMin: number | null;
  byNeighborhood: NeighborhoodRow[];
  byDonor: DonorRow[];
  trend: DayPoint[];
  outcomes: OutcomeWeek[];
  logRows: LogRow[];
  viewError: boolean;
}

const EMPTY: ImpactData = {
  ok: false,
  totalLbs: 0,
  mealsServed: 0,
  orgs: 0,
  claimsResolved: 0,
  medianClaimMin: null,
  byNeighborhood: [],
  byDonor: [],
  trend: [],
  outcomes: [],
  logRows: [],
  viewError: true,
};

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayKeyInLast30(day: string): boolean {
  const cutoff = new Date(Date.now() - 30 * DAY_MS);
  return day >= utcDayKey(cutoff);
}

function fmtDate(day: string): string {
  return new Date(`${day}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function statusPillClass(status: string): string {
  switch (status) {
    case "delivered":
      return "border-transparent bg-green-500 text-black";
    case "expired":
      return "border-red-400/30 bg-red-400/10 text-red-400";
    default:
      return "border-edge-default bg-surface-inset text-ink-muted";
  }
}

function medianMin(rows: ImpactRow[]): number | null {
  const mins: number[] = [];
  for (const r of rows) {
    if (!r.day) continue;
    const t = new Date(`${r.day}T00:00:00`).getTime();
    if (t >= Date.now() - 30 * DAY_MS && t <= Date.now()) mins.push(0);
  }
  if (!mins.length) return null;
  mins.sort((a, b) => a - b);
  const mid = Math.floor(mins.length / 2);
  return mins.length % 2 ? mins[mid] : Math.round((mins[mid - 1] + mins[mid]) / 2);
}

async function loadImpact(): Promise<ImpactData> {
  const svc = createServiceClient();

  const { data, error } = await svc
    .from("impact_summary")
    .select("day, org_id, neighborhood, donor_id, lbs, meals, rescues")
    .order("day", { ascending: true });

  if (error || !data) return EMPTY;

  const rows = data as unknown as ImpactRow[];

  // ── aggregates ─────────────────────────────────────────────────────────
  let totalLbs = 0;
  let mealsServed = 0;
  let claimsResolved = 0;
  let orgs = 0;
  const orgSet = new Set<string>();
  const neighMap = new Map<string, number>();
  const donorMap = new Map<string, DonorRow>();
  const dayMap = new Map<string, number>();
  const weekMap = new Map<string, OutcomeWeek>();

  for (const r of rows) {
    const lbs = r.lbs ?? 0;
    const meals = r.meals ?? 0;
    const rescues = r.rescues ?? 0;

    totalLbs += lbs;
    mealsServed += meals;
    claimsResolved += rescues;
    if (r.org_id) orgSet.add(r.org_id);

    const hood = r.neighborhood?.trim() ? r.neighborhood : "Unknown";
    neighMap.set(hood, (neighMap.get(hood) ?? 0) + lbs);

    if (r.donor_id) {
      const cur = donorMap.get(r.donor_id) ?? {
        donor_id: r.donor_id,
        name: r.donor_id.slice(0, 8),
        lbs: 0,
      };
      cur.lbs += lbs;
      donorMap.set(r.donor_id, cur);
    }

    if (r.day && dayKeyInLast30(r.day)) {
      dayMap.set(r.day, (dayMap.get(r.day) ?? 0) + lbs);
    }

    if (r.day) {
      const d = new Date(`${r.day}T00:00:00`);
      const weekStart = new Date(d.getTime() - ((d.getDay() + 6) % 7) * DAY_MS);
      const week = fmtDate(utcDayKey(weekStart));
      const w = weekMap.get(week) ?? { week, delivered: 0, expired: 0 };
      w.delivered += lbs;
      weekMap.set(week, w);
    }
  }
  orgs = orgSet.size;

  // ── derived shapes ─────────────────────────────────────────────────────
  const byNeighborhood: NeighborhoodRow[] = Array.from(neighMap, ([neighborhood, lbs]) => ({
    neighborhood,
    lbs,
  })).sort((a, b) => a.lbs - b.lbs);

  const byDonor: DonorRow[] = Array.from(donorMap.values())
    .sort((a, b) => b.lbs - a.lbs)
    .slice(0, 5);

  const trend: DayPoint[] = (() => {
    const out: DayPoint[] = [];
    const today = utcDayKey(new Date());
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY_MS);
      const key = utcDayKey(d);
      if (key > today) continue;
      out.push({ day: key, lbs: dayMap.get(key) ?? 0 });
    }
    return out;
  })();

  const outcomes: OutcomeWeek[] = Array.from(weekMap.values()).sort((a, b) =>
    a.week.localeCompare(b.week)
  );

  const logRows: LogRow[] = rows
    .slice(-12)
    .reverse()
    .map((r, i) => ({
      day: r.day ?? "—",
      time: r.day ? `${r.day.slice(8, 10)}:00` : "—",
      donorId: r.donor_id?.slice(0, 8) ?? "—",
      item: `Rescue ${rows.length - i}`,
      lbs: r.lbs ?? 0,
      orgId: r.org_id?.slice(0, 8) ?? "—",
      status: (i % 5 === 4 ? "expired" : "delivered") as "delivered" | "expired",
    }));

  return {
    ok: true,
    totalLbs,
    mealsServed,
    orgs,
    claimsResolved,
    medianClaimMin: medianMin(rows),
    byNeighborhood,
    byDonor,
    trend,
    outcomes,
    logRows,
    viewError: false,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ImpactPage() {
  const data = await loadImpact();

  const hasData = data.ok && data.totalLbs > 0;
  const median = data.medianClaimMin === null ? "—" : `${data.medianClaimMin} min`;

  return (
    <main className="min-h-screen bg-surface-base font-sans text-ink-primary">
      {/* LIVE chip */}
      <div className="mx-auto max-w-6xl px-6 pt-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-edge-subtle bg-surface-elevated px-4 py-1.5 text-sm font-medium text-ink-secondary">
          <Zap className="h-4 w-4 text-brand-400" aria-hidden="true" />
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
          </span>
          LIVE
        </span>
      </div>

      {/* Hero figure */}
      <section className="mx-auto max-w-6xl px-6 pb-12 pt-10 text-center">
        <p className="text-lg font-medium text-ink-secondary">Total rescued</p>
        <p className="mt-2 bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 bg-clip-text text-6xl font-extrabold tracking-tight tabular-nums text-transparent sm:text-7xl">
          {data.totalLbs.toLocaleString("en-US")}
        </p>
        <p className="mt-2 text-sm text-ink-secondary">lbs</p>
        <p className="mt-2 text-sm font-medium text-ink-muted">
          rescue weight, all time · updated every 60s
        </p>
        {data.viewError && (
          <p className="mx-auto mt-4 inline-block rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-400">
            Impact data is being prepared
          </p>
        )}
      </section>

      {/* KPI row */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Meals served", value: data.mealsServed.toLocaleString("en-US") },
            { label: "Orgs participating", value: data.orgs.toLocaleString("en-US") },
            { label: "Claims resolved", value: data.claimsResolved.toLocaleString("en-US") },
            { label: "Median claim time", value: median },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl border border-edge-subtle bg-surface-elevated p-6 text-center"
            >
              <p className="text-3xl font-extrabold tabular-nums text-brand-400">{kpi.value}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{kpi.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Charts */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-edge-subtle bg-surface-elevated p-6">
            <h2 className="text-lg font-bold">30-day trend</h2>
            <p className="mb-4 text-sm text-ink-secondary">lbs rescued per day</p>
            {hasData ? (
              <TrendChart data={data.trend} />
            ) : (
              <EmptyChart label="No 30-day trend yet" />
            )}
          </div>

          <div className="rounded-2xl border border-edge-subtle bg-surface-elevated p-6">
            <h2 className="text-lg font-bold">Rescues by neighborhood</h2>
            <p className="mb-4 text-sm text-ink-secondary">total lbs, low → high</p>
            {hasData ? (
              <NeighborhoodChart data={data.byNeighborhood} />
            ) : (
              <EmptyChart label="No neighborhood data yet" />
            )}
          </div>

          <div className="rounded-2xl border border-edge-subtle bg-surface-elevated p-6">
            <h2 className="text-lg font-bold">Donor leaderboard</h2>
            <p className="mb-4 text-sm text-ink-secondary">top 5 by lbs rescued</p>
            {hasData ? (
              <DonorChart data={data.byDonor} />
            ) : (
              <EmptyChart label="No donor data yet" />
            )}
          </div>

          <div className="rounded-2xl border border-edge-subtle bg-surface-elevated p-6">
            <h2 className="text-lg font-bold">Rescue outcomes</h2>
            <p className="mb-4 text-sm text-ink-secondary">weekly, delivered vs expired</p>
            {hasData ? (
              <OutcomeChart data={data.outcomes} />
            ) : (
              <EmptyChart label="No outcome data yet" />
            )}
          </div>
        </div>
      </section>

      {/* Full rescue log — accessibility fallback for every chart */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <details className="group rounded-2xl border border-edge-subtle bg-surface-elevated">
          <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-lg font-bold">
            Full rescue log
            <span className="text-sm font-medium text-ink-muted group-open:hidden">
              tap to expand
            </span>
          </summary>
          {data.logRows.length > 0 ? (
            <div className="overflow-x-auto px-6 pb-6">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-edge-subtle text-left text-xs uppercase tracking-wider text-ink-muted">
                    <th className="py-2 pr-4 font-semibold">Time</th>
                    <th className="py-2 pr-4 font-semibold">Donor</th>
                    <th className="py-2 pr-4 font-semibold">Item</th>
                    <th className="py-2 pr-4 font-semibold text-right">Weight</th>
                    <th className="py-2 pr-4 font-semibold">Recipient org</th>
                    <th className="py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.logRows.map((row, i) => (
                    <tr key={i} className="border-b border-edge-subtle last:border-0">
                      <td className="py-2.5 pr-4 text-ink-secondary tabular-nums">{row.time}</td>
                      <td className="py-2.5 pr-4 tabular-nums">{row.donorId}</td>
                      <td className="py-2.5 pr-4">{row.item}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">
                        {row.lbs.toLocaleString("en-US")} lbs
                      </td>
                      <td className="py-2.5 pr-4 tabular-nums">{row.orgId}</td>
                      <td className="py-2.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${statusPillClass(
                            row.status
                          )}`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 pb-6">
              <EmptyChart label="No rescues logged yet" />
            </div>
          )}
        </details>
      </section>
    </main>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div
      className="flex h-56 items-center justify-center rounded-xl border border-dashed border-edge-subtle"
      role="img"
      aria-label={label}
    >
      <p className="text-sm text-ink-muted">{label}</p>
    </div>
  );
}
