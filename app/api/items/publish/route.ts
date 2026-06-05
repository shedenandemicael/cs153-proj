import { NextRequest, NextResponse } from "next/server";
import { getEbaySellStatus } from "@/lib/ebay/sell/publish-listing";
import { publishItemsByIds } from "@/lib/services/publish-item";
import { canPublishToEbay } from "@/lib/utils/ebay-config";
import { getErrorMessage, AppError } from "@/lib/utils/errors";

/** POST — publish one or more ready items to eBay sandbox */
export async function POST(request: NextRequest) {
  try {
    if (!canPublishToEbay()) {
      throw new AppError(
        "Sandbox publish requires EBAY_ENV=sandbox and EBAY_SANDBOX_CLIENT_ID / EBAY_SANDBOX_CLIENT_SECRET.",
        403
      );
    }

    const sellStatus = await getEbaySellStatus();
    if (!sellStatus.connected) {
      throw new AppError(
        "Connect your eBay sandbox seller account first.",
        403
      );
    }

    const body = (await request.json()) as { itemIds?: unknown };
    const itemIds = Array.isArray(body.itemIds)
      ? body.itemIds.filter((id): id is string => typeof id === "string" && id.length > 0)
      : [];

    if (itemIds.length === 0) {
      throw new AppError("Provide at least one itemId.", 400);
    }

    const results = await publishItemsByIds(itemIds);
    const published = results.filter((r) => r.ok).length;
    const failed = results.length - published;

    return NextResponse.json({
      results,
      published,
      failed,
      message:
        published > 0
          ? `Published ${published} listing${published === 1 ? "" : "s"} to eBay sandbox.`
          : "No listings were published.",
    });
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}
