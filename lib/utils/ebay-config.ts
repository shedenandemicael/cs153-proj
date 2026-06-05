export type EbayEnvironment = "sandbox" | "production";

const DEFAULT_OAUTH_SCOPE = "https://api.ebay.com/oauth/api_scope";

/** OAuth scopes for sandbox listing publish (user authorization code grant). */
export const EBAY_SELL_USER_SCOPES = [
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.account",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
  "https://api.ebay.com/oauth/api_scope/commerce.identity.readonly",
] as const;

function parseEnvFlag(name: string, defaultValue: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return defaultValue;
  return v.toLowerCase() === "true" || v === "1";
}

function parseEnvironment(value: string | undefined, fallback: EbayEnvironment): EbayEnvironment {
  return value === "production" ? "production" : value === "sandbox" ? "sandbox" : fallback;
}

function apiBaseForEnv(env: EbayEnvironment): string {
  return env === "production" ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";
}

function authBaseForEnv(env: EbayEnvironment): string {
  return env === "production"
    ? "https://auth.ebay.com/oauth2/authorize"
    : "https://auth.sandbox.ebay.com/oauth2/authorize";
}

/**
 * Credentials for a specific eBay API environment.
 * Use EBAY_PRODUCTION_* + EBAY_SANDBOX_* when you have both keysets.
 * EBAY_CLIENT_ID / EBAY_CLIENT_SECRET still work as production fallback.
 */
export function getCredentialsForEnvironment(env: EbayEnvironment): {
  clientId: string;
  clientSecret: string;
} {
  const sellEnv = parseEnvironment(process.env.EBAY_ENV, "sandbox");

  if (env === "sandbox") {
    const sandboxId = process.env.EBAY_SANDBOX_CLIENT_ID?.trim();
    const sandboxSecret = process.env.EBAY_SANDBOX_CLIENT_SECRET?.trim();
    if (sandboxId && sandboxSecret) {
      return { clientId: sandboxId, clientSecret: sandboxSecret };
    }
    // Legacy: single pair in EBAY_CLIENT_* with EBAY_ENV=sandbox
    if (sellEnv === "sandbox") {
      return {
        clientId: process.env.EBAY_CLIENT_ID?.trim() ?? "",
        clientSecret: process.env.EBAY_CLIENT_SECRET?.trim() ?? "",
      };
    }
    return { clientId: "", clientSecret: "" };
  }

  const productionId =
    process.env.EBAY_PRODUCTION_CLIENT_ID?.trim() || process.env.EBAY_CLIENT_ID?.trim() || "";
  const productionSecret =
    process.env.EBAY_PRODUCTION_CLIENT_SECRET?.trim() ||
    process.env.EBAY_CLIENT_SECRET?.trim() ||
    "";

  return { clientId: productionId, clientSecret: productionSecret };
}

/** Config for read-only market research (Browse, Taxonomy, Insights). */
export function getEbayResearchConfig() {
  const sellEnv = parseEnvironment(process.env.EBAY_ENV, "sandbox");
  const researchEnv = parseEnvironment(
    process.env.EBAY_RESEARCH_ENV,
    sellEnv === "sandbox" ? "production" : sellEnv
  );
  const { clientId, clientSecret } = getCredentialsForEnvironment(researchEnv);

  return {
    env: researchEnv,
    researchEnv,
    clientId,
    clientSecret,
    isConfigured: Boolean(clientId && clientSecret),
    researchApiBase: apiBaseForEnv(researchEnv),
    oauthScopes: (process.env.EBAY_OAUTH_SCOPES ?? DEFAULT_OAUTH_SCOPE)
      .split(/\s+/)
      .filter(Boolean),
    allowMockFallback: parseEnvFlag("EBAY_ALLOW_MOCK_FALLBACK", true),
    fetchActive: parseEnvFlag("EBAY_FETCH_ACTIVE", true),
    fetchSold: parseEnvFlag("EBAY_FETCH_SOLD", true),
  };
}

/** Config for sandbox Sell API + seller OAuth (publish). */
export function getEbaySellConfig() {
  const env: EbayEnvironment = "sandbox";
  const { clientId, clientSecret } = getCredentialsForEnvironment("sandbox");
  const redirectUri = process.env.EBAY_REDIRECT_URI ?? "http://localhost:3000/api/ebay/callback";

  return {
    env,
    clientId,
    clientSecret,
    redirectUri,
    isConfigured: Boolean(clientId && clientSecret),
    authBase: authBaseForEnv(env),
    apiBase: apiBaseForEnv(env),
    sellApiBase: apiBaseForEnv(env),
    userScopes: [...EBAY_SELL_USER_SCOPES],
    merchantLocationKey: process.env.EBAY_MERCHANT_LOCATION_KEY?.trim() || "default",
  };
}

/** @deprecated Prefer getEbayResearchConfig or getEbaySellConfig */
export function getEbayConfig() {
  const sell = getEbaySellConfig();
  return {
    env: parseEnvironment(process.env.EBAY_ENV, "sandbox"),
    clientId: sell.clientId,
    clientSecret: sell.clientSecret,
    redirectUri: sell.redirectUri,
    isConfigured: sell.isConfigured,
    authBase: sell.authBase,
    apiBase: sell.apiBase,
  };
}

export function canPublishToEbay(): boolean {
  const sell = getEbaySellConfig();
  return sell.isConfigured && parseEnvironment(process.env.EBAY_ENV, "sandbox") === "sandbox";
}
