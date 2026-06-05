import type { ListingDraft, UploadedImage } from "@prisma/client";
import { parseJsonArray, parseJsonObject } from "@/lib/utils/json";
import { mapConditionToEbayEnum } from "./condition";
import { ebaySellFetch } from "./http";

function toPublicImageUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function createOrReplaceInventoryItem(params: {
  sku: string;
  draft: ListingDraft;
  images: UploadedImage[];
  notesCondition?: string | null;
}): Promise<void> {
  const { draft } = params;
  const bullets = parseJsonArray(draft.descriptionBullets);
  const specifics = parseJsonObject<Record<string, string>>(draft.itemSpecifics);
  const description = bullets.length > 0 ? bullets.join("\n") : draft.conditionDesc;

  const aspects: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(specifics)) {
    if (value?.trim()) aspects[key] = [value.trim()];
  }

  const imageUrls = params.images
    .slice(0, 12)
    .map((img) => toPublicImageUrl(img.path))
    .filter((url) => url.startsWith("http"));

  if (imageUrls.length === 0) {
    throw new Error("At least one public image URL is required to publish on eBay.");
  }

  await ebaySellFetch(`/sell/inventory/v1/inventory_item/${encodeURIComponent(params.sku)}`, {
    method: "PUT",
    body: {
      condition: mapConditionToEbayEnum(draft.conditionDesc, params.notesCondition ?? undefined),
      product: {
        title: draft.title.slice(0, 80),
        description,
        imageUrls,
        aspects: Object.keys(aspects).length > 0 ? aspects : undefined,
      },
      availability: {
        shipToLocationAvailability: {
          quantity: 1,
        },
      },
    },
  });
}
