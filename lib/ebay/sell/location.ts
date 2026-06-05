import { getEbaySellConfig } from "@/lib/utils/ebay-config";
import { ebaySellFetch } from "./http";

export async function ensureDefaultInventoryLocation(): Promise<string> {
  const { merchantLocationKey } = getEbaySellConfig();

  try {
    await ebaySellFetch(`/sell/inventory/v1/location/${encodeURIComponent(merchantLocationKey)}`);
    return merchantLocationKey;
  } catch {
    // Create default US warehouse location for sandbox
  }

  await ebaySellFetch(`/sell/inventory/v1/location/${encodeURIComponent(merchantLocationKey)}`, {
    method: "POST",
    body: {
      name: "Default Warehouse",
      merchantLocationStatus: "ENABLED",
      locationTypes: ["WAREHOUSE"],
      location: {
        address: {
          city: "San Jose",
          stateOrProvince: "CA",
          country: "US",
          postalCode: "95125",
        },
      },
    },
  });

  return merchantLocationKey;
}
