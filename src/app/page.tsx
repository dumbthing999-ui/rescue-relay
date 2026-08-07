import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-surface-base text-ink-primary">
      <h1 className="text-5xl font-extrabold tracking-tight">Rescue Relay</h1>
      <p className="mt-4 max-w-xl text-lg text-ink-secondary">
        Real-time food rescue coordination for Pittsburgh. Post a donation, claim it fast, close the loop.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/signup" className="rounded-lg bg-brand-500 px-6 py-3 font-semibold text-black hover:bg-brand-400">Sign up</Link>
        <Link href="/login" className="rounded-lg border border-edge-default px-6 py-3 font-semibold hover:bg-surface-hover">Log in</Link>
      </div>
    </main>
  );
}
