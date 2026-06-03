import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";
import {
  assertBlobStorageAvailable,
  localItemUploadDir,
  useBlobStorage,
} from "@/lib/services/upload-paths";

const MAX_IMAGES = 5;
const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function saveUploadedImages(
  itemId: string,
  files: File[],
  options?: { maxImages?: number }
): Promise<Array<{ filename: string; path: string; mimeType: string; sizeBytes: number }>> {
  const maxImages = options?.maxImages ?? MAX_IMAGES;
  if (files.length === 0) {
    throw new Error("At least one image is required");
  }
  if (files.length > maxImages) {
    throw new Error(`Maximum ${maxImages} images allowed`);
  }

  assertBlobStorageAvailable();
  if (useBlobStorage()) {
    return saveToBlob(itemId, files);
  }
  return saveToLocalDisk(itemId, files);
}

async function saveToBlob(
  itemId: string,
  files: File[]
): Promise<Array<{ filename: string; path: string; mimeType: string; sizeBytes: number }>> {
  const saved: Array<{ filename: string; path: string; mimeType: string; sizeBytes: number }> = [];

  for (const file of files) {
    validateFile(file);
    const ext = path.extname(file.name) || ".jpg";
    const key = `items/${itemId}/${uuidv4()}${ext}`;
    const blob = await put(key, file, { access: "public", contentType: file.type });
    saved.push({
      filename: file.name,
      path: blob.url,
      mimeType: file.type,
      sizeBytes: file.size,
    });
  }

  return saved;
}

async function saveToLocalDisk(
  itemId: string,
  files: File[]
): Promise<Array<{ filename: string; path: string; mimeType: string; sizeBytes: number }>> {
  const itemDir = localItemUploadDir(itemId);
  await mkdir(itemDir, { recursive: true });

  const saved: Array<{ filename: string; path: string; mimeType: string; sizeBytes: number }> = [];

  for (const file of files) {
    validateFile(file);
    const ext = path.extname(file.name) || ".jpg";
    const filename = `${uuidv4()}${ext}`;
    const publicPath = `/uploads/${itemId}/${filename}`;
    const diskPath = path.join(itemDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(diskPath, buffer);

    saved.push({
      filename: file.name,
      path: publicPath,
      mimeType: file.type,
      sizeBytes: file.size,
    });
  }

  return saved;
}

function validateFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`File ${file.name} exceeds 8MB limit`);
  }
}
