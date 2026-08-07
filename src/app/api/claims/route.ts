// Rescue Relay — POST /api/claims (minimal, basic header check only)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const claimSchema = z.object({ donation_id: z.string().uuid() });

export async function POST(req: NextRequest) {
  const header = req.headers.get("x-claim-driver");
  if (!header) {
    return NextResponse.json(
      { claimed: false, reason: "missing_header" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ claimed: false, reason: "invalid_json" }, { status: 400 });
  }

  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { claimed: false, reason: "invalid_request" },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("claim_donation", {
    p_donation_id: parsed.data.donation_id,
    p_driver_id: header,
  });

  if (error) {
    const msg = (error.message ?? "") as string;
    if (msg.includes("already_claimed") || msg.includes("claim_window_closed") || msg.includes("cannot_claim_own")) {
      return NextResponse.json({ claimed: false, reason: msg }, { status: 409 });
    }
    return NextResponse.json({ claimed: false, reason: msg || "rpc_error" }, { status: 500 });
  }

  return NextResponse.json(
    { claimed: true, claim_id: (data as any)?.claim_id ?? null },
    { status: 201 }
  );
}
