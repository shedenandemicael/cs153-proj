import { rm } from "fs/promises";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/errors";
import { isRemoteImagePath, localItemUploadDir } from "@/lib/services/upload-paths";

/** Delete item, related DB rows (cascade), and uploaded image files. */
export async function deleteItem(itemId: string): Promise<void> {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { images: true },
  });
  if (!item) {
    throw new AppError("Item not found", 404);
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
}
