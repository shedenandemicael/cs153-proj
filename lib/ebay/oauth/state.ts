import { cookies } from "next/headers";
import { randomBytes } from "crypto";

const COOKIE_NAME = "ebay_oauth_state";
const MAX_AGE_SEC = 600;

export async function createOAuthState(): Promise<string> {
  const state = randomBytes(16).toString("hex");
  const store = await cookies();
  store.set(COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE_SEC,
    path: "/",
  });
  return state;
}

export async function consumeOAuthState(returned: string | null): Promise<boolean> {
  const store = await cookies();
  const expected = store.get(COOKIE_NAME)?.value;
  store.delete(COOKIE_NAME);
  return Boolean(expected && returned && expected === returned);
}
