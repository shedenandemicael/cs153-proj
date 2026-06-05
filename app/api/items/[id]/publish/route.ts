import { NextRequest, NextResponse } from "next/server";
import { getEbaySellStatus } from "@/lib/ebay/sell/publish-listing";
import { publishItemById } from "@/lib/services/publish-item";
import { canPublishToEbay } from "@/lib/utils/ebay-config";
import { getErrorMessage, AppError } from "@/lib/utils/errors";

/**
 * POST /api/items/[id]/publish — publish approved draft to eBay sandbox (Sell API).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!canPublishToEbay()) {
      throw new AppError(
        "Sandbox publish requires EBAY_ENV=sandbox and EBAY_SANDBOX_CLIENT_ID / EBAY_SANDBOX_CLIENT_SECRET.",
        403
      );
    }

    const sellStatus = await getEbaySellStatus();
    if (!sellStatus.connected) {
      throw new AppError(
        "Connect your eBay sandbox seller account first (Connect eBay Sandbox on the item page).",
        403
      );
    }

    const result = await publishItemById(id);

    return NextResponse.json({
      ok: true,
      offerId: result.offerId,
      listingId: result.listingId,
      listingUrl: result.listingUrl,
      message: result.listingUrl
        ? `Published to eBay sandbox. View listing: ${result.listingUrl}`
        : `Published to eBay sandbox (offer ${result.offerId}).`,
    });
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}
