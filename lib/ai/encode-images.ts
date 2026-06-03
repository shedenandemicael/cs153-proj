import { readFile } from "fs/promises";
import path from "path";
import { isRemoteImagePath, localUploadPathToDisk } from "@/lib/services/upload-paths";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export interface EncodedImage {
  dataUrl: string;
  mimeType: string;
}

function mimeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? "image/jpeg";
}

async function loadImageBuffer(imagePath: string): Promise<{ buffer: Buffer; mimeType: string }> {
  if (isRemoteImagePath(imagePath)) {
    const res = await fetch(imagePath);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const mimeType = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "image/jpeg";
    return { buffer: Buffer.from(await res.arrayBuffer()), mimeType };
  }

  const diskPath = localUploadPathToDisk(imagePath);
  const buffer = await readFile(diskPath);
  return { buffer, mimeType: mimeFromPath(diskPath) };
}

/** Load upload files as base64 data URLs for OpenAI vision (local disk or Vercel Blob URL). */
export async function encodeImagesForVision(publicPaths: string[]): Promise<EncodedImage[]> {
  const encoded: EncodedImage[] = [];

  for (const imagePath of publicPaths.slice(0, 5)) {
    try {
      const { buffer, mimeType } = await loadImageBuffer(imagePath);
      encoded.push({
        mimeType,
        dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
      });
    } catch {
      console.warn(`[encodeImagesForVision] Could not read image: ${imagePath}`);
    }
  }

  return encoded;
}
