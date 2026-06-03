import { getLLMProvider } from "@/lib/ai";
import { getEbayResearchClient } from "@/lib/ebay";
import { createInventoryItemStub, createOfferDraftStub } from "@/lib/ebay/sell-stubs";
import { prisma } from "@/lib/db/prisma";
import { determinePrice } from "@/lib/pricing";
import { applyPriceToListing } from "@/lib/pricing/apply-to-listing";
import { getAgentConfig } from "./config";
import type { AgentStepLog, AutonomousRunResult } from "./types";
import { parseJsonArray, stringifyJson } from "@/lib/utils/json";
import { AppError } from "@/lib/utils/errors";
import type { ItemNotes } from "@/types";
import { TRACKED_GENERATED_FIELDS } from "@/types";
import { canPublishToEbay } from "@/lib/utils/ebay-config";

function now(): string {
  return new Date().toISOString();
}

function step(
  steps: AgentStepLog[],
  id: AgentStepLog["id"],
  status: AgentStepLog["status"],
  message: string
): void {
  steps.push({ id, status, message, at: now() });
}

function hasBlockingWarnings(warnings: string[], patterns: string[]): boolean {
  if (patterns.length === 0) return false;
  const lower = warnings.map((w) => w.toLowerCase());
  return lower.some((w) => patterns.some((p) => w.includes(p)));
}

function computeAutoQualityScore(confidence: number, fieldsGenerated: number): number {
  const base = 2.5 + confidence * 2;
  const fieldBonus = Math.min(0.5, fieldsGenerated * 0.05);
  return Math.min(5, Math.round((base + fieldBonus) * 10) / 10);
}

/**
 * Fully autonomous listing agent: comps → price → copy → approve → evaluate → optional publish.
 * No human approval gates unless confidence/warnings fail (item → FAILED).
 */
