import { NextRequest, NextResponse } from "next/server";
import { fetchComparables } from "@/lib/ebay";
import { getErrorMessage, AppError } from "@/lib/utils/errors";

/**
 * GET /api/ebay/comparables?q=nike+shoes&limit=10&categoryId=11450
 * Fetch-only: sold (Insights) + active (Browse) comparables for testing.
 */
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q");
    if (!q?.trim()) {
      throw new AppError("Query parameter 'q' is required", 400);
    }

    const categoryId = request.nextUrl.searchParams.get("categoryId") ?? undefined;
    const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "12", 10);
    const includeSold = request.nextUrl.searchParams.get("includeSold") !== "false";
    const includeActive = request.nextUrl.searchParams.get("includeActive") !== "false";

    const result = await fetchComparables({
      query: q.trim(),
      categoryId,
      limit: Number.isFinite(limit) ? limit : 12,
      includeSold,
      includeActive,
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}
