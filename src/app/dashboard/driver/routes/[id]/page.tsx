import Link from "next/link";
import { ArrowLeft, MapPin, Package, Route, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase-server";
import type { Claim, Donation, DonationItem, Trip } from "@/types";
import CheckInButton from "@/components/driver/CheckInButton";
import StopTimeline, { type Stop } from "@/components/driver/StopTimeline";
import type { RouteClaim } from "../page";

export const dynamic = "force-dynamic";

const TRIP_STATUS_STYLES: Record<Trip["status"], string> = {
  planned: "border-amber-400/30 bg-amber-400/10 text-amber-400",
  in_progress: "border-blue-400/30 bg-blue-400/10 text-blue-400",
  completed: "border-transparent bg-green-500 text-black",
  cancelled: "border-edge-default bg-surface-inset text-ink-muted",
};

function statusPill(status: Trip["status"]) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${TRIP_STATUS_STYLES[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function formatWindow(start: string | null, end: string | null) {
  if (!start || !end) return "No pickup window set";
  const startFmt = new Date(start).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = new Date(end).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${startFmt} – ${endTime}`;
}

function itemSummary(items: DonationItem[]) {
  const first = items?.[0];
  if (!first) return "No items listed";
  const extra = items.length - 1;
  return extra > 0 ? `${first.item_name} +${extra} more` : first.item_name;
}

export default async function TripDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null; // dashboard/page.tsx redirects unauthenticated users
  }

  const { data, error } = await supabase
    .from("trips")
    .select("*, claims(*, donation:donations(*, donor:donors(*), items:donation_items(*)))")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-edge-subtle bg-surface-elevated p-10 text-center">
          <Route className="mx-auto h-8 w-8 text-ink-muted" />
          <h1 className="mt-4 text-lg font-semibold text-ink-primary">
            Trip not found
          </h1>
          <p className="mt-2 text-sm text-ink-secondary">
            It may have been removed, or this link is out of date.
          </p>
          <Link
            href="/dashboard/driver/routes"
            className="mt-6 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-400"
          >
            Back to my routes
          </Link>
        </div>
      </div>
    );
  }

  const trip = data as Trip & {
    claims: (RouteClaim & {
      donation: (Donation & {
        donor: { name: string | null; neighborhood: string | null } | null;
        items: DonationItem[];
      }) | null;
    })[];
  };

  if (trip.driver_id !== user.id) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-edge-subtle bg-surface-elevated p-10 text-center">
          <Truck className="mx-auto h-8 w-8 text-ink-muted" />
          <h1 className="mt-4 text-lg font-semibold text-ink-primary">
            Not your trip
          </h1>
          <p className="mt-2 text-sm text-ink-secondary">
            You can only view trips you drive.
          </p>
          <Link
            href="/dashboard/driver/routes"
            className="mt-6 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-400"
          >
            Back to my routes
          </Link>
        </div>
      </div>
    );
  }

  const claims = trip.claims ?? [];
  const canCheckIn =
    trip.status === "planned" || trip.status === "in_progress";

  // One timeline per claim (route_order respected when present).
  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link
        href="/dashboard/driver/routes"
        className="inline-flex items-center gap-1.5 text-sm text-ink-secondary transition hover:text-ink-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to my routes
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink-primary">
          {claims.length === 0
            ? "Trip"
            : claims.length === 1
              ? itemSummary(claims[0].donation?.items ?? [])
              : `${claims.length} stops`}
        </h1>
        {statusPill(trip.status)}
      </div>

      {claims.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-edge-subtle bg-surface-elevated p-10 text-center">
          <Package className="mx-auto h-8 w-8 text-ink-muted" />
          <h2 className="mt-4 text-lg font-semibold text-ink-primary">
            No claims on this trip
          </h2>
          <p className="mt-2 text-sm text-ink-secondary">
            It looks like this trip doesn&apos;t have any rescues attached yet.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {claims.map((claim) => {
            const donation = claim.donation;
            const stops: Stop[] = [
              { type: "pickup", label: "Pickup", checkedIn: claim.pickup_verified },
              {
                type: "delivery",
                label: "Delivery",
                checkedIn: claim.delivery_verified,
              },
            ];
            const done =
              claim.status === "completed" ||
              claim.donation?.status === "delivered" ||
              claim.status === "cancelled" ||
              claim.status === "expired";
            return (
              <section
                key={claim.id}
                className="rounded-2xl border border-edge-subtle bg-surface-elevated p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-ink-primary">
                      {itemSummary(donation?.items ?? [])}
                    </h2>
                    {donation?.donor && (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-secondary">
                        <MapPin className="h-3.5 w-3.5 text-brand-400" />
                        {donation.donor.name ?? "Unknown donor"}
                        {donation.donor.neighborhood
                          ? ` · ${donation.donor.neighborhood}`
                          : ""}
                      </p>
                    )}
                    {donation && (
                      <p className="mt-1 text-xs text-ink-muted">
                        Pickup window:{" "}
                        {formatWindow(
                          donation.pickup_window_start,
                          donation.pickup_window_end
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 border-t border-edge-subtle pt-4">
                  <StopTimeline stops={stops}>
                    {canCheckIn && !done && (
                      <CheckInButton
                        claimId={claim.id}
                        type="pickup"
                        label="Check in at pickup"
                      />
                    )}
                    {canCheckIn && !done && (
                      <CheckInButton
                        claimId={claim.id}
                        type="delivery"
                        label="Check in at delivery"
                      />
                    )}
                  </StopTimeline>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
