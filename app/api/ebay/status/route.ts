import { NextResponse } from "next/server";
import { getEbayResearchClient } from "@/lib/ebay";

/** GET /api/ebay/status — research API configuration (fetch-only) */
export async function GET() {
  const client = getEbayResearchClient();
  return NextResponse.json(client.getStatus());
}
