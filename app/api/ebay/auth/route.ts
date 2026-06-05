import { NextRequest, NextResponse } from "next/server";
import { buildEbayAuthorizeUrl } from "@/lib/ebay/oauth/user-token";
import { createOAuthState } from "@/lib/ebay/oauth/state";
import { getEbaySellConfig } from "@/lib/utils/ebay-config";
import { getErrorMessage, AppError } from "@/lib/utils/errors";

/**
 * GET /api/ebay/auth — start seller OAuth (sandbox publish).
 * Optional ?returnTo=/items/abc after connect.
 */
export async function GET(request: NextRequest) {
  try {
    const config = getEbaySellConfig();
    if (!config.isConfigured) {
      throw new AppError("EBAY_CLIENT_ID and EBAY_CLIENT_SECRET are required", 400);
    }
    if (config.env !== "sandbox") {
      throw new AppError("Seller OAuth is only enabled when EBAY_ENV=sandbox", 400);
    }

    const returnTo = request.nextUrl.searchParams.get("returnTo") ?? "/";
    const state = await createOAuthState();
    const statePayload = Buffer.from(JSON.stringify({ nonce: state, returnTo })).toString("base64url");

    const authorizeUrl = buildEbayAuthorizeUrl(statePayload);
    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}
