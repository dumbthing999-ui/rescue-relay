import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function SignupPage() {
  async function signup(formData: FormData) {
    "use server";
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("full_name") as string;

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
              // cookies are read-only in Server Actions
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      redirect(`/signup?error=${encodeURIComponent(error.message)}`);
    }

    // Upsert profile row for the new user
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email: data.user.email ?? email,
        full_name: fullName || null,
        role: "driver",
      });
    }

    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-edge-subtle bg-surface-elevated p-8">
        <h1 className="text-2xl font-bold text-ink-primary">Create account</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Join Rescue Relay as a driver.
        </p>
        <form action={signup} className="mt-6 space-y-4">
          <div>
            <label htmlFor="full_name" className="text-sm text-ink-secondary">
              Full name
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              className="mt-1 w-full rounded-lg border border-edge-default bg-surface-inset px-3 py-2 text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label htmlFor="email" className="text-sm text-ink-secondary">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-edge-default bg-surface-inset px-3 py-2 text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm text-ink-secondary">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="mt-1 w-full rounded-lg border border-edge-default bg-surface-inset px-3 py-2 text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-500 px-4 py-2 font-semibold text-black transition hover:bg-brand-400"
          >
            Create account
          </button>
        </form>
        <p className="mt-4 text-sm text-ink-secondary">
          Already have an account?{" "}
          <a href="/login" className="text-brand-400 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
