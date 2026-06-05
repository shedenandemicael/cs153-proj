import { NextResponse } from "next/server";
import { setupBusinessPolicies } from "@/lib/ebay/sell/setup-policies";
import { isEbaySellerConnected } from "@/lib/ebay/oauth/user-token";
import { canPublishToEbay } from "@/lib/utils/ebay-config";
import { getErrorMessage } from "@/lib/utils/errors";

/** POST /api/ebay/sell/setup-policies — create sandbox business policies via Account API */
export async function POST() {
  try {
    if (!canPublishToEbay()) {
      return NextResponse.json(
        { error: "Sandbox publish is not configured (EBAY_ENV=sandbox + sandbox keys)." },
        { status: 403 }
      );
    }

    if (!(await isEbaySellerConnected())) {
      return NextResponse.json(
        { error: "Connect eBay Sandbox first, then run policy setup." },
        { status: 403 }
      );
    }

    const result = await setupBusinessPolicies();

    return NextResponse.json({
      ok: true,
      message:
        result.created.length > 0
          ? `Created ${result.created.join(", ")} policies.`
          : "Business policies were already configured.",
      created: result.created,
      alreadyPresent: result.alreadyPresent,
      policies: result.policies,
    });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
