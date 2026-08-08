"use client";

import { useFormStatus } from "react-dom";
import { useRef, useState } from "react";

type LoginAction = (formData: FormData) => Promise<void>;

export function LoginForm({ action }: { action: LoginAction }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-4"
      onSubmit={() => {
        // Fire-and-forget; useFormStatus handles the spinner state.
      }}
    >
      <div>
        <label htmlFor="email" className="text-sm text-ink-secondary">
          Email
      </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@org.org"
          className="mt-1 w-full rounded-lg border border-edge-default bg-surface-inset px-3 py-2 text-ink-primary placeholder:text-ink-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
    </div>

      <div>
        <label htmlFor="password" className="text-sm text-ink-secondary">
          Password
      </label>
        <div className="relative mt-1">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            minLength={6}
            placeholder="••••••••"
            className="w-full rounded-lg border border-edge-default bg-surface-inset px-3 py-2 pr-10 text-ink-primary placeholder:text-ink-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-muted hover:text-ink-secondary"
          >
            {showPassword ? "Hide" : "Show"}
        </button>
      </div>
    </div>

      <SubmitButton />
  </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 font-semibold text-black transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? (
        <>
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black"
            aria-hidden="true"
          />
          Signing in…
       </>
      ) : (
        <>Sign in</>
      )}
   </button>
  );
}
