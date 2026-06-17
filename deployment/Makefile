# ─────────────────────────────────────────────────────────────
# INFOX — Deployment Makefile
# ─────────────────────────────────────────────────────────────
# Usage: make <target>
# Run from the workspace root (not inside /deployment/).
# ─────────────────────────────────────────────────────────────

.PHONY: help dev build push-schema start-api start-web \
        docker-build docker-up docker-down docker-logs \
        deploy-railway deploy-fly typecheck clean

help:
	@echo ""
	@echo "INFOX — Available commands:"
	@echo ""
	@echo "  Development:"
	@echo "    make dev          Start API server (port 8080)"
	@echo "    make start-web    Start frontend (port 23519)"
	@echo "    make typecheck    Run full typecheck across workspace"
	@echo ""
	@echo "  Database:"
	@echo "    make push-schema  Push DB schema changes (dev only)"
	@echo ""
	@echo "  Build:"
	@echo "    make build        Build all packages"
	@echo "    make codegen      Regenerate API hooks from OpenAPI spec"
	@echo ""
	@echo "  Docker (local staging):"
	@echo "    make docker-build Build Docker images"
	@echo "    make docker-up    Start all services (db + api + web)"
	@echo "    make docker-down  Stop all services"
	@echo "    make docker-logs  Tail all service logs"
	@echo ""
	@echo "  Deployment:"
	@echo "    make deploy-railway   Deploy to Railway"
	@echo "    make deploy-fly       Deploy to Fly.io"
	@echo ""

# ── Development ──────────────────────────────────────────────

dev:
	PORT=8080 pnpm --filter @workspace/api-server run dev

start-web:
	PORT=23519 BASE_PATH=/ pnpm --filter @workspace/newsroom run dev

typecheck:
	pnpm run typecheck

# ── Database ──────────────────────────────────────────────────

push-schema:
	pnpm --filter @workspace/db run push

# ── Build ─────────────────────────────────────────────────────

build:
	pnpm run build

codegen:
	pnpm --filter @workspace/api-spec run codegen

# ── Docker ────────────────────────────────────────────────────

docker-build:
	docker-compose -f deployment/docker-compose.yml build

docker-up:
	docker-compose -f deployment/docker-compose.yml up -d

docker-down:
	docker-compose -f deployment/docker-compose.yml down

docker-logs:
	docker-compose -f deployment/docker-compose.yml logs -f

docker-up-local:
	docker-compose -f deployment/docker-compose.yml --profile local up -d

# ── Deployment ────────────────────────────────────────────────

deploy-railway:
	@echo "Deploying to Railway..."
	@echo "1. Ensure railway CLI is installed: npm install -g @railway/cli"
	@echo "2. Login: railway login"
	@echo "3. Link project: railway link"
	@echo "4. Deploy: railway up"
	@echo "See deployment/RAILWAY.md for full guide."

deploy-fly:
	@echo "Deploying to Fly.io..."
	@echo "1. Ensure flyctl is installed: curl -L https://fly.io/install.sh | sh"
	@echo "2. Login: fly auth login"
	@echo "3. Deploy: fly deploy --config deployment/fly.toml"
	@echo "See deployment/FLY.md for full guide."

# ── Cleanup ───────────────────────────────────────────────────

clean:
	rm -rf artifacts/api-server/dist
	rm -rf artifacts/newsroom/dist
	rm -rf lib/*/dist
	@echo "Build artifacts cleaned."
