# INFOX — Self-Hosting Guide

This guide walks you through deploying INFOX on your own server or VPS.

---

## Prerequisites

| Tool | Minimum version | Notes |
|---|---|---|
| Node.js | 20 LTS | 22/24 also works |
| pnpm | 9+ | `npm i -g pnpm` |
| PostgreSQL | 15+ | Local or managed (Supabase, Neon, Railway) |
| Git | any | — |

---

## 1 — Clone & Install

```bash
git clone <your-repo-url> infox
cd infox
pnpm install
```

---

## 2 — Environment Variables

Create a `.env` file in the project root (never commit this file):

```bash
# ── Required ────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@localhost:5432/infox

# JWT secret — generate with: openssl rand -hex 64
JWT_SECRET=your_64_char_random_hex_string

# ── AI Provider (choose one) ─────────────────────────────────────
# Option A: GitHub Models (free tier available)
GITHUB_TOKEN=ghp_your_github_personal_access_token
AI_PROVIDER=github
GITHUB_AI_MODEL=gpt-4o-mini   # or gpt-4o

# Option B: OpenAI directly
# OPENAI_API_KEY=sk-your_openai_key
# AI_PROVIDER=openai
# OPENAI_MODEL=gpt-4o-mini

# ── Optional: Telegram delivery ──────────────────────────────────
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id   # or channel @username

# ── Optional: PromptPay QR (Thai payment) ───────────────────────
PROMPTPAY_PHONE_NUMBER=0812345678   # Thai phone in 10-digit format

# ── Optional: Email (admin alerts) ──────────────────────────────
ADMIN_EMAILS=admin@example.com,backup@example.com

# ── Optional: Custom port ────────────────────────────────────────
PORT=8080
```

### Getting a GitHub Token

1. Go to https://github.com/settings/tokens → **Personal access tokens (classic)**
2. Create a token with **no scopes** (read-only public access is enough for GitHub Models)
3. Paste the token as `GITHUB_TOKEN`
4. GitHub Models endpoint: `https://models.inference.ai.azure.com`

---

## 3 — Database Setup

```bash
# Push the schema (creates all 11 tables)
pnpm --filter @workspace/db run push

# Verify tables were created
psql $DATABASE_URL -c "\dt"
```

Expected tables: `users`, `profiles`, `events`, `delivery_queue`, `delivery_logs`,
`entity_memory`, `narratives`, `user_interests`, `token_usage`, `billing_plans`,
`subscriptions`

---

## 4 — Build

```bash
# Full typecheck + build all packages
pnpm run build
```

Build artefacts:
- API server → `artifacts/api-server/dist/index.js`
- Frontend → `artifacts/newsroom/dist/`

---

## 5 — Run in Production

### Option A — Direct Node (simplest)

```bash
# Start API server
NODE_ENV=production PORT=8080 node artifacts/api-server/dist/index.js &

# Serve frontend with a static file server (e.g. serve, nginx, caddy)
npx serve -s artifacts/newsroom/dist -l 5000 &
```

### Option B — PM2 (recommended for VPS)

```bash
npm i -g pm2

# Start both processes
pm2 start artifacts/api-server/dist/index.js \
  --name infox-api \
  --env production \
  -- --port 8080

pm2 serve artifacts/newsroom/dist 5000 --name infox-web --spa

# Save so they restart on reboot
pm2 save
pm2 startup
```

### Option C — Docker Compose

```yaml
# docker-compose.yml
version: "3.9"
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: infox
      POSTGRES_USER: infox
      POSTGRES_PASSWORD: changeme
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    image: node:24-alpine
    working_dir: /app
    command: node artifacts/api-server/dist/index.js
    environment:
      DATABASE_URL: postgresql://infox:changeme@db:5432/infox
      JWT_SECRET: ${JWT_SECRET}
      GITHUB_TOKEN: ${GITHUB_TOKEN}
      AI_PROVIDER: github
      PORT: 8080
    ports:
      - "8080:8080"
    depends_on:
      - db
    volumes:
      - .:/app

  web:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./artifacts/newsroom/dist:/usr/share/nginx/html
      - ./deployment/nginx.conf:/etc/nginx/conf.d/default.conf

volumes:
  pgdata:
```

---

## 6 — Nginx Reverse Proxy

Put both services behind a single domain with nginx:

```nginx
# /etc/nginx/sites-available/infox
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /var/www/infox;
        try_files $uri $uri/ /index.html;
        gzip_static on;
    }

    # API — proxy to Express
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

Enable SSL with Certbot:

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com
```

---

## 7 — Telegram Bot Setup (optional)

1. Message `@BotFather` on Telegram → `/newbot` → follow the prompts
2. Copy the bot token → set `TELEGRAM_BOT_TOKEN`
3. Start a chat with your bot, then visit:
   `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Find your `chat.id` in the response → set `TELEGRAM_CHAT_ID`
5. Briefings are now sent automatically at **07:00** and **18:00** (Asia/Bangkok)

---

## 8 — Updating

```bash
git pull
pnpm install                          # install any new deps
pnpm --filter @workspace/db run push  # apply any new schema changes
pnpm run build                        # rebuild
pm2 restart infox-api                 # or restart your process manager
```

---

## 9 — Environment Checklist

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |
| `JWT_SECRET` | ✅ Yes | Random 64-char hex for signing tokens |
| `GITHUB_TOKEN` | ✅ Yes (if `AI_PROVIDER=github`) | GitHub PAT for Models API |
| `OPENAI_API_KEY` | ✅ Yes (if `AI_PROVIDER=openai`) | OpenAI secret key |
| `AI_PROVIDER` | ✅ Yes | `github` or `openai` |
| `TELEGRAM_BOT_TOKEN` | Optional | Enables Telegram delivery |
| `TELEGRAM_CHAT_ID` | Optional | Target chat/channel for delivery |
| `PROMPTPAY_PHONE_NUMBER` | Optional | Thai PromptPay QR generation |
| `ADMIN_EMAILS` | Optional | Comma-separated admin email list |
| `PORT` | Optional | API port (default: `8080`) |

---

## Troubleshooting

**API starts but returns 503 on all routes**
→ Check `DATABASE_URL` is reachable. The server degrades gracefully to in-memory storage without a DB, but some routes will return empty data.

**"Cannot find module" on startup**
→ Run `pnpm run build` first. The production entry point is the compiled `dist/index.js`, not TypeScript source.

**Feed returns no articles**
→ The RSS ingestion worker runs every 15 minutes. Wait one cycle, or call `POST /api/news/summarize` manually to trigger a fresh fetch.

**AI briefing fails with "rate limit"**
→ GitHub Models has a free tier limit. Switch to `AI_PROVIDER=openai` with a paid key, or reduce briefing frequency in settings.

**Telegram messages not arriving**
→ Verify `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`. The bot must have been started by the target user/channel first.
