/** Stable Inventory API SKU for a Spot item (must match publish flow). */
export function spotItemSku(itemId: string): string {
  return `cs153-${itemId}`;
}
