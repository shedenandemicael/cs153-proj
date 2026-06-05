import { publishListingToEbay } from "@/lib/ebay/sell/publish-listing";
import { isItemPublishable } from "@/lib/ebay/sell/publish-eligibility";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/errors";

export interface PublishItemResult {
  itemId: string;
  ok: boolean;
  listingUrl?: string;
  offerId?: string;
  error?: string;
}

export async function publishItemById(itemId: string) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      listingDraft: true,
      images: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!item?.listingDraft) {
    throw new AppError("Approve a listing draft before publishing.", 400);
  }

  if (!isItemPublishable(item)) {
    throw new AppError("This item is not ready to publish.", 400);
  }

  const result = await publishListingToEbay({ ...item, listingDraft: item.listingDraft });

  await prisma.listingDraft.update({
    where: { itemId },
    data: {
      ebayOfferId: result.offerId,
      ebayListingUrl: result.listingUrl ?? null,
      publishedAt: new Date(),
    },
  });

  await prisma.item.update({ where: { id: itemId }, data: { status: "PUBLISHED" } });

  return result;
}

export async function publishItemsByIds(itemIds: string[]): Promise<PublishItemResult[]> {
  const unique = [...new Set(itemIds)].filter(Boolean);
  const results: PublishItemResult[] = [];

  for (const itemId of unique) {
    try {
      const result = await publishItemById(itemId);
      results.push({
        itemId,
        ok: true,
        listingUrl: result.listingUrl,
        offerId: result.offerId,
      });
    } catch (error) {
      results.push({
        itemId,
        ok: false,
        error: error instanceof AppError ? error.message : error instanceof Error ? error.message : "Publish failed",
      });
    }
  }

  return results;
}
