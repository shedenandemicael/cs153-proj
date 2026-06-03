import { NextRequest, NextResponse } from "next/server";
import { getEbayResearchClient } from "@/lib/ebay";

/** GET /api/ebay/status — research API configuration (fetch-only). ?health=true runs live probes. */
export async function GET(request: NextRequest) {
  const client = getEbayResearchClient();
  const health = request.nextUrl.searchParams.get("health") === "true";
  const status = await client.getStatus({ health });
  return NextResponse.json(status);
}
