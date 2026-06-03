import { prisma } from "@/lib/db/prisma";
import type { MarketplaceAccountDeletionNotification } from "./account-deletion";

export interface PurgeResult {
  deletedRecords: number;
}

/**
 * Remove stored eBay user identifiers/tokens when eBay sends a deletion notification.
 * Extend this as you add OAuth tokens, message threads, etc.
 */
export async function purgeEbayUserData(
  notification: MarketplaceAccountDeletionNotification
): Promise<PurgeResult> {
  const data = notification.notification?.data;
  if (!data) return { deletedRecords: 0 };

  const orFilters = [
    data.userId ? { ebayUserId: data.userId } : null,
    data.username ? { username: data.username } : null,
    data.eiasToken ? { eiasToken: data.eiasToken } : null,
  ].filter(Boolean) as Array<
    { ebayUserId: string } | { username: string } | { eiasToken: string }
  >;

  if (orFilters.length === 0) return { deletedRecords: 0 };

  const result = await prisma.ebayAccountRecord.deleteMany({
    where: { OR: orFilters },
  });

  console.info("[ebay-account-deletion] purged records:", {
    notificationId: notification.notification?.notificationId,
    userId: data.userId,
    username: data.username ? "(redacted)" : undefined,
    deletedRecords: result.count,
  });

  return { deletedRecords: result.count };
}

export function getNotificationConfig() {
  const verificationToken = process.env.EBAY_NOTIFICATION_VERIFICATION_TOKEN ?? "";
  const endpoint =
    process.env.EBAY_NOTIFICATION_ENDPOINT_URL ??
    (process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/ebay/notifications/account-deletion`
      : "");

  return {
    verificationToken,
    endpoint,
    isConfigured: verificationToken.length >= 32 && endpoint.startsWith("https://"),
  };
}
