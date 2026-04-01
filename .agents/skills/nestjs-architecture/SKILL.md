---
name: NestJS Backend Architecture Design
description: Best practices e linee guida metodologiche per scrivere API in apps/api con il framework NestJS del progetto Life RPG.
---

# NestJS API Standards

L'API del progetto `apps/api` (su porta 3001) è il motore di verità del gamification system e non confida nel client.

## 1. Struttura dei Moduli NestJS
Ogni domain deve possedere un modulo Nest separato. Attualmente il progetto ha:
- **`player`** — progressione (XP, livelli), streak, log attività, onboarding, skill tree, achievements, goals.
- **`sanctum`** — lobby multiplayer, focus timer sincronizzato, break, leave/host migration.
- **`guild`** — gilde permanenti, ruoli (Leader/Officer/Member), quest settimanali collettive, XP gilda.

Esempio struttura:
- `src/player/player.module.ts`: Espone service e importa SupabaseModule.
- `src/player/player.controller.ts`: Routing HTTP puro. **userId sempre da `req.user.id` (JWT), mai da URL param.**
- `src/player/player.service.ts`: Business Logic core.

## 2. Iniezione di Supabase
Il backend accede al Client Supabase globalmente fornito. Nel provider `SupabaseModule` il client si ottiene da `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` usando la Service Role. Le **RLS policies sono blindate** a `auth.uid() = user_id/id` su tutte le tabelle. Il backend usa la Service Role per oltrepassarle legittimamente.

## 3. Gestione HTTP & DTO (Data Transfer Objects)
Non accettare `payload: any` in un Web controller.
- Crea i file `domain_name.dto.ts`.
- Usa `@nestjs/swagger` se vogliamo esporre l'interfaccia (opzionale) e usa le property decoration.
- Fall-back immediato se il payload è corrotto senza far crasciare il Node context.
- Esempio corretto nel controller:
  ```typescript
  @Post('activity')
  async logActivity(@Req() req: any, @Body() dto: LogActivityDto) {
    return this.playerService.logActivity(req.user.id, dto); // ✅ userId dal JWT
  }
  ```

## 4. Anti-IDOR: userId SEMPRE dal JWT
- **MAI** accettare lo userId come parametro URL (`:id`). Usa sempre `req.user.id` estratto dal `SupabaseAuthGuard`.
- **MAI** fidarsi di ID inviati dal client nel body (es. `nextHostId`) senza validazione server-side. Verifica sempre che l'utente target esista nel DB.
- I dati sensibili (password lobby) vanno hashati con `bcrypt` prima del salvataggio.

## 5. Security Middleware (`main.ts`)
- **Helmet:** `app.use(helmet())` è attivo globalmente per impostare security headers HTTP (`X-Frame-Options`, `CSP`, `HSTS`).
- **CORS:** Configurato con `origin: process.env.CORS_ORIGIN || 'http://localhost:3000'` e `credentials: true`. **MAI** usare `enableCors()` senza parametri.
- **Rate Limiting:** `@nestjs/throttler` è configurato globalmente in `AppModule` (20 req/60s per IP). Il `ThrottlerGuard` è registrato come `APP_GUARD`.
- **Env Vars Obbligatorie:** La `SupabaseAuthGuard` lancia un errore fatale all'avvio se `SUPABASE_URL` o `SUPABASE_ANON_KEY` non sono configurate. **MAI** usare valori di fallback hardcoded.

## 6. Gestione Errori nei Service
- **MAI** usare `throw new Error(error.message)` nei service. Questo espone dettagli interni di Supabase al client.
- Usa sempre le eccezioni HTTP di NestJS: `InternalServerErrorException`, `NotFoundException`, `BadRequestException`, `ForbiddenException`.
- Esempio: `if (error) throw new InternalServerErrorException('Errore nel salvataggio dati');`

## 7. Single Responsibility e Prevenzione della Ridondanza (DRY)
- Quando un'azione genera logiche multipli (Es. Completare il pomodoro timer fa salire XP, check del Daily Quest completato, e aggiornamento Database), incapsula i task dentro sub-metodi privati nel servizio (es `private checkLevelUp(currentXp)`) o importa un service secondario (`QuestEngineService`). Così potrai richiamarlo ovunque e non scriverai codice TS ripetitivo.

## 8. Server-Authoritative State & Synchronization
Nei sistemi multiplayer soft-realtime (come le Lobby Sanctum), il Backend (NestJS) funge da sorgente di verità per i timer e gli stati condivisi. Salva sempre timestamp (`started_at`, `status`) nel DB anziché affidarti a socket custom. La sincronizzazione si ottiene delegando il broadcast al database (Postgres Changes via Supabase Realtime). Questo azzera i consumi WebSocket lato NestJS e garantisce perfetta parità temporale.
