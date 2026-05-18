import { NextRequest, NextResponse } from "next/server";
import { runAutonomousAgent } from "@/lib/agent";
import { prisma } from "@/lib/db/prisma";
import { getErrorMessage, AppError } from "@/lib/utils/errors";

/** POST — re-run the full autonomous agent on an existing item */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const exists = await prisma.item.findUnique({ where: { id } });
    if (!exists) throw new AppError("Item not found", 404);

    const agentResult = await runAutonomousAgent(id);

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        images: true,
        listingDraft: true,
        comparables: true,
        evaluation: true,
        agentRuns: { orderBy: { startedAt: "desc" }, take: 1 },
      },
    });

    return NextResponse.json(
      { item, agent: agentResult },
      { status: agentResult.success ? 200 : 422 }
    );
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}
