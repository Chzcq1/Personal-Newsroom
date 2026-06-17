import { Router } from "express";
import {
  hashPassword,
  verifyPassword,
  signJwt,
  verifyJwt,
  buildJwtPayload,
  buildGoogleAuthUrl,
  exchangeGoogleCode,
  isAdminEmail,
} from "../services/auth/authService.js";
import {
  createUser,
  getUserByEmail,
  getUserById,
  getUserByAnonymousProfileId,
  updateUserLastLogin,
  updateUser,
  createSession,
  deactivateSession,
} from "../repositories/userRepository.js";
import { upsertProfile } from "../repositories/userProfileRepository.js";
import { requireAuth, getAuthUser } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

const FRONTEND_URL = process.env["FRONTEND_URL"] ?? "http://localhost:23519";

function isValidEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}
function isValidPassword(v: unknown): v is string {
  return typeof v === "string" && v.length >= 8;
}

// ── POST /auth/register ─────────────────────────────────────

router.post("/auth/register", async (req, res) => {
  const { email, password, displayName, anonymousProfileId } = req.body as Record<string, unknown>;

  if (!isValidEmail(email)) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }
  if (!isValidPassword(password)) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const passwordHash = await hashPassword(password as string);
  const role = isAdminEmail(email) ? "admin" : "user";

  const user = await createUser({
    email,
    passwordHash,
    displayName: isNonEmptyString(displayName) ? displayName : null,
    provider: "email",
    role,
    tier: "free",
    anonymousProfileId: isNonEmptyString(anonymousProfileId) ? anonymousProfileId : null,
  });

  if (!user) {
    res.status(500).json({ error: "Failed to create account" });
    return;
  }

  if (isNonEmptyString(anonymousProfileId)) {
    await upsertProfile({ id: anonymousProfileId, migrationReady: true });
  }

  const sessionId = await createSession(user.id, req.headers["user-agent"] ?? undefined) ?? "fallback";
  await updateUserLastLogin(user.id);
  const token = signJwt(buildJwtPayload(user, sessionId));

  logger.info({ userId: user.id, email: user.email }, "[Auth] New account registered");
  res.status(201).json({ token, user: publicUser(user) });
});

// ── POST /auth/login ────────────────────────────────────────

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body as Record<string, unknown>;

  if (!isValidEmail(email) || !isNonEmptyString(password)) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const user = await getUserByEmail(email);
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const ok = await verifyPassword(password as string, user.passwordHash);
  if (!ok) {
    logger.warn({ email }, "[Auth] Failed login attempt");
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const sessionId = await createSession(user.id, req.headers["user-agent"] ?? undefined) ?? "fallback";
  await updateUserLastLogin(user.id);
  const token = signJwt(buildJwtPayload(user, sessionId));

  logger.info({ userId: user.id }, "[Auth] Login successful");
  res.json({ token, user: publicUser(user) });
});

// ── POST /auth/logout ───────────────────────────────────────

router.post("/auth/logout", requireAuth, async (req, res) => {
  const authUser = getAuthUser(req);
  if (authUser.sessionId && authUser.sessionId !== "fallback") {
    await deactivateSession(authUser.sessionId);
  }
  res.json({ ok: true });
});

// ── GET /auth/me ────────────────────────────────────────────

router.get("/auth/me", requireAuth, async (req, res) => {
  const userId = getAuthUser(req).userId;
  const user = await getUserById(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user: publicUser(user) });
});

// ── POST /auth/refresh ──────────────────────────────────────

router.post("/auth/refresh", async (req, res) => {
  const { token } = req.body as Record<string, unknown>;
  if (typeof token !== "string") {
    res.status(400).json({ error: "Token required" });
    return;
  }
  try {
    const payload = verifyJwt(token);
    const user = await getUserById(payload.userId);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    const sessionId = await createSession(user.id) ?? "fallback";
    const newToken = signJwt(buildJwtPayload(user, sessionId));
    res.json({ token: newToken, user: publicUser(user) });
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

// ── POST /auth/migrate ──────────────────────────────────────
// Link an existing anonymous profile to the authenticated user

router.post("/auth/migrate", requireAuth, async (req, res) => {
  const { anonymousProfileId } = req.body as Record<string, unknown>;
  if (!isNonEmptyString(anonymousProfileId)) {
    res.status(400).json({ error: "anonymousProfileId required" });
    return;
  }
  const userId = getAuthUser(req).userId;
  const user = await getUserById(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await updateUser(userId, {});
  await upsertProfile({ id: anonymousProfileId, migrationReady: true });

  logger.info({ userId, anonymousProfileId }, "[Auth] Anonymous profile migrated");
  res.json({ ok: true, profileId: anonymousProfileId });
});

// ── GET /auth/google ────────────────────────────────────────

router.get("/auth/google", (req, res) => {
  try {
    const url = buildGoogleAuthUrl();
    res.redirect(url);
  } catch (err) {
    logger.warn({ err }, "[Auth] Google OAuth not configured");
    res.redirect(`${FRONTEND_URL}/auth/login?error=google_not_configured`);
  }
});

// ── GET /auth/google/callback ───────────────────────────────

router.get("/auth/google/callback", async (req, res) => {
  const { code, error: oauthError } = req.query as Record<string, string>;

  if (oauthError || !code) {
    res.redirect(`${FRONTEND_URL}/auth/login?error=google_denied`);
    return;
  }

  try {
    const googleUser = await exchangeGoogleCode(code);

    let user = await getUserByEmail(googleUser.email);

    if (!user) {
      const role = isAdminEmail(googleUser.email) ? "admin" : "user";
      user = await createUser({
        email: googleUser.email,
        displayName: googleUser.name,
        avatarUrl: googleUser.picture,
        provider: "google",
        role,
        tier: "free",
      });
      if (!user) throw new Error("Failed to create user");
      logger.info({ email: googleUser.email }, "[Auth] New Google account created");
    } else if (user.provider !== "google") {
      await updateUser(user.id, { avatarUrl: googleUser.picture });
    }

    const sessionId = await createSession(user.id) ?? "fallback";
    await updateUserLastLogin(user.id);
    const token = signJwt(buildJwtPayload(user, sessionId));

    res.redirect(`${FRONTEND_URL}/auth/callback?token=${encodeURIComponent(token)}`);
  } catch (err) {
    logger.error({ err }, "[Auth] Google OAuth callback error");
    res.redirect(`${FRONTEND_URL}/auth/login?error=google_failed`);
  }
});

// ── GET /auth/google/status ─────────────────────────────────

router.get("/auth/google/status", (_req, res) => {
  const configured = !!(process.env["GOOGLE_CLIENT_ID"] && process.env["GOOGLE_CLIENT_SECRET"]);
  res.json({ configured });
});

// ── Helper ──────────────────────────────────────────────────

function publicUser(user: Awaited<ReturnType<typeof getUserById>>) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    provider: user.provider,
    role: user.role,
    tier: user.tier,
    foundingMember: user.foundingMember,
    anonymousProfileId: user.anonymousProfileId,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

export default router;
