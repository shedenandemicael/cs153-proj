import { prisma } from "@/lib/db/prisma";
import { saveUploadedImages } from "@/lib/services/upload";
import { AppError } from "@/lib/utils/errors";

export interface ItemIntakeFields {
  brand?: string;
  size?: string;
  condition?: string;
  defects?: string;
  purchasePrice?: number | null;
  minPrice?: number | null;
  freeformNotes?: string;
}

export function parseOptionalFloat(value: FormDataEntryValue | null): number | null {
  if (!value || typeof value !== "string" || !value.trim()) return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export function parseItemFieldsFromFormData(
  formData: FormData,
  prefix: string
): ItemIntakeFields {
  const key = (name: string) => formData.get(`${prefix}[${name}]`) as string | null;
  return {
    brand: key("brand")?.trim() || undefined,
    size: key("size")?.trim() || undefined,
    condition: key("condition")?.trim() || undefined,
    defects: key("defects")?.trim() || undefined,
    purchasePrice: parseOptionalFloat(key("purchasePrice")),
    minPrice: parseOptionalFloat(key("minPrice")),
    freeformNotes: key("freeformNotes")?.trim() || undefined,
  };
}

export async function createItemWithImages(
  files: File[],
  fields: ItemIntakeFields,
  options?: { batchId?: string; batchIndex?: number; maxImages?: number }
) {
  if (files.length === 0) {
    throw new AppError("Each item needs at least one photo", 400);
  }

  const item = await prisma.item.create({
    data: {
      batchId: options?.batchId,
      batchIndex: options?.batchIndex,
      notesBrand: fields.brand ?? null,
      notesSize: fields.size ?? null,
      notesCondition: fields.condition ?? null,
      notesDefects: fields.defects ?? null,
      purchasePrice: fields.purchasePrice ?? null,
      minPrice: fields.minPrice ?? null,
      freeformNotes: fields.freeformNotes ?? null,
      status: "PROCESSING",
    },
  });

  const saved = await saveUploadedImages(item.id, files, {
    maxImages: options?.maxImages,
  });
  await prisma.uploadedImage.createMany({
    data: saved.map((img, i) => ({
      itemId: item.id,
      filename: img.filename,
      path: img.path,
      mimeType: img.mimeType,
      sizeBytes: img.sizeBytes,
      sortOrder: i,
    })),
  });

  await prisma.evaluationMetric.create({
    data: { itemId: item.id },
  });

  return item;
}
