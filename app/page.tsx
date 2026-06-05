import Link from "next/link";
import { getSession } from "@/lib/auth/session";

const features = [
  "Turns item photos into polished eBay drafts",
  "Researches comparable listings before pricing",
  "Keeps every listing workflow in one dashboard",
] as const;

type LandingPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LandingPage({ searchParams }: LandingPageProps) {
  const session = await getSession();
  const params = (await searchParams) ?? {};
  const next = params.next && params.next.startsWith("/") && !params.next.startsWith("//") ? params.next : "/dashboard";

  return (
    <div className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <section className="grid gap-8 px-6 py-12 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-14 lg:py-16">
        <div className="flex flex-col justify-center">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--spot-light)] px-3 py-1 text-sm font-medium text-[var(--spot-dark)]">
            Private beta
          </div>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
            List resale inventory on eBay from photos in minutes.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            Spot is an AI listing workspace that identifies items, researches pricing, drafts copy, and helps you publish with less manual work.
          </p>

          {params.error ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {params.error}
            </div>
          ) : null}

          {session ? (
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-lg bg-[var(--spot)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--spot-dark)]"
              >
                Go to dashboard
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--spot-light)]"
              >
                See how it works
              </a>
            </div>
          ) : (
            <form action="/api/auth/login" method="post" className="mt-8 max-w-md rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <input type="hidden" name="next" value={next} />
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[var(--foreground)]">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="shedenandemicael@gmail.com"
                    className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none transition focus:border-[var(--spot)] focus:ring-2 focus:ring-[var(--spot-light)]"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[var(--foreground)]">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none transition focus:border-[var(--spot)] focus:ring-2 focus:ring-[var(--spot-light)]"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-[var(--spot)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--spot-dark)]"
              >
                Log in
              </button>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Access is currently limited to <span className="font-semibold text-[var(--foreground)]">shedenandemicael@gmail.com</span>.
              </p>
            </form>
          )}
        </div>

        <div className="relative min-h-[360px] rounded-[1.5rem] bg-[var(--spot-light)] p-5">
          <div className="absolute inset-5 rounded-[1.25rem] bg-white shadow-sm" />
          <div className="relative space-y-4 rounded-[1.25rem] border border-[var(--border)] bg-white p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div>
                <p className="text-sm font-semibold text-[var(--muted)]">Listing draft</p>
                <h2 className="text-xl font-bold text-[var(--foreground)]">Vintage denim jacket</h2>
              </div>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Ready</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="h-24 rounded-xl bg-gradient-to-br from-slate-200 to-slate-100" />
              <div className="h-24 rounded-xl bg-gradient-to-br from-blue-200 to-slate-100" />
              <div className="h-24 rounded-xl bg-gradient-to-br from-indigo-200 to-slate-100" />
            </div>
            <div className="space-y-3">
              <div className="h-3 w-11/12 rounded-full bg-slate-200" />
              <div className="h-3 w-8/12 rounded-full bg-slate-200" />
              <div className="h-3 w-10/12 rounded-full bg-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[var(--border)] p-4">
                <p className="text-sm text-[var(--muted)]">Suggested price</p>
                <p className="text-2xl font-bold text-[var(--foreground)]">$42.00</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-4">
                <p className="text-sm text-[var(--muted)]">Comps checked</p>
                <p className="text-2xl font-bold text-[var(--foreground)]">18</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="grid gap-4 border-t border-[var(--border)] bg-slate-50 px-6 py-8 sm:px-10 md:grid-cols-3 lg:px-14">
        {features.map((feature) => (
          <div key={feature} className="rounded-2xl border border-[var(--border)] bg-white p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--spot-light)] text-[var(--spot-dark)]">
              ✓
            </div>
            <p className="font-semibold text-[var(--foreground)]">{feature}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
