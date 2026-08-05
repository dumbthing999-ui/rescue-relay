"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, MapPin } from "lucide-react";
import { apiFetch } from "@/lib/api";

/**
 * Driver check-in for one route stop (pickup or delivery). Reads the browser
 * location, POSTs to /api/check-ins, and shows the geofence verdict: green
 * inside the zone, amber outside or when location is unavailable.
 */
export default function CheckInButton({
  claimId,
  type,
  label,
}: {
  claimId: string;
  type: "pickup" | "delivery";
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<
    | { kind: "done"; within: boolean }
    | { kind: "error"; message: string }
    | null
  >(null);

  function locate(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    });
  }

  async function checkIn() {
    setBusy(true);
    setState(null);

    const position = await locate();
    if (!position) {
      setBusy(false);
      setState({
        kind: "error",
        message: "Enable location to check in",
      });
      return;
    }

    const result = await apiFetch<{ within_geofence: boolean }>(
      "/api/check-ins",
      {
        method: "POST",
        body: JSON.stringify({
          claim_id: claimId,
          type,
          lat: position.lat,
          lng: position.lng,
        }),
      }
    );

    if (!result.ok) {
      setBusy(false);
      setState({ kind: "error", message: result.error });
      return;
    }

    setState({ kind: "done", within: result.data.within_geofence });
    router.refresh();
  }

  if (state?.kind === "done") {
    return state.within ? (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-green-400/30 bg-green-400/10 px-3 py-1.5 text-xs font-semibold text-green-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Checked in · within geofence
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-400">
        <MapPin className="h-3.5 w-3.5" />
        Outside pickup zone — delivery can&apos;t be verified
      </span>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={checkIn}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-edge-default px-3 py-1.5 text-xs font-semibold text-ink-secondary transition hover:border-brand-400 hover:text-brand-400 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <MapPin className="h-3.5 w-3.5" />
        )}
        {busy ? "Checking in…" : label}
      </button>
      {state?.kind === "error" && (
        <p
          role="alert"
          className="mt-2 inline-block rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-400"
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
