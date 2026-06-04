import { NextRequest, NextResponse } from "next/server";
import { runAutonomousAgent } from "@/lib/agent";
import { prisma } from "@/lib/db/prisma";
import {
  createItemWithImages,
  parseOptionalFloat,
} from "@/lib/services/item-intake";
import { getErrorMessage, AppError } from "@/lib/utils/errors";

export async function GET() {
  try {
    const items = await prisma.item.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        listingDraft: true,
      },
    });

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        status: item.status,
        title: item.listingDraft?.title ?? null,
        startingPrice: item.listingDraft?.startingPrice ?? null,
        updatedAt: item.updatedAt.toISOString(),
        imagePath: item.images[0]?.path ?? null,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);

    if (files.length === 0) {
      throw new AppError("At least one image is required", 400);
    }

    const item = await createItemWithImages(files, {
      brand: (formData.get("brand") as string) || undefined,
      size: (formData.get("size") as string) || undefined,
      condition: (formData.get("condition") as string) || undefined,
      defects: (formData.get("defects") as string) || undefined,
      purchasePrice: parseOptionalFloat(formData.get("purchasePrice")),
      minPrice: parseOptionalFloat(formData.get("minPrice")),
      freeformNotes: (formData.get("freeformNotes") as string) || undefined,
    });

    const agentResult = await runAutonomousAgent(item.id);

    const full = await prisma.item.findUnique({
      where: { id: item.id },
      include: {
        images: true,
        listingDraft: true,
        comparables: true,
        evaluation: true,
        agentRuns: { orderBy: { startedAt: "desc" }, take: 1 },
      },
    });

    return NextResponse.json(
      { item: full, agent: agentResult },
      {
        status: agentResult.awaitingInput ? 200 : agentResult.success ? 201 : 422,
      }
    );
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}
