import { readFile } from "fs/promises";
import path from "path";

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

/** Resolve a public URL path (e.g. /uploads/...) to an on-disk file under public/ */
export function publicPathToDisk(publicPath: string): string {
  const normalized = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  return path.join(process.cwd(), "public", normalized);
}

function mimeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? "image/jpeg";
}

/** Load local upload files as base64 data URLs for OpenAI vision */
export async function encodeImagesForVision(
  publicPaths: string[]
): Promise<EncodedImage[]> {
  const encoded: EncodedImage[] = [];

  for (const publicPath of publicPaths.slice(0, 5)) {
    const diskPath = publicPathToDisk(publicPath);
    try {
      const buffer = await readFile(diskPath);
      const mimeType = mimeFromPath(diskPath);
      const base64 = buffer.toString("base64");
      encoded.push({
        mimeType,
        dataUrl: `data:${mimeType};base64,${base64}`,
      });
    } catch {
      console.warn(`[encodeImagesForVision] Could not read image: ${diskPath}`);
    }
  }

  return encoded;
}
