# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Life RPG Web is a gamified productivity SaaS (monorepo with npm workspaces) that converts real-world effort (study, workouts) into RPG-style progression. Players gain XP, level up, unlock skills, and compete in guilds.

- **`apps/web`** — Next.js 16 (App Router, React 19), port 3000
- **`apps/api`** — NestJS 11, port 3001
- **Supabase** — PostgreSQL + Auth + Realtime (no custom WebSockets)

## Commands

```bash
# From repo root
npm install
npm run dev:web        # Next.js dev server (port 3000)
npm run dev:api        # NestJS dev server with watch (port 3001)
npm run build:web
npm run build:api

# From apps/api
npm run test           # Jest unit tests
npm run test:watch
npm run test:e2e
npm run lint           # ESLint with auto-fix

# From apps/web
npm run lint           # ESLint

# TypeScript check (run in apps/api before committing backend changes)
cd apps/api && npx tsc --noEmit
```

If port 3000 is occupied, Next.js will attempt 3001 and collide with the API. Kill zombie processes with `lsof -i :3000` before starting the web dev server.

## Architecture

### Feature Implementation Order
Always follow this sequence when adding features:
1. **Database** — update `apps/web/schema.sql` with idempotent SQL (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` before RLS policies). User applies the script manually in the Supabase console.
2. **Backend** — DTOs → Controller → Service in `apps/api/src/<module>/`.
3. **Zustand store** — update `apps/web/src/store/usePlayerStore.ts` if global state changes.
4. **Frontend** — UI in `apps/web/src/app/<route>/page.tsx`.

### Backend (`apps/api`)

**Modules:** `player`, `sanctum`, `guild`, `battle` — each is a self-contained NestJS module.

- `player` — XP/level progression, streak, activity log, onboarding, skill tree, achievements, goals
- `sanctum` — multiplayer Pomodoro lobbies (Supabase Realtime, server-authoritative timers)
- `guild` — permanent guilds, roles (LEADER/OFFICER/MEMBER), weekly quests

**Key rules:**
- `userId` is always extracted from `req.user.id` (JWT via `SupabaseAuthGuard`) — never from URL params or request body.
- Backend uses Supabase **Service Role** key to bypass RLS (RLS policies still protect direct DB access).
- Error handling: use NestJS HTTP exceptions (`InternalServerErrorException`, `NotFoundException`, etc.) — never `throw new Error(message)`.
- All payloads validated with `class-validator` DTOs and `ValidationPipe({ whitelist: true, transform: true })`.

**XP formula:** `XP_Next = 1000 * (L ^ 1.5)` where L is the current level.

**Skill catalog** (`SKILL_CATALOG` in `player.service.ts`) — the tree of passive bonuses. Skill point cost: `max(0, level - 5) - already_spent`. Bonuses are stacked inside `logActivity`.

### Frontend (`apps/web`)

**Routing:** Next.js App Router. Main routes: `/` (dashboard), `/log-activity`, `/sanctum`, `/grimoire`, `/history`, `/achievements`, `/guild`, `/library`, `/login`, `/onboarding`.

**State:** Zustand with `localStorage` persistence (`usePlayerStore`). Store mirrors server truth for fast UI; API is the single source of truth. Fields: `level`, `currentXP`, `xpToNextLevel`, `stats` (7 stats), `currentStreak`, `highestStreak`, `userId`, `username`, `isOnboarded`, `statPoints`, `avatarId`.

**API calls:** Always use `API_URL` from `@/lib/api` — never hardcode `http://localhost:3001`.

**UI conventions:** Dark mode, glassmorphism (`backdrop-blur-md`), RPG-themed gradients, Framer Motion animations, Lucide icons, Tailwind CSS 4.

### Database (Supabase)

Key tables: `users`, `character_stats`, `activity_logs`, `player_skills`, `achievements`, `goals`, `sanctum_lobbies`, `guilds`, `guild_members`, `guild_quests`.

All RLS policies use `auth.uid()`. The backend bypasses RLS via Service Role key.

## Environment Variables

**`apps/web`:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`

**`apps/api`:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGIN` (comma-separated allowed origins, e.g. `https://app.vercel.app,http://localhost:3000`), `PORT`

## Deployments

- **Frontend:** Vercel — `https://life-rpg-web-web-k41j.vercel.app`
- **Backend:** Render — `https://life-rpg-web.onrender.com`
