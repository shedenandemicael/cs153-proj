import { NextResponse, type NextRequest } from "next/server";
import { ALLOWED_EMAIL, AUTH_COOKIE_NAME, createSessionToken, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { STATE_COOKIE_NAME, getRedirectUri } from "@/lib/auth/google";

type GoogleTokenResponse = {
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleTokenInfo = {
  aud: string;
  email: string;
  email_verified: "true" | "false" | boolean;
  name?: string;
  picture?: string;
  exp: string;
};

function getGoogleClientCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set to use Google login.");
  }

  return { clientId, clientSecret };
}

function redirectToLogin(request: NextRequest, error: string) {
  const url = new URL("/", request.nextUrl.origin);
  url.searchParams.set("error", error);

  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get(STATE_COOKIE_NAME)?.value;
  const [expectedState, encodedNext = encodeURIComponent("/dashboard")] = storedState?.split(":") ?? [];
  const next = decodeURIComponent(encodedNext);

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectToLogin(request, "Google login could not be verified. Please try again.");
  }

  const { clientId, clientSecret } = getGoogleClientCredentials();
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(request),
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = (await tokenResponse.json()) as GoogleTokenResponse;

  if (!tokenResponse.ok || !tokenJson.id_token) {
    return redirectToLogin(request, tokenJson.error_description ?? "Google login failed. Please try again.");
  }

  const tokenInfoResponse = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenJson.id_token)}`,
  );

  if (!tokenInfoResponse.ok) {
    return redirectToLogin(request, "Google could not confirm your identity. Please try again.");
  }

  const tokenInfo = (await tokenInfoResponse.json()) as GoogleTokenInfo;
  const email = tokenInfo.email.toLowerCase();
  const emailVerified = tokenInfo.email_verified === true || tokenInfo.email_verified === "true";

  if (tokenInfo.aud !== clientId || !emailVerified || email !== ALLOWED_EMAIL) {
    return redirectToLogin(request, "This Google account is not authorized for Spot yet.");
  }

  const sessionToken = await createSessionToken({
    email,
    name: tokenInfo.name,
    picture: tokenInfo.picture,
  });
  const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const response = NextResponse.redirect(new URL(destination, request.nextUrl.origin));

  response.cookies.set(AUTH_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  response.cookies.delete(STATE_COOKIE_NAME);

  return response;
}
