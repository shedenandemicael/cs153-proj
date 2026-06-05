import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth/token";

export async function getSession() {
  const cookieStore = await cookies();

  return verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}

export {
  ALLOWED_EMAIL,
  AUTH_COOKIE_NAME,
  createSessionToken,
  SESSION_MAX_AGE_SECONDS,
  verifySessionToken,
} from "@/lib/auth/token";
export type { AuthSession } from "@/lib/auth/token";
