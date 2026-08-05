// Rescue Relay — GET/PATCH /api/trips/[id]
// GET:  trip detail with claims ordered by route_order (the driving route).
// PATCH: driver starts (planned → in_progress) or completes (in_progress → completed).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";
import { fail, ok } from "@/lib/api";
import type { Trip } from "@/types";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["in_progress", "completed"]),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data: trip, error } = await supabase
      .from("trips")
      .select(
        "*, claims:claims(*, donation:donations(*, donor:donors(*), org:organizations(*)))"
      )
      .eq("id", params.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(fail("Could not fetch trip", "server_error"), {
        status: 500,
      });
    }
    if (!trip) {
      return NextResponse.json(fail("Trip not found", "not_found"), { status: 404 });
    }
    if (trip.driver_id !== user.id) {
      return NextResponse.json(
        fail("You do not have access to this trip", "forbidden"),
        { status: 403 }
      );
    }

    // Order the claims by route_order so the client gets a driving route.
    const claims = Array.isArray(trip.claims)
      ? [...trip.claims].sort(
          (a, b) => (a.route_order ?? 0) - (b.route_order ?? 0)
        )
      : [];
    const ordered = { ...trip, claims };

    return NextResponse.json(ok(ordered), { status: 200 });
  } catch {
    return NextResponse.json(fail("Could not fetch trip", "server_error"), {
      status: 500,
    });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(fail("Invalid JSON body", "validation_error"), {
      status: 400,
    });
  }

  const parsed = patchSchema.safeParse(body);
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

  const { data: existing, error: fetchError } = await supabase
    .from("trips")
    .select("id, driver_id, status")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json(fail("Could not fetch trip", "server_error"), {
      status: 500,
    });
  }
  if (!existing) {
    return NextResponse.json(fail("Trip not found", "not_found"), { status: 404 });
  }
  if (existing.driver_id !== user.id) {
    return NextResponse.json(
      fail("Only the trip driver can update it", "forbidden"),
      { status: 403 }
    );
  }

  // Transition guard: start requires 'planned', complete requires 'in_progress'.
  const to = parsed.data.status;
  const from = existing.status as Trip["status"];
  const allowed = (from === "planned" && to === "in_progress") ||
    (from === "in_progress" && to === "completed");
  if (!allowed) {
    return NextResponse.json(
      fail(`Cannot transition trip from '${from}' to '${to}'`, "invalid_transition"),
      { status: 409 }
    );
  }

  const updates: Record<string, string> = { status: to };
  if (to === "in_progress") updates.started_at = new Date().toISOString();
  if (to === "completed") updates.completed_at = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("trips")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(
      fail(updateError.message ?? "Could not update trip", "server_error"),
      { status: 500 }
    );
  }

  return NextResponse.json(ok(updated as Trip), { status: 200 });
}
