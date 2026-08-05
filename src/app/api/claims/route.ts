// Rescue Relay — POST /api/claims
// THE centerpiece: one driver wins a donation, exactly one, race-condition-safe.
// The database RPC `claim_donation` does `SELECT ... FOR UPDATE` + a partial
// unique index inside a transaction; this handler is the thin API layer that
// calls it and maps the returned error string to a structured 409.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";
import { fail, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

const claimSchema = z.object({
  donation_id: z.string().uuid(),
});

/** Error strings thrown by the claim_donation RPC → HTTP codes. */
const CLAIM_ERRORS: Record<string, { code: string; status: number }> = {
  already_claimed: { code: "already_claimed", status: 409 },
  claim_window_closed: { code: "claim_window_closed", status: 409 },
  cannot_claim_own: { code: "cannot_claim_own", status: 409 },
  not_found: { code: "not_found", status: 404 },
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(fail("Invalid JSON body", "validation_error"), {
      status: 400,
    });
  }

  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      fail(parsed.error.issues[0]?.message ?? "Invalid request", "validation_error"),
      { status: 400 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(fail("Authentication required", "unauthorized"), {
      status: 401,
    });
  }

  const { error } = await supabase.rpc("claim_donation", {
    p_donation_id: parsed.data.donation_id,
    p_driver_id: user.id,
  });

  if (error) {
    const mapped = CLAIM_ERRORS[error.message];
    if (mapped) {
      return NextResponse.json(
        fail(
          humanMessage(mapped.code),
          mapped.code
        ),
        { status: mapped.status }
      );
    }
    // Unknown RPC error — surface the raw message.
    return NextResponse.json(fail(error.message, "server_error"), { status: 500 });
  }

  // Claim succeeded — return the fresh claim + donation state for optimistic UI.
  const { data: claim, error: claimError } = await supabase
    .from("claims")
    .select("*")
    .eq("donation_id", parsed.data.donation_id)
    .eq("claimed_by", user.id)
    .eq("status", "active")
    .maybeSingle();

  const { data: donation, error: donationError } = await supabase
    .from("donations")
    .select("id, status, pickup_lat, pickup_lng, geofence_radius_m")
    .eq("id", parsed.data.donation_id)
    .maybeSingle();

  if (claimError || donationError) {
    return NextResponse.json(
      fail("Claim recorded, but could not load its state", "server_error"),
      { status: 500 }
    );
  }

  return NextResponse.json(
    ok({ claim, donation: donation ?? null }),
    { status: 201 }
  );
}

function humanMessage(code: string): string {
  switch (code) {
    case "already_claimed":
      return "This rescue has already been claimed by another driver.";
    case "claim_window_closed":
      return "The claim window for this rescue has closed.";
    case "cannot_claim_own":
      return "You cannot claim a rescue posted by your own organization.";
    case "not_found":
      return "Rescue not found or no longer claimable.";
    default:
      return "Could not claim this rescue.";
  }
}
