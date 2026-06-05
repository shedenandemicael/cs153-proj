import type { Item, ListingDraft, UploadedImage } from "@prisma/client";
import { getEbaySellConfig, canPublishToEbay } from "@/lib/utils/ebay-config";
import { isEbaySellerConnected } from "../oauth/user-token";
import { ensureDefaultInventoryLocation } from "./location";
import { getListingPolicyIds } from "./policies";
import { getBusinessPoliciesStatus } from "./setup-policies";
import { createOrReplaceInventoryItem } from "./inventory-item";
import { createAndPublishOffer } from "./offer";

export interface PublishListingResult {
  offerId: string;
  listingId?: string;
  listingUrl?: string;
  sku: string;
}

export interface EbaySellStatus {
  publishEnabled: boolean;
  connected: boolean;
  environment: string;
  username?: string | null;
  policiesReady?: boolean;
  policyCounts?: {
    payment: number;
    return: number;
    fulfillment: number;
  };
  hint?: string;
}

export async function getEbaySellStatus(): Promise<EbaySellStatus> {
  const config = getEbaySellConfig();
  const connected = await isEbaySellerConnected();
  const account = connected
    ? await import("../oauth/user-token").then((m) => m.getConnectedEbayAccount())
    : null;

  let hint: string | undefined;
  if (!config.isConfigured) {
    hint = "Set EBAY_SANDBOX_CLIENT_ID and EBAY_SANDBOX_CLIENT_SECRET.";
  } else if (config.env !== "sandbox") {
    hint = "Publishing is sandbox-only (EBAY_ENV=sandbox).";
  } else if (!connected) {
    hint = "Connect your eBay sandbox seller account.";
  }

  const policyStatus = connected ? await getBusinessPoliciesStatus() : null;

  return {
    publishEnabled: canPublishToEbay() && connected,
    connected,
    environment: config.env,
    username: account?.username,
    policiesReady: policyStatus?.ready,
    policyCounts: policyStatus
      ? {
          payment: policyStatus.paymentCount,
          return: policyStatus.returnCount,
          fulfillment: policyStatus.fulfillmentCount,
        }
      : undefined,
    hint,
  };
}

export async function publishListingToEbay(item: Item & {
  listingDraft: ListingDraft;
  images: UploadedImage[];
}): Promise<PublishListingResult> {
  if (!canPublishToEbay()) {
    throw new Error("Sandbox publish is disabled. Set EBAY_ENV=sandbox and eBay credentials.");
  }

  if (!(await isEbaySellerConnected())) {
    throw new Error(
      "Connect eBay sandbox first: visit /api/ebay/auth or use Connect eBay Sandbox on the item page."
    );
  }

  const draft = item.listingDraft;
  if (draft.status !== "APPROVED") {
    throw new Error("Listing draft must be approved before publishing.");
  }

  const sku = `cs153-${item.id}`;
  const merchantLocationKey = await ensureDefaultInventoryLocation();
  const policies = await getListingPolicyIds();

  await createOrReplaceInventoryItem({
    sku,
    draft,
    images: item.images,
    notesCondition: item.notesCondition,
  });

  const { offerId, listingId } = await createAndPublishOffer({
    sku,
    draft,
    merchantLocationKey,
    policies,
  });

  const config = getEbaySellConfig();
  const listingUrl = listingId
    ? config.env === "sandbox"
      ? `https://www.sandbox.ebay.com/itm/${listingId}`
      : `https://www.ebay.com/itm/${listingId}`
    : undefined;

  return { offerId, listingId, listingUrl, sku };
}
