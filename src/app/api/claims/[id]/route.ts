// Rescue Relay — DELETE /api/claims/[id]
// Release a claim via the `release_claim` RPC. Only the claimer can release;
// the RPC is the source of truth for ownership + state transitions.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { fail, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function DELETE(
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

    const { data, error } = await supabase.rpc("release_claim", {
      p_claim_id: params.id,
      p_driver_id: user.id,
    });

    if (error) {
      // RPC refused — map to a structured 403 (not the claimer) or 409 (already closed).
      const message = error.message ?? "";
      if (/claim|owner|permission/i.test(message) && /not|only/i.test(message)) {
        return NextResponse.json(
          fail("Only the claiming driver can release this claim", "forbidden"),
          { status: 403 }
        );
      }
      return NextResponse.json(fail(message, "conflict"), { status: 409 });
    }

    return NextResponse.json(
      ok({ id: params.id, released: true, donation_id: data ?? null }),
      { status: 200 }
    );
  } catch {
    return NextResponse.json(fail("Could not release claim", "server_error"), {
      status: 500,
    });
  }
}
