import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resale Agent — Autonomous eBay Listings",
  description: "Autonomous AI agent for eBay resale listings",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-semibold text-slate-900">
              Resale Agent
            </Link>
            <nav className="flex gap-4 text-sm font-medium text-slate-600">
              <Link href="/" className="hover:text-slate-900">
                Dashboard
              </Link>
              <Link href="/items/new" className="hover:text-slate-900">
                Single item
              </Link>
              <Link href="/items/batch" className="hover:text-slate-900">
                Batch upload
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
