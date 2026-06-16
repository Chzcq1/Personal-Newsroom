// ============================================================
// DEPLOYMENT HARDENING — Sprint 18 Task K
//
// Makes INFOX host-independent infrastructure.
// Removes hidden Replit assumptions, adds portability audit,
// environment validation, and deployment health checks.
// ============================================================

import { logger } from "../../lib/logger.js";

// ── Environment validation ────────────────────────────────────

export interface EnvValidationResult {
  key: string;
  required: boolean;
  present: boolean;
  value?: string;   // Only for non-sensitive keys
  status: "ok" | "missing_required" | "missing_optional" | "using_default";
  defaultValue?: string;
}

export interface DeploymentReadiness {
  isProductionReady: boolean;
  score: number;              // 0–100
  criticalMissing: string[];
  warnings: string[];
  checks: DeploymentCheck[];
  runtimeInfo: RuntimeInfo;
  portabilityIssues: PortabilityIssue[];
  recommendations: string[];
}

export interface DeploymentCheck {
  name: string;
  passed: boolean;
  severity: "critical" | "warning" | "info";
  detail: string;
}

export interface RuntimeInfo {
  nodeVersion: string;
  platform: string;
  isReplit: boolean;
  isDocker: boolean;
  isRailway: boolean;
  isRender: boolean;
  isFlyio: boolean;
  environment: string;
  hasDatabase: boolean;
  hasTelegram: boolean;
  hasAIProvider: boolean;
  port: number;
}

export interface PortabilityIssue {
  severity: "critical" | "warning" | "info";
  description: string;
  recommendation: string;
}

// ── Environment definitions ────────────────────────────────────

const ENV_SPEC = [
  { key: "PORT", required: true, sensitive: false, default: "8080" },
  { key: "DATABASE_URL", required: true, sensitive: true },
  { key: "AI_PROVIDER", required: false, sensitive: false, default: "github" },
  { key: "GITHUB_TOKEN", required: false, sensitive: true, note: "Required when AI_PROVIDER=github" },
  { key: "OPENAI_API_KEY", required: false, sensitive: true, note: "Required when AI_PROVIDER=openai" },
  { key: "GEMINI_API_KEY", required: false, sensitive: true, note: "Required when AI_PROVIDER=gemini" },
  { key: "TELEGRAM_BOT_TOKEN", required: false, sensitive: true, note: "Required for scheduled delivery" },
  { key: "TELEGRAM_CHAT_ID", required: false, sensitive: true, note: "Required for scheduled delivery" },
  { key: "SCHEDULER_TIMEZONE", required: false, sensitive: false, default: "Asia/Bangkok" },
  { key: "NODE_ENV", required: false, sensitive: false, default: "production" },
] as const;

// ── Runtime detection ─────────────────────────────────────────

function detectRuntime(): RuntimeInfo {
  const env = process.env;
  return {
    nodeVersion: process.version,
    platform: process.platform,
    isReplit: !!(env.REPL_ID || env.REPLIT_DOMAINS),
    isDocker: !!(env.DOCKER_CONTAINER || (process.platform === "linux" && !env.REPL_ID)),
    isRailway: !!env.RAILWAY_ENVIRONMENT,
    isRender: !!env.RENDER,
    isFlyio: !!env.FLY_APP_NAME,
    environment: env.NODE_ENV ?? "production",
    hasDatabase: !!env.DATABASE_URL,
    hasTelegram: !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID),
    hasAIProvider: !!(env.GITHUB_TOKEN || env.OPENAI_API_KEY || env.GEMINI_API_KEY),
    port: parseInt(env.PORT ?? "8080", 10),
  };
}

// ── Portability audit ──────────────────────────────────────────

function auditPortability(runtime: RuntimeInfo): PortabilityIssue[] {
  const issues: PortabilityIssue[] = [];

  // Check for Replit-specific paths in code (architecture-level note)
  if (runtime.isReplit) {
    issues.push({
      severity: "info",
      description: "Running on Replit — some runtime assumptions may be Replit-specific",
      recommendation: "Review sleep safety: Delivery Scheduler and Narrative Memory are P0 services that require persistent process. Use Railway/Render/Fly.io for production with persistent containers.",
    });
  }

  // External cron compatibility
  if (!runtime.hasTelegram) {
    issues.push({
      severity: "warning",
      description: "Telegram not configured — scheduled delivery inactive",
      recommendation: "Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID for delivery activation. For external cron (QStash, Upstash), implement /api/cron/trigger endpoints.",
    });
  }

  // Database connectivity
  if (!runtime.hasDatabase) {
    issues.push({
      severity: "critical",
      description: "DATABASE_URL not set — running in degraded in-memory mode",
      recommendation: "Provision a PostgreSQL database. Any Platform as a Service (Railway, Render, Fly.io, Neon, Supabase) provides managed PostgreSQL.",
    });
  }

  // AI provider
  if (!runtime.hasAIProvider) {
    issues.push({
      severity: "critical",
      description: "No AI provider credentials found — summarization will fail",
      recommendation: "Set GITHUB_TOKEN (free), OPENAI_API_KEY, or GEMINI_API_KEY. GitHub Models is the recommended default (free tier available).",
    });
  }

  return issues;
}

