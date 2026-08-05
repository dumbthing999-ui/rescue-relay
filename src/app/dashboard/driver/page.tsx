import Link from "next/link";
import {
  MapPin,
  PackageOpen,
  PackagePlus,
  Snowflake,
  Timer,
} from "lucide-react";
import { createClient } from "@/lib/supabase-server";
import type { Donation, DonationItem, Donor } from "@/types";
import ClaimButton from "@/components/driver/ClaimButton";
import CountdownTimer from "@/components/driver/CountdownTimer";

export const dynamic = "force-dynamic";

const PERISHABILITY_LABELS: Record<Donation["perishability"], string> = {
  dry_goods: "Dry goods",
  produce: "Produce",
  refrigerated: "Refrigerated",
  frozen: "Frozen",
  prepared: "Prepared",
};

function formatWindow(start: string, end: string) {
  const startFmt = new Date(start).toLocaleString("en-US", {
    weekday: "short",
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

function itemSummary(donation: Donation & { items?: DonationItem[] }) {
  const first = donation.items?.[0];
  if (!first) return "No items listed";
  const extra = (donation.items?.length ?? 1) - 1;
  return extra > 0 ? `${first.item_name} +${extra} more` : first.item_name;
}

export default async function DriverDashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null; // dashboard/page.tsx redirects unauthenticated users
  }

  const { data, error } = await supabase
    .from("donations")
    .select("*, donor:donors(name, neighborhood), items:donation_items(*)")
    .eq("status", "available")
    .gt("pickup_window_end", new Date().toISOString())
    .order("pickup_window_end", { ascending: true });

  // Query errors (e.g. schema not applied yet) degrade to an empty board.
  const rescues = (data ?? []) as (Donation & {
    donor: { name: string | null; neighborhood: string | null } | null;
    items: DonationItem[];
  })[];
  const hasError = !!error;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">Driver dashboard</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Open rescues near you — claim one to start the relay.
          </p>
        </div>
        <Link
          href="/dashboard/driver/routes"
          className="flex items-center gap-2 rounded-lg border border-edge-default px-4 py-2 font-semibold text-ink-secondary transition hover:border-brand-400 hover:text-brand-400"
        >
          <PackageOpen className="h-4 w-4" />
          My routes
        </Link>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-ink-primary">
        Open rescues
      </h2>

      {hasError || rescues.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-edge-subtle bg-surface-elevated p-10 text-center">
          <PackagePlus className="mx-auto h-8 w-8 text-ink-muted" />
          <h3 className="mt-4 text-lg font-semibold text-ink-primary">
            No open rescues right now
          </h3>
          <p className="mt-2 text-sm text-ink-secondary">
            Be the first to post — dinner doesn&apos;t wait.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {rescues.map((donation) => (
            <article
              key={donation.id}
              className="flex flex-col rounded-2xl border border-edge-subtle bg-surface-elevated p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-ink-primary">
                  {itemSummary(donation)}
                </h3>
                <CountdownTimer endISO={donation.pickup_window_end} />
              </div>

              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-secondary">
                <MapPin className="h-3.5 w-3.5 text-brand-400" />
                {donation.donor?.name ?? "Unknown donor"}
                {donation.donor?.neighborhood
                  ? ` · ${donation.donor.neighborhood}`
                  : ""}
              </p>

              <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-secondary">
                <Timer className="h-3.5 w-3.5 text-brand-400" />
                {formatWindow(donation.pickup_window_start, donation.pickup_window_end)}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border border-edge-default bg-surface-inset px-2.5 py-0.5 text-xs font-medium capitalize text-ink-secondary">
                  {PERISHABILITY_LABELS[donation.perishability]}
                </span>
                {donation.cold_chain_required && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-0.5 text-xs font-medium text-sky-400">
                    <Snowflake className="h-3 w-3" />
                    Cold chain required
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-end justify-between gap-4 border-t border-edge-subtle pt-4">
                <p className="text-xs text-ink-muted">
                  {Math.round(donation.total_pounds ?? 0)} lbs ·{" "}
                  {Math.round(donation.estimated_meals ?? 0)} meals
                </p>
                <div className="w-36 shrink-0">
                  <ClaimButton donationId={donation.id} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
