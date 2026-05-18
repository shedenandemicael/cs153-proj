import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getErrorMessage, AppError } from "@/lib/utils/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const overall = body.overall as number | undefined;

    if (overall == null || overall < 1 || overall > 5) {
      throw new AppError("Overall quality score must be between 1 and 5", 400);
    }

    await prisma.evaluationMetric.upsert({
      where: { itemId: id },
      create: {
        itemId: id,
        qualityScore: overall,
        qualityNotes: body.notes ?? null,
      },
      update: {
        qualityScore: overall,
        qualityNotes: body.notes ?? null,
      },
    });

    return NextResponse.json({ ok: true, qualityScore: overall });
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}
