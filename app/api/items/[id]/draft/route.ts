import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { countUserEdits } from "@/lib/services/listing-generation";
import { parseJsonArray, parseJsonObject, stringifyJson } from "@/lib/utils/json";
import { getErrorMessage, AppError } from "@/lib/utils/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const item = await prisma.item.findUnique({
      where: { id },
      include: { listingDraft: true },
    });

    if (!item?.listingDraft) {
      throw new AppError("No listing draft found. Generate one first.", 404);
    }

    if (body.reject) {
      await prisma.listingDraft.update({
        where: { itemId: id },
        data: { status: "REJECTED" },
      });
      return NextResponse.json({ ok: true, status: "REJECTED" });
    }

    const original = {
      title: item.listingDraft.title,
      descriptionBullets: parseJsonArray(item.listingDraft.descriptionBullets),
      itemSpecifics: parseJsonObject(item.listingDraft.itemSpecifics),
      conditionDesc: item.listingDraft.conditionDesc,
      categoryName: item.listingDraft.categoryName,
      startingPrice: item.listingDraft.startingPrice,
      buyItNowPrice: item.listingDraft.buyItNowPrice,
      shippingAssumptions: item.listingDraft.shippingAssumptions,
    };

    const updated = {
      title: body.title ?? original.title,
      descriptionBullets: body.descriptionBullets ?? original.descriptionBullets,
      itemSpecifics: body.itemSpecifics ?? original.itemSpecifics,
      conditionDesc: body.conditionDesc ?? original.conditionDesc,
      categoryName: body.categoryName ?? original.categoryName,
      startingPrice: body.startingPrice ?? original.startingPrice,
      buyItNowPrice: body.buyItNowPrice ?? original.buyItNowPrice,
      shippingAssumptions: body.shippingAssumptions ?? original.shippingAssumptions,
    };

    const edits = countUserEdits(original, updated);
    const approve = Boolean(body.approve);

    await prisma.listingDraft.update({
      where: { itemId: id },
      data: {
        title: updated.title,
        descriptionBullets: stringifyJson(updated.descriptionBullets),
        itemSpecifics: stringifyJson(updated.itemSpecifics),
        conditionDesc: updated.conditionDesc,
        categoryId: body.categoryId ?? item.listingDraft.categoryId,
        categoryName: updated.categoryName,
        startingPrice: updated.startingPrice,
        buyItNowPrice: updated.buyItNowPrice ?? null,
        shippingAssumptions: updated.shippingAssumptions,
        status: approve ? "APPROVED" : "DRAFT",
        approvedAt: approve ? new Date() : item.listingDraft.approvedAt,
        userEditsCount: item.listingDraft.userEditsCount + edits,
      },
    });

    if (approve) {
      await prisma.item.update({ where: { id }, data: { status: "REVIEWED" } });
      await prisma.evaluationMetric.update({
        where: { itemId: id },
        data: {
          fieldsEditedByUser: { increment: edits },
          reviewCompletedAt: new Date(),
        },
      });
    } else if (edits > 0) {
      await prisma.evaluationMetric.update({
        where: { itemId: id },
        data: { fieldsEditedByUser: { increment: edits } },
      });
    }

    return NextResponse.json({ ok: true, edits });
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}
