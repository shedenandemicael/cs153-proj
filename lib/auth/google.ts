import type { NextRequest } from "next/server";

export const STATE_COOKIE_NAME = "spot_oauth_state";

export function getRedirectUri(request: NextRequest) {
  return new URL("/api/auth/google/callback", request.nextUrl.origin).toString();
}
