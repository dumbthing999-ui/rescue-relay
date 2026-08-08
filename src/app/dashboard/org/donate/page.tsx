"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  PackagePlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { apiFetch } from "@/lib/api";
import type { Donation, Perishability } from "@/types";

const FALLBACK_DONOR_ID = "00000000-0000-4000-8000-000000000000";

const PERISHABILITY_OPTIONS: { value: Perishability; label: string }[] = [
  { value: "dry_goods", label: "Dry goods" },
  { value: "produce", label: "Produce" },
  { value: "refrigerated", label: "Refrigerated" },
  { value: "frozen", label: "Frozen" },
  { value: "prepared", label: "Prepared meals" },
];

interface DonorOption {
  id: string;
  name: string;
  neighborhood: string | null;
}

interface ItemRow {
  id: number;
  name: string;
  quantity: string;
  unit: string;
}

const inputClass =
  "mt-1 w-full rounded-lg border border-edge-default bg-surface-inset px-3 py-2 text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500";

export default function DonatePage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [donors, setDonors] = useState<DonorOption[] | null>(null);
  const [donorId, setDonorId] = useState("");
  const [manualDonorName, setManualDonorName] = useState("");
  const [items, setItems] = useState<ItemRow[]>([
    { id: 1, name: "", quantity: "", unit: "" },
  ]);
  const [pickupStart, setPickupStart] = useState("");
  const [pickupEnd, setPickupEnd] = useState("");
  const [perishability, setPerishability] = useState<Perishability>("dry_goods");
  const [coldChain, setColdChain] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load donor list once, when the step is first reached. If the fetch fails
  // (e.g. schema not applied yet), fall back to a manual donor name input.
  const [donorFetchTried, setDonorFetchTried] = useState(false);
  useEffect(() => {
    if (step !== 1 || donorFetchTried) return;
    setDonorFetchTried(true);
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("donors")
        .select("id, name, neighborhood")
        .eq("active", true)
        .order("name");
      if (!error && data && data.length > 0) {
        setDonors(data as DonorOption[]);
      }
    })();
  }, [step, donorFetchTried]);

  const totalPounds = useMemo(
    () => items.reduce((sum, i) => sum + (parseFloat(i.quantity) || 0), 0),
    [items]
  );
  const canContinue =
    step === 1
      ? Boolean(donorId || manualDonorName.trim())
      : step === 2
        ? items.every((i) => i.name.trim() && (parseFloat(i.quantity) || 0) > 0)
        : Boolean(pickupStart && pickupEnd && new Date(pickupEnd) > new Date(pickupStart));

  function updateItem(id: number, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addItem() {
    setItems((rows) => [
      ...rows,
      { id: Date.now(), name: "", quantity: "", unit: "" },
    ]);
  }

  function removeItem(id: number) {
    setItems((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== id) : rows));
  }

  async function submit() {
    if (!donorId && !manualDonorName.trim()) return;
    setSubmitting(true);
    setError(null);

    const result = await apiFetch<Donation>("/api/donations", {
      method: "POST",
      body: JSON.stringify({
        // The API requires a real donor row; when the donor list is
        // unavailable we fall back to the seeded "unlisted" donor and record
        // the manual name in notes for the org's own records.
        donor_id: donorId || FALLBACK_DONOR_ID,
        items: items.map((i) => ({
          item_name: i.name.trim(),
          quantity: parseFloat(i.quantity),
          unit: i.unit.trim() || "item",
          estimated_pounds: parseFloat(i.quantity) || null,
        })),
        pickup_window_start: new Date(pickupStart).toISOString(),
        pickup_window_end: new Date(pickupEnd).toISOString(),
        claim_deadline: new Date(pickupEnd).toISOString(),
        perishability,
        cold_chain_required: coldChain,
        notes: manualDonorName.trim()
          ? `Donor: ${manualDonorName.trim()}`
          : null,
      }),
    });

    if (!result.ok) {
      setSubmitting(false);
      setError(result.error);
      return;
    }
    router.push("/dashboard/org");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-ink-primary">Post a donation</h1>
      <p className="mt-1 text-sm text-ink-secondary">
        Step {step} of 4 — {STEP_TITLES[step - 1]}
      </p>

      {/* Step indicator */}
      <ol className="mt-6 flex gap-2">
        {[1, 2, 3, 4].map((n) => (
          <li
            key={n}
            aria-current={n === step ? "step" : undefined}
            className={`h-1.5 flex-1 rounded-full ${
              n <= step ? "bg-brand-500" : "bg-edge-default"
            }`}
          />
        ))}
      </ol>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-400"
        >
          {error}
        </p>
      )}

      <div className="mt-6">
        {step === 1 && (
          <section className="space-y-4">
            {donors ? (
              <>
                <label className="block text-sm text-ink-secondary">
                  Donor
                  <select
                    value={donorId}
                    onChange={(e) => setDonorId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select a donor…</option>
                    {donors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                        {d.neighborhood ? ` — ${d.neighborhood}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-xs text-ink-muted">
                  Donor list unavailable?{" "}
                  <button
                    type="button"
                    onClick={() => setDonors(null)}
                    className="text-brand-400 hover:underline"
                  >
                    Enter a name manually instead
                  </button>
                </p>
              </>
            ) : (
              <label className="block text-sm text-ink-secondary">
                Donor name
                <input
                  value={manualDonorName}
                  onChange={(e) => setManualDonorName(e.target.value)}
                  placeholder="e.g. Whole Foods Market — Squirrel Hill"
                  className={inputClass}
                />
              </label>
            )}
          </section>
        )}

        {step === 2 && (
          <section className="space-y-3">
            {/* TODO: when @/components/donate/AIUploadCard exists, swap this notice
                for an AIUploadCard import + a "manual" toggle between the two flows.
                The classify API route at /api/donations/classify is already live. */}
            {/* Photo AI classification is not wired up yet — manual entry only. */}
            <p className="rounded-lg border border-edge-subtle bg-surface-inset px-4 py-2 text-xs text-ink-muted">
              Photo AI classification coming soon — add your items manually for now.
            </p>
            {items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_5rem_5rem_auto] items-end gap-2"
              >
                <label className="block text-sm text-ink-secondary">
                  Item
                  <input
                    value={item.name}
                    onChange={(e) => updateItem(item.id, { name: e.target.value })}
                    placeholder="e.g. Bagged salad"
                    className={inputClass}
                  />
                </label>
                <label className="block text-sm text-ink-secondary">
                  Qty
                  <input
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, { quantity: e.target.value })
                    }
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    placeholder="10"
                    className={inputClass}
                  />
                </label>
                <label className="block text-sm text-ink-secondary">
                  Unit
                  <input
                    value={item.unit}
                    onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                    placeholder="bags"
                    className={inputClass}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  aria-label="Remove item"
                  disabled={items.length === 1}
                  className="mb-0.5 rounded-lg p-2 text-ink-muted transition hover:bg-surface-hover hover:text-red-400 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 text-sm font-medium text-brand-400 hover:underline"
            >
              <Plus className="h-4 w-4" />
              Add item
            </button>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-ink-secondary">
                Pickup window starts
                <input
                  type="datetime-local"
                  value={pickupStart}
                  onChange={(e) => setPickupStart(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm text-ink-secondary">
                Pickup window ends
                <input
                  type="datetime-local"
                  value={pickupEnd}
                  onChange={(e) => setPickupEnd(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <label className="block text-sm text-ink-secondary">
              Perishability
              <select
                value={perishability}
                onChange={(e) => setPerishability(e.target.value as Perishability)}
                className={inputClass}
              >
                {PERISHABILITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-secondary">
              <input
                type="checkbox"
                checked={coldChain}
                onChange={(e) => setColdChain(e.target.checked)}
                className="h-4 w-4 rounded border-edge-default bg-surface-inset accent-brand-500"
              />
              Cold chain required
            </label>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Review
            </h2>
            <dl className="divide-y divide-edge-subtle rounded-2xl border border-edge-subtle bg-surface-elevated text-sm">
              <ReviewRow
                label="Donor"
                value={
                  (donors?.find((d) => d.id === donorId)?.name ??
                    manualDonorName) ||
                  "—"
                }
              />
              <ReviewRow
                label="Items"
                value={items
                  .map((i) => `${i.name} (${i.quantity} ${i.unit || "item"})`)
                  .join(", ")}
              />
              <ReviewRow
                label="Pickup window"
                value={
                  pickupStart && pickupEnd
                    ? `${new Date(pickupStart).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })} – ${new Date(pickupEnd).toLocaleString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}`
                    : "—"
                }
              />
              <ReviewRow
                label="Perishability"
                value={
                  PERISHABILITY_OPTIONS.find((o) => o.value === perishability)
                    ?.label ?? perishability
                }
              />
              <ReviewRow
                label="Cold chain"
                value={coldChain ? "Required" : "Not required"}
              />
              <ReviewRow label="Estimated weight" value={`${totalPounds} lbs`} />
            </dl>
          </section>
        )}
      </div>

      {/* Nav buttons */}
      <div className="mt-8 flex items-center justify-between">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="flex items-center gap-1.5 rounded-lg border border-edge-default px-4 py-2 text-sm font-medium text-ink-secondary transition hover:bg-surface-hover"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        ) : (
          <span />
        )}
        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canContinue}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !canContinue}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PackagePlus className="h-4 w-4" />
            )}
            {submitting ? "Posting…" : "Post donation"}
          </button>
        )}
      </div>
    </div>
  );
}

const STEP_TITLES = ["Donor", "Items", "Pickup details", "Review"];

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right text-ink-primary">{value}</dd>
    </div>
  );
}
