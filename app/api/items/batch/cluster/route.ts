import { NextRequest, NextResponse } from "next/server";
import { clusterBatchImages } from "@/lib/ai/cluster-batch-images";
import { getBatchMaxPhotos } from "@/lib/services/batch";
import { getErrorMessage, AppError } from "@/lib/utils/errors";

/** POST — vision clusters batch photos into distinct products */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData
      .getAll("images")
      .filter((f): f is File => f instanceof File && f.size > 0);

    const maxPhotos = getBatchMaxPhotos();
    if (files.length === 0) {
      throw new AppError("Upload at least one photo", 400);
    }
    if (files.length > maxPhotos) {
      throw new AppError(`Maximum ${maxPhotos} photos per batch`, 400);
    }

    const clusters = await clusterBatchImages(files);

    return NextResponse.json({
      clusters,
      itemCount: clusters.length,
      photoCount: files.length,
    });
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}
