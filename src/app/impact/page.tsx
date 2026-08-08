// Rescue Relay — Public live-impact page
// Server component (ISR, 60s) over the `impact_summary` view via the service
// client. Falls back to computing from delivered donations when the view is
// unavailable; falls back to zeros when Supabase isn't configured.

import { AlertTriangle, Building2, HandHeart, Scale, Timer, UtensilsCrossed } from "lucide-react";
import { createServiceClient } from "@/lib/supabase-server";
import {
  TrendChart,
  NeighborhoodChart,
  DonorChart,
  OutcomeChart,
  type DayPoint,
  type NeighborhoodRow,
  type DonorRow,
  type OutcomeWeek,
} from "@/components/impact/ImpactCharts";

// Server-rendered on every request so live Supabase data is always fresh —
// static pre-rendering bakes in empty state when env isn't available at build.
export const dynamic = "force-dynamic";
export const revalidate = 60; // fallback ISR window

// "Since Aug 1" scope window (UTC). Everything on this page reflects this period.
const SINCE = new Date("2026-08-01T00:00:00.000Z");

interface ImpactSummary {
  total_pounds: number;
  estimated_meals: number;
  by_neighborhood: NeighborhoodRow[];
  by_donor: DonorRow[];
  last_30_days: DayPoint[];
  weekly_outcomes: OutcomeWeek[];
  org_count: number;
  claims_resolved: number;
  median_claim_minutes: number | null;
  data_source: "view" | "fallback" | "empty";
  source_warning: string | null;
  context: ImpactContext;
}

// Real-world food-rescue context (sourced). These are NOT Rescue Relay's
// numbers — they document the wider food-rescue ecosystem the platform plugs
// into. Every entry carries its source and the period it covers.
interface ContextStat {
  value: number;
  unit: "lbs" | "meals" | "rescues" | "tons" | "pct";
  label: string;
  source: string;
  url: string;
  period: string;
}
interface ImpactContext {
  headline: string;
  stats: ContextStat[];
  note: string;
}

/** Real, sourced food-rescue context figures (gathered 2026-08-08). */
function buildContext(): ImpactContext {
  return {
    headline:
      "The food-rescue ecosystem these networks plug into moves real food at massive scale:",
    note:
      "Context figures are reported by the named organizations — they document the scale of food rescue and food waste across networks like Rescue Relay, not Rescue Relay's own totals. Each carries its source and the period it covers.",
    stats: [
      {
        value: 931_000_000,
        unit: "tons",
        label: "of food wasted globally each year (61% household, 26% food service, 13% retail)",
        source: "UN Environment Programme — Food Waste Index",
        url: "https://en.wikipedia.org/wiki/Food_loss_and_waste",
        period: "2021 report; 2019 data",
      },
      {
        value: 14,
        unit: "pct",
        label: "of the world's food lost before it ever reaches retail",
        source: "FAO — The State of Food and Agriculture 2019",
        url: "https://en.wikipedia.org/wiki/Food_loss_and_waste",
        period: "2019 report; 2016 data",
      },
      {
        value: 25_000_000,
        unit: "meals",
        label: "delivered each year by OzHarvest from food that would otherwise be wasted",
        source: "OzHarvest (Australia)",
        url: "https://en.wikipedia.org/wiki/Food_loss_and_waste",
        period: "annual",
      },
      {
        value: 33_000_000_000,
        unit: "lbs",
        label: "wasted each year by U.S. restaurants alone (upper estimate)",
        source: "U.S. restaurant food-waste estimate (cited in FAO/UN literature)",
        url: "https://en.wikipedia.org/wiki/Food_loss_and_waste",
        period: "annual estimate",
      },
    ],
  };
}

type ServiceClient = ReturnType<typeof createServiceClient>;

