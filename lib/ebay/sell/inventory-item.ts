import type { ListingDraft, UploadedImage } from "@prisma/client";
import { parseJsonArray, parseJsonObject } from "@/lib/utils/json";
import { resolveConditionForCategory } from "./condition";
import { buildInventoryAspects } from "./build-aspects";
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

  if (!draft.categoryId?.trim()) {
    throw new Error("Listing draft is missing eBay categoryId — re-run the agent or set category manually.");
  }

  const aspects = await buildInventoryAspects({
    categoryId: draft.categoryId,
    itemSpecifics: specifics,
  });

  const imageUrls = params.images
    .slice(0, 12)
    .map((img) => toPublicImageUrl(img.path))
    .filter((url) => url.startsWith("http"));

  if (imageUrls.length === 0) {
    throw new Error("At least one public image URL is required to publish on eBay.");
  }

  const condition = await resolveConditionForCategory(
    draft.categoryId,
    draft.conditionDesc,
    params.notesCondition ?? undefined
  );

  await ebaySellFetch(`/sell/inventory/v1/inventory_item/${encodeURIComponent(params.sku)}`, {
    method: "PUT",
    body: {
      condition,
      product: {
        title: draft.title.slice(0, 80),
        description,
        imageUrls,
        aspects,
      },
      availability: {
        shipToLocationAvailability: {
          quantity: 1,
        },
      },
    },
  });
}
