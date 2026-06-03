export interface EbayApiErrorBody {
  errors?: Array<{
    errorId?: number;
    domain?: string;
    category?: string;
    message?: string;
    longMessage?: string;
  }>;
}

export class EbayApiError extends Error {
  readonly status: number;
  readonly errorId?: number;
  readonly category?: string;

  constructor(message: string, status: number, errorId?: number, category?: string) {
    super(message);
    this.name = "EbayApiError";
    this.status = status;
    this.errorId = errorId;
    this.category = category;
  }
}

export function parseEbayErrorBody(data: unknown): EbayApiErrorBody {
  if (data && typeof data === "object" && "errors" in data) {
    return data as EbayApiErrorBody;
  }
  return {};
}

export function formatEbayError(data: unknown, status: number, fallback: string): string {
  const body = parseEbayErrorBody(data);
  const first = body.errors?.[0];
  if (first?.message) {
    const id = first.errorId != null ? ` [${first.errorId}]` : "";
    return `${first.message}${id}`;
  }
  return `${fallback} (HTTP ${status})`;
}

export function ebayErrorFromResponse(data: unknown, status: number, fallback: string): EbayApiError {
  const body = parseEbayErrorBody(data);
  const first = body.errors?.[0];
  return new EbayApiError(
    formatEbayError(data, status, fallback),
    status,
    first?.errorId,
    first?.category
  );
}
