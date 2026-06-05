import Link from "next/link";
import { SpotLogo } from "@/components/brand/SpotLogo";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/items/new", label: "New listing" },
  { href: "/items/batch", label: "Batch" },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 rounded-xl py-1 pr-2 transition hover:opacity-90"
        >
          <SpotLogo size={44} className="shrink-0 shadow-sm ring-2 ring-white/80" />
          <div className="min-w-0 leading-tight">
            <span className="block text-lg font-bold tracking-tight text-[var(--foreground)]">
              Spot
            </span>
            <span className="block text-xs font-medium text-[var(--muted)]">
              eBay listing agent
            </span>
          </div>
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm font-medium">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-[var(--muted)] transition hover:bg-[var(--spot-light)] hover:text-[var(--spot-dark)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
