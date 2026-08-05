// Rescue Relay — GET/POST /api/trips
// POST: driver creates a trip from one of their active claims.
// GET:  my trips, with claims + donations joined.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";
import { fail, ok } from "@/lib/api";
import type { Trip } from "@/types";

export const dynamic = "force-dynamic";

const createTripSchema = z.object({
  claim_id: z.string().uuid(),
});

export async function GET(_req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(fail("Authentication required", "unauthorized"), {
        status: 401,
      });
    }

    const { data, error } = await supabase
      .from("trips")
      .select(
        "*, claims:claims(*, donation:donations(*, donor:donors(*), org:organizations(*)))"
      )
      .eq("driver_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(fail("Could not fetch your trips", "server_error"), {
        status: 500,
      });
    }

    return NextResponse.json(ok(data as Trip[]), { status: 200 });
  } catch {
    return NextResponse.json(fail("Could not fetch your trips", "server_error"), {
      status: 500,
    });
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(fail("Invalid JSON body", "validation_error"), {
      status: 400,
    });
  }

  const parsed = createTripSchema.safeParse(body);
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

  // Only the claimer can build a trip from a claim.
  const { data: claim, error: claimError } = await supabase
    .from("claims")
    .select("id, claimed_by, org_id, status, donation_id")
    .eq("id", parsed.data.claim_id)
    .maybeSingle();

  if (claimError) {
    return NextResponse.json(fail("Could not load claim", "server_error"), {
      status: 500,
    });
  }
  if (!claim) {
    return NextResponse.json(fail("Claim not found", "not_found"), { status: 404 });
  }
  if (claim.claimed_by !== user.id) {
    return NextResponse.json(
      fail("Only the claiming driver can create a trip", "forbidden"),
      { status: 403 }
    );
  }

  // Create the trip and bind the claim to it in one go.
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .insert({ driver_id: user.id, org_id: claim.org_id })
    .select()
    .single();

  if (tripError || !trip) {
    return NextResponse.json(fail(tripError?.message ?? "Could not create trip", "server_error"), {
      status: 500,
    });
  }

  const { error: linkError } = await supabase
    .from("claims")
    .update({ trip_id: trip.id, route_order: 0 })
    .eq("id", claim.id);

  if (linkError) {
    return NextResponse.json(
      fail(linkError.message ?? "Could not link claim to trip", "server_error"),
      { status: 500 }
    );
  }

  return NextResponse.json(
    ok({ ...(trip as Trip), claim_id: claim.id }),
    { status: 201 }
  );
}
