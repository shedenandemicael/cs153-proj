import { NextResponse, type NextRequest } from "next/server";
import { ALLOWED_EMAIL, AUTH_COOKIE_NAME, createSessionToken, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";

const ALLOWED_PASSWORD = "password";
const INVALID_LOGIN_ERROR = "Invalid email or password.";

function getSafeNext(value: FormDataEntryValue | string | null) {
  const next = typeof value === "string" ? value : "/dashboard";

  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

function redirectToLanding(request: NextRequest, error: string, next: string) {
  const url = new URL("/", request.nextUrl.origin);
  url.searchParams.set("error", error);
  url.searchParams.set("next", next);

  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = getSafeNext(formData.get("next"));

  if (email !== ALLOWED_EMAIL || password !== ALLOWED_PASSWORD) {
    return redirectToLanding(request, INVALID_LOGIN_ERROR, next);
  }

  const sessionToken = await createSessionToken({ email });
  const response = NextResponse.redirect(new URL(next, request.nextUrl.origin), 303);

  response.cookies.set(AUTH_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });

  return response;
}
