import { runAutonomousAgent } from "@/lib/agent";
import { prisma } from "@/lib/db/prisma";
import { parseJsonArray, parseJsonObject } from "@/lib/utils/json";

/** @deprecated Use runAutonomousAgent — kept for /api/items/[id]/generate */
export async function generateListingForItem(itemId: string) {
  await runAutonomousAgent(itemId);
  return prisma.item.findUnique({
    where: { id: itemId },
    include: {
      images: true,
      listingDraft: true,
      comparables: true,
      evaluation: true,
      agentRuns: { orderBy: { startedAt: "desc" }, take: 1 },
    },
  });
}

export function countUserEdits(
  original: Record<string, unknown>,
  updated: Record<string, unknown>
): number {
  let edits = 0;
  for (const key of Object.keys(updated)) {
    if (JSON.stringify(original[key]) !== JSON.stringify(updated[key])) {
      edits += 1;
    }
  }
  return edits;
}

export { parseJsonArray, parseJsonObject };
