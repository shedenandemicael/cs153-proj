import Link from "next/link";
import { ItemTable } from "@/components/dashboard/ItemTable";
import { BulkPublishBar } from "@/components/ebay/BulkPublishBar";
import { Button } from "@/components/ui/Button";
import { isItemPublishable } from "@/lib/ebay/sell/publish-eligibility";
import { getEbaySellStatus } from "@/lib/ebay/sell/publish-listing";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const items = await prisma.item.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      listingDraft: true,
    },
  });

  const rows = items.map((item) => ({
    id: item.id,
    status: item.status,
    title: item.listingDraft?.title ?? null,
    startingPrice: item.listingDraft?.startingPrice ?? null,
    updatedAt: item.updatedAt.toISOString(),
    imagePath: item.images[0]?.path ?? null,
    ebayListingUrl: item.listingDraft?.ebayListingUrl ?? null,
    canPublish: isItemPublishable(item),
  }));

  const sellStatus = await getEbaySellStatus();
  const publishableIds = rows.filter((r) => r.canPublish).map((r) => r.id);
  const liveCount = rows.filter((r) => r.status === "PUBLISHED").length;
  const needsYou = rows.filter((r) => r.status === "AWAITING_INPUT").length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Listings</h1>
          {(liveCount > 0 || needsYou > 0) && (
            <p className="mt-1 text-sm text-[var(--muted)]">
              {liveCount > 0 ? `${liveCount} live on eBay` : null}
              {liveCount > 0 && needsYou > 0 ? " · " : null}
              {needsYou > 0 ? `${needsYou} need your input` : null}
            </p>
          )}
        </div>
        <Link href="/items/new">
          <Button>Add photos</Button>
        </Link>
      </div>

      <div className="space-y-4">
        <BulkPublishBar publishableItemIds={publishableIds} returnTo="/dashboard" />
        <ItemTable items={rows} sellConnected={sellStatus.connected} />
      </div>
    </div>
  );
}
