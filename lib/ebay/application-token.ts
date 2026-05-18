import { getEbayConfig } from "@/lib/utils/ebay-config";

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let cachedAppToken: TokenCache | null = null;

/**
 * Application access token (client credentials) for Browse API search.
 * https://developer.ebay.com/api-docs/static/oauth-client-credentials-grant.html
 */
export async function getEbayApplicationToken(): Promise<string> {
  const config = getEbayConfig();
  if (!config.isConfigured) {
    throw new Error("eBay credentials not configured");
  }

  if (cachedAppToken && cachedAppToken.expiresAt > Date.now() + 60_000) {
    return cachedAppToken.accessToken;
  }

  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  const tokenUrl = `${config.apiBase}/identity/v1/oauth2/token`;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "https://api.ebay.com/oauth/api_scope",
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
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? `eBay token request failed (${res.status})`);
  }

  cachedAppToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 7200) * 1000,
  };

  return cachedAppToken.accessToken;
}
