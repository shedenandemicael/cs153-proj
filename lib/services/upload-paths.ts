import path from "path";

export function useBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
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
