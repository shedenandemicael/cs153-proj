import { NextRequest, NextResponse } from "next/server";
import { getBatchSummary } from "@/lib/services/batch";
import { getErrorMessage, AppError } from "@/lib/utils/errors";

/** GET — batch status and item summaries (for polling) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const summary = await getBatchSummary(id);
    if (!summary) throw new AppError("Batch not found", 404);
    return NextResponse.json(summary);
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}
