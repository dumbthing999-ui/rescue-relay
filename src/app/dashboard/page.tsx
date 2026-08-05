import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthenticated users bounce to login.
  if (!user) {
    redirect("/login");
  }

  // Profile row tells us which dashboard to land on. If the query fails
  // (e.g. schema not applied yet) or no row exists, fall through to the
  // "finish setting up your profile" state below.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile) {
    if (profile.role === "org_staff" || profile.role === "org_admin") {
      redirect("/dashboard/org");
    }
    if (profile.role === "driver") {
      redirect("/dashboard/driver");
    }
  }

  // No profile row yet (or role unknown) — prompt to finish setup.
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-edge-subtle bg-surface-elevated p-8 text-center">
        <h1 className="text-2xl font-bold text-ink-primary">Rescue Relay</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Your account is ready, but you haven&apos;t finished setting up your
          profile yet.
        </p>
        <a
          href="/signup"
          className="mt-6 inline-block w-full rounded-lg bg-brand-500 px-4 py-2 font-semibold text-black transition hover:bg-brand-400"
        >
          Finish setting up your profile
        </a>
      </div>
    </main>
  );
}
