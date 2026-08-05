// Rescue Relay — GET/PATCH /api/donations/[id]
// GET:  full detail (donation + items + donor + current claim).
// PATCH: org can cancel/update; a driver can mark delivered only while holding
//        the active claim.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";
import { fail, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    status: z.enum(["cancelled", "delivered"]),
    notes: z.string().nullable().optional(),
  })
  .refine((v) => v.status !== "delivered" || v.notes !== undefined, {
    message: "notes required when marking delivered",
  });

export async function GET(
  req: NextRequest,
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

    const { data: donation, error } = await supabase
      .from("donations")
      .select("*, donor:donors(*), org:organizations(*), donation_items(*)")
      .eq("id", params.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        fail("Could not fetch donation", "server_error"),
        { status: 500 }
      );
    }
    if (!donation) {
      return NextResponse.json(fail("Donation not found", "not_found"), {
        status: 404,
      });
    }

    // Current claim (at most one active claim per donation by the unique index).
    const { data: claims, error: claimsError } = await supabase
      .from("claims")
      .select("*, driver:profiles(id, full_name)")
      .eq("donation_id", params.id)
      .eq("status", "active")
      .limit(1);
    if (claimsError) {
      return NextResponse.json(fail("Could not fetch claim", "server_error"), {
        status: 500,
      });
    }

    return NextResponse.json(
      ok({ ...donation, current_claim: claims?.[0] ?? null }),
      { status: 200 }
    );
  } catch {
    return NextResponse.json(fail("Could not fetch donation", "server_error"), {
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

  // Load the donation + its active claim (for the driver-delivered path).
  const { data: donation, error: fetchError } = await supabase
    .from("donations")
    .select("id, posted_by, org_id")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json(fail("Could not fetch donation", "server_error"), {
      status: 500,
    });
  }
  if (!donation) {
    return NextResponse.json(fail("Donation not found", "not_found"), {
      status: 404,
    });
  }

  const { data: claims, error: claimsError } = await supabase
    .from("claims")
    .select("*")
    .eq("donation_id", params.id)
    .eq("status", "active")
    .limit(1);
  if (claimsError) {
    return NextResponse.json(fail("Could not fetch claim", "server_error"), {
      status: 500,
    });
  }
  const activeClaim = claims?.[0] ?? null;

  if (parsed.data.status === "cancelled") {
    // Only the posting org (admin/staff) can cancel.
    if (donation.posted_by !== user.id && donation.org_id !== user.user_metadata.org_id) {
      return NextResponse.json(
        fail("Only the posting organization can cancel this donation", "forbidden"),
        { status: 403 }
      );
    }

    const { error: updateError } = await supabase
      .from("donations")
      .update({ status: "cancelled" })
      .eq("id", params.id);
    if (updateError) {
      return NextResponse.json(
        fail(updateError.message ?? "Could not cancel donation", "server_error"),
        { status: 500 }
      );
    }
    return NextResponse.json(ok({ id: params.id, status: "cancelled" }), {
      status: 200,
    });
  }

  // status === "delivered" — only the driver holding the active claim.
  if (!activeClaim || activeClaim.claimed_by !== user.id) {
    return NextResponse.json(
      fail("Only the claiming driver can mark this delivered", "forbidden"),
      { status: 403 }
    );
  }

  const { error: deliveredError } = await supabase
    .from("donations")
    .update({
      status: "delivered",
      ...(parsed.data.notes ? { notes: parsed.data.notes } : {}),
    })
    .eq("id", params.id);
  if (deliveredError) {
    return NextResponse.json(
      fail(deliveredError.message ?? "Could not update donation", "server_error"),
      { status: 500 }
    );
  }

  return NextResponse.json(ok({ id: params.id, status: "delivered" }), {
    status: 200,
  });
}
