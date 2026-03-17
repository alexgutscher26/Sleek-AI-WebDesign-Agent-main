# Sleek AI Web Design Agent

AI-powered web and mobile UI generation workspace built with Next.js 16, Clerk, Neon/Postgres, and an OpenAI-compatible model provider.

This app lets you describe a landing page, dashboard, or mobile screen in chat, then generates one or more renderable pages on a draggable canvas. Projects, messages, and generated pages are persisted so you can come back and keep iterating.

## What it does

- Generates multi-page web or mobile UI concepts from natural-language prompts
- Streams agent responses and generation progress into the chat panel
- Persists projects, chat history, page metadata, and generated HTML in Postgres
- Supports page regeneration and iterative edits on a selected page
- Accepts image attachments for reference-driven design generation
- Includes request validation, HTML sanitization, rate limiting, and security headers

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS
- Clerk for authentication
- Neon/Postgres for persistence
- Vercel AI SDK for chat streaming
- OpenAI-compatible provider routing for Claude, Gemini, or OpenAI-style APIs
- TanStack Query, shadcn/ui, Radix UI, and `react-rnd` for the canvas/editor experience

## Project structure

```text
app/
  (routes)/              Main chat and project pages
  api/project/           Streaming generation + project APIs
  api/upload/            Signed attachment upload flow
components/chat/         Chat UI, canvas, and page controls
insforge/schema.sql      Database schema and RPC helpers
lib/                     Backend adapters, validation, prompts, and security utilities
```

## Prerequisites

- Node.js 20+
- npm
- A Clerk application
- A Postgres database connection string
- An OpenAI-compatible AI endpoint

## Environment variables

Copy `.env.example` to `.env` and fill in the values.

Required variables:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# OpenRouter example
OPENROUTER_API_KEY=sk-or-v1-xxx
OPENAI_BASE_URL=https://openrouter.ai/api/v1

# Or use OpenAI directly instead of OpenRouter
# OPENAI_API_KEY=sk-proj-xxx
# OPENAI_BASE_URL=https://api.openai.com/v1
```

Notes:

- The app uses Clerk routes for auth. Use `/sign-in` and `/sign-up`.
- `DATABASE_URL` is used by the Neon/Postgres compatibility layer in [`lib/neon-db.ts`](/C:/Users/madaj/OneDrive/Desktop/Sleek-AI-WebDesign-Agent-main/lib/neon-db.ts).
- The AI layer expects an OpenAI-compatible chat completions API.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create your `.env` file from `.env.example`.

3. Run the database schema in [`insforge/schema.sql`](/C:/Users/madaj/OneDrive/Desktop/Sleek-AI-WebDesign-Agent-main/insforge/schema.sql).

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000).

## Database setup

Run the SQL in [`insforge/schema.sql`](/C:/Users/madaj/OneDrive/Desktop/Sleek-AI-WebDesign-Agent-main/insforge/schema.sql) against your Postgres database. It creates:

- `projects`
- `pages`
- `messages`
- `generation_requests`
- `generation_runs`

It also adds helper RPC functions for:

- project creation and ownership checks
- generation request idempotency and rate limiting
- committing generated pages and regenerated pages
- page reordering and project metadata syncing

## Available scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## How generation works

1. A user starts a project from the chat screen.
2. The app creates or loads a project by `slugId`.
3. The backend classifies the request as chat, generate, or regenerate.
4. For generation requests, it runs a preflight step, analyzes the prompt, and generates page HTML plus shared styles.
5. Results are sanitized, streamed to the UI, and saved to Postgres.
6. The canvas updates with persisted pages and viewport metadata.

The main streaming route lives in [`app/api/project/route.ts`](/C:/Users/madaj/OneDrive/Desktop/Sleek-AI-WebDesign-Agent-main/app/api/project/route.ts).

## Security notes

- Clerk protects authenticated flows
- Middleware applies CSP and related security headers in [`proxy.ts`](/C:/Users/madaj/OneDrive/Desktop/Sleek-AI-WebDesign-Agent-main/proxy.ts)
- Uploads use signed tokens and file validation
- Generated HTML is sanitized before persistence/rendering
- Generation requests include idempotency protection and abuse controls

## Known implementation details

- The codebase still uses some `insforge` naming in adapters and schema files, but the current implementation is backed by Clerk plus a Postgres compatibility layer.
- Auth is no longer handled by `app/api/auth`; that route now returns a `410` and points callers to Clerk auth routes.

## License

This repository includes a personal-use/commercial-license notice in the original project materials. If you plan to use this code commercially, review the license terms referenced by the project owner before shipping.
