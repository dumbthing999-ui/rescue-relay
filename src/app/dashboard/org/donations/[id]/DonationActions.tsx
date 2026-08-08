"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Donation } from "@/types";

/** Inline actions for the donation detail page (client component). */
export default function DonationActions({
  donationId,
  status,
  canCancel: canCancelProp,
}: {
  donationId: string;
  status: Donation["status"];
  /** Whether the viewing user may cancel (server gates on org_admin). */
  canCancel?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"delivered" | "cancelled" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patch(status: "delivered" | "cancelled") {
    setBusy(status);
    setError(null);
    const result = await apiFetch<{ id: string; status: string }>(
      `/api/donations/${donationId}`,
      { method: "PATCH", body: JSON.stringify({ status }) }
    );
    if (!result.ok) {
      setBusy(null);
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const canDeliver = status === "claimed" || status === "in_transit";
  const roleAllowsCancel = canCancelProp !== false; // default true when prop absent
  const canCancel =
    roleAllowsCancel &&
    (status === "available" ||
      status === "claimed" ||
      status === "in_transit" ||
      status === "expired");

  return (
    <div>
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-400"
        >
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {canDeliver && (
          <button
            type="button"
            onClick={() => patch("delivered")}
            disabled={busy !== null}
            className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-green-400 disabled:opacity-50"
          >
            {busy === "delivered" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Mark delivered
          </button>
        )}
        {canCancel && (
          <button
            type="button"
            onClick={() => patch("cancelled")}
            disabled={busy !== null}
            className="rounded-lg border border-edge-default px-4 py-2 text-sm font-medium text-ink-secondary transition hover:bg-surface-hover hover:text-red-400 disabled:opacity-50"
          >
            {busy === "cancelled" ? "Cancelling…" : "Cancel"}
          </button>
        )}
      </div>
    </div>
  );
}
