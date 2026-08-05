// Rescue Relay — GET/POST /api/donations
// POST: org admin posts a donation (donation + items in one tx via service client).
// GET:  available rescues, joined with donor + org, sorted by pickup_window_end ASC.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase-server";
import { fail, ok } from "@/lib/api";
import type { Donation, DonationItem } from "@/types";

export const dynamic = "force-dynamic";

const itemSchema = z.object({
  item_name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  estimated_pounds: z.number().nonnegative().nullable().optional(),
  estimated_meals: z.number().int().nonnegative().nullable().optional(),
  cold_chain: z.boolean().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const postDonationSchema = z.object({
  donor_id: z.string().uuid(),
  pickup_window_start: z.string().datetime(),
  pickup_window_end: z.string().datetime(),
  claim_deadline: z.string().datetime(),
  perishability: z.enum([
    "dry_goods",
    "produce",
    "refrigerated",
    "frozen",
    "prepared",
  ]),
  cold_chain_required: z.boolean().default(false),
  pickup_lat: z.number().min(-90).max(90).nullable().optional(),
  pickup_lng: z.number().min(-180).max(180).nullable().optional(),
  geofence_radius_m: z.number().int().positive().default(100),
  notes: z.string().nullable().optional(),
  items: z.array(itemSchema).min(1),
});

/** Available rescues: window open (or within grace), donor + org joined. */
export async function GET(_req: NextRequest) {
  try {
    const svc = createServiceClient();

    const { data, error } = await svc
      .from("donations")
      .select("*, donor:donors(*), org:organizations(*)")
      .eq("status", "available")
      .lte("pickup_window_start", new Date().toISOString())
      .gte("pickup_window_end", new Date().toISOString())
      .order("pickup_window_end", { ascending: true });

    if (error) {
      return NextResponse.json(
        fail("Could not fetch available rescues", "server_error"),
        { status: 500 }
      );
    }

    return NextResponse.json(ok(data as Donation[]), { status: 200 });
  } catch {
    return NextResponse.json(
      fail("Could not fetch available rescues", "server_error"),
      { status: 500 }
    );
  }
}

/** Org admin posts a donation + its items in one transaction. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(fail("Invalid JSON body", "validation_error"), {
      status: 400,
    });
  }

  const parsed = postDonationSchema.safeParse(body);
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

  const { donor_id, items, ...donationFields } = parsed.data;

  const svc = createServiceClient();
  const { data: donation, error: donationError } = await svc
    .from("donations")
    .insert({
      donor_id,
      posted_by: user.id,
      org_id: user.user_metadata.org_id,
      ...donationFields,
      total_pounds: items.reduce(
        (sum, item) => sum + (item.estimated_pounds ?? 0),
        0
      ),
      estimated_meals: items.reduce(
        (sum, item) => sum + (item.estimated_meals ?? 0),
        0
      ),
    })
    .select()
    .single();

  if (donationError || !donation) {
    return NextResponse.json(
      fail(donationError?.message ?? "Could not create donation", "server_error"),
      { status: 500 }
    );
  }

  const { error: itemsError } = await svc.from("donation_items").insert(
    items.map((item, index) => ({
      donation_id: donation.id,
      item_name: item.item_name,
      quantity: item.quantity,
      unit: item.unit,
      estimated_pounds: item.estimated_pounds ?? null,
      estimated_meals: item.estimated_meals ?? null,
      cold_chain: item.cold_chain ?? null,
      notes: item.notes ?? null,
      sort_order: index,
    }))
  );

  if (itemsError) {
    return NextResponse.json(
      fail(itemsError.message ?? "Could not create donation items", "server_error"),
      { status: 500 }
    );
  }

  return NextResponse.json(
    ok({ ...(donation as Donation), items: items as DonationItem[] }),
    { status: 201 }
  );
}
