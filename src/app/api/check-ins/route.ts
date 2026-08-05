// Rescue Relay — POST /api/check-ins
// Driver check-in at pickup or delivery. The geofence check is done HERE (in
// the API) against the donation's pickup coords + radius; the check_in RPC
// records the verified_at timestamp.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";
import { fail, ok } from "@/lib/api";
import { withinRadius } from "@/lib/geofence";

export const dynamic = "force-dynamic";

const checkInSchema = z.object({
  claim_id: z.string().uuid(),
  type: z.enum(["pickup", "delivery"]),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(fail("Invalid JSON body", "validation_error"), {
      status: 400,
    });
  }

  const parsed = checkInSchema.safeParse(body);
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

  // Load the claim to verify ownership and get the donation's geofence.
  const { data: claim, error: claimError } = await supabase
    .from("claims")
    .select("id, claimed_by, donation:donations(id, pickup_lat, pickup_lng, geofence_radius_m)")
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
      fail("You do not own this claim", "forbidden"),
      { status: 403 }
    );
  }

  // PostgREST returns a single object for to-one embeds but the client types
  // can't know cardinality — normalize both shapes defensively.
  const donation = (Array.isArray(claim.donation)
    ? claim.donation[0]
    : claim.donation) as {
    id: string;
    pickup_lat: number | null;
    pickup_lng: number | null;
    geofence_radius_m: number;
  } | null;

  const inGeofence =
    !!donation?.pickup_lat &&
    donation.pickup_lng !== null &&
    withinRadius(
      donation.pickup_lat,
      donation.pickup_lng,
      parsed.data.lat,
      parsed.data.lng,
      donation.geofence_radius_m
    );

  const { error: rpcError } = await supabase.rpc("check_in", {
    p_claim_id: parsed.data.claim_id,
    p_checkin_type: parsed.data.type,
    p_lat: parsed.data.lat,
    p_lng: parsed.data.lng,
    p_within_geofence: inGeofence,
  });

  if (rpcError) {
    return NextResponse.json(fail(rpcError.message ?? "Could not record check-in", "server_error"), {
      status: 500,
    });
  }

  return NextResponse.json(ok({ within_geofence: inGeofence }), { status: 201 });
}
