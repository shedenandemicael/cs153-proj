import { NextRequest, NextResponse } from "next/server";
import {
  computeChallengeResponse,
  isMarketplaceAccountDeletionNotification,
} from "@/lib/ebay/account-deletion";
import {
  getNotificationConfig,
  purgeEbayUserData,
} from "@/lib/ebay/account-deletion-service";

/**
 * eBay Marketplace Account Deletion notifications.
 * GET  — challenge verification when subscribing in Developer Portal
 * POST — deletion notifications (ack immediately, then purge stored user data)
 *
 * Register this exact HTTPS URL in eBay Developer Portal → Alerts and Notifications.
 */
export async function GET(request: NextRequest) {
  const challengeCode = request.nextUrl.searchParams.get("challenge_code");
  if (!challengeCode) {
    return NextResponse.json({ error: "Missing challenge_code query parameter" }, { status: 400 });
  }

  const { verificationToken, endpoint, isConfigured } = getNotificationConfig();
  if (!isConfigured) {
    return NextResponse.json(
      {
        error:
          "Set EBAY_NOTIFICATION_VERIFICATION_TOKEN (32–80 chars) and EBAY_NOTIFICATION_ENDPOINT_URL (https://...)",
      },
      { status: 500 }
    );
  }

  const challengeResponse = computeChallengeResponse(
    challengeCode,
    verificationToken,
    endpoint
  );

  return NextResponse.json({ challengeResponse });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (isMarketplaceAccountDeletionNotification(body)) {
    try {
      await purgeEbayUserData(body);
    } catch (error) {
      console.error("[ebay-account-deletion] purge failed:", error);
    }
  } else {
    console.warn("[ebay-account-deletion] unexpected notification payload");
  }

  return new NextResponse(null, { status: 200 });
}
