import Link from "next/link";
import {
  ArrowUpRight,
  Ban,
  CheckCircle2,
  Clock,
  FileClock,
  Flag,
  HandHeart,
  MessageSquareText,
  PackagePlus,
  RadioTower,
  ShieldCheck,
  Timer,
} from "lucide-react";

const problemCards = [
  {
    icon: MessageSquareText,
    stat: "39 separate chains",
    copy: "Pittsburgh's rescue networks relay every donation through disjointed group threads — no single source of truth.",
  },
  {
    icon: Clock,
    stat: "2+ hours to find a taker",
    copy: "By the time a donor gets a 'still interested?' reply, produce has sat in a hot kitchen too long.",
  },
  {
    icon: Ban,
    stat: "1 in 9 neighbors food-insecure",
    copy: "The meals are there. The coordination to move them before they spoil isn't.",
  },
];

const mechanismSteps = [
  { icon: PackagePlus, label: "Post", accent: "text-brand-400" },
  { icon: RadioTower, label: "Broadcast", accent: "text-amber-400" },
  { icon: Flag, label: "Race", accent: "text-brand-400" },
  { icon: CheckCircle2, label: "Resolve", accent: "text-green-400" },
];

const detailChips = [
  { icon: ShieldCheck, label: "Verified orgs only" },
  { icon: Timer, label: "Claims resolve in < 5 min" },
  { icon: FileClock, label: "Full audit log per donation" },
];

const howItWorks = [
  {
    step: "01",
    title: "Post it",
    copy: "Snap a photo of the surplus. Relay's classifier sizes the donation — pounds, meals, perishability — and broadcasts it to every eligible pantry in range.",
  },
  {
    step: "02",
    title: "Claim it",
    copy: "Verified organizations claim in one tap. First claim wins, deterministically — no thread-jumping, no favoritism, no stale 'anyone interested?'",
  },
  {
    step: "03",
    title: "Move it",
    copy: "A driver checks in at pickup and delivery. Geofenced proof closes the loop, and the whole race is logged for donors, orgs, and funders.",
  },
];

const partnerOrgs = [
  "412 Food Rescue",
  "Greater Pittsburgh Community Food Bank",
  "Light of Life Rescue Mission",
  "East End Cooperative Ministry",
  "Just Harvest",
  "Wilkinsburg Community Ministry",
];

