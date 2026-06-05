import { prisma } from "@/lib/db/prisma";
import { getEbaySellConfig } from "@/lib/utils/ebay-config";
import { formatEbayError } from "../fetch/errors";

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

function apiBaseForEnv(env: "sandbox" | "production"): string {
  return env === "production" ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";
}

export async function getConnectedEbayAccount() {
  return prisma.ebayAccountRecord.findFirst({
    orderBy: { updatedAt: "desc" },
  });
}

export async function isEbaySellerConnected(): Promise<boolean> {
  const account = await getConnectedEbayAccount();
  return Boolean(account?.accessToken && account.refreshToken);
}

export function buildEbayAuthorizeUrl(state: string): string {
  const config = getEbaySellConfig();
  if (!config.isConfigured) {
    throw new Error("eBay credentials not configured");
  }
  if (config.env !== "sandbox") {
    throw new Error("Seller OAuth publish is enabled for EBAY_ENV=sandbox only");
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.userScopes.join(" "),
    state,
  });

  return `${config.authBase}?${params.toString()}`;
}

export async function exchangeAuthorizationCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const config = getEbaySellConfig();
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  const tokenUrl = `${apiBaseForEnv(config.env)}/identity/v1/oauth2/token`;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = (await res.json()) as TokenResponse;
  if (!res.ok || !data.access_token || !data.refresh_token) {
    throw new Error(
      data.error_description ?? data.error ?? formatEbayError(data, res.status, "OAuth token exchange failed")
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 7200) * 1000),
  };
}

async function refreshUserAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const config = getEbaySellConfig();
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  const tokenUrl = `${apiBaseForEnv(config.env)}/identity/v1/oauth2/token`;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: config.userScopes.join(" "),
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = (await res.json()) as TokenResponse;
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description ?? data.error ?? formatEbayError(data, res.status, "OAuth token refresh failed")
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 7200) * 1000),
  };
}

export async function getValidUserAccessToken(): Promise<string> {
  const account = await getConnectedEbayAccount();
  if (!account?.accessToken || !account.refreshToken) {
    throw new Error(
      "eBay seller account not connected. Open an item page and click Connect eBay Sandbox."
    );
  }

  if (account.tokenExpiresAt && account.tokenExpiresAt.getTime() > Date.now() + TOKEN_REFRESH_BUFFER_MS) {
    return account.accessToken;
  }

  const refreshed = await refreshUserAccessToken(account.refreshToken);
  await prisma.ebayAccountRecord.update({
    where: { id: account.id },
    data: {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      tokenExpiresAt: refreshed.expiresAt,
    },
  });

  return refreshed.accessToken;
}

function identityBaseForEnv(env: "sandbox" | "production"): string {
  return env === "production" ? "https://apiz.ebay.com" : "https://apiz.sandbox.ebay.com";
}

export async function fetchEbayUserIdentity(accessToken: string): Promise<{
  userId?: string;
  username?: string;
}> {
  const config = getEbaySellConfig();
  const url = `${identityBaseForEnv(config.env)}/commerce/identity/v1/user/`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const data = (await res.json()) as { userId?: string; username?: string };
  if (!res.ok) {
    return { userId: "sandbox-seller", username: undefined };
  }

  return { userId: data.userId, username: data.username };
}

export async function upsertConnectedSeller(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  ebayUserId?: string;
  username?: string;
}): Promise<void> {
  const ebayUserId = tokens.ebayUserId ?? "sandbox-seller";

  const existing = await prisma.ebayAccountRecord.findUnique({
    where: { ebayUserId },
  });

  if (existing) {
    await prisma.ebayAccountRecord.update({
      where: { id: existing.id },
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        username: tokens.username ?? existing.username,
      },
    });
    return;
  }

  await prisma.ebayAccountRecord.deleteMany({});
  await prisma.ebayAccountRecord.create({
    data: {
      ebayUserId,
      username: tokens.username,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.expiresAt,
    },
  });
}
