import { runAutonomousAgent } from "@/lib/agent";
import { prisma } from "@/lib/db/prisma";
import {
  createItemWithImages,
  type ItemIntakeFields,
} from "@/lib/services/item-intake";
import { AppError } from "@/lib/utils/errors";

export type BatchSplitMode = "single" | "per_image";

export function getBatchMaxItems(): number {
  const n = parseInt(process.env.BATCH_MAX_ITEMS ?? "10", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 20) : 10;
}

export function getBatchMaxPhotos(): number {
  const n = parseInt(process.env.BATCH_MAX_PHOTOS ?? "30", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 50) : 30;
}

function parseGlobalFields(formData: FormData): ItemIntakeFields {
  const get = (key: string) => {
    const v = formData.get(`meta[${key}]`);
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  const parseNum = (key: string) => {
    const v = formData.get(`meta[${key}]`);
    if (typeof v !== "string" || !v.trim()) return undefined;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    brand: get("brand"),
    size: get("size"),
    condition: get("condition"),
    defects: get("defects"),
    purchasePrice: parseNum("purchasePrice"),
    minPrice: parseNum("minPrice"),
    freeformNotes: get("freeformNotes"),
  };
}

/** Build item groups from one multi-file upload + split mode */
export function buildBatchItemGroups(formData: FormData): {
  files: File[];
  groups: { files: File[]; fields: ItemIntakeFields }[];
  splitMode: BatchSplitMode;
} {
  const splitMode = (formData.get("meta[splitMode]") as BatchSplitMode) || "per_image";
  const globalFields = parseGlobalFields(formData);

  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const maxPhotos = getBatchMaxPhotos();
  if (files.length === 0) {
    throw new AppError("Upload at least one photo", 400);
  }
  if (files.length > maxPhotos) {
    throw new AppError(`Maximum ${maxPhotos} photos per batch upload`, 400);
  }

  if (splitMode === "single") {
    const maxPerItem = parseInt(process.env.BATCH_SINGLE_MAX_IMAGES ?? "10", 10) || 10;
    return {
      files,
      splitMode,
      groups: [
        {
          files: files.slice(0, maxPerItem),
          fields: globalFields,
        },
      ],
    };
  }

  const maxItems = getBatchMaxItems();
  if (files.length > maxItems) {
    throw new AppError(
      `Per-photo mode supports up to ${maxItems} listings. Use "one listing" mode for more photos on a single item.`,
      400
    );
  }

  return {
    files,
    splitMode,
    groups: files.map((file) => ({
      files: [file],
      fields: globalFields,
    })),
  };
}

/** @deprecated Legacy multi-row form parser */
export function parseBatchItemsFromFormData(formData: FormData): {
  index: number;
  files: File[];
  fields: ItemIntakeFields;
}[] {
  const max = getBatchMaxItems();
  const items: { index: number; files: File[]; fields: ItemIntakeFields }[] = [];

  for (let i = 0; i < max; i++) {
    const rowFiles = formData
      .getAll(`items[${i}][images]`)
      .filter((f): f is File => f instanceof File && f.size > 0);
    if (rowFiles.length === 0) break;

    const prefix = `items[${i}]`;
    const get = (name: string) => {
      const v = formData.get(`${prefix}[${name}]`);
      return typeof v === "string" && v.trim() ? v.trim() : undefined;
    };
    const parseNum = (name: string) => {
      const v = formData.get(`${prefix}[${name}]`);
      if (typeof v !== "string" || !v.trim()) return undefined;
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : undefined;
    };

    items.push({
      index: i,
      files: rowFiles.slice(0, 5),
      fields: {
        brand: get("brand"),
        size: get("size"),
        condition: get("condition"),
        defects: get("defects"),
        purchasePrice: parseNum("purchasePrice"),
        minPrice: parseNum("minPrice"),
        freeformNotes: get("freeformNotes"),
      },
    });
  }

  return items;
}

export async function createBatchFromFormData(formData: FormData) {
  const legacy = parseBatchItemsFromFormData(formData);
  const groups =
    legacy.length > 0
      ? legacy.map((e) => ({ files: e.files, fields: e.fields }))
      : buildBatchItemGroups(formData).groups;

  if (groups.length === 0) {
    throw new AppError("Add at least one photo", 400);
  }

  const batch = await prisma.batch.create({
    data: {
      status: "pending",
      totalItems: groups.length,
    },
  });

  const maxPerItem =
    formData.get("meta[splitMode]") === "single"
      ? parseInt(process.env.BATCH_SINGLE_MAX_IMAGES ?? "10", 10) || 10
      : undefined;

  const itemIds: string[] = [];
  for (let i = 0; i < groups.length; i++) {
    const entry = groups[i];
    const item = await createItemWithImages(entry.files, entry.fields, {
      batchId: batch.id,
      batchIndex: i,
      maxImages: maxPerItem,
    });
    itemIds.push(item.id);
  }

  return { batch, itemIds };
}

export async function processBatch(batchId: string): Promise<void> {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { items: { orderBy: { batchIndex: "asc" } } },
  });

  if (!batch) return;

  await prisma.batch.update({
    where: { id: batchId },
    data: { status: "processing", processed: 0, succeeded: 0, failed: 0 },
  });

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const item of batch.items) {
    try {
      const result = await runAutonomousAgent(item.id);
      processed += 1;
      if (result.success) succeeded += 1;
      else failed += 1;
    } catch {
      processed += 1;
      failed += 1;
    }

    await prisma.batch.update({
      where: { id: batchId },
      data: { processed, succeeded, failed },
    });
  }

  await prisma.batch.update({
    where: { id: batchId },
    data: { status: "completed" },
  });
}

export async function getBatchSummary(batchId: string) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      items: {
        orderBy: { batchIndex: "asc" },
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          listingDraft: true,
        },
      },
    },
  });

  if (!batch) return null;

  return {
    id: batch.id,
    status: batch.status,
    totalItems: batch.totalItems,
    processed: batch.processed,
    succeeded: batch.succeeded,
    failed: batch.failed,
    createdAt: batch.createdAt.toISOString(),
    items: batch.items.map((item) => ({
      id: item.id,
      batchIndex: item.batchIndex,
      status: item.status,
      title: item.listingDraft?.title ?? null,
      startingPrice: item.listingDraft?.startingPrice ?? null,
      imagePath: item.images[0]?.path ?? null,
    })),
  };
}
