import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/** POST /api/ebay/sell/disconnect — remove stored seller tokens */
export async function POST() {
  const result = await prisma.ebayAccountRecord.deleteMany({});
  return NextResponse.json({ ok: true, deleted: result.count });
}
