export const AUTH_COOKIE_NAME = "spot_session";
export const ALLOWED_EMAIL = "shedenandemicael@gmail.com";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const DEFAULT_AUTH_SECRET = "spot-private-beta-session-secret";
const encoder = new TextEncoder();

type SessionPayload = {
  email: string;
  name?: string;
  picture?: string;
  exp: number;
};

export type AuthSession = {
  email: string;
  name?: string;
  picture?: string;
};

function base64UrlEncode(input: string | Uint8Array) {
  const bytes = typeof input === "string" ? encoder.encode(input) : input;
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new TextDecoder().decode(bytes);
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET?.trim();

  return secret && secret.length > 0 ? secret : DEFAULT_AUTH_SECRET;
}

async function getSigningKey() {
  const secret = getAuthSecret();

  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signPayload(payload: string) {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));

  return base64UrlEncode(new Uint8Array(signature));
}

export async function createSessionToken(session: AuthSession) {
  const payload: SessionPayload = {
    email: session.email,
    name: session.name,
    picture: session.picture,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export async function verifySessionToken(token?: string): Promise<AuthSession | null> {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = await signPayload(encodedPayload);

  if (signature !== expectedSignature) {
    return null;
  }

  let payload: SessionPayload;

  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
  } catch {
    return null;
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  if (payload.email.toLowerCase() !== ALLOWED_EMAIL) {
    return null;
  }

  return {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}