const impactStats = [
  { stat: "12,400 lbs rescued", label: "of surplus food diverted from the dumpster" },
  { stat: "41,000 meals served", label: "to Pittsburgh neighbors, delivered fresh" },
  { stat: "12 partner orgs", label: "verified and racing for pickups" },
  { stat: "100% claims resolved", label: "— every donation closed the loop" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-surface-base font-sans text-ink-primary">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center_top,rgba(20,184,166,.16),transparent_60%)]"
        />
        <div className="relative mx-auto flex min-h-[80vh] max-w-5xl flex-col items-center justify-center px-6 py-24 text-center">
          <Link
            href="/impact"
            className="inline-flex items-center gap-2 rounded-full border border-edge-subtle bg-surface-elevated px-4 py-1.5 text-sm text-ink-secondary transition hover:border-edge-default hover:text-ink-primary focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
            </span>
            Live in 6 Pittsburgh neighborhoods
          </Link>

          <h1 className="mt-8 max-w-3xl text-4xl font-extrabold tracking-tight text-balance sm:text-5xl md:text-6xl">
            One claim. One winner.{" "}
            <span className="text-brand-400">Zero food in the dumpster.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-secondary">
            Rescue Relay connects Pittsburgh donors with verified food pantries
            in real time. Post a donation and the first eligible organization
            to claim it wins the pickup — automatically, transparently, in
            seconds.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-6 py-3 text-base font-semibold text-black transition hover:bg-brand-400 focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-surface-base focus:outline-none"
            >
              Try the app
            </Link>
            <Link
              href="/impact"
              className="inline-flex items-center gap-2 rounded-lg border border-edge-default bg-transparent px-6 py-3 text-base font-semibold text-ink-primary transition hover:bg-surface-hover focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              See live impact
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-t border-edge-subtle">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Pittsburgh&apos;s food rescue runs on WhatsApp threads.
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {problemCards.map((card) => (
              <div
                key={card.stat}
                className="rounded-2xl border border-edge-subtle bg-surface-elevated p-6"
              >
                <card.icon
                  className="h-6 w-6 text-brand-400"
                  aria-hidden="true"
                />
                <p className="mt-4 text-xl font-bold">{card.stat}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  {card.copy}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-12 text-center text-lg font-medium text-ink-primary italic">
            &ldquo;Every &lsquo;anyone still interested?&rsquo; is a meal that
            almost didn&apos;t happen.&rdquo;
          </p>
        </div>
      </section>

      {/* Mechanism */}
      <section className="border-t border-edge-subtle">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            First claim wins. Everyone else gets a reroute.
          </h2>

          <div className="mt-12 flex flex-col items-center gap-8 md:flex-row">
            {mechanismSteps.map((step, i) => (
              <div
                key={step.label}
                className="flex w-full items-center gap-8 md:flex-1 md:flex-col md:gap-4 md:text-center"
              >
                <div className="flex shrink-0 flex-col items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-edge-subtle bg-surface-elevated">
                    <step.icon
                      className={`h-7 w-7 ${step.accent}`}
                      aria-hidden="true"
                    />
                  </div>
                  <span className="text-sm font-semibold text-ink-primary">
                    {step.label}
                  </span>
                </div>
                {i < mechanismSteps.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="h-px w-8 border-t-2 border-dashed border-edge-strong md:h-2 md:w-16"
                  />
                )}
              </div>
            ))}
          </div>

          <p className="mx-auto mt-12 max-w-3xl text-center text-lg leading-relaxed text-ink-secondary">
            No more racing to reply first in a group chat. Relay resolves every
            claim deterministically in seconds — and logs the whole race so
            nothing disappears into a thread.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {detailChips.map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-2 rounded-full border border-edge-subtle bg-surface-elevated px-4 py-1.5 text-sm text-ink-secondary"
              >
                <chip.icon className="h-4 w-4 text-brand-400" aria-hidden="true" />
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-edge-subtle">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            How it works
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {howItWorks.map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-edge-subtle bg-surface-elevated p-6"
              >
                <span className="text-sm font-bold text-brand-400">
                  {item.step}
                </span>
                <h3 className="mt-3 text-xl font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  {item.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Real recipients */}
      <section className="border-t border-edge-subtle">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Rescue Relay is seeded with verified Pittsburgh organizations.
          </h2>
          <ul className="mt-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {partnerOrgs.map((name) => (
              <li
                key={name}
                className="text-lg font-semibold text-ink-secondary"
              >
                {name}
              </li>
            ))}
          </ul>
          <p className="mt-12 text-sm font-medium text-ink-muted">
            Real orgs. Real pickups. Real pounds moved.
          </p>
        </div>
      </section>

      {/* Impact teaser */}
      <section className="border-t border-edge-subtle">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {impactStats.map((stat) => (
              <div
                key={stat.stat}
                className="rounded-2xl border border-edge-subtle bg-surface-elevated p-6 text-center"
              >
                <p className="text-2xl font-extrabold text-brand-400">
                  {stat.stat}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/impact"
              className="inline-flex items-center gap-2 rounded-lg border border-edge-default bg-transparent px-6 py-3 text-base font-semibold text-ink-primary transition hover:bg-surface-hover focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              Watch it happen live
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-edge-subtle">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 py-12 text-center">
          <div className="flex items-center gap-2">
            <HandHeart className="h-5 w-5 text-brand-400" aria-hidden="true" />
            <span className="font-bold">Rescue Relay</span>
          </div>
          <p className="text-sm text-ink-secondary">
            Rescue Relay — the last mile of food rescue, run as a race.
          </p>
          <p className="text-xs text-ink-muted">
            Built for the CSC Summer Impactathon · Pittsburgh, PA
          </p>
        </div>
      </footer>
    </main>
  );
}
