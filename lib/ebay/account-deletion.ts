import { createHash } from "crypto";

/**
 * eBay marketplace account deletion challenge verification.
 * Hash order: challengeCode + verificationToken + endpoint (exact URL registered in Developer Portal).
 */
export function computeChallengeResponse(
  challengeCode: string,
  verificationToken: string,
  endpoint: string
): string {
  const hash = createHash("sha256");
  hash.update(challengeCode);
  hash.update(verificationToken);
  hash.update(endpoint);
  return hash.digest("hex");
}

export interface MarketplaceAccountDeletionNotification {
  metadata?: {
    topic?: string;
    schemaVersion?: string;
  };
  notification?: {
    notificationId?: string;
    eventDate?: string;
    data?: {
      username?: string;
      userId?: string;
      eiasToken?: string;
    };
  };
}

export function isMarketplaceAccountDeletionNotification(
  body: unknown
): body is MarketplaceAccountDeletionNotification {
  if (!body || typeof body !== "object") return false;
  const meta = (body as MarketplaceAccountDeletionNotification).metadata;
  return meta?.topic === "MARKETPLACE_ACCOUNT_DELETION";
}
