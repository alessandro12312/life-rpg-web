---
name: Next.js Ecosystem Guidelines
description: Pattern e standard architetturali specifici per Next.js (App Router) e React nel progetto Life RPG Web.
---

# Next.js App Router (v14+) Standards

Il Frontend in `apps/web` si basa sulle nuove funzionalità del React Server Components (RSC) per l'ottimizzazione e il rendering.

## 1. Server Components vs Client Components
- **Server Components (Default):** Qualsiasi file dentro `app/` senza direttive, è un Server Component. Essi hanno accesso diretto al backend ma non possono usare React Hook (es. `useState`, `useEffect`) né aggiungere listener di eventi (`onClick`). Usa i Server Components per Layouts, le view di sola lettura e per caricare dati strutturati per il SEO iniziale.
- **Client Components (`"use client"`):** Metti questa stringa alla linea 1 SOLO per file che richiedono iterazione dell'utente (`button` con logica onClick), form processing, librerie UI hook-based (come Framer Motion o Zustand) o gestione dello stato locale con `useState`/`usePlayerStore`.
- **Composizione Intelligente:** Spingi il `"use client"` *il più in basso possibile nell'albero*. Non mettere un intero layout in un Client Component se a te serve solo far diventare "interattivo" un singolo bottone presente nell'header.

## 2. Pagine & Layout
- `page.tsx` è il punto d'ingresso per la rotta.
- `layout.tsx` è il wrapper della rotta. Non fetchare dati utente sensibili nei layout globali se le pagine figlie hanno policy diverse o bloccano la renderizzazione. 

## 3. Data Fetching
- Su componenti "Client", usa il classico `fetch` nel `useEffect` combinato allo store `usePlayerStore` (Zustand), specialmente per i fetch in polling, o dopo action dell'utente.
- **URL API centralizzato:** Importa sempre `API_URL` da `@/lib/api` per le chiamate al backend. **MAI** hardcodare `http://localhost:3001` nei componenti. Esempio: `` fetch(`${API_URL}/player/me`, { ... }) ``.
- Su componenti "Server", usa fetch async diretti nel componente RSC con revalidate, sebbene la comunicazione Life RPG faccia per lo più uso di mutazioni client-side a causa delle interazioni frequenti di Gamification (aggiunta XP, level up animato in tempo reale).

## 4. Gestione Autenticazione & Stato
- **Supabase Session:** Supabase Auth viene agganciata nel layer client (`useEffect` in root page/layout). Esegue i push ai path reindirizzati (`router.push('/login')`) se la `session` non è presente.
- **Zustand (`usePlayerStore`):** Serve a riflettere istantaneamente lo stato dell'utente RPG persistito lato server, garantendo fluidità senza delay e skeleton loaders per l'UI.

## 5. Supabase Realtime & SPA Cleanup (Anti-Ghosting)
- Nelle App Router (SPA), la navigazione tra pagine (con `<Link>`) **non scatena** l'evento browser `beforeunload`. Per disconnettersi correttamente dal server (es. uscire da stanze multiplayer e prevenire lobby orfane), unisci un blocco `return` nel `useEffect` del component unmount insieme al `window.addEventListener('beforeunload')` per coprire le chiusure tab. Fai attenzione ad usare reference affidabili e Fetch con `keepalive: true`!

## 6. Navigazione vs Stato Locale (UI Consistency)
- **Evita false navigazioni locali:** Non svuotare stati locali (es. `onLeave={() => setMyGuild(null)}`) per simulare un "tasto Indietro" se tale azione espone l'utente a schermate che non dovrebbe vedere (come la ricerca gilde quando l'utente è già in una gilda nel backend).
- Usa sempre il vero routing (es. `useRouter().push('/')` da `next/navigation`) per uscire da interfacce esclusive. Il rendering condizionale della pagina deve riflettere la Source of Truth del server, prevenendo inconsistenze tra client e backend.
