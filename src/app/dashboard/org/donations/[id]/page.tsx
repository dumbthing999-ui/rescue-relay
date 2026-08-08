import Link from "next/link";
import { ArrowLeft, MapPin, Building2, Package } from "lucide-react";
import { createClient } from "@/lib/supabase-server";
import type { Claim, Donation, DonationItem, Donor } from "@/types";
import DonationActions from "./DonationActions";

export const dynamic = "force-dynamic";

const TIMELINE_STEPS: Donation["status"][] = [
  "available",
  "claimed",
  "in_transit",
  "delivered",
];

function stepIndex(status: Donation["status"]) {
  const i = TIMELINE_STEPS.indexOf(status);
  return i === -1 ? 0 : i;
}

export default async function DonationDetailPage({
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

  // Role gates the cancel action: only org_admin (not org_staff) can cancel.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isOrgAdmin = profile?.role === "org_admin";

  const { data, error } = await supabase
    .from("donations")
    .select(
      "*, donor:donors(*), donation_items(*), current_claim:claims(*, driver:profiles(full_name))"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-edge-subtle bg-surface-elevated p-10 text-center">
          <Package className="mx-auto h-8 w-8 text-ink-muted" />
          <h1 className="mt-4 text-lg font-semibold text-ink-primary">
            Donation not found
          </h1>
          <p className="mt-2 text-sm text-ink-secondary">
            It may have been removed, or this link is out of date.
          </p>
          <Link
            href="/dashboard/org"
            className="mt-6 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-400"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const donation = data as Donation & {
    donor: Donor | null;
    donation_items: DonationItem[];
    current_claim: (Claim & {
      driver: { full_name: string | null } | null;
    }) | null;
  };

  const current = stepIndex(donation.status);
  const complete = donation.status === "delivered";

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link
        href="/dashboard/org"
        className="inline-flex items-center gap-1.5 text-sm text-ink-secondary transition hover:text-ink-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink-primary">
          {donation.donation_items?.[0]?.item_name ?? "Donation"}
          {donation.donation_items && donation.donation_items.length > 1
            ? ` +${donation.donation_items.length - 1} more`
            : ""}
        </h1>
      </div>

      {/* Status timeline */}
      <ol className="mt-6 flex items-center gap-1" aria-label="Donation status">
        {TIMELINE_STEPS.map((step, i) => {
          const reached = complete || i <= current;
          return (
            <li key={step} className="flex flex-1 items-center gap-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`h-3 w-3 rounded-full ${
                    reached ? "bg-brand-500" : "bg-edge-default"
                  }`}
                />
                <span
                  className={`text-xs font-medium capitalize ${
                    i === current
                      ? "text-ink-primary"
                      : reached
                        ? "text-ink-secondary"
                        : "text-ink-muted"
                  }`}
                >
                  {step.replace("_", " ")}
                </span>
              </div>
              {i < TIMELINE_STEPS.length - 1 && (
                <div
                  className={`mb-5 h-0.5 flex-1 ${
                    complete || i < current ? "bg-brand-500" : "bg-edge-default"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_15rem]">
        <div className="space-y-6">
          {/* Items */}
          <section className="rounded-2xl border border-edge-subtle bg-surface-elevated p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Items
            </h2>
            <ul className="mt-3 divide-y divide-edge-subtle">
              {(donation.donation_items ?? []).map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <span className="font-medium text-ink-primary">
                    {item.item_name}
                  </span>
                  <span className="text-ink-secondary">
                    {item.quantity} {item.unit}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-edge-subtle pt-4 text-sm">
              <div>
                <dt className="text-ink-muted">Total weight</dt>
                <dd className="mt-0.5 font-semibold text-ink-primary">
                  {Math.round(donation.total_pounds ?? 0)} lbs
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Estimated meals</dt>
                <dd className="mt-0.5 font-semibold text-ink-primary">
                  {Math.round(donation.estimated_meals ?? 0)}
                </dd>
              </div>
            </dl>
          </section>

          {/* Donor card */}
          <section className="rounded-2xl border border-edge-subtle bg-surface-elevated p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Donor
            </h2>
            <div className="mt-3 flex items-start gap-3">
              <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-400" />
              <div>
                <p className="font-medium text-ink-primary">
                  {donation.donor?.name ?? "Unknown donor"}
                </p>
                {donation.donor?.neighborhood && (
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-secondary">
                    <MapPin className="h-3.5 w-3.5" />
                    {donation.donor.neighborhood}
                  </p>
                )}
              </div>
            </div>
            <dl className="mt-4 grid gap-3 border-t border-edge-subtle pt-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-muted">Pickup window</dt>
                <dd className="mt-0.5 text-ink-primary">
                  {new Date(donation.pickup_window_start).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  –{" "}
                  {new Date(donation.pickup_window_end).toLocaleString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Perishability</dt>
                <dd className="mt-0.5 capitalize text-ink-primary">
                  {donation.perishability.replace("_", " ")}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Cold chain</dt>
                <dd className="mt-0.5 text-ink-primary">
                  {donation.cold_chain_required ? "Required" : "Not required"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Claim deadline</dt>
                <dd className="mt-0.5 text-ink-primary">
                  {new Date(donation.claim_deadline).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
            </dl>
          </section>

          {/* Claim info */}
          <section className="rounded-2xl border border-edge-subtle bg-surface-elevated p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Claim
            </h2>
            {donation.current_claim ? (
              <div className="mt-3 text-sm">
                <p className="text-ink-primary">
                  Claimed by{" "}
                  <span className="font-semibold">
                    {donation.current_claim.driver?.full_name ?? "a driver"}
                  </span>
                </p>
                <p className="mt-1 text-ink-secondary">
                  Claimed{" "}
                  {new Date(donation.current_claim.claimed_at).toLocaleString(
                    "en-US",
                    { month: "short", day: "numeric", hour: "numeric" }
                  )}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">
                No driver has claimed this donation yet.
              </p>
            )}
          </section>
        </div>

        {/* Actions */}
        <aside className="h-fit rounded-2xl border border-edge-subtle bg-surface-elevated p-5 md:sticky md:top-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Actions
          </h2>
          <div className="mt-4">
            <DonationActions
              donationId={donation.id}
              status={donation.status}
              canCancel={isOrgAdmin}
            />
          </div>
          {donation.notes && (
            <p className="mt-4 border-t border-edge-subtle pt-4 text-sm text-ink-secondary">
              {donation.notes}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
