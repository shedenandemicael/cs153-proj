import { NextRequest, NextResponse } from "next/server";
import {
  exchangeAuthorizationCode,
  fetchEbayUserIdentity,
  upsertConnectedSeller,
} from "@/lib/ebay/oauth/user-token";
import { consumeOAuthState } from "@/lib/ebay/oauth/state";
import { getErrorMessage } from "@/lib/utils/errors";

function appOrigin(request: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    request.nextUrl.origin
  );
}

/** GET /api/ebay/callback — OAuth redirect from eBay sandbox */
export async function GET(request: NextRequest) {
  const origin = appOrigin(request);
  const errorParam = request.nextUrl.searchParams.get("error");
  if (errorParam) {
    return NextResponse.redirect(
      `${origin}/?ebay=error&message=${encodeURIComponent(errorParam)}`
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");

  let returnTo = "/";
  let nonce: string | null = stateParam;
  if (stateParam) {
    try {
      const parsed = JSON.parse(Buffer.from(stateParam, "base64url").toString("utf8")) as {
        nonce?: string;
        returnTo?: string;
      };
      if (parsed.nonce) nonce = parsed.nonce;
      if (parsed.returnTo?.startsWith("/")) returnTo = parsed.returnTo;
    } catch {
      nonce = stateParam;
    }
  }

  const stateOk = await consumeOAuthState(nonce);
  if (!stateOk) {
    return NextResponse.redirect(
      `${origin}/?ebay=error&message=${encodeURIComponent("Invalid OAuth state")}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/?ebay=error&message=${encodeURIComponent("Missing authorization code")}`
    );
  }

  try {
    const tokens = await exchangeAuthorizationCode(code);
    const identity = await fetchEbayUserIdentity(tokens.accessToken);

    await upsertConnectedSeller({
      ...tokens,
      ebayUserId: identity.userId,
      username: identity.username,
    });

    const dest = returnTo.includes("?") ? `${returnTo}&ebay=connected` : `${returnTo}?ebay=connected`;
    return NextResponse.redirect(`${origin}${dest}`);
  } catch (error) {
    return NextResponse.redirect(
      `${origin}/?ebay=error&message=${encodeURIComponent(getErrorMessage(error))}`
    );
  }
}
