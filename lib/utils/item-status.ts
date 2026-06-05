/** Seller-facing status labels (not raw enum strings). */
export const ITEM_STATUS_LABELS: Record<string, string> = {
  PROCESSING: "Working",
  AWAITING_INPUT: "Needs you",
  READY: "Ready to list",
  PUBLISHED: "Live on eBay",
  FAILED: "Failed",
  INTAKE: "Draft",
  GENERATED: "Ready to list",
  REVIEWED: "Ready to list",
};

export function itemStatusLabel(status: string): string {
  return ITEM_STATUS_LABELS[status] ?? status;
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
