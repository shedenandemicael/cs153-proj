import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Spot",
    template: "%s · Spot",
  },
  description: "Spot — AI agent for eBay resale listings from photos to publish.",
  icons: {
    icon: [{ url: "/spot-logo.jpg", type: "image/jpeg" }],
    apple: [{ url: "/spot-logo.jpg", type: "image/jpeg" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
