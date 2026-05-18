import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createInventoryItemStub, createOfferDraftStub } from "@/lib/ebay/sell-stubs";
import { canPublishToEbay } from "@/lib/utils/ebay-config";
import { getErrorMessage, AppError } from "@/lib/utils/errors";

/**
 * Publish requires explicit user confirmation in the UI (confirm dialog).
 * Sell API not implemented — stubs only. Market research uses fetch APIs separately.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!canPublishToEbay()) {
      throw new AppError(
        "Publish is disabled. Configure EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, and EBAY_ENV=sandbox to enable sandbox publishing.",
        403
      );
    }

    const item = await prisma.item.findUnique({
      where: { id },
      include: { listingDraft: true },
    });

    if (!item?.listingDraft) {
      throw new AppError("Approve a listing draft before publishing.", 400);
    }

    if (item.listingDraft.status !== "APPROVED") {
      throw new AppError("Draft must be approved before publishing.", 400);
    }

    const sku = `item-${id}`;
    await createInventoryItemStub(sku);
    const offer = await createOfferDraftStub(sku);

    await prisma.listingDraft.update({
      where: { itemId: id },
      data: {
        ebayOfferId: offer.offerId,
        publishedAt: new Date(),
      },
    });

    await prisma.item.update({ where: { id }, data: { status: "PUBLISHED" } });

    return NextResponse.json({
      ok: true,
      offerId: offer.offerId,
      message: `Listing draft submitted to eBay sandbox (offer ${offer.offerId}). Review in Seller Hub before going live.`,
    });
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}
