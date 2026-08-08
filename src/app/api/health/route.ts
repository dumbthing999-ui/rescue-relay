import type { NextRequest } from "next/server";
export async function GET(req: NextRequest) {
  return Response.json({ ok: true, time: new Date().toISOString(), service: "rescue-relay" });
}
