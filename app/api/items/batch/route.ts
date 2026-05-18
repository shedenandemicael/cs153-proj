import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { createBatchFromFormData, processBatch } from "@/lib/services/batch";
import { getErrorMessage, AppError } from "@/lib/utils/errors";

/** POST — create batch of items and start background agent processing */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { batch, itemIds } = await createBatchFromFormData(formData);

    after(async () => {
      try {
        await processBatch(batch.id);
      } catch (error) {
        console.error("[batch] processBatch failed:", error);
        const { prisma } = await import("@/lib/db/prisma");
        await prisma.batch.update({
          where: { id: batch.id },
          data: { status: "completed" },
        });
      }
    });

    return NextResponse.json(
      {
        batchId: batch.id,
        totalItems: batch.totalItems,
        itemIds,
        status: "processing",
        message: "Batch queued. Agent is processing each item.",
      },
      { status: 201 }
    );
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}
