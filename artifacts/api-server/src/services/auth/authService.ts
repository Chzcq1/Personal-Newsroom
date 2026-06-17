import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { User } from "@workspace/db";

const BCRYPT_ROUNDS = 12;

function getJwtSecret(): string {
  const secret = process.env["JWT_SECRET"];
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return secret;
}

export interface JwtPayload {
  userId: string;
  profileId: string;
  email: string | null;
  role: "user" | "admin";
  tier: "free" | "founding_member" | "premium_future";
  sessionId: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "30d" });
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

export function buildJwtPayload(user: User, sessionId: string): JwtPayload {
  const profileId = user.anonymousProfileId ?? user.id;
  return {
    userId: user.id,
    profileId,
    email: user.email ?? null,
    role: (user.role as "user" | "admin"),
    tier: (user.tier as "free" | "founding_member" | "premium_future"),
    sessionId,
  };
}

/** Resolves the absolute base URL of the API server.
 *  Priority: API_BASE_URL > REPLIT_DEV_DOMAIN > empty string.
 *  An empty result will produce a relative redirect_uri that Google will reject.
 */
function getApiBaseUrl(): string {
  if (process.env["API_BASE_URL"]) return process.env["API_BASE_URL"].replace(/\/$/, "");
  if (process.env["REPLIT_DEV_DOMAIN"]) return `https://${process.env["REPLIT_DEV_DOMAIN"]}`;
  return "";
}

function getGoogleRedirectUri(): string {
  return process.env["GOOGLE_REDIRECT_URI"] ?? `${getApiBaseUrl()}/api/auth/google/callback`;
}

export function buildGoogleAuthUrl(): string {
  const clientId = process.env["GOOGLE_CLIENT_ID"];
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID not configured");
  const redirectUri = getGoogleRedirectUri();
  if (!redirectUri.startsWith("http")) {
    throw new Error("Google OAuth requires an absolute redirect URI. Set API_BASE_URL or GOOGLE_REDIRECT_URI.");
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

export async function exchangeGoogleCode(code: string): Promise<GoogleUserInfo> {
  const clientId = process.env["GOOGLE_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_CLIENT_SECRET"];
  const redirectUri = getGoogleRedirectUri();

  if (!clientId || !clientSecret) throw new Error("Google OAuth not configured");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
  });

  if (!tokenRes.ok) {
    throw new Error(`Google token exchange failed: ${tokenRes.status}`);
  }

  const tokenData = await tokenRes.json() as { access_token: string };
  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) throw new Error("Failed to fetch Google user info");
  return userRes.json() as Promise<GoogleUserInfo>;
}

export function isAdminEmail(email: string): boolean {
  const adminEmails = (process.env["ADMIN_EMAILS"] ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}
