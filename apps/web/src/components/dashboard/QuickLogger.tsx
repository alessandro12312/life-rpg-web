"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, BookOpen, Activity, Brain, Heart, Check, Flame } from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { applyActivityResponse } from "@/lib/triggerActivityAnimation";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

interface ActivityPreset {
  name: string;
  category: "STUDY" | "WORKOUT" | "MIXED";
  statType: "intelligence" | "strength" | "endurance" | "focus" | "health";
  duration: number;
  icon: React.ReactNode;
}

const PRESETS: ActivityPreset[] = [
  { name: "Lettura/Studio", category: "STUDY", statType: "intelligence", duration: 30, icon: <BookOpen className="w-4 h-4" /> },
  { name: "Lavoro Focalizzato", category: "STUDY", statType: "focus", duration: 45, icon: <Brain className="w-4 h-4" /> },
  { name: "Allenamento Forza", category: "WORKOUT", statType: "strength", duration: 60, icon: <Swords className="w-4 h-4" /> },
  { name: "Cardio/Corsa", category: "WORKOUT", statType: "endurance", duration: 30, icon: <Activity className="w-4 h-4" /> },
  { name: "Meditazione/Sonno", category: "MIXED", statType: "health", duration: 15, icon: <Heart className="w-4 h-4" /> },
];

export function QuickLogger() {
  const { userId } = usePlayerStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [customTitle, setCustomTitle] = useState("");
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState(1.0);
  const [showCustom, setShowCustom] = useState(false);

  const currentPreset = PRESETS[selectedPresetIdx];

  const handleLogActivity = async () => {
    if (!userId) return;
    setLoading(true);

    const title = showCustom ? (customTitle.trim() || "Attività Rapida") : currentPreset.name;
    const category = showCustom ? "MIXED" : currentPreset.category;
    const statType = showCustom ? "health" : currentPreset.statType;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/player/activity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          category,
          custom_name: title,
          duration_minutes: duration,
          stat_type: statType,
          intensity_multiplier: intensity,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        applyActivityResponse(data);
        setSuccess(true);
        setCustomTitle("");
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (e) {
      console.error("Error logging quick activity:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard glow glowColor="accent" className="p-5 relative overflow-hidden" hoverEffect={false}>
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-foreground/90 flex items-center gap-2">
            <Flame className="w-5 h-5 text-accent animate-pulse" />
            Quick Logger
          </h3>
          <p className="text-xs text-foreground/40 mt-0.5">Registra al volo le tue attività giornaliere</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center py-6 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <Check className="w-6 h-6 animate-bounce" />
            </div>
            <p className="font-bold text-sm text-emerald-400">Quest Completata!</p>
            <p className="text-xs text-foreground/50 mt-1">XP e Statistiche sincronizzate con la Gilda</p>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Mode Switcher */}
            <div className="flex bg-surface/50 border border-surface-border rounded-lg p-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowCustom(false);
                  setDuration(PRESETS[selectedPresetIdx].duration);
                }}
                className={cn(
                  "flex-1 py-1 font-semibold rounded-md transition-all",
                  !showCustom ? "bg-accent text-[#09090b]" : "text-foreground/60 hover:text-foreground"
                )}
              >
                Preset
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCustom(true);
                  setDuration(30);
                }}
                className={cn(
                  "flex-1 py-1 font-semibold rounded-md transition-all",
                  showCustom ? "bg-accent text-[#09090b]" : "text-foreground/60 hover:text-foreground"
                )}
              >
                Personalizzato
              </button>
            </div>

            {!showCustom ? (
              /* Presets selector */
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((preset, idx) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setSelectedPresetIdx(idx);
                      setDuration(preset.duration);
                    }}
                    className={cn(
                      "flex items-center gap-2 p-2 text-left rounded-xl border text-xs transition-all",
                      selectedPresetIdx === idx
                        ? "border-accent/40 bg-accent/10 text-accent font-semibold"
                        : "border-surface-border bg-surface/20 hover:bg-surface/40 text-foreground/70 hover:text-foreground"
                    )}
                  >
                    <span className={cn(selectedPresetIdx === idx ? "text-accent" : "text-foreground/40")}>
                      {preset.icon}
                    </span>
                    <span className="truncate">{preset.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              /* Custom input */
              <div className="space-y-2">
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Es: Corsa 5km, Lettura..."
                  className="w-full bg-background border border-surface-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent/50 placeholder-foreground/30 text-foreground"
                />
              </div>
            )}

            {/* Duration and Intensity */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-foreground/50 mb-1">Durata (minuti)</label>
                <div className="flex items-center bg-background border border-surface-border rounded-xl px-3 py-1.5">
                  <input
                    type="number"
                    min="1"
                    value={duration}
                    onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-transparent border-none text-foreground outline-none text-center font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-foreground/50 mb-1">Intensità</label>
                <select
                  value={intensity}
                  onChange={(e) => setIntensity(parseFloat(e.target.value))}
                  className="w-full bg-background border border-surface-border rounded-xl px-2 py-2 outline-none text-foreground"
                >
                  <option value={0.8}>Leggera (x0.8)</option>
                  <option value={1.0}>Media (x1.0)</option>
                  <option value={1.5}>Intensa (x1.5)</option>
                </select>
              </div>
            </div>

            {/* Quick Duration Adders */}
            <div className="flex gap-2 justify-between">
              {[15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDuration(mins)}
                  className={cn(
                    "flex-1 py-1 rounded-md border text-[10px] font-mono transition-all",
                    duration === mins
                      ? "border-accent bg-accent/10 text-accent font-bold"
                      : "border-surface-border bg-surface/10 text-foreground/40 hover:text-foreground"
                  )}
                >
                  {mins}m
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleLogActivity}
              disabled={loading || (showCustom && !customTitle.trim())}
              className={cn(
                "w-full py-2.5 rounded-xl text-xs font-bold text-[#09090b] transition-all relative overflow-hidden flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-md",
                loading || (showCustom && !customTitle.trim())
                  ? "bg-accent/40 cursor-not-allowed text-[#09090b]/50"
                  : "bg-accent hover:bg-accent/90 shadow-accent/10"
              )}
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-[#09090b] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Log Attività ⚔️
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
