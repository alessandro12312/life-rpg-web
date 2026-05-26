"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Star, Shield, Zap, Sparkles, Brain } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

interface BuffsTrackerProps {
  characterClass: string;
  currentStreak: number;
}

interface SkillInfo {
  name: string;
  type: "Attiva" | "Passiva";
  description: string;
  cost?: string;
  icon: React.ReactNode;
}

export function BuffsTracker({ characterClass = "Novice", currentStreak = 0 }: BuffsTrackerProps) {
  const [activeTab, setActiveTab] = useState<"buffs" | "skills">("buffs");

  const normalizedClass = characterClass.toLowerCase();

  // Determine class skills
  const getSkills = (): SkillInfo[] => {
    if (normalizedClass.includes("mago") || normalizedClass.includes("mage")) {
      return [
        { name: "Mente Arcana", type: "Passiva", description: "+10% guadagno INT durante le sessioni di studio.", icon: <Brain className="w-4 h-4 text-blue-400" /> },
        { name: "Dardo di Fuoco", type: "Attiva", description: "Scaglia dardi magici infliggendo elevato danno magico.", cost: "15 Mana", icon: <Flame className="w-4 h-4 text-orange-400" /> },
        { name: "Scudo di Mana", type: "Attiva", description: "Usa il mana per bloccare il danno in arrivo per 1 turno.", cost: "10 Mana", icon: <Shield className="w-4 h-4 text-cyan-400" /> },
        { name: "Rigenerazione", type: "Attiva", description: "Incanta se stessi curando HP gradualmente.", cost: "20 Mana", icon: <Sparkles className="w-4 h-4 text-emerald-400" /> },
      ];
    }
    if (normalizedClass.includes("guerriero") || normalizedClass.includes("warrior")) {
      return [
        { name: "Tempra del Titano", type: "Passiva", description: "+10% guadagno STR e END durante gli allenamenti.", icon: <Shield className="w-4 h-4 text-amber-500" /> },
        { name: "Attacco di Potenza", type: "Attiva", description: "Un fendente devastante con alta possibilità di colpo critico.", cost: "10 Mana", icon: <Zap className="w-4 h-4 text-red-400" /> },
        { name: "Muro di Ferro", type: "Attiva", description: "Raddoppia la difesa e contrattacca all'attacco nemico.", cost: "8 Mana", icon: <Shield className="w-4 h-4 text-blue-400" /> },
        { name: "Grido di Guerra", type: "Attiva", description: "Aumenta la velocità e la forza di attacco temporaneamente.", cost: "12 Mana", icon: <Sparkles className="w-4 h-4 text-orange-400" /> },
      ];
    }
    if (normalizedClass.includes("ranger") || normalizedClass.includes("rogue") || normalizedClass.includes("ladro")) {
      return [
        { name: "Passo Rapido", type: "Passiva", description: "+10% guadagno Focus e Discipline nel Sanctum.", icon: <Sparkles className="w-4 h-4 text-green-400" /> },
        { name: "Tiro Rapido", type: "Attiva", description: "Scaglia due frecce in rapida successione.", cost: "12 Mana", icon: <Zap className="w-4 h-4 text-yellow-400" /> },
        { name: "Frecce Tossiche", type: "Attiva", description: "Infetta il boss infliggendo danni nel tempo.", cost: "15 Mana", icon: <Flame className="w-4 h-4 text-purple-400" /> },
        { name: "Schivata Riflessa", type: "Attiva", description: "Aumenta notevolmente la probabilità di evitare colpi nemici.", cost: "8 Mana", icon: <Shield className="w-4 h-4 text-emerald-400" /> },
      ];
    }

    // Default / Novice
    return [
      { name: "Spirito Libero", type: "Passiva", description: "+5% XP extra su tutte le quest completate.", icon: <Star className="w-4 h-4 text-yellow-400" /> },
      { name: "Attacco Base", type: "Attiva", description: "Colpo standard con la spada.", cost: "5 Mana", icon: <Zap className="w-4 h-4 text-foreground/60" /> },
      { name: "Parata", type: "Attiva", description: "Dimezza il danno del prossimo attacco nemico.", cost: "5 Mana", icon: <Shield className="w-4 h-4 text-foreground/60" /> },
    ];
  };

  const skills = getSkills();
  const streakBonus = currentStreak > 0 ? Math.min(20, currentStreak * 2) : 0;

  return (
    <GlassCard className="p-5 relative overflow-hidden" hoverEffect={false}>
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header and tab switcher */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-bold text-foreground/90 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Class Buffs & Skills
          </h3>
          <p className="text-xs text-foreground/40 mt-0.5">I tuoi poteri attivi e passivi</p>
        </div>

        <div className="flex bg-surface/50 border border-surface-border rounded-lg p-1 text-[10px]">
          <button
            type="button"
            onClick={() => setActiveTab("buffs")}
            className={cn(
              "px-2.5 py-1 font-semibold rounded transition-all",
              activeTab === "buffs" ? "bg-primary text-[#09090b]" : "text-foreground/60 hover:text-foreground"
            )}
          >
            Buffs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("skills")}
            className={cn(
              "px-2.5 py-1 font-semibold rounded transition-all",
              activeTab === "skills" ? "bg-primary text-[#09090b]" : "text-foreground/60 hover:text-foreground"
            )}
          >
            Spellbook
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "buffs" ? (
          <motion.div
            key="buffs"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="space-y-3 min-h-[12.5rem] flex flex-col justify-center"
          >
            {/* Streak Buff */}
            <div className="bg-surface/30 border border-surface-border/50 rounded-xl p-3 flex gap-3 items-start relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent pointer-events-none" />
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 shrink-0">
                <Flame className={cn("w-4 h-4", currentStreak > 0 && "animate-pulse")} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-xs text-foreground/90">Streak Ardent Booster</h4>
                  {currentStreak > 0 && (
                    <span className="text-[9px] px-1.5 py-0.2 bg-orange-500/20 text-orange-400 font-bold rounded">ATTIVO</span>
                  )}
                </div>
                <p className="text-[10px] text-foreground/50 mt-0.5 leading-relaxed">
                  Hai mantenuto una streak di {currentStreak} giorni. Guadagni il{" "}
                  <span className="text-orange-400 font-bold">+{streakBonus}% di XP</span> extra da ogni attività completata!
                </p>
              </div>
            </div>

            {/* Class Passive Buff */}
            <div className="bg-surface/30 border border-surface-border/50 rounded-xl p-3 flex gap-3 items-start relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                {skills.find((s) => s.type === "Passiva")?.icon || <Star className="w-4 h-4" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-xs text-foreground/90">
                    {skills.find((s) => s.type === "Passiva")?.name || "Abilità Passiva"}
                  </h4>
                  <span className="text-[9px] px-1.5 py-0.2 bg-primary/20 text-primary font-bold rounded">PASSIVA</span>
                </div>
                <p className="text-[10px] text-foreground/50 mt-0.5 leading-relaxed">
                  {skills.find((s) => s.type === "Passiva")?.description || "Bonus speciale legato alla tua classe."}
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="skills"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-2.5 min-h-[12.5rem]"
          >
            {/* List skills */}
            {skills
              .filter((s) => s.type === "Attiva")
              .map((skill) => (
                <div key={skill.name} className="flex items-start gap-2.5 p-2 rounded-lg border border-surface-border/40 bg-surface/10 hover:bg-surface/20 transition-all">
                  <div className="p-1.5 rounded bg-foreground/5 text-foreground/70 shrink-0">
                    {skill.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-foreground/80">{skill.name}</span>
                      {skill.cost && (
                        <span className="text-[9px] font-mono text-primary font-bold shrink-0">{skill.cost}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-foreground/40 mt-0.5 leading-relaxed">{skill.description}</p>
                  </div>
                </div>
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
