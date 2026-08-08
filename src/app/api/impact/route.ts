// Rescue Relay — GET /api/impact
// Public live-impact data source. Aggregated via the `impact_summary` view
// (service role, no auth); falls back to computing from delivered donations
// if the view isn't available yet.
//
// Scoped to activity since 2026-08-01 ("the movement window") and enriched with
// real, sourced food-rescue context figures (the "wider movement") so the public
// impact page shows both what Rescue Relay delivered AND the real-world food
// rescue ecosystem it plugs into.

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { fail, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

// "Since Aug 1" scope window (UTC). Everything on the impact page reflects
// this period.
const SINCE = new Date("2026-08-01T00:00:00.000Z");

interface NeighborhoodRow {
  neighborhood: string;
  total_pounds: number;
  donations: number;
}
interface DonorRow {
  donor_id: string;
  name: string;
  total_pounds: number;
  donations: number;
}
interface DayRow {
  date: string;
  total_pounds: number;
  meals: number;
  donations: number;
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
interface ImpactSummary {
  total_pounds: number;
  estimated_meals: number;
  by_neighborhood: NeighborhoodRow[];
  by_donor: DonorRow[];
  last_30_days: DayRow[];
  source: string;
  context: ImpactContext;
}

type ServiceClient = ReturnType<typeof createServiceClient>;

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

/** Fallback: derive the same shape directly from delivered donations. */
async function computeFromDeliveries(
  svc: ServiceClient
): Promise<Pick<ImpactSummary, "total_pounds" | "estimated_meals" | "by_neighborhood" | "by_donor" | "last_30_days">> {
  const { data, error } = await svc
    .from("donations")
    .select(
      "id, donor_id, total_pounds, estimated_meals, updated_at, donor:donors(name, neighborhood)"
    )
    .eq("status", "delivered");
  if (error) throw new Error(error.message);

  const donations = (data ?? []) as unknown as Array<{
    id: string;
    donor_id: string | null;
    total_pounds: number | null;
    estimated_meals: number | null;
    updated_at: string | null;
    donor: { name: string | null; neighborhood: string | null } | null;
  }>;

  // Only count deliveries within the "since Aug 1" window.
  const scoped = donations.filter((d) => d.updated_at && new Date(d.updated_at) >= SINCE);

  const totals = scoped.reduce(
    (acc, d) => ({
      total_pounds: acc.total_pounds + (d.total_pounds ?? 0),
      estimated_meals: acc.estimated_meals + (d.estimated_meals ?? 0),
    }),
    { total_pounds: 0, estimated_meals: 0 }
  );

  const neighborhoods = new Map<string, NeighborhoodRow>();
  for (const d of scoped) {
    const key = d.donor?.neighborhood ?? "Unknown";
    const row = neighborhoods.get(key) ?? { neighborhood: key, total_pounds: 0, donations: 0 };
    row.total_pounds += d.total_pounds ?? 0;
    row.donations += 1;
    neighborhoods.set(key, row);
  }
  const by_neighborhood = Array.from(neighborhoods.values()).sort(
    (a, b) => b.total_pounds - a.total_pounds
  );

  const donors = new Map<string, DonorRow>();
  for (const d of scoped) {
    const key = d.donor_id ?? "unknown";
    const row = donors.get(key) ?? {
      donor_id: key,
      name: d.donor?.name ?? "Unknown",
      total_pounds: 0,
      donations: 0,
    };
    row.total_pounds += d.total_pounds ?? 0;
    row.donations += 1;
    donors.set(key, row);
  }
  const by_donor = Array.from(donors.values()).sort((a, b) => b.total_pounds - a.total_pounds);

  const days = new Map<string, DayRow>();
  for (const d of scoped) {
    if (!d.updated_at) continue;
    const date = d.updated_at.slice(0, 10); // YYYY-MM-DD
    const row = days.get(date) ?? { date, total_pounds: 0, meals: 0, donations: 0 };
    row.total_pounds += d.total_pounds ?? 0;
    row.meals += d.estimated_meals ?? 0;
    row.donations += 1;
    days.set(date, row);
  }
  const last_30_days = Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date));

  return { ...totals, by_neighborhood, by_donor, last_30_days };
}

export async function GET(_req: NextRequest) {
  try {
    const svc = createServiceClient();

    // Compute everything from delivered donations, scoped to "since Aug 1".
    // The schema's all-time impact_summary view is intentionally NOT used
    // here — it would break the Aug-1 scope the page requires.
    const summary = await computeFromDeliveries(svc);

    return NextResponse.json(
      ok({
        ...summary,
        source: "Rescue Relay platform",
        context: buildContext(),
      }),
      { status: 200 }
    );
  } catch {
    return NextResponse.json(fail("Could not load impact data", "server_error"), {
      status: 500,
    });
  }
}