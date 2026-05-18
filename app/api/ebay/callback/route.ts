import { NextResponse } from "next/server";

/** OAuth callback reserved for future sell/publish flows (not used for fetch). */
export async function GET() {
  return NextResponse.json(
    {
      error: "OAuth callback not active",
      hint: "Comparable fetch uses application tokens only. See /api/ebay/status",
    },
    { status: 501 }
  );
}
