import { PackageCheck, PackageOpen } from "lucide-react";

export interface Stop {
  type: "pickup" | "delivery";
  label: string;
  checkedIn: boolean;
}

/**
 * Presentational vertical timeline of a route's stops. Each stop shows its
 * icon (PackageOpen for pickup, PackageCheck for delivery), label, a green
 * "Checked in" stamp when verified, and the children slot (e.g. CheckInButton).
 */
export default function StopTimeline({
  stops,
  children,
}: {
  stops: Stop[];
  children?: React.ReactNode;
}) {
  return (
    <ol className="relative space-y-0">
      {stops.map((stop, i) => {
        const Icon = stop.type === "pickup" ? PackageOpen : PackageCheck;
        const isLast = i === stops.length - 1;
        return (
          <li key={`${stop.type}-${i}`} className="relative flex gap-4 pb-8 last:pb-0">
            {/* Connector line */}
            {!isLast && (
              <span
                aria-hidden
                className="absolute left-[1.0625rem] top-8 h-[calc(100%-2rem)] w-px bg-edge-default"
              />
            )}
            {/* Icon node */}
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                stop.checkedIn
                  ? "border-green-400/30 bg-green-400/10 text-green-400"
                  : "border-edge-default bg-surface-inset text-brand-400"
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            {/* Stop body */}
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <p className="text-sm font-medium text-ink-primary">{stop.label}</p>
                {stop.checkedIn && (
                  <span className="inline-flex items-center rounded-full border border-green-400/30 bg-green-400/10 px-2 py-0.5 text-xs font-semibold text-green-400">
                    Checked in
                  </span>
                )}
              </div>
              <div className="mt-2">{children}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
