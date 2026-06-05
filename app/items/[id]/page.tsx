import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { parseJsonArray, parseJsonObject } from "@/lib/utils/json";
import { AgentRunTimeline } from "@/components/agent/AgentRunTimeline";
import { ListingResult } from "@/components/items/ListingResult";
import { ComparableList } from "@/components/items/ComparableList";
import { AgentActions } from "@/components/items/AgentActions";
import { ItemAgentShell } from "@/components/items/ItemAgentShell";
import { EbaySellPanel } from "@/components/ebay/EbaySellPanel";
import { Suspense } from "react";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { filterListingQuestions } from "@/lib/agent/filter-listing-questions";
import type { AgentStepLog, AgentQuestion } from "@/lib/agent/types";

export const dynamic = "force-dynamic";

function statusBanner(status: string, error?: string | null, listingUrl?: string | null) {
  if (status === "PROCESSING") {
    return <Alert variant="info">Spot is working on this listing…</Alert>;
  }
  if (status === "AWAITING_INPUT") {
    return <Alert variant="warning">Answer the quick question to continue.</Alert>;
  }
  if (status === "FAILED") {
    return (
      <Alert variant="error">
        Couldn&apos;t finish this listing.{error ? ` ${error}` : " Try again with clearer photos."}
      </Alert>
    );
  }
  if (status === "PUBLISHED" && listingUrl) {
    return (
      <Alert variant="success">
        <a
          href={listingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline"
        >
          View on eBay →
        </a>
      </Alert>
    );
  }
  if (status === "READY" || status === "GENERATED" || status === "REVIEWED") {
    return <Alert variant="success">Ready to publish.</Alert>;
  }
  return null;
}

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
      comparables: { orderBy: { price: "asc" }, take: 6 },
      agentRuns: { orderBy: { startedAt: "desc" }, take: 1 },
    },
  });

  if (!item) notFound();

  const latestRun = item.agentRuns[0];
  const steps = latestRun ? (JSON.parse(latestRun.steps) as AgentStepLog[]) : [];
  const pendingQuestions = parseJsonArray<AgentQuestion>(latestRun?.pendingQuestions);
  const draft = item.listingDraft;
  const listingUrl = draft?.ebayListingUrl ?? null;
  const sellerNotes = {
    brand: item.notesBrand ?? undefined,
    size: item.notesSize ?? undefined,
    condition: item.notesCondition ?? undefined,
  };

  return (
    <div className="space-y-5">
      <ItemAgentShell
        itemId={id}
        itemStatus={item.status}
        agentRunStatus={latestRun?.status}
        pendingQuestions={pendingQuestions}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/"
            className="text-sm text-[var(--muted)] hover:text-[var(--spot)] hover:underline"
          >
            ← Listings
          </Link>
          <h1 className="mt-1 text-xl font-bold text-[var(--foreground)] line-clamp-2">
            {draft?.title ?? "Listing"}
          </h1>
          <div className="mt-2">
            <Badge status={item.status} />
          </div>
        </div>
        <AgentActions itemId={id} itemLabel={draft?.title ?? "this item"} />
      </div>

      {statusBanner(item.status, latestRun?.error, listingUrl)}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          {item.images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
              {item.images.map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={img.path}
                  alt=""
                  className="aspect-square rounded-lg object-cover bg-slate-100"
                />
              ))}
            </div>
          )}
          <Suspense fallback={null}>
            <EbaySellPanel
              itemId={id}
              itemStatus={item.status}
              draftStatus={draft?.status}
              savedListingUrl={listingUrl}
            />
          </Suspense>
          {item.comparables.length > 0 && (
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
          )}
          {steps.length > 0 && (
            <details className="rounded-2xl border border-[var(--border)] bg-[var(--card)]">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-[var(--muted)]">
                Activity log
              </summary>
              <div className="border-t border-[var(--border)] px-2 pb-2">
                <AgentRunTimeline
                  steps={steps}
                  runStatus={latestRun?.status}
                  error={latestRun?.error}
                  compact
                />
              </div>
            </details>
          )}
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
                confidenceScore: draft.confidenceScore,
                warnings: parseJsonArray(draft.warnings),
                questions: filterListingQuestions(parseJsonArray(draft.questions), sellerNotes),
                pricingRationale: draft.pricingRationale,
                ebayListingUrl: listingUrl,
              }}
            />
          ) : (
            <Alert variant="warning">No listing yet — re-run Spot.</Alert>
          )}
        </div>
      </div>
    </div>
  );
}
