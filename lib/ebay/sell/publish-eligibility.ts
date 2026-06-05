const PUBLISHABLE_ITEM_STATUSES = new Set(["READY", "GENERATED", "REVIEWED"]);

export function isItemPublishable(item: {
  status: string;
  listingDraft?: {
    status: string;
    ebayListingUrl?: string | null;
  } | null;
}): boolean {
  const draft = item.listingDraft;
  if (!draft) return false;
  if (draft.status !== "APPROVED") return false;
  if (draft.ebayListingUrl) return false;
  return PUBLISHABLE_ITEM_STATUSES.has(item.status);
}
