import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; next?: string };
}) {
  async function login(formData: FormData) {
    "use server";
    const email = (formData.get("email") as string | null)?.trim() ?? "";
    const password = (formData.get("password") as string | null) ?? "";
    const next = (formData.get("next") as string | null) ?? "/dashboard";

    if (!email || !password) {
      redirect("/login?error=missing_fields");
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
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
              // cookies are read-only in Server Actions / RSC
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      const code =
        error.message.toLowerCase().includes("rate")
          ? "rate_limited"
          : "invalid_credentials";
      redirect(`/login?error=${code}`);
    }
    // Only allow same-origin redirects.
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    redirect(safeNext);
  }

  const errorKey = searchParams?.error;
  const errorMessage =
    errorKey === "invalid_credentials"
      ? "Email or password is incorrect."
      : errorKey === "rate_limited"
      ? "Too many attempts. Wait a moment and try again."
      : errorKey === "missing_fields"
      ? "Enter both email and password."
      : errorKey === "email_not_confirmed"
      ? "Confirm your email before signing in."
      : null;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-edge-subtle bg-surface-elevated p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-500/15 text-brand-400">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h12" />
           </svg>
         </div>
          <div>
            <h1 className="text-xl font-bold text-ink-primary">Rescue Relay</h1>
            <p className="text-xs text-ink-secondary">Coordinate food rescue in real time</p>
         </div>
       </div>

        {errorMessage ? (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          >
            {errorMessage}
         </div>
        ) : null}

        <LoginForm action={login} />

        <div className="mt-6 flex items-center justify-between text-sm">
          <a href="/signup" className="text-brand-400 hover:underline">
            Create account
         </a>
          <a href="/impact" className="text-ink-muted hover:text-ink-secondary">
            View public impact →
         </a>
       </div>

        <p className="mt-6 border-t border-edge-subtle pt-4 text-xs text-ink-muted">
          Demo accounts: <code className="text-ink-secondary">admin@rescurerelay.demo</code>,{" "}
          <code className="text-ink-secondary">driver1@rescurerelay.demo</code> · pw{" "}
          <code className="text-ink-secondary">DemoPass123!</code>
       </p>
     </div>
   </main>
  );
}
