import type { EncodedImage } from "./encode-images";

/** Encode uploaded files as data URLs for OpenAI vision (batch clustering). */
export async function encodeFilesForVision(
  files: File[],
  max = 30
): Promise<EncodedImage[]> {
  const encoded: EncodedImage[] = [];

  for (const file of files.slice(0, max)) {
    if (!file.type.startsWith("image/")) continue;
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type || "image/jpeg";
      encoded.push({
        mimeType,
        dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
      });
    } catch {
      console.warn(`[encodeFilesForVision] Could not read file: ${file.name}`);
    }
  }

  return encoded;
}
