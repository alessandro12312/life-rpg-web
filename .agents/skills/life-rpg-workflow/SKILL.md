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
1. **Auth & Onboarding** — Login Supabase, questionario iniziale, bonus stat + 500 XP. Crea **goal iniziali** basati su ore studio/allenamento dichiarate
2. **Dashboard Taverna** (`/`) — Avatar, livello, XP bar animata, radar chart stat con **scala dinamica** (`fullMark = max(maxStat * 1.5, 5)`), quest board giornaliere (completabili una sola volta per sessione), streak badge dinamico, link a Trofei
3. **Log Activity** (`/log-activity`) — Registrazione manuale studio/allenamento → calcolo XP/stat server-side. `initStats` con streak
4. **Streak System** — Calcolo automatico in `logActivity`, streak multiplier (+5% a 3gg, +10% a 7gg), `currentStreak` e `highestStreak` in Zustand
5. **Sanctum Focus Timer** (`/sanctum`) — Timer Pomodoro 25 min. `category: 'STUDY'`, `stat_type: 'focus'`, `intensity: 1.2x`. Pulsante "Concludi" (≥1 min). XP bonus % da skill/streak mostrati in HUD. UI italiana
6. **Grimoire Skill Tree** (`/grimoire`) — Drag-and-pan interattivo con 7 nodi. SP = `max(0, livello - 5) - spesi`. Bonus passivi in `logActivity`. Tabella: `player_skills`
7. **Achievement System** (`/achievements` tab Trofei) — 10 badge automatici (`ACHIEVEMENT_CATALOG`): first_blood, level_5, level_10, streak_3/7/30, study_10, workout_10, sanctum_5, skill_1. `checkAchievements()` chiamato in `logActivity`. Tabella: `achievements`
8. **Goal Tracking** (`/achievements` tab Obiettivi) — Obiettivi personalizzati con target in ore, progress bar, XP bonus al completamento (200 XP default). `updateGoalProgress()` chiamato in `logActivity`. Form creazione nuovi goal. Tabella: `goals`
9. **Sanctum Audio** — Musica ambientale integrata nel timer Pomodoro (Lofi/Ambient) governata da useRef React
10. **API Security & Validation** — NestJS SupabaseAuthGuard in tutto il controller; `class-validator` per validare payload (es. divieto log > 8h); Injection token Bearer nel client
11. **Health Stat Radar** — Dashboard aggiornata per proiettare la 7° statistica "HLT" su Recharts radar.
12. **Stat Rebalancing & Endurance Runes** — Aumenti passivi di Endurance (0.03/h) globale e Knowledge (0.05/h) in STUDY. Salute aumenta coi livelli (+0.5). Aggiunte due rune Vitality nel Grimorio. Fixato bug AuthHeader nello sblocco skill.
13. **Cronologia Attività (The Chronicles)** — Endpoint `GET /player/:id/activities`, UI timeline `/history` accessibile dalla Taverna, per consultare vecchie attività, durata, XP e specifici Stat gains.
14. **Character Creation (Race, Class & Aspect)** — Aggiornato `/onboarding` con scelte di Razza (es. Orco), Classe (es. Barbaro) e Aspetto (Maschio/Femmina). Applicati bonus alle stats base. Generati artwork Avatar AI sdoppiati per genere e risolto il bug persistenza Zustand al logout.
15. **Sanctum Multiplayer Lobbies** — Sistema multiplayer sincronizzato per il Pomodoro (Focus -> Pausa -> Focus) su Supabase Realtime. Timer server-authoritative (`started_at`), calcolo locale degli XP anti-exploit, e UI split responsive.

### 🔲 Da Implementare
16. **Library** (`/library`) — (AI) Upload appunti, AI genera quiz/flashcard, rispondere = XP
17. **AI Coaching** — (AI) Integrazione LLM per suggerimenti e review settimanali

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
