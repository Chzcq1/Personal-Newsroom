# Deployment Guide — INFOX

## Supported Platforms

| Platform | Cost | Best for |
|----------|------|---------|
| Replit | Free/Pro | Development, demos |
| Railway | ~$5/mo | Production, simple ops |
| Render | ~$7/mo | Production, auto-SSL |
| Fly.io | ~$5/mo | Production, global edge |
| VPS/Docker | ~$6/mo | Full control |

---

## Prerequisites

All deployments require:
1. **PostgreSQL** database (provisioned separately or included by platform)
2. **Environment variables** (see `deployment/.env.example`)
3. **AI provider** credential — GitHub Token (default, free), OpenAI key, or Gemini key

---

## Replit (Current / Development)

Already configured. Workflows are managed by `.replit`:
- `API Server` — runs on port 8080
- `web` — runs on port 23519

**DB push:**
```bash
pnpm --filter @workspace/db run push
```

**Post-merge setup** (`scripts/post-merge.sh`):
```bash
pnpm install --frozen-lockfile
pnpm --filter @workspace/db push
```

---

## Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link project
railway login
railway link

# Set environment variables
railway variables set DATABASE_URL=postgresql://...
railway variables set GITHUB_TOKEN=ghp_...
railway variables set AI_PROVIDER=github

# Deploy
railway up
```

Config: `deployment/railway.toml`  
Health check: `GET /api/health`

---

## Render

1. Connect GitHub repo in Render dashboard
2. Set **Root Directory** to project root
3. Set **Dockerfile Path** to `deployment/Dockerfile`
4. Add a PostgreSQL database → copy `DATABASE_URL` to service env vars
5. Add other env vars from `deployment/.env.example`
6. Deploy

Config: `deployment/render.yaml`

---

## Fly.io

```bash
# Install flyctl
brew install flyctl  # or curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Create app
fly apps create infox

# Add PostgreSQL
fly postgres create --name infox-db
fly postgres attach --app infox infox-db

# Set secrets
fly secrets set GITHUB_TOKEN=ghp_...
fly secrets set TELEGRAM_BOT_TOKEN=...
fly secrets set TELEGRAM_CHAT_ID=...

# Deploy
fly deploy --dockerfile deployment/Dockerfile

# View logs
fly logs
```

Config: `deployment/fly.toml` (Singapore region — closest to Thailand)

---

## VPS / Docker Compose

```bash
# Clone and configure
cp deployment/.env.example .env
nano .env  # fill in values

# Build and start
docker-compose -f deployment/docker-compose.yml up -d

# Run DB migrations
docker-compose exec api pnpm --filter @workspace/db run push

# Check logs
docker-compose logs -f api
```

---

## Production Checklist

- [ ] `DATABASE_URL` set and reachable
- [ ] `GITHUB_TOKEN` (or other AI key) set
- [ ] `NODE_ENV=production`
- [ ] `PORT=8080`
- [ ] DB schema pushed (`pnpm --filter @workspace/db run push`)
- [ ] `GET /api/health` returns `{"status":"healthy",...}`
- [ ] Telegram credentials set (optional — for scheduled delivery)
- [ ] Verify `/admin/economics` shows DB connected (not degraded mode)

---

## Environment Variable Reference

See `deployment/.env.example` for the full reference with comments.

Critical variables:
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `PORT` | Yes | Server port (default 8080) |
| `AI_PROVIDER` | No | `github` (default), `openai`, `gemini` |
| `GITHUB_TOKEN` | If github | GitHub Models API token |
| `OPENAI_API_KEY` | If openai | OpenAI API key |
| `GEMINI_API_KEY` | If gemini | Google Gemini API key |
| `TELEGRAM_BOT_TOKEN` | No | Enables scheduled delivery |
| `TELEGRAM_CHAT_ID` | No | Telegram target chat |
| `SCHEDULER_TIMEZONE` | No | IANA timezone (default: Asia/Bangkok) |

---

## Scaling Considerations

**Single instance** (current): All workers run in the same Node.js process. Works for up to ~100 concurrent users.

**Multi-instance** (future): Extract workers to separate processes. Use Redis for distributed queue. Use pgBouncer for connection pooling.
