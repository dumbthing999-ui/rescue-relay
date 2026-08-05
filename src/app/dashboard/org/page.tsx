import Link from "next/link";
import { PackagePlus, PackageOpen, Truck, Scale, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase-server";
import type { Donation } from "@/types";

export const dynamic = "force-dynamic";

// Status pill — visual states defined in the task spec.
function StatusPill({ status }: { status: Donation["status"] }) {
  const styles: Record<Donation["status"], string> = {
    available: "border-amber-400/30 bg-amber-400/10 text-amber-400",
    claimed: "border-green-400/30 bg-green-400/10 text-green-400",
    in_transit: "border-blue-400/30 bg-blue-400/10 text-blue-400",
    delivered: "border-transparent bg-green-500 text-black",
    expired: "border-red-400/30 bg-red-400/10 text-red-400",
    cancelled: "border-edge-default bg-surface-inset text-ink-muted",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function formatWindow(start: string, end: string) {
  const fmt: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  return `${new Date(start).toLocaleString("en-US", fmt)} – ${new Date(
    end
  ).toLocaleString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

function itemSummary(donation: Donation & { donation_items: { item_name: string }[] }) {
  const first = donation.donation_items?.[0];
  if (!first) return "No items listed";
  const extra = donation.donation_items.length - 1;
  return extra > 0 ? `${first.item_name} +${extra} more` : first.item_name;
}

export default async function OrgDashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null; // dashboard/page.tsx redirects unauthenticated users
  }

  // Find the org this user belongs to via memberships.
  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("org_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return (
      <EmptyState
        icon={Building2}
        title="Couldn't load your organization"
        body="Something went wrong while fetching your dashboard. Please try again in a moment."
      />
    );
  }

  if (!membership) {
    return (
      <EmptyState
        icon={Building2}
        title="You're not linked to an organization yet"
        body="Ask an organization admin to add you as staff, then check back here to start posting donations."
        actionHref="/impact"
        actionLabel="Browse live impact"
      />
    );
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", membership.org_id)
    .single();

  // All of this org's donations; query errors render as an empty board.
  const { data: donations } = await supabase
    .from("donations")
    .select("*, donor:donors(*), donation_items(*)")
    .eq("org_id", membership.org_id)
    .order("created_at", { ascending: false });

  const rows = (donations ?? []) as (Donation & {
    donor: { name: string | null } | null;
    donation_items: { item_name: string }[];
  })[];

  const activeRescues = rows.filter((d) => d.status === "available").length;
  const inTransit = rows.filter((d) => d.status === "in_transit").length;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const lbsThisMonth = rows
    .filter((d) => d.status === "delivered" && new Date(d.created_at) >= monthStart)
    .reduce((sum, d) => sum + (d.total_pounds ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">
            {org?.name ?? "Organization dashboard"}
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Keep food moving — post donations and track every rescue.
          </p>
        </div>
        <Link
          href="/dashboard/org/donate"
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 font-semibold text-black transition hover:bg-brand-400"
        >
          <PackagePlus className="h-4 w-4" />
          Post a donation
        </Link>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={PackageOpen}
          label="Active rescues"
          value={activeRescues}
        />
        <StatCard icon={Truck} label="In transit" value={inTransit} />
        <StatCard
          icon={Scale}
          label="Lbs delivered this month"
          value={`${Math.round(lbsThisMonth)} lbs`}
        />
      </div>

      {/* Recent donations */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink-primary">Recent donations</h2>
        {rows.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-edge-subtle bg-surface-elevated p-10 text-center">
            <p className="text-sm text-ink-secondary">
              No donations yet — post your first one to start the relay.
            </p>
            <Link
              href="/dashboard/org/donate"
              className="mt-4 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-400"
            >
              Post a donation
            </Link>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-edge-subtle bg-surface-elevated">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-edge-subtle text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium">Donor</th>
                  <th className="px-4 py-3 font-medium">Pickup window</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((donation) => (
                  <tr
                    key={donation.id}
                    className="border-b border-edge-subtle transition last:border-0 hover:bg-surface-hover"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/org/donations/${donation.id}`}
                        className="font-medium text-ink-primary hover:text-brand-400"
                      >
                        {itemSummary(donation)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">
                      {donation.donor?.name ?? "Unknown donor"}
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">
                      {formatWindow(
                        donation.pickup_window_start,
                        donation.pickup_window_end
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={donation.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-edge-subtle bg-surface-elevated p-5">
      <div className="flex items-center gap-2 text-ink-muted">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-3 text-3xl font-bold text-ink-primary">{value}</p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  actionHref,
  actionLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mx-auto max-w-md p-6">
      <div className="rounded-2xl border border-edge-subtle bg-surface-elevated p-10 text-center">
        <Icon className="mx-auto h-8 w-8 text-ink-muted" />
        <h2 className="mt-4 text-lg font-semibold text-ink-primary">{title}</h2>
        <p className="mt-2 text-sm text-ink-secondary">{body}</p>
        {actionHref && actionLabel && (
          <Link
            href={actionHref}
            className="mt-6 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-400"
          >
            {actionLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
