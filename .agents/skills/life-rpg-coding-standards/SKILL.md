---
name: Life RPG Coding Standards
description: Regole di codifica, formattazione e best practices architetturali per il monorepo Next.js e NestJS "Life RPG Web".
---

# Obiettivo
Questa skill definisce le regole di stile del codice (Coding Standards) che *devi* applicare in ogni momento durante lo sviluppo del SaaS "Life RPG Web". La coerenza della base di codice è fondamentale per l'architettura.

## 1. Regole TypeScript & Naming Conventions
- **Strict Typing:** Usa *sempre* tipi espliciti. Evita il tipo `any`. Definisci interfacce (preferite) o tipi per tutte le Props React, le Response API, e i Payload DTO in NestJS.
- **Naming:**
  - `camelCase` per variabili, funzioni e metodi (es. `calculateXpGain`, `userStats`).
  - `PascalCase` per Classi, Componenti React, Interfacce, Type e File di componenti (es. `PlayerStore`, `DashboardPage.tsx`).
  - `SCREAMING_SNAKE_CASE` per costanti di configurazione globali (es. `MAX_LEVEL_CAP`, `BASE_XP_YIELD`).
  - `snake_case` in modo rigoroso **SOLO nel database PostgreSQL** (Supabase) per nomi tabelle e colonne (es. `user_skills`, `xp_current`). Il backend NestJS deve mappare il `snake_case` del database nel `camelCase` del TypeScript.

## 2. Frontend (Next.js App Router & React)
- **"use client" vs Server Components:** Usa "use client" solo nei componenti che necessitano di interattività o Hook (`useState`, `useEffect`, `framer-motion`, Zustand). Lascia tutti gli altri componenti come Server Components di default per migliorare le performance.
- **Clean Components:** Mantieni i componenti brevi. Se la funzione `return` (JSX) inizia a diventare profonda o complessa, scomponila in micro-componenti nella directory `components/`.
- **Styling (Tailwind CSS):** 
  - Usa le classi di utility di Tailwind in linea.
  - Per unioni complesse o logiche condizionali di classi, usa la utility `cn()` basata su `clsx` e `tailwind-merge` proveniente da `@/lib/utils`.
- **Aesthetics First:** Usa scale di colore personalizzate o del tema (`text-primary`, `bg-surface`), aggiungi transizioni fluide (`transition-all duration-300`), evita di usare i colori di default brutti del browser. I pulsanti dovrebbero avere stati interattivi multipli (hover, focus, disabilitati).

## 3. Backend (NestJS)
- **Dependency Injection:** Le logiche pesanti (calcoli matematici RPG) vanno nei `*.service.ts`, MAI nei `*.controller.ts`. Il controller è responsabile solo di reindirizzare le chiamate e validare i Payload di base.
- **DTOs:** Definisci classi Data Transfer Object usando `class-validator` per validare strettamente gli Input delle API prima che tocchino la logica di Business.
- **Gestione Errori:** Non lanciare `throw new Error(...)` grezzi. Usa le eccezioni HTTP di NestJS (es. `NotFoundException`, `BadRequestException`) cosicché il client Next.js riceva sempre risposte formattate e pulite per l'utente.

## 4. Gestione Stato (Zustand)
- Le mutazioni asincrone pesanti stanno nel Backend. Lo store locale in Next.js serve come cache di specchio rapida.
- Mantieni tipizzato l'intero Store con le interfacce per lo Stato e le Action.

## 5. Commenti e Documentazione
- Aggiungi commenti in stile JSDoc per i metodi `public` principali nei Servizi (*es. la formula matematica per il Livellamento in PlayerService*).
- Spiega il "Perché" nei commenti complessi, non il "Cosa" (il codice dice già cosa sta facendo).
- Mantieni un repository pulito: evita file con codice morto o "placeholder". Rimuovi i `console.log()` non destinati al debug in background.
