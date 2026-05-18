import { NextRequest, NextResponse } from "next/server";
import { generateListingForItem } from "@/lib/services/listing-generation";
import { parseJsonArray, parseJsonObject } from "@/lib/utils/json";
import { getErrorMessage, AppError } from "@/lib/utils/errors";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await generateListingForItem(id);
    if (!item) throw new AppError("Item not found", 404);

    const draft = item.listingDraft
      ? {
          ...item.listingDraft,
          descriptionBullets: parseJsonArray(item.listingDraft.descriptionBullets),
          itemSpecifics: parseJsonObject(item.listingDraft.itemSpecifics),
          warnings: parseJsonArray(item.listingDraft.warnings),
          questions: parseJsonArray(item.listingDraft.questions),
        }
      : null;

    return NextResponse.json({ item: { ...item, listingDraft: draft } });
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}
