---
name: NestJS Backend Architecture Design
description: Best practices e linee guida metodologiche per scrivere API in apps/api con il framework NestJS del progetto Life RPG.
---

# NestJS API Standards

L'API del progetto `apps/api` (su porta 3001) è il motore di verità del gamification system e non confida nel client.

## 1. Struttura dei Moduli NestJS
Ogni domain "Game"/"SaaS" (es. Profilo Personaggio giocatore = `player`, Sistema Abilità = `skills`, Motore Diario Appunti = `grimoire`) deve possedere un modulo Nest separato, generato formalmente.
- `src/domain_name/domain_name.module.ts`: Espone i service e importa dipendenze (es. SupabaseModule).
- `src/domain_name/domain_name.controller.ts`: Interfacciamento HTTP puro (Rotote, Metodi POST/GET, Parsing Parametri, Restituzione JSON code). Nessuna logica RPG matematica vive in questo strato.
- `src/domain_name/domain_name.service.ts`: La Business Logic "Core". I calcoli matematici XP, formule di level-up stat, e call DTO dirette via `@supabase/supabase-js`.

## 2. Iniezione di Supabase
Data la nostra architettura RLS, il backend accede al Client Supabase globalmente fornito per manipolare dati. Nel provider Supabase (es. modulo `SupabaseModule` condiviso) il client si ottiene da `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` iniettando la Service Role per oltrepassare le policy utente *se si fanno calcoli API backend sicuri* oppure con il solo anon-key e autorizzazione header per mantenere le RLS dell'utente. *Attualmente, le politiche sono libere (MVP), ma tienilo presente.*

## 3. Gestione HTTP & DTO (Data Transfer Objects)
Non accettare `payload: any` in un Web controller.
- Crea i file `domain_name.dto.ts`.
- Usa `@nestjs/swagger` se vogliamo esporre l'interfaccia (opzionale) e usa le property decoration.
- Fall-back immediato se il payload è corrotto senza far crasciare il Node context.
- Esempio corretto nel controller:
  ```typescript
  @Post(':id/activity')
  async logActivity(@Param('id') userId: string, @Body() logDetailsDto: LogDetailsDto) {
    if (!userId) throw new BadRequestException('User ID is required');
    return await this.playerService.logActivity(userId, logDetailsDto);
  }
  ```

## 4. Single Responsibility e Prevenzione della Ridondanza (DRY)
- Quando un'azione genera logiche multipli (Es. Completare il pomodoro timer fa salire XP, check del Daily Quest completato, e aggiornamento Database), incapsula i task dentro sub-metodi privati nel servizio (es `private checkLevelUp(currentXp)`) o importa un service secondario (`QuestEngineService`). Così potrai richiamarlo ovunque e non scriverai codice TS ripetitivo.
