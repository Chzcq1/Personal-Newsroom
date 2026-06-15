---
name: Port Conflict Risk
description: Removing a workflow does NOT kill its process — stale PIDs keep ports bound
---

## The Problem

Deleting a Replit workflow via `removeWorkflow()` removes the workflow entry but does **not** SIGKILL the underlying process. The node/vite process keeps running and holds its port.

**Why this matters:** If you remove `Start newsroom` (port 23519) and then restart `artifacts/newsroom: web`, the new workflow immediately fails with "Port 23519 is already in use" — even though the workflow that created that process no longer exists.

## Detection

```bash
ss -tlnp 2>/dev/null | grep <port>
ps aux | grep "vite\|node" | grep -v grep
```

## Fix

```bash
kill -9 <pid>
# then restart the artifact workflow
```

## Prevention

Never create custom workflows that duplicate an artifact workflow. Use the artifacts skill only — it manages the lifecycle correctly.
