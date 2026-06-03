import path from "path";

/** True when running in a Vercel serverless deployment (read-only filesystem). */
export function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1";
}

/** True when @vercel/blob can authenticate (static token or linked Blob store). */
export function hasBlobCredentials(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

/**
 * Use Vercel Blob instead of writing under public/uploads.
 * On Vercel we always use Blob — the filesystem cannot create public/.
 */
export function useBlobStorage(): boolean {
  if (hasBlobCredentials()) return true;
  return isVercelRuntime();
}

export function assertBlobStorageAvailable(): void {
  if (isVercelRuntime() && !hasBlobCredentials()) {
    throw new Error(
      "Photo uploads require Vercel Blob. In the Vercel dashboard go to Storage → create a Blob store → connect it to this project, then redeploy."
    );
  }
}

export function isRemoteImagePath(imagePath: string): boolean {
  return imagePath.startsWith("http://") || imagePath.startsWith("https://");
}

/** Map a stored public path (e.g. /uploads/itemId/file.jpg) to a local disk path. */
export function localUploadPathToDisk(publicPath: string): string {
  const uploadDir = process.env.UPLOAD_DIR ?? "public/uploads";
  const normalized = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  if (normalized.startsWith("uploads/")) {
    return path.join(process.cwd(), uploadDir, normalized.slice("uploads/".length));
  }
  return path.join(process.cwd(), "public", normalized);
}

export function localItemUploadDir(itemId: string): string {
  const uploadDir = process.env.UPLOAD_DIR ?? "public/uploads";
  return path.join(process.cwd(), uploadDir, itemId);
}
