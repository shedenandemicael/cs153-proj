import { rm } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/errors";

/** Delete item, related DB rows (cascade), and uploaded image folder. */
export async function deleteItem(itemId: string): Promise<void> {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) {
    throw new AppError("Item not found", 404);
  }

  await prisma.item.delete({ where: { id: itemId } });

  const uploadDir = process.env.UPLOAD_DIR ?? "public/uploads";
  const itemDir = path.join(process.cwd(), uploadDir, itemId);
  try {
    await rm(itemDir, { recursive: true, force: true });
  } catch {
    // Folder may not exist (e.g. seed data without files)
  }
}
