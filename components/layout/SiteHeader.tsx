import Link from "next/link";
import { SpotLogo } from "@/components/brand/SpotLogo";

const nav = [
  { href: "/", label: "Listings" },
  { href: "/items/new", label: "Add" },
  { href: "/items/batch", label: "Batch" },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5 transition hover:opacity-90">
          <SpotLogo size={36} className="shrink-0" />
          <span className="text-lg font-bold tracking-tight text-[var(--foreground)]">Spot</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
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
