export async function parseApiJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    if (res.status === 413 || /request entity too large/i.test(text)) {
      throw new Error(
        "Photos are too large to upload at once. Try fewer photos or use smaller images."
      );
    }

    const snippet = text.replace(/\s+/g, " ").trim().slice(0, 120);
    throw new Error(snippet || `Request failed (${res.status})`);
  }
}
