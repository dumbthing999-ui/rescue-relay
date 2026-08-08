// Rescue Relay — StatusPill
// Shared visual state for Donation["status"]. Colors per the design spec:
// available=warning/amber, claimed=good/green, in_transit=info/blue,
// delivered=good/green, expired=critical/red, cancelled=muted.

import type { Donation } from "@/types";

const STYLES: Record<Donation["status"], string> = {
  available: "border-amber-400/30 bg-amber-400/10 text-amber-400",
  claimed: "border-green-400/30 bg-green-400/10 text-green-400",
  in_transit: "border-blue-400/30 bg-blue-400/10 text-blue-400",
  delivered: "border-green-400/30 bg-green-500 text-black",
  expired: "border-red-400/30 bg-red-400/10 text-red-400",
  cancelled: "border-edge-default bg-surface-inset text-ink-muted",
};

export default function StatusPill({ status }: { status: Donation["status"] }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${STYLES[status]}`}
    >
      {status.replace("_", " ")}
   </span>
  );
}