export async function runAutonomousAgent(itemId: string): Promise<AutonomousRunResult> {
  const config = getAgentConfig();
  const steps: AgentStepLog[] = [];

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { images: { orderBy: { sortOrder: "asc" } }, listingDraft: true },
  });

  if (!item) {
    throw new AppError("Item not found", 404);
  }

  await prisma.item.update({ where: { id: itemId }, data: { status: "PROCESSING" } });
  await prisma.agentRun.create({
    data: { itemId, status: "running", steps: "[]" },
  });

  const persistSteps = async (status: string, error?: string) => {
    await prisma.agentRun.updateMany({
      where: { itemId, status: "running" },
      data: {
        status,
        steps: stringifyJson(steps),
        error: error ?? null,
        completedAt: new Date(),
      },
    });
  };

  try {
    const notes: ItemNotes = {
      brand: item.notesBrand ?? undefined,
      size: item.notesSize ?? undefined,
      condition: item.notesCondition ?? undefined,
      defects: item.notesDefects ?? undefined,
      purchasePrice: item.purchasePrice ?? undefined,
      minPrice: item.minPrice ?? undefined,
      freeformNotes: item.freeformNotes ?? undefined,
    };

    const searchQuery =
      [notes.brand, notes.size, notes.freeformNotes].filter(Boolean).join(" ") || "resale item";

    step(steps, "fetch_comparables", "running", `Searching market: "${searchQuery}"`);
    const ebay = getEbayResearchClient();
    const { comparables: comparablesRaw, meta: ebayMeta } = await ebay.fetchComparables({
      query: searchQuery,
      limit: 12,
      categoryId: item.listingDraft?.categoryId ?? undefined,
    });

    await prisma.comparableListing.deleteMany({ where: { itemId } });
    if (comparablesRaw.length > 0) {
      await prisma.comparableListing.createMany({
        data: comparablesRaw.map((c) => ({
          itemId,
          ebayItemId: c.ebayItemId,
          title: c.title,
          price: c.price,
          condition: c.condition,
          soldDate: c.soldDate ? new Date(c.soldDate) : null,
          url: c.url,
          listingType: c.listingType,
          source: c.source,
        })),
      });
    }

    step(
      steps,
      "fetch_comparables",
      "completed",
      `Found ${comparablesRaw.length} comparables (${ebayMeta.activeCount} active, ${ebayMeta.soldCount} sold${
        ebayMeta.usedMockFallback ? ", mock fallback" : ""
      }, env=${ebayMeta.researchEnv}).`
    );

    const comparables = comparablesRaw.map((c) => ({
      title: c.title,
      price: c.price,
      condition: c.condition,
      soldDate: c.soldDate,
      url: c.url,
    }));

    const imagePaths = item.images.map((img) => img.path);

    step(steps, "determine_price", "running", "Analyzing photos and market data for pricing…");
    const priceRecommendation = await determinePrice({ notes, imagePaths, comparables });
    step(
      steps,
      "determine_price",
      "completed",
      `Starting $${priceRecommendation.startingPrice.toFixed(2)}, BIN $${priceRecommendation.buyItNowPrice.toFixed(2)} (${priceRecommendation.method}).`
    );

    step(steps, "generate_listing", "running", "Generating listing copy from images…");
    const llm = getLLMProvider();
    let generated = await llm.generateListing({
      itemId,
      notes,
      imagePaths,
      comparables,
      priceRecommendation: {
        startingPrice: priceRecommendation.startingPrice,
        buyItNowPrice: priceRecommendation.buyItNowPrice,
        pricingConfidence: priceRecommendation.pricingConfidence,
        rationale: priceRecommendation.rationale,
        method: priceRecommendation.method,
      },
    });
    generated = applyPriceToListing(generated, priceRecommendation);
    step(steps, "generate_listing", "completed", `Draft title: ${generated.title.slice(0, 60)}…`);

    const warnings = generated.warnings;
    const questions = generated.questions;
    const confidence = generated.confidenceScore;

    const draftPayload = {
      title: generated.title,
      descriptionBullets: stringifyJson(generated.descriptionBullets),
      itemSpecifics: stringifyJson(generated.itemSpecifics),
      conditionDesc: generated.conditionDesc,
      categoryId: generated.categoryId,
      categoryName: generated.categoryName,
      startingPrice: generated.startingPrice,
      buyItNowPrice: generated.buyItNowPrice,
      shippingAssumptions: generated.shippingAssumptions,
      confidenceScore: confidence,
      warnings: stringifyJson(warnings),
      questions: stringifyJson(questions),
      pricingRationale: priceRecommendation.rationale,
      pricingMethod: priceRecommendation.method,
      status: "DRAFT" as const,
      userEditsCount: 0,
    };

    if (item.listingDraft) {
      await prisma.listingDraft.update({ where: { itemId }, data: draftPayload });
    } else {
      await prisma.listingDraft.create({ data: { itemId, ...draftPayload } });
    }

    const blocked = hasBlockingWarnings(warnings, config.blockingWarningPatterns);
    const meetsConfidence = confidence >= config.confidenceThreshold;

    step(steps, "auto_approve", "running", "Applying autonomous approval policy…");

    if (!config.autoApprove || blocked || !meetsConfidence) {
      const reason = blocked
        ? "Blocked by safety warnings (authenticity/compliance)."
        : !meetsConfidence
          ? `Confidence ${(confidence * 100).toFixed(0)}% below threshold ${(config.confidenceThreshold * 100).toFixed(0)}%.`
          : "Auto-approve disabled.";
      step(steps, "auto_approve", "failed", reason);
      await prisma.listingDraft.update({
        where: { itemId },
        data: { status: "REJECTED" },
      });
      await prisma.item.update({ where: { id: itemId }, data: { status: "FAILED" } });
      await persistSteps("failed", reason);

      return {
        itemId,
        success: false,
        itemStatus: "FAILED",
        steps,
        error: reason,
        published: false,
      };
    }

    await prisma.listingDraft.update({
      where: { itemId },
      data: { status: "APPROVED", approvedAt: new Date() },
    });
    step(steps, "auto_approve", "completed", "Listing auto-approved by agent policy.");

    step(steps, "auto_evaluate", "running", "Recording agent evaluation metrics…");
    const qualityScore = computeAutoQualityScore(confidence, TRACKED_GENERATED_FIELDS.length);
    const generationCompletedAt = new Date();

    await prisma.evaluationMetric.upsert({
      where: { itemId },
      create: {
        itemId,
        timeSavedMinutes: config.timeSavedMinutes,
        fieldsGenerated: TRACKED_GENERATED_FIELDS.length,
        fieldsEditedByUser: 0,
        qualityScore,
        qualityNotes: "Autonomous agent run — no human edits.",
        generationCompletedAt,
        reviewCompletedAt: generationCompletedAt,
      },
      update: {
        timeSavedMinutes: config.timeSavedMinutes,
        fieldsGenerated: TRACKED_GENERATED_FIELDS.length,
        fieldsEditedByUser: 0,
        qualityScore,
        qualityNotes: "Autonomous agent run — no human edits.",
        generationCompletedAt,
        reviewCompletedAt: generationCompletedAt,
      },
    });
    step(steps, "auto_evaluate", "completed", `Quality score ${qualityScore}/5 (automated).`);

    let published = false;
    let offerId: string | undefined;

    const canPublish =
      config.autoPublish &&
      canPublishToEbay() &&
      confidence >= config.publishConfidenceThreshold;

    if (canPublish) {
      step(steps, "auto_publish", "running", "Publishing to eBay sandbox…");
      const sku = `item-${itemId}`;
      await createInventoryItemStub(sku);
      const offer = await createOfferDraftStub(sku);
      offerId = offer.offerId;
      await prisma.listingDraft.update({
        where: { itemId },
        data: { ebayOfferId: offer.offerId, publishedAt: new Date() },
      });
      await prisma.item.update({ where: { id: itemId }, data: { status: "PUBLISHED" } });
      published = true;
      step(steps, "auto_publish", "completed", `Published (sandbox offer ${offer.offerId}).`);
    } else {
      await prisma.item.update({ where: { id: itemId }, data: { status: "READY" } });
      const skipReason = !config.autoPublish
        ? "Auto-publish disabled (set AGENT_AUTO_PUBLISH=true)."
        : !canPublishToEbay()
          ? "eBay credentials not configured for publish."
          : `Confidence below publish threshold (${(config.publishConfidenceThreshold * 100).toFixed(0)}%).`;
      step(steps, "auto_publish", "skipped", skipReason);
    }

    await persistSteps("completed");

    return {
      itemId,
      success: true,
      itemStatus: published ? "PUBLISHED" : "READY",
      steps,
      published,
      offerId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent run failed";
    step(steps, "generate_listing", "failed", message);
    await prisma.item.update({ where: { id: itemId }, data: { status: "FAILED" } }).catch(() => {});
    await persistSteps("failed", message);
    throw new AppError(message, 502, "AGENT_RUN_FAILED");
  }
}
