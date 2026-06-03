export type EbayEnvironment = "sandbox" | "production";

const DEFAULT_OAUTH_SCOPE = "https://api.ebay.com/oauth/api_scope";

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

export function getEbayConfig() {
  const env = parseEnvironment(process.env.EBAY_ENV, "sandbox");
  const clientId = process.env.EBAY_CLIENT_ID ?? "";
  const clientSecret = process.env.EBAY_CLIENT_SECRET ?? "";
  const redirectUri = process.env.EBAY_REDIRECT_URI ?? "http://localhost:3000/api/ebay/callback";

  const isConfigured = Boolean(clientId && clientSecret);

  return {
    env,
    clientId,
    clientSecret,
    redirectUri,
    isConfigured,
    authBase: authBaseForEnv(env),
    apiBase: apiBaseForEnv(env),
  };
}

/** Config for read-only market research (Browse, Taxonomy, Insights). */
export function getEbayResearchConfig() {
  const base = getEbayConfig();
  const researchEnv = parseEnvironment(
    process.env.EBAY_RESEARCH_ENV,
    base.env === "sandbox" ? "production" : base.env
  );

  return {
    ...base,
    /** Env used for comps fetch — defaults to production when sell env is sandbox. */
    researchEnv,
    researchApiBase: apiBaseForEnv(researchEnv),
    oauthScopes: (process.env.EBAY_OAUTH_SCOPES ?? DEFAULT_OAUTH_SCOPE)
      .split(/\s+/)
      .filter(Boolean),
    allowMockFallback: parseEnvFlag("EBAY_ALLOW_MOCK_FALLBACK", true),
    fetchActive: parseEnvFlag("EBAY_FETCH_ACTIVE", true),
    fetchSold: parseEnvFlag("EBAY_FETCH_SOLD", true),
  };
}

export function canPublishToEbay(): boolean {
  const config = getEbayConfig();
  return config.isConfigured && config.env === "sandbox";
}
