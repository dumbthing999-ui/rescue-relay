// Rescue Relay — Landing page
// Sections: hero, problem, mechanism, how-it-works, recipients, impact teaser, footer.

import Link from "next/link";
import {
  ArrowRight,
  Activity,
  Clock,
  Users,
  Send,
  Radio,
  Trophy,
  CheckCircle2,
  PackageOpen,
  HandHeart,
  Truck,
} from "lucide-react";
import { ImpactTeaser } from "@/components/landing/impact-teaser";

const RECIPIENTS = [
  "412 Food Rescue",
  "Greater Pittsburgh Community Food Bank",
  "Light of Life Rescue Mission",
  "East End Cooperative Ministry",
  "Just Harvest",
  "Wilkinsburg Community Ministry",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-surface-base text-ink-primary">
      <Hero />
      <Problem />
      <Mechanism />
      <HowItWorks />
      <Recipients />
      <ImpactTeaser />
      <Footer />
   </main>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* teal glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(20,184,166,0.18) 0%, rgba(20,184,166,0) 70%)",
        }}
      />
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-sm font-semibold text-brand-400">
            <span className="relative inline-flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
           </span>
            <span>Powered by Rescue Relay platform</span>
         </div>
         <div className="inline-flex items-center gap-2 rounded-full border border-edge-default bg-surface-elevated px-3 py-1 text-sm text-ink-secondary">
           <span className="relative inline-flex h-2 w-2" aria-hidden="true">
             <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
             <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
          </span>
           <span>Live in 6 Pittsburgh neighborhoods</span>
        </div>
      </div>

        <h1 className="mt-8 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          One claim. One winner.{" "}
          <span className="text-brand-400">Zero food in the dumpster</span>
       </h1>

        <p className="mt-6 max-w-2xl text-lg text-ink-secondary sm:text-xl">
          Rescue Relay connects Pittsburgh donors with verified food pantries in
          real time. Post a donation and the first eligible organization to
          claim it wins the pickup — automatically, transparently, in seconds.
       </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-6 py-3 font-semibold text-black transition hover:bg-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
          >
            Try the app
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
         </Link>
          <Link
            href="/impact"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-edge-default bg-surface-elevated px-6 py-3 font-semibold text-ink-primary transition hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
          >
            See live impact
         </Link>
       </div>
     </div>
   </section>
  );
}

function Problem() {
  const cards = [
    {
      icon: Users,
      title: "39 separate chains",
      body: "Pittsburgh volunteers juggle dozens of overlapping group texts, DMs, and email threads to find a single taker.",
    },
    {
      icon: Clock,
      title: "2+ hours to find a taker",
      body: "By the time a recipient is confirmed, the cold-chain window has already slipped and perishables are at risk.",
    },
    {
      icon: Activity,
      title: "1 in 9 neighbors food-insecure",
      body: "In Allegheny County roughly 11% of residents face food insecurity — surplus that sits on a counter is a missed meal.",
    },
  ];

  return (
    <section className="border-t border-edge-subtle bg-surface-inset py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-400">
            The problem
         </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Pittsburgh&apos;s food rescue runs on WhatsApp threads.
         </h2>
          <p className="mt-4 text-lg text-ink-secondary">
            Donors post a pickup window. Volunteers copy the message into a
            dozen chats. The first org to reply wins — but only if someone
            sees it before the food goes bad.
         </p>
       </div>

        <ul
          role="list"
          className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {cards.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="rounded-xl border border-edge-subtle bg-surface-elevated p-6"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                <Icon className="h-5 w-5" aria-hidden="true" />
             </div>
              <h3 className="mt-4 text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-ink-secondary">{body}</p>
           </li>
          ))}
       </ul>
     </div>
   </section>
  );
}

function Mechanism() {
  const steps = [
    { icon: PackageOpen, label: "Post", detail: "Donor posts a donation with a pickup window." },
    { icon: Radio, label: "Broadcast", detail: "Verified orgs in radius get the alert instantly." },
    { icon: Trophy, label: "Race", detail: "First eligible org to claim wins — server-side lock." },
    { icon: CheckCircle2, label: "Resolve", detail: "Reroutes go to #2; driver check-ins close the loop." },
  ];

  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-400">
            The mechanism
         </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            First claim wins. Everyone else gets a reroute.
         </h2>
          <p className="mt-4 text-lg text-ink-secondary">
            A single row in Postgres decides the winner. Race conditions are
            impossible by construction — every claim either succeeds or is
            politely rerouted.
         </p>
       </div>

        <ol
          role="list"
          className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {steps.map(({ icon: Icon, label, detail }, idx) => (
            <li
              key={label}
              className="relative rounded-xl border border-edge-subtle bg-surface-elevated p-6"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-black">
                  {idx + 1}
               </span>
                <Icon className="h-5 w-5 text-brand-400" aria-hidden="true" />
             </div>
              <h3 className="mt-4 text-lg font-semibold">{label}</h3>
              <p className="mt-1 text-sm text-ink-secondary">{detail}</p>
           </li>
          ))}
       </ol>
     </div>
   </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: PackageOpen,
      title: "Post it",
      body: "Donors publish a donation in under a minute. Photo, weight, pickup window — that's it.",
    },
    {
      icon: HandHeart,
      title: "Claim it",
      body: "Verified orgs see only what fits their radius and capacity. The first eligible claim locks the pickup.",
    },
    {
      icon: Truck,
      title: "Move it",
      body: "Drivers check in at pickup and delivery inside the geofence. The loop closes with an auditable receipt.",
    },
  ];

  return (
    <section className="border-t border-edge-subtle bg-surface-inset py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          How it works
       </h2>
        <ul role="list" className="mt-10 grid gap-6 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="rounded-xl border border-edge-subtle bg-surface-elevated p-6"
            >
              <Icon className="h-6 w-6 text-brand-400" aria-hidden="true" />
              <h3 className="mt-4 text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-ink-secondary">{body}</p>
           </li>
          ))}
       </ul>
     </div>
   </section>
  );
}

function Recipients() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-400">
              Real recipients
           </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Verified Pittsburgh organizations already on the relay.
           </h2>
         </div>
       </div>

        <ul
          role="list"
          className="mt-10 flex flex-wrap gap-3"
          aria-label="Verified recipient organizations"
        >
          {RECIPIENTS.map((name) => (
            <li
              key={name}
              className="inline-flex items-center gap-2 rounded-full border border-edge-default bg-surface-elevated px-4 py-2 text-sm font-medium text-ink-primary"
            >
              <CheckCircle2
                className="h-4 w-4 text-brand-400"
                aria-hidden="true"
              />
              {name}
           </li>
          ))}
       </ul>
     </div>
   </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-edge-subtle bg-surface-inset py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-ink-secondary">
          <Send className="h-4 w-4 text-brand-400" aria-hidden="true" />
          <span>Rescue Relay — Pittsburgh, PA</span>
       </div>
        <p className="text-xs text-ink-muted">
          Real coordination. Real deliveries. Real meals. Built on Rescue Relay platform.
       </p>
     </div>
   </footer>
  );
}
