import Link from "next/link";
import { redirect } from "next/navigation";
import { HandHeart, LayoutDashboard, PackagePlus, BarChart3, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

async function signOut() {
  "use server";
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const navItems = [
  { href: "/dashboard/org", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/org/donate", label: "Post a donation", icon: PackagePlus },
  { href: "/impact", label: "Live impact", icon: BarChart3 },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-base">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-edge-subtle bg-surface-elevated md:flex">
        <Link
          href="/dashboard/org"
          className="flex items-center gap-2 border-b border-edge-subtle px-5 py-4 font-bold text-ink-primary"
        >
          <HandHeart className="h-5 w-5 text-brand-400" />
          Rescue Relay
        </Link>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-secondary transition hover:bg-surface-hover hover:text-ink-primary"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={signOut} className="border-t border-edge-subtle p-3">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition hover:bg-surface-hover hover:text-ink-primary"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-edge-subtle bg-surface-elevated px-4 py-3 md:hidden">
        <Link
          href="/dashboard/org"
          className="flex items-center gap-2 font-bold text-ink-primary"
        >
          <HandHeart className="h-5 w-5 text-brand-400" />
          Rescue Relay
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Sign out"
            className="rounded-lg p-2 text-ink-muted transition hover:bg-surface-hover hover:text-ink-primary"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </form>
      </header>
      <nav className="flex items-center gap-1 overflow-x-auto border-b border-edge-subtle bg-surface-base px-4 py-2 md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-ink-secondary transition hover:bg-surface-hover hover:text-ink-primary"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <main className="md:pl-60">{children}</main>
    </div>
  );
}
