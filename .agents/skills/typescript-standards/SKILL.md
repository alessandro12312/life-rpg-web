---
name: TypeScript Coding Guidelines
description: Best practices e standard per l'ecosistema TypeScript in Life RPG Web.
---

# TypeScript Standards

La rigorosità dei tipi di TypeScript in questo monorepo è essenziale per garantire stabilità tra DB (Supabase), Backend (NestJS) e Frontend (Next.js).

## Type Safety Assoluta
- **No `any`:** È severamente vietato utilizzare `any`. Se il tipo esatto è sconosciuto in fase di ricezione, utilizza `unknown` e definisci dei Type Guard o usa una validazione (es. Zod o `class-validator`).
- **Strict Null Checks:** TypeScript è configurato con `strict: true`. Bisogna sempre prevedere se il ritorno di un'API è potenzialmente `undefined` o `null` e gestirlo nel frontend.

## Interfacce vs Tipi
- **`interface`:** Da utilizzare sempre per definire contratti di API, modelli di classi di dominio, Props dei componenti React e state di Zustand. (Permettono l'estensione/declaration merging in modo pulito).
- **`type`:** Da usare per definire Union type (es. `type Category = "WORKOUT" | "STUDY"`), Tuple, Intersection, Utility Types (es. `Partial<T>`, `Omit<T, 'id'>`) o alias di primitive.

## File Organization & Export
- Nessun `export default` tranne che per File che lo richiedono esplicitamente (Page.tsx e Layout.tsx in Next.js).
- Usa gli export named: `export const MyComponent = ...` o `export class MyService ...`.

## Type Sharing (Monorepo)
- Se possibile, mantieni i file `.interface.ts` di payload di API in un formato portabile nel caso servano al Frontend, oppure rimodella il Supabase types (generati) sia sul backend che sul frontend.
