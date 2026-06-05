import { runAutonomousAgent } from "@/lib/agent";
import {
  orderFilesForCluster,
  type BatchImageCluster,
} from "@/lib/ai/cluster-batch-images";
import { isItemPublishable } from "@/lib/ebay/sell/publish-eligibility";
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

function getMaxImagesPerClusterItem(): number {
  return parseInt(process.env.BATCH_SINGLE_MAX_IMAGES ?? "10", 10) || 10;
}

function parseClustersJson(raw: string, imageCount: number): BatchImageCluster[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AppError("Invalid cluster data", 400);
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new AppError("At least one item grouping is required", 400);
  }

  const assigned = new Set<number>();
  const clusters: BatchImageCluster[] = [];

  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const obj = entry as Record<string, unknown>;
    const indices = Array.isArray(obj.imageIndices)
      ? obj.imageIndices.filter(
          (v): v is number => typeof v === "number" && v >= 0 && v < imageCount
        )
      : [];
    const unique = [...new Set(indices)].filter((i) => !assigned.has(i));
    if (unique.length === 0) continue;
    unique.forEach((i) => assigned.add(i));

    const label =
      typeof obj.label === "string" && obj.label.trim()
        ? obj.label.trim()
        : `Item ${clusters.length + 1}`;
    let heroIndex = typeof obj.heroIndex === "number" ? obj.heroIndex : 0;
    if (heroIndex < 0 || heroIndex >= unique.length) heroIndex = 0;

    clusters.push({ label, imageIndices: unique, heroIndex });
  }

  if (assigned.size !== imageCount) {
    throw new AppError("Every photo must be assigned to exactly one item", 400);
  }

  const maxItems = getBatchMaxItems();
  if (clusters.length === 0) {
    throw new AppError("At least one item grouping is required", 400);
  }
  if (clusters.length > maxItems) {
    throw new AppError(`Maximum ${maxItems} listings per batch`, 400);
  }

  return clusters;
}

/** Build item groups from AI-confirmed cluster assignments */
export function buildBatchItemGroupsFromClusters(
  files: File[],
  clusters: BatchImageCluster[],
  globalFields: ItemIntakeFields
): { files: File[]; fields: ItemIntakeFields }[] {
  const maxPerItem = getMaxImagesPerClusterItem();

  return clusters.map((cluster) => {
    const ordered = orderFilesForCluster(files, cluster).slice(0, maxPerItem);
    const notes = [globalFields.freeformNotes, cluster.label].filter(Boolean).join("\n");
    return {
      files: ordered,
      fields: {
        ...globalFields,
        freeformNotes: notes || undefined,
      },
    };
  });
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
  let groups: { files: File[]; fields: ItemIntakeFields }[];
  let maxPerItem: number | undefined;

  if (legacy.length > 0) {
    groups = legacy.map((e) => ({ files: e.files, fields: e.fields }));
  } else {
    const files = formData
      .getAll("images")
      .filter((f): f is File => f instanceof File && f.size > 0);
    const clustersRaw = formData.get("meta[clusters]");
    if (typeof clustersRaw === "string" && clustersRaw.trim()) {
      const globalFields = parseGlobalFields(formData);
      const clusters = parseClustersJson(clustersRaw, files.length);
      groups = buildBatchItemGroupsFromClusters(files, clusters, globalFields);
      maxPerItem = getMaxImagesPerClusterItem();
    } else {
      const built = buildBatchItemGroups(formData);
      groups = built.groups;
      maxPerItem =
        built.splitMode === "single" ? getMaxImagesPerClusterItem() : undefined;
    }
  }

  if (groups.length === 0) {
    throw new AppError("Add at least one photo", 400);
  }

  const batch = await prisma.batch.create({
    data: {
      status: "pending",
      totalItems: groups.length,
    },
  });

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
      else if (!result.awaitingInput) failed += 1;
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
      ebayListingUrl: item.listingDraft?.ebayListingUrl ?? null,
      canPublish: isItemPublishable(item),
    })),
  };
}
