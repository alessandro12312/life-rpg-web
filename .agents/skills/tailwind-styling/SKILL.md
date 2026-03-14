---
name: Tailwind CSS & Styling Standards
description: Linee guida su come sviluppare UI "Aesthetic" di livello premium usando TailwindCSS, Shadcn e Framer Motion per Life RPG.
---

# UI/UX e Styling Aesthetics

Il prodotto è gamificato e "premium", quindi deve brillare ad impatto visivo. Nessuna estetica noiosa da cruscotto amministrativo. 

## 1. Tailwind UI (Colori e Componenti)
- Non definire colori HEX puri ad-hoc (eccetto per brand accenti temporanei). Il progetto fa largo uso delle CSS custom properties via `@apply` e configurate nel `tailwind.config`.
- Usa rigorosamente i design tokens:
  - Sfondi base: `bg-background`, layer sollevati: `bg-surface`.
  - Colori Testo: `text-foreground` (corpo), `text-primary` (titoli o accenti cruciali).
  - Colori brand: `primary` (orange/amber dominante per Level/XP), `accent` (cyan/teal dominante per i menu/wizard).
- Usa `backdrop-blur-md bg-surface/50` per box vetrati in stile **Glassmorphism**.

## 2. Helper `cn` e Shadcn/UI
- Ogniqualvolta devi fondere una stringa statica di classi con eventuali props condizionali passate via parent React, non usare mai i Template Literal puri (es. `className={\`flex px-2 \${props.class}\`}`). 
- Utilizza SEMPRE l'helper `cn(...)`:
  ```tsx
  import { cn } from "@/lib/utils";
  <div className={cn("base-classes rounded-md text-sm", props.className, {
    'bg-primary text-black': isActive,
    'bg-surface-border text-foreground/50': !isActive
  })} />
  ```
  Questo risolve a cascata conflitti di padding (`px-2 px-4`).

## 3. Micro-interazioni (Framer Motion)
- **Modali/Steps:** Le transizioni di pagina e gli Onboarding Wizard DEVONO essere wrapcati con `AnimatePresence` ed elementi `motion.div` con entrate fluid (es `opacity: 0, y: 10` a `opacity: 1, y: 0`).
- **Pulsanti:** Usa la classe utilities Tailwind `hover:scale-105 active:scale-95 transition-transform` o l'iconcina animata `group-hover:translate-x-1` invece di semplici cambi di background colore, per far sembrare il gioco "Reattivo e Fisico".

## 4. Dark Theme
- Di default la web app di Life RPG è orientata alle palette tematiche "Dark Mode" perché favorisce visibilità di neon glow ed XP Bars in Game. Non è attualmente supportato in `class` force il light-mode, e le utility come le barre XP usano shadow con colori primari luminosi `drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]`.
