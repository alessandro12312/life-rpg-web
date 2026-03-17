---
name: Sviluppo Feature Life RPG Web
description: Standard architetturale e workflow operativo per implementare nuove funzionalità full-stack nel SaaS gamificato "Life RPG Web".
---

# Obiettivo
Questo workflow definisce come tu (Agent) devi progettare e implementare una nuova feature nel progetto monorepo "Life RPG Web". Il progetto converte la produttività reale (studio, allenamento) in progressione RPG.

## Tech Stack
- **Database & Auth:** Supabase (PostgreSQL, RLS Policies libere in fase di alpha).
- **Backend API:** NestJS (`apps/api`, porta 3001).
- **Frontend App:** Next.js 14+ App Router (`apps/web`, porta 3000), Tailwind CSS, framer-motion, lucide-react.
- **State Management:** Zustand persistente nel LocalStorage (`apps/web/src/store/usePlayerStore.ts`).

## Stato Attuale del Progetto (Roadmap MVP)
Questa sezione elenca cosa è già implementato e cosa manca. Aggiornala dopo ogni commit.

### ✅ Implementato
1. **Auth & Onboarding** — Login Supabase, questionario iniziale, bonus stat + 500 XP
2. **Dashboard Taverna** (`/`) — Avatar, livello, XP bar animata, radar chart stat con **scala dinamica** (`fullMark = max(maxStat * 1.5, 5)` — il poligono riempie sempre ~60-70% del chart), quest board giornaliere (completabili **una sola volta per sessione**), streak badge dinamico
3. **Log Activity** (`/log-activity`) — Registrazione manuale studio/allenamento → calcolo XP/stat server-side. Tutte le chiamate `initStats` includono `currentStreak` e `highestStreak`
4. **Streak System** — Calcolo automatico in `logActivity`, streak multiplier (+5% a 3gg, +10% a 7gg), `currentStreak` e `highestStreak` in Zustand e mostrati nella Dashboard
5. **Sanctum Focus Timer** (`/sanctum`) — Timer Pomodoro per deep work. Invia `category: 'STUDY'` (non più 'FOCUS' che non era nell'ENUM DB)
6. **Grimoire Skill Tree** (`/grimoire`) — Skill tree drag-and-pan interattivo con 7 nodi. SP = `max(0, livello - 5) - spesi`. Bonus passivi reali applicati nel `logActivity` server-side. Tabella DB: `player_skills`

### 🔲 Da Implementare
7. **Library** (`/library`) — Upload appunti, AI genera quiz/flashcard, rispondere = XP
8. **Achievement System** — Badge per traguardi
9. **Sistema Obiettivi personalizzati** — Goal tracking
10. **AI Coaching** — Integrazione LLM per suggerimenti
11. **Musica ambientale** nel Sanctum — Lofi per studio, energica per allenamento
12. **Auth Guard API** — Middleware NestJS che verifica JWT Supabase (attualmente l'API è aperta)
13. **Input Validation backend** — DTO con `class-validator` per limitare valori (es. `duration_minutes` max 480)
14. **Stat Health nel radar** — Il prompt richiede 7 stat, il radar ne mostra 6 (manca Health)

## Workflow Operativo Passo-Passo

Quando ti viene chiesto di sviluppare una nuova feature, DEVI seguire rigorosamente questo ordine:

### 1. Database Schema (`apps/web/schema.sql`)
Ogni logica persistente parte da qui.
- Aggiungi o modifica tabelle usando sintassi idempotente (es. `CREATE TABLE IF NOT EXISTS`).
- Se introduci policy RLS, **usa SEMPRE `DROP POLICY IF EXISTS`** prima di ricrearle.
- Chiedi all'utente di far girare lo script manualmente nella console Supabase.

### 2. Backend Logic (NestJS - `apps/api`)
Tutta la logica di calcolo XP, Statistiche, Livelli e validazione deve stare qui.
- **Controller:** Esponi endpoint RESTful puliti.
- **Service:** Implementa il business logic. Formule: XP `XP_Next = 1000 * (L ^ 1.5)`, streak multiplier, bonus da skill tree.
- **Skill Tree Catalog:** Il catalogo dei nodi skill è definito come costante `SKILL_CATALOG` in `player.service.ts`. I bonus vengono applicati in stack dentro `logActivity`.
- Risolvi proattivamente gli errori TypeScript. Verifica: `npx tsc --noEmit` nella cartella `apps/api`.

### 3. Frontend Global State (Zustand)
Se la UI ha bisogno di cache immediata, aggiorna lo store `usePlayerStore.ts`.
- Lo store include: `level`, `currentXP`, `xpToNextLevel`, `stats`, `currentStreak`, `highestStreak`, `userId`, `username`, `isOnboarded`.
- Lo store serve come specchio veloce per la UI — le chiamate API sono la singola fonte di verità.

### 4. Frontend UI/UX (Next.js - `apps/web/src/app`)
Crea le interfacce orientate all'aspetto RPG.
- Usa componenti Shadcn (`@/components/ui/...`).
- Idrata i dati del client tramite `usePlayerStore().userId` o `supabase.auth.getSession()`.
- Punta all'API locale (`http://localhost:3001/...`) per fetch/mutazioni.
- **Aesthetic focus:** Gradienti sfumati, glassmorphism (`backdrop-blur-md`), dark mode, animazioni con `framer-motion`.

## API Endpoints Attivi
| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | `/player/:id` | Stats + character_stats del player |
| POST | `/player/:id/activity` | Log attività → XP, stat, streak, bonus skill |
| POST | `/player/:id/onboard` | Onboarding iniziale |
| GET | `/player/:id/skills` | Skill tree: lista skill sbloccate |
| POST | `/player/:id/skills/unlock` | Sblocca uno skill (body: `{ skillId }`) |

## Tabelle DB Principali
- `users` — progressione (level, xp, streak)
- `character_stats` — 7 stat del personaggio
- `activity_logs` — storico attività con XP e stat assegnati
- `player_skills` — skill tree sbloccate per ogni player (skill_id TEXT)
- `skills` / `user_skills` — legacy MVP seed, non più usati attivamente

## Gestione Porte in Dev
- Next.js su porta **3000**, NestJS su porta **3001**.
- Se 3000 è occupata, Next.js va sulla 3001 causando conflitti. Uccidi i processi zombie con `lsof -i :3000` prima di `npm run dev:web`.