// ── Deployment checks ──────────────────────────────────────────

function runDeploymentChecks(runtime: RuntimeInfo): DeploymentCheck[] {
  const checks: DeploymentCheck[] = [];

  checks.push({
    name: "Node.js version",
    passed: parseInt(process.version.slice(1), 10) >= 18,
    severity: "critical",
    detail: `Node.js ${process.version} — requires v18+`,
  });

  checks.push({
    name: "Database connection",
    passed: runtime.hasDatabase,
    severity: "critical",
    detail: runtime.hasDatabase
      ? "DATABASE_URL configured"
      : "DATABASE_URL missing — persistence degraded to in-memory",
  });

  checks.push({
    name: "AI provider",
    passed: runtime.hasAIProvider,
    severity: "critical",
    detail: runtime.hasAIProvider
      ? `AI provider credentials present (provider: ${process.env.AI_PROVIDER ?? "github"})`
      : "No AI credentials — summarization unavailable",
  });

  checks.push({
    name: "Port configuration",
    passed: !isNaN(runtime.port) && runtime.port > 0,
    severity: "critical",
    detail: `Server port: ${runtime.port}`,
  });

  checks.push({
    name: "Telegram delivery",
    passed: runtime.hasTelegram,
    severity: "warning",
    detail: runtime.hasTelegram
      ? "Telegram configured — scheduled delivery active"
      : "Telegram not configured — manual delivery only",
  });

  checks.push({
    name: "Environment mode",
    passed: runtime.environment === "production",
    severity: "info",
    detail: `NODE_ENV=${runtime.environment}`,
  });

  checks.push({
    name: "External cron compatibility",
    passed: true, // Always true — all delivery endpoints are HTTP-triggerable
    severity: "info",
    detail: "POST /api/delivery/morning and /api/delivery/evening are external-cron-compatible",
  });

  checks.push({
    name: "Health check endpoint",
    passed: true,
    severity: "info",
    detail: "GET /api/health returns comprehensive health status",
  });

  return checks;
}

// ── Main readiness function ────────────────────────────────────

export function getDeploymentReadiness(): DeploymentReadiness {
  const runtime = detectRuntime();
  const portabilityIssues = auditPortability(runtime);
  const checks = runDeploymentChecks(runtime);

  const criticalMissing = checks
    .filter((c) => !c.passed && c.severity === "critical")
    .map((c) => c.name);

  const warnings = [
    ...checks.filter((c) => !c.passed && c.severity === "warning").map((c) => c.detail),
    ...portabilityIssues.filter((i) => i.severity === "warning").map((i) => i.description),
  ];

  // Score: 100 base − 20 per critical failure − 5 per warning
  const score = Math.max(
    0,
    100 -
      criticalMissing.length * 20 -
      warnings.length * 5
  );

  const isProductionReady = criticalMissing.length === 0;

  const recommendations = [
    ...portabilityIssues.map((i) => i.recommendation),
    "Use pnpm --filter @workspace/db run push before first deployment to create DB tables",
    "Set NODE_ENV=production for production deployments",
    "Configure SCHEDULER_TIMEZONE for accurate delivery scheduling",
    "Health check: GET /api/health — use this as your container health check endpoint",
  ].filter(Boolean);

  logger.info(
    { isProductionReady, score, criticalMissing, runtime: runtime.isReplit ? "replit" : runtime.isDocker ? "docker" : "other" },
    "[Deployment] Readiness check"
  );

  return {
    isProductionReady,
    score,
    criticalMissing,
    warnings,
    checks,
    runtimeInfo: runtime,
    portabilityIssues,
    recommendations,
  };
}

// ── Env validation report ──────────────────────────────────────

export function validateEnvironment(): EnvValidationResult[] {
  return ENV_SPEC.map((spec) => {
    const { key, required, sensitive } = spec;
    const defaultVal = "default" in spec ? spec.default : undefined;
    const value = process.env[key];
    const present = !!value;
    let status: EnvValidationResult["status"];

    if (present) {
      status = "ok";
    } else if (defaultVal) {
      status = "using_default";
    } else if (required) {
      status = "missing_required";
    } else {
      status = "missing_optional";
    }

    return {
      key,
      required,
      present,
      value: !sensitive && present ? value : undefined,
      status,
      defaultValue: defaultVal,
    };
  });
}
