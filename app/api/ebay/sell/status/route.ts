import { NextResponse } from "next/server";
import { getEbaySellStatus } from "@/lib/ebay/sell/publish-listing";

/** GET /api/ebay/sell/status — sandbox seller connection + publish readiness */
export async function GET() {
  const status = await getEbaySellStatus();
  return NextResponse.json(status);
}
