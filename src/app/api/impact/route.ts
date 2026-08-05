// Rescue Relay — GET /api/impact
// Public live-impact data source. Aggregated via the `impact_summary` view
// (service role, no auth); falls back to computing from delivered donations
// if the view isn't available yet.

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { fail, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

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
interface ImpactSummary {
  total_pounds: number;
  estimated_meals: number;
  by_neighborhood: NeighborhoodRow[];
  by_donor: DonorRow[];
  last_30_days: DayRow[];
}

type ServiceClient = ReturnType<typeof createServiceClient>;

/** Preferred path: read the pre-aggregated `impact_summary` view (single row). */
async function readFromView(svc: ServiceClient): Promise<ImpactSummary | null> {
  const { data, error } = await svc.from("impact_summary").select("*").maybeSingle();
  if (error || !data) return null;

  return {
    total_pounds: data.total_pounds ?? 0,
    estimated_meals: data.estimated_meals ?? 0,
    by_neighborhood: data.by_neighborhood ?? [],
    by_donor: data.by_donor ?? [],
    last_30_days: data.last_30_days ?? [],
  };
}

/** Fallback: derive the same shape directly from delivered donations. */
async function computeFromDeliveries(svc: ServiceClient): Promise<ImpactSummary> {
  const since = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

  const { data, error } = await svc
    .from("donations")
    .select("id, donor_id, total_pounds, estimated_meals, updated_at, donor:donors(name, neighborhood)")
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

  const totals = donations.reduce(
    (acc, d) => ({
      total_pounds: acc.total_pounds + (d.total_pounds ?? 0),
      estimated_meals: acc.estimated_meals + (d.estimated_meals ?? 0),
    }),
    { total_pounds: 0, estimated_meals: 0 }
  );

  const neighborhoods = new Map<string, NeighborhoodRow>();
  for (const d of donations) {
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
  for (const d of donations) {
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
  for (const d of donations) {
    if (!d.updated_at || d.updated_at < since) continue;
    const date = d.updated_at.slice(0, 10); // YYYY-MM-DD
    const row = days.get(date) ?? { date, total_pounds: 0, meals: 0, donations: 0 };
    row.total_pounds += d.total_pounds ?? 0;
    row.meals += d.estimated_meals ?? 0;
    row.donations += 1;
    days.set(date, row);
  }
  const last_30_days = Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date));

  return {
    total_pounds: totals.total_pounds,
    estimated_meals: totals.estimated_meals,
    by_neighborhood,
    by_donor,
    last_30_days,
  };
}

export async function GET(_req: NextRequest) {
  try {
    const svc = createServiceClient();

    // Prefer the schema's aggregate view; fall back to live computation.
    let summary = await readFromView(svc);
    if (!summary) summary = await computeFromDeliveries(svc);

    return NextResponse.json(ok(summary), { status: 200 });
  } catch {
    return NextResponse.json(fail("Could not load impact data", "server_error"), {
      status: 500,
    });
  }
}
