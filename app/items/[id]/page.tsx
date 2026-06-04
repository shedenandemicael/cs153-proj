import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { parseJsonArray, parseJsonObject } from "@/lib/utils/json";
import { AgentRunTimeline } from "@/components/agent/AgentRunTimeline";
import { ListingResult } from "@/components/items/ListingResult";
import { ComparableList } from "@/components/items/ComparableList";
import { AgentActions } from "@/components/items/AgentActions";
import { ItemAgentShell } from "@/components/items/ItemAgentShell";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import type { AgentStepLog, AgentQuestion } from "@/lib/agent/types";

export const dynamic = "force-dynamic";

export default async function ItemAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      listingDraft: true,
      comparables: { orderBy: { price: "asc" } },
      evaluation: true,
      agentRuns: { orderBy: { startedAt: "desc" }, take: 1 },
    },
  });

  if (!item) notFound();

  const latestRun = item.agentRuns[0];
  const steps = latestRun ? (JSON.parse(latestRun.steps) as AgentStepLog[]) : [];
  const pendingQuestions = parseJsonArray<AgentQuestion>(latestRun?.pendingQuestions);

  const draft = item.listingDraft;
  const legacyReady = item.status === "GENERATED" || item.status === "REVIEWED";

  return (
    <div className="space-y-6">
      <ItemAgentShell
        itemId={id}
        itemStatus={item.status}
        agentRunStatus={latestRun?.status}
        pendingQuestions={pendingQuestions}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {draft?.title ?? "Agent run"}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge status={item.status} />
            <Link href={`/items/${id}/evaluate`} className="text-sm text-slate-500 hover:underline">
              Metrics →
            </Link>
          </div>
        </div>
        <AgentActions itemId={id} itemLabel={draft?.title ?? "this item"} />
      </div>

      {item.status === "PROCESSING" && (
        <Alert variant="info">Agent is processing this item…</Alert>
      )}

      {item.status === "AWAITING_INPUT" && (
        <Alert variant="warning">
          The agent needs your input before it can finish — answer the popup to continue.
        </Alert>
      )}

      {item.status === "FAILED" && (
        <Alert variant="error">
          Agent could not complete autonomously. Check the run log or re-run with better photos/notes.
          {latestRun?.error ? ` ${latestRun.error}` : ""}
        </Alert>
      )}

      {(item.status === "READY" || item.status === "PUBLISHED" || legacyReady) && (
        <Alert variant="success">
          {item.status === "PUBLISHED"
            ? "Agent completed and published to eBay sandbox."
            : "Agent completed listing autonomously — ready for eBay."}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold">Photos</h3>
            <div className="grid grid-cols-2 gap-2">
              {item.images.map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={img.path}
                  alt={img.filename}
                  className="aspect-square rounded-lg object-cover bg-slate-100"
                />
              ))}
            </div>
          </div>
          <AgentRunTimeline
            steps={steps}
            runStatus={latestRun?.status}
            error={latestRun?.error}
          />
          <ComparableList
            comparables={item.comparables.map((c) => ({
              id: c.id,
              title: c.title,
              price: c.price,
              condition: c.condition,
              soldDate: c.soldDate?.toISOString() ?? null,
              url: c.url,
              listingType: c.listingType,
              source: c.source,
            }))}
          />
        </div>
        <div className="lg:col-span-2">
          {draft ? (
            <ListingResult
              data={{
                title: draft.title,
                descriptionBullets: parseJsonArray(draft.descriptionBullets),
                itemSpecifics: parseJsonObject(draft.itemSpecifics),
                conditionDesc: draft.conditionDesc,
                categoryName: draft.categoryName ?? undefined,
                startingPrice: draft.startingPrice,
                buyItNowPrice: draft.buyItNowPrice ?? undefined,
                shippingAssumptions: draft.shippingAssumptions ?? undefined,
                confidenceScore: draft.confidenceScore,
                warnings: parseJsonArray(draft.warnings),
                questions: parseJsonArray(draft.questions),
                pricingRationale: draft.pricingRationale,
                pricingMethod: draft.pricingMethod,
                draftStatus: draft.status,
                itemStatus: item.status,
                ebayOfferId: draft.ebayOfferId,
              }}
            />
          ) : (
            <Alert variant="warning">No listing output yet. Re-run the agent.</Alert>
          )}
        </div>
      </div>
    </div>
  );
}
