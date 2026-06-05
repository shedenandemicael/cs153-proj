import Link from "next/link";
import { SpotLogo } from "@/components/brand/SpotLogo";
import { getSession } from "@/lib/auth/session";

const nav = [
  { href: "/dashboard", label: "Listings" },
  { href: "/items/new", label: "Add" },
  { href: "/items/batch", label: "Batch" },
] as const;

export async function SiteHeader() {
  const session = await getSession();
  const homeHref = session ? "/dashboard" : "/";

  return (
    <header className="border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href={homeHref} className="flex items-center gap-2.5 transition hover:opacity-90">
          <SpotLogo size={36} className="shrink-0" />
          <span className="text-lg font-bold tracking-tight text-[var(--foreground)]">Spot</span>
        </Link>
        {session ? (
          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-1 text-sm font-medium sm:flex">
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
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--spot-light)] hover:text-[var(--spot-dark)]"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/?next=/dashboard"
            className="rounded-lg bg-[var(--spot)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--spot-dark)]"
          >
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}
