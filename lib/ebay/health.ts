import { getEbayApplicationToken } from "./application-token";
import { probeBrowseApi } from "./fetch/browse";
import { probeTaxonomyApi } from "./fetch/taxonomy";
import { getEbayResearchConfig } from "@/lib/utils/ebay-config";

export interface EbayHealthCheck {
  configured: boolean;
  researchEnv: string;
  tokenOk: boolean;
  tokenError?: string;
  browseOk: boolean;
  browseItemCount: number;
  browseError?: string;
  taxonomyOk: boolean;
  taxonomyCategoryCount: number;
  taxonomyError?: string;
}

/** Live connectivity check for eBay research APIs. */
export async function checkEbayResearchHealth(): Promise<EbayHealthCheck> {
  const config = getEbayResearchConfig();

  if (!config.isConfigured) {
    return {
      configured: false,
      researchEnv: config.researchEnv,
      tokenOk: false,
      tokenError: "Production eBay credentials not set (EBAY_PRODUCTION_* or EBAY_CLIENT_ID)",
      browseOk: false,
      browseItemCount: 0,
      taxonomyOk: false,
      taxonomyCategoryCount: 0,
    };
  }

  let tokenOk = false;
  let tokenError: string | undefined;
  try {
    await getEbayApplicationToken(config.researchEnv);
    tokenOk = true;
  } catch (error) {
    tokenError = error instanceof Error ? error.message : "Token request failed";
  }

  const browse = tokenOk ? await probeBrowseApi() : { ok: false, itemCount: 0, error: tokenError };
  const taxonomy = tokenOk
    ? await probeTaxonomyApi()
    : { ok: false, categoryCount: 0, error: tokenError };

  return {
    configured: true,
    researchEnv: config.researchEnv,
    tokenOk,
    tokenError,
    browseOk: browse.ok,
    browseItemCount: browse.itemCount,
    browseError: browse.error,
    taxonomyOk: taxonomy.ok,
    taxonomyCategoryCount: taxonomy.categoryCount,
    taxonomyError: taxonomy.error,
  };
}
