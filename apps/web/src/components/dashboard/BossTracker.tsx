"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Skull, Shield, Star, RefreshCw, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

interface ActiveBattleInfo {
  battleId: string;
  bossId: string;
  status: string;
  mode: string;
}

interface BossDetails {
  id: string;
  name: string;
  description: string | null;
  type: string;
  tier: number;
  currentHp: number;
  maxHp: number;
  atk: number;
  def: number;
}

const TIER_STARS = (tier: number) => {
  return Array.from({ length: tier }).map((_, s) => (
    <Star key={s} className="w-3 h-3 text-red-500 fill-red-500 shrink-0" />
  ));
};

const TIER_COLORS = [
  "",
  "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "text-purple-400 bg-purple-500/10 border-purple-500/20",
  "text-orange-400 bg-orange-500/10 border-orange-500/20",
  "text-red-500 bg-red-500/10 border-red-500/20",
];

export function BossTracker() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeBattle, setActiveBattle] = useState<ActiveBattleInfo | null>(null);
  const [bossDetails, setBossDetails] = useState<BossDetails | null>(null);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [totalPhases, setTotalPhases] = useState(1);
  const [abandoning, setAbandoning] = useState(false);

  useEffect(() => {
    fetchActiveBattle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return {
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    };
  };

  const fetchActiveBattle = async () => {
    setLoading(true);
    const headers = await getHeaders();
    if (!headers) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/battle/active`, { headers });
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        if (data && data.battleId) {
          setActiveBattle(data);
          await fetchBattleDetails(data.battleId, headers);
        } else {
          setActiveBattle(null);
          setBossDetails(null);
        }
      }
    } catch (e) {
      console.error("Error fetching active battle in widget:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBattleDetails = async (battleId: string, headers: Record<string, string>) => {
    try {
      const res = await fetch(`${API_URL}/battle/${battleId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.boss) {
          setBossDetails(data.boss);
        }
        if (data.battle) {
          setCurrentPhase(data.battle.currentPhase || 1);
          setTotalPhases(data.battle.totalPhases || 1);
        }
      }
    } catch (e) {
      console.error("Error fetching battle details in widget:", e);
    }
  };

  const handleAbandon = async () => {
    if (!activeBattle) return;
    if (!confirm("Abbandonare la battaglia attiva? Perderai tutti i progressi accumulati in questa sessione.")) {
      return;
    }

    setAbandoning(true);
    const headers = await getHeaders();
    if (!headers) {
      setAbandoning(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/battle/${activeBattle.battleId}/abandon`, {
        method: "POST",
        headers,
      });

      if (res.ok) {
        setActiveBattle(null);
        setBossDetails(null);
      }
    } catch (e) {
      console.error("Error abandoning battle in widget:", e);
    } finally {
      setAbandoning(false);
    }
  };

  if (loading) {
    return (
      <GlassCard className="p-6 flex flex-col items-center justify-center min-h-[14rem]" hoverEffect={false}>
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-foreground/40 mt-3">{"Esplorando l'Arena..."}</p>
      </GlassCard>
    );
  }

  const hpPercent = bossDetails ? Math.max(0, (bossDetails.currentHp / bossDetails.maxHp) * 100) : 0;

  return (
    <GlassCard glow={!!bossDetails} glowColor="str" className="p-5 relative overflow-hidden" hoverEffect={false}>
      {/* Background ambient glow */}
      {bossDetails && (
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
      )}

      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-foreground/90 flex items-center gap-2">
            <Skull className={cn("w-5 h-5", bossDetails ? "text-red-500 animate-pulse" : "text-foreground/30")} />
            Boss Tracker
          </h3>
          <p className="text-xs text-foreground/40 mt-0.5">La tua sfida di combattimento corrente</p>
        </div>
        
        {bossDetails && (
          <button 
            onClick={fetchActiveBattle}
            className="p-1 rounded hover:bg-white/5 text-foreground/40 hover:text-foreground transition-colors"
            title="Ricarica Battaglia"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {bossDetails && activeBattle ? (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Header info */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <span className="font-bold text-sm text-foreground truncate max-w-[120px] sm:max-w-none">
                  {bossDetails.name}
                </span>
                <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border shrink-0", TIER_COLORS[bossDetails.tier] || TIER_COLORS[1])}>
                  Tier {bossDetails.tier}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-foreground/40">
                <div className="flex">{TIER_STARS(bossDetails.tier)}</div>
                <span>•</span>
                <span>Fase {currentPhase}/{totalPhases}</span>
                <span>•</span>
                <span className="capitalize">{activeBattle.mode.toLowerCase()}</span>
              </div>
            </div>

            {/* HP Bar */}
            <div>
              <div className="flex justify-between text-[10px] font-mono mb-1 text-foreground/50">
                <span>HP BOSS</span>
                <span>
                  {Math.ceil(bossDetails.currentHp)} / {bossDetails.maxHp}
                </span>
              </div>
              <div className="h-3 w-full bg-surface-border rounded-full overflow-hidden shadow-inner relative flex items-center justify-center">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${hpPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={cn(
                    "absolute left-0 top-0 bottom-0 rounded-full transition-all duration-300",
                    hpPercent > 50
                      ? "bg-gradient-to-r from-red-600/70 to-red-500"
                      : hpPercent > 20
                      ? "bg-gradient-to-r from-orange-600/70 to-orange-500"
                      : "bg-gradient-to-r from-rose-700/80 to-rose-600 animate-pulse"
                  )}
                />
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-foreground/60 bg-surface/20 border border-surface-border/40 rounded-lg p-2 font-mono">
              <span className="flex items-center gap-1">
                <Swords className="w-3 h-3 text-red-400" /> ATK: {bossDetails.atk}
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-blue-400" /> DEF: {bossDetails.def}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAbandon}
                disabled={abandoning}
                className="flex-1 py-2 text-xs font-semibold rounded-xl border border-red-500/20 bg-[#ef4444]/5 hover:bg-[#ef4444]/15 text-red-400 hover:border-red-500/30 transition-all flex items-center justify-center gap-1 active:scale-95"
              >
                <LogOut className="w-3 h-3" />
                Fuggi
              </button>

              <button
                type="button"
                onClick={() => router.push(`/battle/${activeBattle.battleId}`)}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-500 hover:to-orange-500 transition-all shadow-md shadow-red-500/10 hover:shadow-red-500/20 flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
              >
                <Swords className="w-3.5 h-3.5" />
                Combatti
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center justify-center py-4 text-center space-y-3"
          >
            <div className="w-10 h-10 rounded-full bg-surface-border text-foreground/30 flex items-center justify-center">
              <Skull className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-xs text-foreground/70">Nessuna minaccia attiva</p>
              <p className="text-[10px] text-foreground/40 mt-1 max-w-[200px] mx-auto leading-relaxed">
                {"L'Arena è silenziosa. Evoca un boss associato ai tuoi obiettivi per risvegliare il combattimento."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/battle")}
              className="py-1.5 px-4 text-[10px] font-bold rounded-lg border border-surface-border hover:border-primary/30 hover:bg-primary/10 text-primary transition-all active:scale-95 cursor-pointer"
            >
              {"Entra nell'Arena ⚔️"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
