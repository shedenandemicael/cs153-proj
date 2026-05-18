export type EbayEnvironment = "sandbox" | "production";

export function getEbayConfig() {
  const env = (process.env.EBAY_ENV ?? "sandbox") as EbayEnvironment;
  const clientId = process.env.EBAY_CLIENT_ID ?? "";
  const clientSecret = process.env.EBAY_CLIENT_SECRET ?? "";
  const redirectUri = process.env.EBAY_REDIRECT_URI ?? "http://localhost:3000/api/ebay/callback";

  const isConfigured = Boolean(clientId && clientSecret);

  const authBase =
    env === "production"
      ? "https://auth.ebay.com/oauth2/authorize"
      : "https://auth.sandbox.ebay.com/oauth2/authorize";

  const apiBase =
    env === "production" ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";

  return {
    env,
    clientId,
    clientSecret,
    redirectUri,
    isConfigured,
    authBase,
    apiBase,
  };
}

export function canPublishToEbay(): boolean {
  const config = getEbayConfig();
  return config.isConfigured && config.env === "sandbox";
}
