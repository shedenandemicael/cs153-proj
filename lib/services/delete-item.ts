import { rm } from "fs/promises";
import { del } from "@vercel/blob";
import { endEbayListingForItem, wasPublishedOnEbay } from "@/lib/ebay/sell/end-listing";
import { prisma } from "@/lib/db/prisma";
import { AppError, getErrorMessage } from "@/lib/utils/errors";
import { isRemoteImagePath, localItemUploadDir } from "@/lib/services/upload-paths";

export interface DeleteItemResult {
  ebayEnded: boolean;
  ebayWarning?: string;
}

/** Delete item, end eBay listing if published, related DB rows (cascade), and uploaded image files. */
export async function deleteItem(itemId: string): Promise<DeleteItemResult> {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { images: true, listingDraft: true },
  });
  if (!item) {
    throw new AppError("Item not found", 404);
  }

  let ebayEnded = false;
  let ebayWarning: string | undefined;

  if (wasPublishedOnEbay(item)) {
    try {
      const ebayResult = await endEbayListingForItem({
        itemId,
        ebayOfferId: item.listingDraft?.ebayOfferId,
      });
      ebayEnded = ebayResult.ended;
      ebayWarning = ebayResult.warning;
    } catch (error) {
      throw new AppError(
        `Could not end the eBay listing: ${getErrorMessage(error)}. Item was not deleted.`,
        502
      );
    }
  }

  const blobUrls = item.images.map((img) => img.path).filter(isRemoteImagePath);
  await prisma.item.delete({ where: { id: itemId } });

  if (blobUrls.length > 0) {
    try {
      await del(blobUrls);
    } catch {
      // Blobs may already be gone
    }
  }

  const itemDir = localItemUploadDir(itemId);
  try {
    await rm(itemDir, { recursive: true, force: true });
  } catch {
    // Folder may not exist (e.g. seed data or blob-only uploads)
  }

  return { ebayEnded, ebayWarning };
}
