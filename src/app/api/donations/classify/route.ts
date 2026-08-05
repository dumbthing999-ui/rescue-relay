// Rescue Relay — POST /api/donations/classify
// Turn donation photos (already in storage) into a structured listing.
// AI at the edge: NVIDIA NIM vision with a 3-layer fallback. NEVER 500s —
// on any failure it returns 200 with status:'heuristic' so the flow continues.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { fail, ok } from "@/lib/api";
import { classifyPhotos } from "@/lib/donations-ai";

export const dynamic = "force-dynamic";

const classifySchema = z.object({
  photoPaths: z.array(z.string()).max(5),
  filenames: z.array(z.string()).max(5).default([]),
});

// Rate guard: 1 classify per org per 10s (in-memory; resets on deploy).
const lastClassifyAt = new Map<string, number>();
const RATE_WINDOW_MS = 10_000;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(fail("Invalid JSON body", "validation_error"), {
      status: 400,
    });
  }

  const parsed = classifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      fail(parsed.error.issues[0]?.message ?? "Invalid request", "validation_error"),
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Read photo bytes from storage, base64 them for the vision call.
  const photos: { base64: string; filename: string }[] = [];
  for (const path of parsed.data.photoPaths) {
    const { data, error } = await supabase.storage
      .from("donation-photos")
      .download(path);
    if (error || !data) continue; // skip unreadable photos — never fail the flow
    const buffer = Buffer.from(await data.arrayBuffer());
    photos.push({ base64: `data:image/jpeg;base64,${buffer.toString("base64")}`, filename: path.split("/").pop() ?? path });
  }

  // Rate guard (best-effort, keyed by org from path shape {orgId}/...).
  const orgId = parsed.data.photoPaths[0]?.split("/")[0] ?? "unknown";
  const now = Date.now();
  const last = lastClassifyAt.get(orgId) ?? 0;
  if (now - last < RATE_WINDOW_MS) {
    return NextResponse.json(
      fail("Wait a few seconds before classifying again.", "rate_limited"),
      { status: 429 }
    );
  }
  lastClassifyAt.set(orgId, now);

  // The classifier NEVER throws; worst case it returns status:'heuristic'.
  const result = await classifyPhotos(photos, parsed.data.filenames);
  return NextResponse.json(ok(result), { status: 200 });
}