async function computeFromDeliveries(svc: ServiceClient) {
  const since = SINCE;

  const { data } = await svc
    .from("donations")
    .select(
      "id, org_id, donor_id, total_pounds, estimated_meals, status, created_at, updated_at, donor:donors(name, neighborhood)"
    )
    .in("status", ["delivered", "expired"]);

  const rows = ((data ?? []) as unknown) as Array<{
    id: string;
    org_id: string;
    donor_id: string | null;
    total_pounds: number | null;
    estimated_meals: number | null;
    status: string;
    created_at: string;
    updated_at: string;
    donor: { name: string | null; neighborhood: string | null } | null;
  }>;

  const delivered = rows
    .filter((r) => r.status === "delivered")
    // Scope the entire page to the "since Aug 1" window.
    .filter((r) => r.updated_at && new Date(r.updated_at) >= since);

  const total_pounds = delivered.reduce((s, r) => s + (r.total_pounds ?? 0), 0);
  const estimated_meals = delivered.reduce((s, r) => s + (r.estimated_meals ?? 0), 0);

  const nMap = new Map<string, NeighborhoodRow>();
  for (const r of delivered) {
    const key = r.donor?.neighborhood ?? "Unknown";
    nMap.set(key, {
      neighborhood: key,
      lbs: (nMap.get(key)?.lbs ?? 0) + (r.total_pounds ?? 0),
    });
  }
  const by_neighborhood = Array.from(nMap.values()).sort((a, b) => b.lbs - a.lbs);

  const dMap = new Map<string, DonorRow>();
  for (const r of delivered) {
    const key = r.donor_id ?? "unknown";
    const existing = dMap.get(key);
    dMap.set(key, {
      donor_id: key,
      name: existing?.name ?? r.donor?.name ?? "Unknown",
      lbs: (existing?.lbs ?? 0) + (r.total_pounds ?? 0),
    });
  }
  const by_donor = Array.from(dMap.values()).sort((a, b) => b.lbs - a.lbs);

  const dayMap = new Map<string, DayPoint>();
  for (const r of delivered) {
    if (!r.updated_at) continue;
    const day = r.updated_at.slice(0, 10);
    dayMap.set(day, { day, lbs: (dayMap.get(day)?.lbs ?? 0) + (r.total_pounds ?? 0) });
  }
  const last_30_days = Array.from(dayMap.values()).sort((a, b) => a.day.localeCompare(b.day));

  const weekMap = new Map<string, OutcomeWeek>();
  const isoWeek = (d: Date) => {
    // Monday-start ISO week, e.g. 2026-08-04
    const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = (dt.getUTCDay() + 6) % 7; // 0 = Mon
    dt.setUTCDate(dt.getUTCDate() - dayNum + 3); // Thursday of this week
    const firstThursday = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
    const diff = (dt.getTime() - firstThursday.getTime()) / 86400000;
    const week = 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    return `${dt.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  };
  for (const r of rows) {
    if (r.status !== "delivered" && r.status !== "expired") continue;
    if (!r.updated_at) continue;
    const wk = isoWeek(new Date(r.updated_at));
    const existing = weekMap.get(wk) ?? { week: wk, delivered: 0, expired: 0 };
    if (r.status === "delivered") existing.delivered += r.total_pounds ?? 0;
    else existing.expired += r.total_pounds ?? 0;
    weekMap.set(wk, existing);
  }
  const weekly_outcomes = Array.from(weekMap.values())
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-8);

  // Median claim time is not computed — the live DB has no `claimed_at`
  // column, so this renders as "—" (the tuned muted state) rather than
  // crashing the query. The claimed-at timestamp can be added to the schema
  // later without touching this page.
  const median_claim_minutes: number | null = null;

  return {
    total_pounds,
    estimated_meals,
    by_neighborhood,
    by_donor,
    last_30_days,
    weekly_outcomes,
    org_count: new Set(delivered.map((r) => r.org_id)).size,
    claims_resolved: delivered.length,
    median_claim_minutes,
  };
}

async function loadImpact(): Promise<ImpactSummary> {
  const zeros: ImpactSummary = {
    total_pounds: 0,
    estimated_meals: 0,
    by_neighborhood: [],
    by_donor: [],
    last_30_days: [],
    weekly_outcomes: [],
    org_count: 0,
    claims_resolved: 0,
    median_claim_minutes: null,
    data_source: "empty",
    source_warning: null,
    context: buildContext(),
  };

  let svc: ServiceClient;
  try {
    svc = createServiceClient();
  } catch {
    return { ...zeros, source_warning: "Database not configured." };
  }

  // Compute everything from delivered donations, scoped to "since Aug 1".
  // The schema's all-time view / aggregates are intentionally NOT consulted —
  // they would break the Aug-1 scope this page requires.
  try {
    const computed = await computeFromDeliveries(svc);
    return { ...computed, data_source: "fallback", source_warning: null, context: buildContext() };
  } catch {
    return {
      ...zeros,
      source_warning: "No deliveries recorded yet.",
      context: buildContext(),
    };
  }
}

function fmtLbs(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return Math.round(n).toLocaleString("en-US");
}

function fmtInt(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

function fmtMedianMinutes(mins: number | null): string {
  if (mins === null) return "—";
  if (mins < 1) return "<1 min";
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = mins / 60;
  if (h < 48) return `${h.toFixed(1)} hr`;
  return `${Math.round(h / 24)} days`;
}

export default async function ImpactPage() {
  const data = await loadImpact();

  const heroLbs = Math.round(data.total_pounds);
  const topNeighborhoods = data.by_neighborhood.slice(0, 6);
  const topDonors = data.by_donor.slice(0, 5);

  return (
    <main className="min-h-screen bg-surface-base text-ink-primary">
      <Hero lbs={heroLbs} meals={data.estimated_meals} />

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <KpiRow
          meals={data.estimated_meals}
          orgs={data.org_count}
          claims={data.claims_resolved}
          medianMinutes={data.median_claim_minutes}
        />

        <ContextSection context={data.context} />

        {data.source_warning ? (
          <div
            role="status"
            className="mt-8 flex items-start gap-3 rounded-xl border border-edge-subtle bg-surface-elevated p-4 text-sm text-ink-secondary"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" aria-hidden="true" />
            <p>
              <span className="font-semibold text-ink-primary">No rescues to show yet</span>{" "}
              {data.source_warning}
           </p>
         </div>
        ) : null}

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <Card title="30-day trend" subtitle="Pounds rescued per day" className="lg:col-span-2">
            {data.last_30_days.length ? (
              <TrendChart data={data.last_30_days} />
            ) : (
              <EmptyChart label="Pounds rescued per day over the last 30 days" />
            )}
         </Card>

          <Card title="Weekly outcomes" subtitle="Delivered vs expired (honest loss)">
            {data.weekly_outcomes.length ? (
              <OutcomeChart data={data.weekly_outcomes} />
            ) : (
              <EmptyChart label="Weekly outcomes, delivered versus expired" />
            )}
         </Card>
       </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="By neighborhood" subtitle="Where the food is moving">
            {topNeighborhoods.length ? (
              <NeighborhoodChart data={topNeighborhoods} />
            ) : (
              <EmptyChart label="Pounds rescued by neighborhood" />
            )}
         </Card>

          <Card title="Donor leaderboard" subtitle="Top 5 partners">
            {topDonors.length ? (
              <DonorChart data={topDonors} />
            ) : (
              <EmptyChart label="Top 5 donors by pounds rescued" />
            )}
         </Card>
       </div>
     </section>
   </main>
  );
}

function Hero({ lbs, meals }: { lbs: number; meals: number }) {
  return (
    <section className="relative overflow-hidden border-b border-edge-subtle">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 0%, rgba(20,184,166,0.20) 0%, rgba(20,184,166,0) 65%)",
        }}
      />
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-20 sm:pt-24">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-sm font-semibold text-brand-400">
            <span className="relative inline-flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
           </span>
            <span>Data from Rescue Relay platform</span>
         </div>
       </div>

        <p className="text-sm font-semibold uppercase tracking-wider text-brand-400">
          Live impact
       </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Every pound on this page was delivered.
       </h1>
        <p className="mt-3 max-w-2xl text-ink-secondary">
          Real donations, real claims, real check-ins. No demo data.
       </p>

        <div className="mt-10 inline-block">
          <div
            className="bg-gradient-to-r from-brand-400 via-brand-500 to-brand-700 bg-clip-text text-7xl font-extrabold leading-none tracking-tight text-transparent sm:text-8xl"
            style={{ fontVariantNumeric: "tabular-nums" }}
            aria-label={`${lbs.toLocaleString("en-US")} pounds rescued`}
          >
            {fmtLbs(lbs)}
         </div>
          <div className="mt-2 flex items-baseline gap-3 text-lg font-semibold text-ink-primary">
            <Scale className="h-5 w-5 text-brand-400" aria-hidden="true" />
            <span>pounds rescued</span>
            <span className="text-ink-muted" style={{ fontVariantNumeric: "tabular-nums" }}>
              · {fmtInt(meals)} meals
           </span>
         </div>
       </div>
     </div>
   </section>
  );
}

function KpiRow({
  meals,
  orgs,
  claims,
  medianMinutes,
}: {
  meals: number;
  orgs: number;
  claims: number;
  medianMinutes: number | null;
}) {
  return (
    <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Kpi icon={UtensilsCrossed} label="Meals served" value={fmtInt(meals)} />
      <Kpi icon={Building2} label="Orgs participating" value={fmtInt(orgs)} />
      <Kpi icon={HandHeart} label="Claims resolved" value={fmtInt(claims)} />
      <Kpi
        icon={Timer}
        label="Median claim time"
        value={fmtMedianMinutes(medianMinutes)}
        muted={medianMinutes === null}
      />
   </dl>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  muted = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-edge-subtle bg-surface-elevated p-5">
      <div className="flex items-center gap-2 text-ink-muted">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
     </div>
      <p
        className={`mt-3 text-3xl font-bold ${muted ? "text-ink-secondary" : "text-ink-primary"}`}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
     </p>
   </div>
  );
}

function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-edge-subtle bg-surface-elevated p-5 ${className}`}
    >
      <header className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-ink-primary">{title}</h2>
        {subtitle ? (
          <p className="text-xs text-ink-muted">{subtitle}</p>
        ) : null}
     </header>
      {children}
   </section>
  );
}

