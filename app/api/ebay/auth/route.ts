import { NextResponse } from "next/server";

/**
 * User OAuth is not required for fetch-only market research (application token).
 * Reserved for a future publish/sell integration.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: "User OAuth is not used for comparable research",
      hint: "Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET for Browse + Marketplace Insights fetch. Use GET /api/ebay/comparables?q=... to test.",
    },
    { status: 501 }
  );
}
