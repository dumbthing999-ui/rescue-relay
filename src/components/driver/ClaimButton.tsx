"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, HandHeart, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

/**
 * Claim a rescue (driver side). POSTs to /api/claims and reflects the three
 * outcomes inline: success (green "Claimed — sealed"), already-claimed or
 * claim-window-closed (mapped copy), or a generic error.
 */
export default function ClaimButton({
  donationId,
  onClaimed,
}: {
  donationId: string;
  onClaimed?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setBusy(true);
    setError(null);

    const result = await apiFetch<{ claim: unknown; donation: unknown }>(
      "/api/claims",
      { method: "POST", body: JSON.stringify({ donation_id: donationId }) }
    );

    if (!result.ok) {
      setBusy(false);
      setError(
        result.code === "already_claimed"
          ? "Claimed by another driver"
          : result.code === "claim_window_closed"
            ? "Claim window closed"
            : result.error
      );
      return;
    }

    setClaimed(true);
    onClaimed?.();
    router.refresh();
  }

  if (claimed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-green-400/30 bg-green-400/10 px-3 py-2 text-sm font-semibold text-green-400">
        <CheckCircle2 className="h-4 w-4" />
        Claimed — sealed
      </span>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={claim}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-400 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <HandHeart className="h-4 w-4" />
        )}
        {busy ? "Claiming…" : "Claim rescue"}
      </button>
      {error && (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}
