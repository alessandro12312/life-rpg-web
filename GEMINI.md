# Life RPG Web - Project Context

Life RPG Web is a gamified productivity SaaS that transforms real-world efforts (studying, working out) into RPG-style progression. This monorepo contains both the frontend (Next.js) and the backend (NestJS) applications, integrated with Supabase for authentication and persistent data storage.

## Project Architecture

The project is structured as a monorepo using **npm workspaces**:

- **`apps/web`**: The frontend application built with **Next.js 16+** (App Router).
- **`apps/api`**: The backend API built with **NestJS 11+**.
- **`Supabase`**: Handles PostgreSQL database, Authentication, and Realtime features.

## Tech Stack

### Frontend (`apps/web`)
- **Framework**: Next.js 16 (React 19)
- **Styling**: Tailwind CSS 4, Framer Motion (animations), Radix UI (primitives)
- **State Management**: Zustand (with local storage persistence)
- **Data Fetching**: React Query (TanStack Query)
- **Icons & Charts**: Lucide React, Recharts
- **Auth**: Supabase Auth (SSR support)

### Backend (`apps/api`)
- **Framework**: NestJS 11
- **Auth**: Passport.js with Supabase JWT validation
- **Validation**: `class-validator`, `class-transformer`
- **Database**: Supabase JS SDK (PostgreSQL)
- **Security**: Helmet, Rate Limiting (Throttler), Bcrypt (lobby passwords)

## Getting Started

### Prerequisites
- Node.js (Latest LTS recommended)
- A Supabase project with the schema applied (see `apps/web/schema.sql`)

### Installation
Run from the root directory:
```bash
npm install
```

### Running the Project
The monorepo provides shortcut scripts in the root `package.json`:

| Command | Action | Port |
|---|---|---|
| `npm run dev:web` | Start Next.js in development mode | 3000 |
| `npm run dev:api` | Start NestJS in development mode | 3001 |
| `npm run build:web` | Build the frontend for production | - |
| `npm run build:api` | Build the backend for production | - |

**Note**: Ensure port 3000 is available for the web app and 3001 for the API to avoid conflicts.

## Development Conventions

### 1. Workflow for New Features
Always follow this sequence when implementing features:
1.  **Database**: Update `apps/web/schema.sql` with idempotent SQL (use `CREATE TABLE IF NOT EXISTS` and `DROP POLICY IF EXISTS`).
2.  **Backend**: Implement DTOs, Controllers, and Services in `apps/api`.
3.  **Store**: Update the Zustand store in `apps/web/src/store/usePlayerStore.ts` if global state is affected.
4.  **Frontend**: Create UI components in `apps/web/src/app` using Tailwind CSS 4 and Framer Motion.

### 2. API Communication
- Use the `API_URL` constant from `apps/web/src/lib/api.ts` for all frontend-to-backend calls.
- **Never** hardcode `http://localhost:3001`.

### 3. Aesthetics & UI/UX
- Follow a "Premium Aesthetic": dark mode by default, glassmorphism (`backdrop-blur-md`), smooth transitions, and RPG-themed gradients.
- Use Lucide icons for consistency.

### 4. Security & Validation
- Backend endpoints must be protected by `SupabaseAuthGuard`.
- All incoming payloads must be validated using NestJS `ValidationPipe` and `class-validator`.
- Database RLS (Row Level Security) policies must strictly use `auth.uid()`.

## Key Files & Directories
- `apps/web/schema.sql`: Source of truth for the database schema.
- `apps/web/src/store/usePlayerStore.ts`: Client-side progression state.
- `apps/api/src/player/player.service.ts`: Core logic for XP, levels, and skill bonuses.
- `.agents/skills/`: Specialized instructions for AI sub-agents.

---

## Current Status & Deployments

### 🌍 Deployment Configuration
- **Frontend (Vercel)**: `https://life-rpg-web-web-k41j.vercel.app`
- **Backend (Render)**: `https://life-rpg-web.onrender.com`
- **Database (Supabase)**: Persistent schema configuration.

### 🛠️ Recent Fixes & Modifications
1. **Next.js & Vercel Compatibility (Next.js 16)**:
   - Configured `next.config.ts` to support environment-aware `turbopack.root` (avoiding local paths crash on Vercel).
   - Removed unsupported `eslint` key in `nextConfig`.
   - Setup `vercel.json` and removed `package-lock.json` from git to fix platform-specific native binary compilation issues on Linux (errors on `lightningcss` and `@tailwindcss/oxide`).
2. **CORS & TS Config**:
   - Added support in backend `main.ts` for multiple comma-separated allowed origins (supporting local dev `localhost:3000` and Vercel production URL).
   - Fixed missing types inside `main.ts` CORS callback to comply with TypeScript strict mode.
3. **Stat Points Allocation Fix**:
   - Resolved a database query bug in `allocateStats` (`player.service.ts` line 1076): the code was filtering on `id` instead of the actual primary key `user_id` on the `character_stats` table. Corrected to `.eq('user_id', userId)`.
