"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { DeleteItemButton } from "@/components/items/DeleteItemButton";
import { PublishItemButton } from "@/components/ebay/PublishItemButton";
import { formatRelativeTime } from "@/lib/utils/item-status";

export interface DashboardItem {
  id: string;
  status: string;
  title: string | null;
  startingPrice: number | null;
  updatedAt: string;
  imagePath: string | null;
  ebayListingUrl: string | null;
  canPublish: boolean;
}

export function ItemTable({
  items,
  sellConnected,
}: {
  items: DashboardItem[];
  sellConnected: boolean;
}) {
  const router = useRouter();

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-10 text-center">
        <p className="text-[var(--foreground)] font-medium">No listings yet</p>
        <p className="mt-1 text-sm text-[var(--muted)]">Upload photos — Spot handles the rest.</p>
        <Link href="/items/new" className="mt-4 inline-block">
          <span className="font-medium text-[var(--spot)] hover:text-[var(--spot-dark)] hover:underline">
            Add photos →
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="border-b border-[var(--border)] bg-[var(--spot-light)]/40">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-[var(--muted)]">Item</th>
            <th className="hidden px-4 py-3 text-left font-medium text-[var(--muted)] sm:table-cell">
              Status
            </th>
            <th className="px-4 py-3 text-left font-medium text-[var(--muted)]">Price</th>
            <th className="hidden px-4 py-3 text-left font-medium text-[var(--muted)] md:table-cell">
              Updated
            </th>
            <th className="px-4 py-3 text-right font-medium text-[var(--muted)]">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-[var(--spot-light)]/30">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {item.imagePath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imagePath}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-lg object-cover bg-slate-100"
                    />
                  ) : (
                    <div className="h-11 w-11 shrink-0 rounded-lg bg-slate-100" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--foreground)] line-clamp-1">
                      {item.title ?? "Untitled"}
                    </p>
                    <div className="mt-0.5 sm:hidden">
                      <Badge status={item.status} />
                    </div>
                  </div>
                </div>
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">
                <Badge status={item.status} />
              </td>
              <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                {item.startingPrice != null ? `$${item.startingPrice.toFixed(0)}` : "—"}
              </td>
              <td className="hidden px-4 py-3 text-[var(--muted)] md:table-cell">
                {formatRelativeTime(item.updatedAt)}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex flex-col items-end gap-1.5">
                  {item.ebayListingUrl ? (
                    <a
                      href={item.ebayListingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[var(--spot)] hover:text-[var(--spot-dark)] hover:underline"
                    >
                      View on eBay
                    </a>
                  ) : item.canPublish && sellConnected ? (
                    <PublishItemButton
                      itemId={item.id}
                      onPublished={() => router.refresh()}
                    />
                  ) : null}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/items/${item.id}`}
                      className="text-[var(--muted)] hover:text-[var(--spot)] hover:underline"
                    >
                      {item.ebayListingUrl ? "Details" : "Open"}
                    </Link>
                    <DeleteItemButton
                      itemId={item.id}
                      itemLabel={item.title ?? "Untitled"}
                      variant="link"
                    />
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
