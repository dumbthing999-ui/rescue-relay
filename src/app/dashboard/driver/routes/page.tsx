import Link from "next/link";
import { PackageOpen, Route, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase-server";
import type { Claim, Donation, Trip } from "@/types";

export const dynamic = "force-dynamic";

const TRIP_STATUS_STYLES: Record<Trip["status"], string> = {
  planned: "border-amber-400/30 bg-amber-400/10 text-amber-400",
  in_progress: "border-blue-400/30 bg-blue-400/10 text-blue-400",
  completed: "border-transparent bg-green-500 text-black",
  cancelled: "border-edge-default bg-surface-inset text-ink-muted",
};

const CLAIM_STATUS_STYLES: Record<Claim["status"], string> = {
  active: "border-blue-400/30 bg-blue-400/10 text-blue-400",
  completed: "border-transparent bg-green-500 text-black",
  cancelled: "border-edge-default bg-surface-inset text-ink-muted",
  expired: "border-red-400/30 bg-red-400/10 text-red-400",
};

function statusPill(status: string, styles: Record<string, string>) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[status] ?? styles.planned ?? ""}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

/** Whether every claim on the trip has checked in at every stop. */
function routeComplete(claims: RouteClaim[]): boolean {
  return (
    claims.length > 0 &&
    claims.every(
      (c) =>
        c.pickup_verified &&
        (c.donation?.status === "delivered" || c.delivery_verified)
    )
  );
}

export interface RouteClaim {
  id: string;
  status: Claim["status"];
  pickup_verified: boolean;
  delivery_verified: boolean;
  donation: Pick<Donation, "id" | "status"> | null;
}

export default async function DriverRoutesPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null; // dashboard/page.tsx redirects unauthenticated users
  }

  const { data, error } = await supabase
    .from("trips")
    .select(
      "*, claims(*, donation:donations(id, status))"
    )
    .eq("driver_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-edge-subtle bg-surface-elevated p-10 text-center">
          <Route className="mx-auto h-8 w-8 text-ink-muted" />
          <h1 className="mt-4 text-lg font-semibold text-ink-primary">
            Couldn&apos;t load your trips
          </h1>
          <p className="mt-2 text-sm text-ink-secondary">
            Something went wrong while fetching your routes. Please try again in
            a moment.
          </p>
        </div>
      </div>
    );
  }

  const trips = (data ?? []) as (Trip & { claims: RouteClaim[] })[];

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">My routes</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Every trip you&apos;ve driven, from planning to completion.
          </p>
        </div>
        <Link
          href="/dashboard/driver"
          className="flex items-center gap-2 rounded-lg border border-edge-default px-4 py-2 font-semibold text-ink-secondary transition hover:border-brand-400 hover:text-brand-400"
        >
          <PackageOpen className="h-4 w-4" />
          Browse rescues
        </Link>
      </div>

      {trips.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-edge-subtle bg-surface-elevated p-10 text-center">
          <Truck className="mx-auto h-8 w-8 text-ink-muted" />
          <h2 className="mt-4 text-lg font-semibold text-ink-primary">
            No trips yet
          </h2>
          <p className="mt-2 text-sm text-ink-secondary">
            Claim a rescue and your route will show up here.
          </p>
          <Link
            href="/dashboard/driver"
            className="mt-6 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-400"
          >
            Browse open rescues
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {trips.map((trip) => {
            const claims = trip.claims ?? [];
            const stopped = trip.status === "cancelled";
            const complete =
              trip.status === "completed" || routeComplete(claims);
            return (
              <li key={trip.id}>
                <Link
                  href={`/dashboard/driver/routes/${trip.id}`}
                  className="block rounded-2xl border border-edge-subtle bg-surface-elevated p-5 transition hover:border-brand-400"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-brand-400" />
                      <span className="font-semibold text-ink-primary">
                        {claims.length === 0
                          ? "Empty trip"
                          : claims.length === 1
                            ? `${claims[0].donation?.id.slice(0, 8) ?? "Trip"}`
                            : `${claims.length} stops`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!stopped && complete && (
                        <span className="inline-flex rounded-full border border-green-400/30 bg-green-400/10 px-2.5 py-0.5 text-xs font-semibold text-green-400">
                          Complete
                        </span>
                      )}
                      {statusPill(trip.status, TRIP_STATUS_STYLES)}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-ink-secondary">
                    {claims.length === 0
                      ? "No claims attached yet."
                      : claims
                          .map(
                            (c) =>
                              `${c.donation?.id.slice(0, 8) ?? "Stop"} ${
                                c.donation?.status ?? c.status
                              }`
                          )
                          .join(" · ")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {claims.map((c) => statusPill(c.status, CLAIM_STATUS_STYLES))}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
