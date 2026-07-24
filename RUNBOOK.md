# Sleek AI Web Design Agent — Operations Runbook

> **Scope:** Deployment rollback, database rollback, environment variable
> management, health checks, incident severity, and escalation procedures for
> the Sleek AI Web Design Agent (`ai-webdesign-agent`).

---

## Table of Contents

1. [Incident Severity Levels](#1-incident-severity-levels)
2. [Health Checks & Smoke Tests](#2-health-checks--smoke-tests)
3. [Deployment Rollback — Vercel](#3-deployment-rollback--vercel)
4. [Database Rollback — Neon / Postgres](#4-database-rollback--neon--postgres)
5. [Environment Variable Rollback](#5-environment-variable-rollback)
6. [AI Provider Fallback](#6-ai-provider-fallback)
7. [Auth Rollback — Clerk](#7-auth-rollback--clerk)
8. [Monitoring Reference](#8-monitoring-reference)
9. [On-Call Escalation](#9-on-call-escalation)
10. [Post-Incident Checklist](#10-post-incident-checklist)

---

## 1. Incident Severity Levels

| Severity          | Description                                                                                 | Target Response | Target Resolution |
| ----------------- | ------------------------------------------------------------------------------------------- | --------------- | ----------------- |
| **P0 — Critical** | Production is down; all users affected (e.g., 5xx on all routes, auth loop, DB unreachable) | < 15 min        | < 2 h             |
| **P1 — High**     | Core feature broken for a segment of users (generation fails, canvas blank, saves fail)     | < 1 h           | < 8 h             |
| **P2 — Medium**   | Non-core feature broken or degraded performance (slow saves, minor UI bug)                  | < 4 h           | < 24 h            |
| **P3 — Low**      | Cosmetic issue, doc gap, or minor UX annoyance                                              | Next sprint     | Next sprint       |

---

## 2. Health Checks & Smoke Tests

Run these immediately after any deployment or after a rollback to confirm the
system is healthy.

### 2.1 Quick HTTP smoke tests

```bash
# App root should return 200
curl -o /dev/null -s -w "%{http_code}" https://<YOUR_DOMAIN>/

# Auth entrypoint (Clerk) — should return 200 or redirect, never 5xx
curl -o /dev/null -s -w "%{http_code}" https://<YOUR_DOMAIN>/sign-in

# Deprecated auth stub — should return 410
curl -o /dev/null -s -w "%{http_code}" https://<YOUR_DOMAIN>/api/auth
```

### 2.2 Database connectivity

```bash
# From a psql client or your Neon console, confirm tables are reachable:
psql "$DATABASE_URL" -c "SELECT count(*) FROM public.projects;"
psql "$DATABASE_URL" -c "SELECT count(*) FROM public.pages;"
psql "$DATABASE_URL" -c "SELECT count(*) FROM public.messages;"
```

### 2.3 AI provider connectivity

```bash
# Test the configured provider endpoint directly:
curl -s \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"max_tokens":5}' \
  "${OPENAI_BASE_URL}/chat/completions" | jq .choices[0].message.content
```

### 2.4 End-to-end generation smoke test (manual)

1. Sign in as a test user.
2. Create a new project with the prompt:
   `"A simple landing page for a SaaS product"`.
3. Confirm streaming progresses and at least one page appears on the canvas
   within 60 seconds.
4. Rename the page and verify the autosave indicator shows **Saved**.

---

## 3. Deployment Rollback — Vercel

### 3.1 Instant rollback via Vercel dashboard

1. Open **Vercel → Project → Deployments**.
2. Find the last known-good deployment (green ✅).
3. Click **⋯ → Promote to Production**.
4. Wait for the promotion to complete (~30 s).
5. Run the [smoke tests](#2-health-checks--smoke-tests).

### 3.2 Rollback via Vercel CLI

```bash
# Install CLI if not present
npm i -g vercel

# List recent deployments
vercel ls --prod

# Promote a specific deployment URL to production
vercel promote <deployment-url> --scope=<your-team-slug>
```

### 3.3 Rollback via Git revert (code-level)

Use this when the bad deployment introduced source-level regressions:

```bash
# Identify the bad commit
git log --oneline -10

# Revert to the previous good commit (creates a new commit, safe for history)
git revert <bad-commit-sha>

# Or hard-reset a feature branch before it merged (use with care)
git checkout main
git reset --hard <last-good-sha>
git push --force-with-lease origin main
```

Vercel will automatically redeploy when the `main` branch is updated.

### 3.4 Locking deployments (prevent further auto-deploys)

In the Vercel dashboard: **Settings → Git → Deploy Hooks / Branch Protection** —
disable automatic deployments until the incident is resolved.

---

## 4. Database Rollback — Neon / Postgres

> **Warning:** Database rollbacks are destructive to data written after the
> migration. Ensure you have taken a Neon branch snapshot or a logical backup
> before proceeding.

### 4.1 Schema rollback (full wipe + re-apply)

The project ships a ready-made rollback script at
[`insforge/schema_rollback.sql`](./insforge/schema_rollback.sql).

```bash
# Step 1 — Take a snapshot in the Neon console first (recommended)
# Neon console → Branch → Create branch from current state → name it "pre-rollback-<date>"

# Step 2 — Apply the rollback (drops all app tables and functions)
psql "$DATABASE_URL" -f insforge/schema_rollback.sql

# Step 3 — Re-apply the schema from scratch
psql "$DATABASE_URL" -f insforge/schema.sql

# Step 4 — Confirm tables exist
psql "$DATABASE_URL" -c "\dt public.*"
```

> This wipes **all application data**. Only use for a full schema emergency. For
> partial fixes, write a targeted `ALTER` or `DROP` statement instead.

### 4.2 Neon branch-based rollback (recommended, zero data loss)

Neon supports instant branching. Use this to restore to a known-good state
without destroying production data:

1. Open **Neon console → Branches**.
2. Click **New Branch** from a past restore point timestamp (or from a named
   branch snapshot you created before the bad migration).
3. Copy the connection string for the new branch.
4. Update `DATABASE_URL` in your Vercel environment variables to point to the
   new branch.
5. Trigger a Vercel redeploy (or promote the last good deployment — the new
   `DATABASE_URL` takes effect on next deploy).
6. Validate with smoke tests, then merge the branch or migrate data as needed.

### 4.3 Targeted data fix (recommended for P1/P2)

Prefer surgical SQL over full rollbacks when possible:

```sql
-- Example: revert a bad column added in a migration
ALTER TABLE public.projects DROP COLUMN IF EXISTS bad_column;

-- Example: restore deleted rows from a logical backup / Neon point-in-time
INSERT INTO public.projects SELECT * FROM backup_projects WHERE "createdAt" > '2024-01-01';
```

---

## 5. Environment Variable Rollback

All environment variables are managed in **Vercel → Project → Settings →
Environment Variables**.

### 5.1 Procedure

1. Open the Vercel dashboard for the project.
2. Navigate to **Settings → Environment Variables**.
3. Find the changed variable and click **Edit**.
4. Restore the previous value (keep a local `.env.backup` record — see below).
5. Click **Save** and trigger a redeploy:

```bash
vercel --prod
```

### 5.2 Local backup practice

Before every deployment that changes env vars, capture the current state:

```bash
# Save current values to a local encrypted backup (never commit this file)
vercel env pull .env.backup --environment=production
# Encrypt before storing
gpg --symmetric --cipher-algo AES256 .env.backup
```

### 5.3 Required environment variables reference

| Variable                            | Purpose                                  | Example                                          |
| ----------------------------------- | ---------------------------------------- | ------------------------------------------------ |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key for frontend auth       | `pk_live_xxx`                                    |
| `CLERK_SECRET_KEY`                  | Clerk secret key for backend auth        | `sk_live_xxx`                                    |
| `DATABASE_URL`                      | Neon/Postgres connection string          | `postgresql://user:pass@host/db?sslmode=require` |
| `OPENROUTER_API_KEY`                | OpenRouter API key (primary AI provider) | `sk-or-v1-xxx`                                   |
| `OPENAI_BASE_URL`                   | Base URL for OpenAI-compatible API       | `https://openrouter.ai/api/v1`                   |
| `OPENAI_API_KEY`                    | Direct OpenAI key (optional fallback)    | `sk-proj-xxx`                                    |

---

## 6. AI Provider Fallback

The app routes to any OpenAI-compatible endpoint via `OPENAI_BASE_URL`. If the
primary provider (OpenRouter) is down:

### 6.1 Switch to direct OpenAI

1. In Vercel env vars, update:
   - `OPENAI_BASE_URL` → `https://api.openai.com/v1`
   - `OPENROUTER_API_KEY` → _(remove or leave blank)_
   - `OPENAI_API_KEY` → `sk-proj-<your-key>`
2. Redeploy.

### 6.2 Switch to another OpenRouter-compatible provider

Any provider that exposes an OpenAI-compatible `/chat/completions` endpoint
works:

| Provider              | Base URL                         |
| --------------------- | -------------------------------- |
| OpenRouter            | `https://openrouter.ai/api/v1`   |
| OpenAI                | `https://api.openai.com/v1`      |
| Together AI           | `https://api.together.xyz/v1`    |
| Groq                  | `https://api.groq.com/openai/v1` |
| Anthropic (via proxy) | depends on proxy                 |

Update `OPENAI_BASE_URL` and the matching API key variable, then redeploy.

---

## 7. Auth Rollback — Clerk

Clerk auth issues are typically key mismatches or environment promotions.
**Never share Clerk secret keys.**

### 7.1 Clerk key rotation

1. In the **Clerk dashboard → API Keys**, generate a new secret key.
2. Update `CLERK_SECRET_KEY` in Vercel.
3. Update `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` if rotating the publishable key as
   well.
4. Redeploy.

### 7.2 Rolling back Clerk JWT configuration

If a JWT template change breaks auth:

1. Open **Clerk dashboard → JWT Templates**.
2. Identify the changed template.
3. Click **Edit** and revert to the previous claims/algorithm.
4. Publish the change — no redeploy needed, takes effect within seconds.

### 7.3 Emergency: disable sign-ups

If the app is under attack or credentials are compromised:

1. **Clerk dashboard → User & Authentication → Email, Phone, Username** — toggle
   off all sign-up methods.
2. This preserves existing sessions while blocking new registrations.

---

## 8. Monitoring Reference

> Monitoring infrastructure is on the roadmap. Use these manual checks until
> Sentry and uptime monitoring are integrated.

### 8.1 Vercel function logs

```bash
# Stream live function logs
vercel logs --prod --follow
```

### 8.2 Neon database logs

Available in the **Neon console → Monitoring → Logs** tab. Filter by:

- Connection errors
- Long-running queries (> 5 s)
- Lock waits

### 8.3 Key error signatures

| Error pattern                           | Likely cause                        | Action                                                                           |
| --------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------- |
| `connect ECONNREFUSED` in function logs | `DATABASE_URL` wrong or Neon paused | Check env var; wake Neon branch                                                  |
| `401 Unauthorized` from AI provider     | API key expired/wrong               | Rotate `OPENROUTER_API_KEY`                                                      |
| `Clerk: Invalid token`                  | Key mismatch between environments   | Verify both Clerk keys match the environment                                     |
| `500` on `/api/project`                 | Generation pipeline error           | Check Vercel function logs; inspect `generation_requests.status = 'failed'` rows |
| `NEXT_REDIRECT` loop on `/sign-in`      | Middleware misconfiguration         | Roll back `proxy.ts` / middleware changes                                        |

---

## 9. On-Call Escalation

> Fill in the contact details for your team before shipping to production.

| Role               | Contact                 | Channel                                     |
| ------------------ | ----------------------- | ------------------------------------------- |
| On-call engineer   | `<name>`                | PagerDuty / Slack `#incidents`              |
| Database DBA       | `<name>`                | Slack `#db-ops`                             |
| Clerk support      | support@clerk.com       | https://clerk.com/support                   |
| Neon support       | support@neon.tech       | https://neon.tech/docs/introduction/support |
| Vercel support     | https://vercel.com/help | Vercel dashboard → Support ticket           |
| OpenRouter support | support@openrouter.ai   | https://openrouter.ai                       |

### Escalation flow

```
Alert fires
  → On-call engineer assesses severity (< 5 min)
    → P0/P1: execute rollback immediately, page backup engineer
    → P2/P3: file issue, schedule fix for next sprint
  → Rollback complete: run smoke tests
  → Confirmed healthy: post update in #incidents
  → Within 24 h: write post-mortem (see §10)
```

---

## 10. Post-Incident Checklist

Complete within 24 hours of resolving any P0 or P1 incident.

- [ ] **Timeline documented** — exact sequence of events from detection to
      resolution
- [ ] **Root cause identified** — what broke and why
- [ ] **Immediate fix applied** — rollback or hotfix deployed and verified
- [ ] **Smoke tests passed** — all checks in §2 confirmed green
- [ ] **Monitoring gap noted** — what detection would have caught this sooner
- [ ] **Action items created** — tickets filed for permanent fix and monitoring
      improvements
- [ ] **Team notified** — summary posted in #incidents or equivalent channel
- [ ] **`todo.md` updated** — any new infrastructure tasks added to the backlog

---

_Last updated: 2026-07-24_ _Maintainer: See project README for ownership._
