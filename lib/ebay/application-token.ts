import { getEbayResearchConfig, type EbayEnvironment } from "@/lib/utils/ebay-config";
import { formatEbayError } from "./fetch/errors";

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

const tokenCacheByEnv = new Map<EbayEnvironment, TokenCache>();

/**
 * Application access token (client credentials) for Browse / Taxonomy / Insights.
 * https://developer.ebay.com/api-docs/static/oauth-client-credentials-grant.html
 */
export async function getEbayApplicationToken(
  env?: EbayEnvironment
): Promise<string> {
  const config = getEbayResearchConfig();
  if (!config.isConfigured) {
    throw new Error("eBay credentials not configured");
  }

  const targetEnv = env ?? config.researchEnv;
  const cached = tokenCacheByEnv.get(targetEnv);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }

  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  const tokenUrl = `${apiBaseForEnv(targetEnv)}/identity/v1/oauth2/token`;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: config.oauthScopes.join(" "),
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    const detail =
      data.error_description ??
      data.error ??
      formatEbayError(data, res.status, "eBay token request failed");
    throw new Error(`${detail} (env=${targetEnv})`);
  }

  tokenCacheByEnv.set(targetEnv, {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 7200) * 1000,
  });

  return data.access_token;
}

export function clearEbayApplicationTokenCache(env?: EbayEnvironment): void {
  if (env) {
    tokenCacheByEnv.delete(env);
    return;
  }
  tokenCacheByEnv.clear();
}

function apiBaseForEnv(env: EbayEnvironment): string {
  return env === "production" ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";
}
