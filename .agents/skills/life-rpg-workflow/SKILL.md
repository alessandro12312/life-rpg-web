---
name: Sviluppo Feature Life RPG Web
description: Standard architetturale e workflow operativo per implementare nuove funzionalità full-stack nel SaaS gamificato "Life RPG Web".
---

# Obiettivo
Questo workflow definisce come tu (Agent) devi progettare e implementare una nuova feature nel progetto monorepo "Life RPG Web". Il progetto converte la produttività reale (studio, allenamento) in progressione RPG.

## Tech Stack
- **Database & Auth:** Supabase (PostgreSQL, RLS Policies libere in fase di alpha).
- **Backend API:** NestJS (`apps/api`).
- **Frontend App:** Next.js 14+ App Router (`apps/web`), Tailwind CSS, framer-motion, lucide-react.
- **State Management:** Zustand persistente nel LocalStorage (`apps/web/src/store/usePlayerStore.ts`).

## Workflow Operativo Passo-Passo

Quando ti viene chiesto di sviluppare una nuova feature (es. "Aggiungi la modalità Appunti con l'AI"), DEVI seguire rigorosamente questo ordine:

### 1. Database Schema (`apps/web/schema.sql`)
Ogni logica persistente parte da qui.
- Aggiungi o modifica tabelle usando sintassi idempotente (es. `CREATE TABLE IF NOT EXISTS`).
- Se introduci policy RLS, **usa SEMPRE `DROP POLICY IF EXISTS`** prima di ricrearle, per permettere al file di girare più volte senza crashare o duplicare.
- Chiedi all'utente di far girare lo script manualmente nella console Supabase (poiché la CLI locale attualmente non è linkata).

### 2. Backend Logic (NestJS - `apps/api`)
Tutta la logica di calcolo XP, Statistiche, Livelli e validazione deve stare qui.
- **Controller:** Esponi endpoint RESTful puliti (es. `apps/api/src/player/player.controller.ts`).
- **Service:** Implementa il business logic. Ad esempio, nel calcolo XP usa la curva esponenziale `XP_Next = 1000 * (L ^ 1.5)`. Calcola i bonus streak basandoti su `last_login_date`. Aggiorna db tramite modulo `@supabase/supabase-js` interno a NestJS.
- Risolvi proattivamente tutti gli errori di Type-checking. Assicurati che l'app compili (`npm run build --workspace=apps/api`).

### 3. Frontend Global State (Zustand)
Se la UI ha bisogno di cache immediata, aggiorna lo store.
- Vai in `apps/web/src/store/usePlayerStore.ts` e aggiungi metodi e tipizzazioni.
- Lo store serve come "Specchio" veloce per la UI, ma le chiamate API devono essere la singola fonte di verità (Single Source of Truth).

### 4. Frontend UI/UX (Next.js - `apps/web/src/app`)
Crea le interfacce per l'utente orientate all'aspetto RPG.
- Usa componenti di UI Shadcn (`@/components/ui/...`). In caso di file mancanti installali prima.
- Idrata i dati del client tramite l'id dell'utente (`usePlayerStore().userId` o `supabase.auth.getSession()`).
- Punta all'API locale (`http://localhost:3001/...`) per fetchare / inviare mutazioni.
- **Aesthetic focus:** Usa gradienti sfumati (`bg-gradient-radial`), blur (glassmorphism con `backdrop-blur-md`), dark mode (tema integrato), font leggibili e componenti animati (`AnimatePresence` di `framer-motion`).

## Gestione Porte in Dev
- Durante il dev, Next.js cerca di prendere la porta 3000. Se è occupata va sulla 3001 causando conflitti con NestJS. Assicurati sempre di uccidere i processi zombie sulla 3000 (`lsof -i :3000`) prima di fare `npm run dev:web`. Entrambi (dev:web e dev:api) devono convivere felici.
