// Rescue Relay — Supabase Server Client
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as supabaseAdmin } from "@supabase/supabase-js";

// Placeholder envs (build-offline mode) — the app must still build and render
// empty states before real Supabase credentials are wired in at deploy.
const PLACEHOLDER = "YOUR_SUPABASE";
function envConfigured(...values: (string | undefined)[]) {
  return values.every(
    (v) => !!v && !v.startsWith(PLACEHOLDER) && !v.startsWith("your-")
  );
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!envConfigured(url, anon)) {
    // Return a minimal mock so static generation / build never crashes.
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: { message: "Not configured" } }),
            maybeSingle: async () => ({ data: null, error: { message: "Not configured" } }),
          }),
          maybeSingle: async () => ({ data: null, error: { message: "Not configured" } }),
          order: () => ({ limit: async () => ({ data: [], error: null }) }),
          range: () => ({ data: [], error: null }),
        }),
        eq: () => ({ data: [], error: null }),
        order: () => ({ data: [], error: null }),
        insert: async () => ({ data: null, error: { message: "Not configured" } }),
        update: async () => ({ data: null, error: { message: "Not configured" } }),
        delete: async () => ({ data: null, error: { message: "Not configured" } }),
      }),
      rpc: async () => ({ data: null, error: { message: "Not configured" } }),
    } as unknown as ReturnType<typeof createServerClient>;
  }

  const cookieStore = cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from Server Component — cookies are read-only in RSC
        }
      },
    },
  });
}

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!envConfigured(url, serviceKey)) {
    return {
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: { message: "Not configured" } }),
          }),
          maybeSingle: async () => ({ data: null, error: { message: "Not configured" } }),
        }),
        eq: () => ({ data: [], error: null }),
      }),
      rpc: async () => ({ data: null, error: { message: "Not configured" } }),
      storage: { from: () => ({ download: async () => ({ data: null, error: { message: "Not configured" } }) }) },
    } as unknown as ReturnType<typeof supabaseAdmin>;
  }

  return supabaseAdmin(url, serviceKey, { auth: { persistSession: false } });
}
