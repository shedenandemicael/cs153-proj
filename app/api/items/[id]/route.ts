import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { deleteItem } from "@/lib/services/delete-item";
import { parseJsonArray, parseJsonObject } from "@/lib/utils/json";
import { getErrorMessage, AppError } from "@/lib/utils/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        listingDraft: true,
        comparables: { orderBy: { price: "asc" } },
        evaluation: true,
      },
    });

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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await deleteItem(id);
    return NextResponse.json({
      ok: true,
      ebayEnded: result.ebayEnded,
      message: result.ebayEnded
        ? "Item deleted and eBay listing ended."
        : result.ebayWarning
          ? `Item deleted. ${result.ebayWarning}`
          : "Item deleted.",
      warning: result.ebayWarning,
    });
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}
