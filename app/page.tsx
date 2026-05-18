import Link from "next/link";
import { ItemTable } from "@/components/dashboard/ItemTable";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/db/prisma";
import { getAgentConfig } from "@/lib/agent";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const agentConfig = getAgentConfig();
  const items = await prisma.item.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      listingDraft: true,
    },
  });

  const rows = items.map((item) => ({
    id: item.id,
    status: item.status,
    title: item.listingDraft?.title ?? null,
    startingPrice: item.listingDraft?.startingPrice ?? null,
    updatedAt: item.updatedAt.toISOString(),
    imagePath: item.images[0]?.path ?? null,
  }));

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Autonomous resale agent</h1>
          <p className="mt-1 text-slate-600">
            Upload photos → agent researches, prices, lists, and publishes with no manual review.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Auto-approve ≥{(agentConfig.confidenceThreshold * 100).toFixed(0)}% confidence
            {agentConfig.autoPublish
              ? ` · Auto-publish ≥${(agentConfig.publishConfidenceThreshold * 100).toFixed(0)}%`
              : " · Auto-publish off"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/items/batch">
            <Button>Batch upload</Button>
          </Link>
          <Link href="/items/new">
            <Button variant="secondary">Single item</Button>
          </Link>
        </div>
      </div>

      <ItemTable items={rows} />
    </div>
  );
}