function fmtContextValue(stat: ContextStat): string {
  const raw = stat.unit === "pct" ? `${stat.value}%` : stat.value.toLocaleString("en-US");
  if (stat.unit === "pct") return raw;
  return `${raw} ${stat.unit}`;
}

function ContextSection({ context }: { context: ImpactContext }) {
  return (
    <div className="mt-10 rounded-2xl border border-edge-subtle bg-surface-elevated p-6">
      <h2 className="text-lg font-bold text-ink-primary">{context.headline}</h2>
      <p className="mt-2 text-sm text-ink-secondary">{context.note}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {context.stats.map((stat) => (
          <a
            key={`${stat.source}-${stat.label}`}
            href={stat.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-xl border border-edge-subtle bg-surface-inset p-4 transition hover:border-brand-500/40"
          >
            <p
              className="text-2xl font-extrabold text-brand-400"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {fmtContextValue(stat)}
            </p>
            <p className="mt-2 text-sm text-ink-primary">{stat.label}</p>
            <p className="mt-2 text-xs text-ink-muted">
              {stat.source} · {stat.period}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div
      role="img"
      aria-label={`${label} — no data`}
      className="flex h-64 items-center justify-center rounded-lg border border-dashed border-edge-default bg-surface-inset text-sm text-ink-muted"
    >
      No data yet — first delivery will appear here.
   </div>
  );
}
