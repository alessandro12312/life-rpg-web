"use client";

import { motion, AnimatePresence, useAnimation } from "framer-motion";
import {
  Swords, Shield, Heart, Droplets, Star, ArrowLeft, Skull,
  Zap, FlaskConical, ShieldAlert, Sparkles, Trophy, X
} from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api";
import { useBattleStore, AnimationEvent } from "@/store/useBattleStore";

// ─── Floating Damage Number ─────────────────────────────────────────────────
function FloatingNumber({ value, type, onComplete }: {
  value: number; type: 'damage' | 'heal' | 'miss'; onComplete: () => void;
}) {
  const color = type === 'heal' ? 'text-emerald-400' : type === 'miss' ? 'text-gray-400' : 'text-red-400';
  const prefix = type === 'heal' ? '+' : type === 'miss' ? '' : '-';
  const text = type === 'miss' ? 'MISS!' : `${prefix}${value}`;

  return (
    <motion.div
      className={`absolute text-3xl font-black ${color} pointer-events-none z-50`}
      style={{ textShadow: '0 0 20px currentColor, 0 2px 4px rgba(0,0,0,0.8)' }}
      initial={{ opacity: 1, y: 0, scale: 0.5 }}
      animate={{ opacity: 0, y: -80, scale: 1.2 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      onAnimationComplete={onComplete}
    >
      {text}
    </motion.div>
  );
}

// ─── HP Bar Component ───────────────────────────────────────────────────────
function HPBar({ current, max, label, color, icon }: {
  current: number; max: number; label: string; color: string; icon: React.ReactNode;
}) {
  const percent = Math.max(0, Math.min(100, (current / max) * 100));
  const isLow = percent < 25;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 font-medium text-foreground/70">
          {icon} {label}
        </span>
        <span className="font-mono font-bold">
          <span className={isLow ? "text-red-400 animate-pulse" : ""}>{current}</span>
          <span className="text-foreground/40"> / {max}</span>
        </span>
      </div>
      <div className="h-3 w-full bg-surface-border/50 rounded-full overflow-hidden relative">
        <motion.div
          className={`h-full rounded-full ${color} relative`}
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
          {percent > 10 && (
            <div className="absolute top-0 bottom-0 right-0 w-4 bg-gradient-to-l from-white/40 to-transparent blur-sm" />
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ─── Skill Button ───────────────────────────────────────────────────────────
function SkillButton({ skill, disabled, onUse }: {
  skill: { id: string; name: string; description: string; manaCost: number; effectType: string };
  disabled: boolean;
  onUse: () => void;
}) {
  const effectColors: Record<string, string> = {
    DAMAGE: "from-red-600/20 to-red-900/10 border-red-500/30 hover:border-red-400/50",
    HEAL: "from-emerald-600/20 to-emerald-900/10 border-emerald-500/30 hover:border-emerald-400/50",
    BUFF: "from-blue-600/20 to-blue-900/10 border-blue-500/30 hover:border-blue-400/50",
    DEBUFF: "from-purple-600/20 to-purple-900/10 border-purple-500/30 hover:border-purple-400/50",
  };
  const colorClass = effectColors[skill.effectType] || effectColors.DAMAGE;

  return (
    <button
      onClick={onUse}
      disabled={disabled}
      className={`bg-gradient-to-r ${colorClass} border rounded-xl px-3 py-2 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 group`}
      title={skill.description}
    >
      <div className="text-xs font-bold truncate">{skill.name}</div>
      <div className="flex items-center gap-1 mt-0.5">
        <Droplets className="w-3 h-3 text-blue-400" />
        <span className="text-[10px] text-foreground/50">{skill.manaCost} MP</span>
      </div>
    </button>
  );
}

// ─── Main Battle Page ───────────────────────────────────────────────────────
export default function BattlePage() {
  const router = useRouter();
  const params = useParams();
  const battleId = params.id as string;

  const store = useBattleStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [floatingNumbers, setFloatingNumbers] = useState<Array<{
    id: string; value: number; type: 'damage' | 'heal' | 'miss'; target: 'PLAYER' | 'BOSS';
  }>>([]);
  const [screenShake, setScreenShake] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const arenaRef = useRef<HTMLDivElement>(null);

  // Player and boss sprite animation controls
  const playerControls = useAnimation();
  const bossControls = useAnimation();

  // ─── Auth + Load ────────────────────────────────────────────────────
  const getAuthHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return null; }
    return { "Authorization": `Bearer ${session.access_token}`, "Content-Type": "application/json" };
  }, [router]);

  const loadBattle = useCallback(async () => {
    const headers = await getAuthHeader();
    if (!headers) return;
    try {
      const res = await fetch(`${API_URL}/battle/${battleId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const { data: { session } } = await supabase.auth.getSession();
        store.setBattleFromServer(data, session!.user.id);
      }
    } catch (e) {
      console.error("Error loading battle:", e);
    } finally {
      setLoading(false);
      setMounted(true);
    }
  }, [battleId, getAuthHeader, store]);

  useEffect(() => {
    loadBattle();
    return () => { store.reset(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleId]);

  // ─── Animation Queue Processor ──────────────────────────────────────
  useEffect(() => {
    if (store.isAnimating || store.animationQueue.length === 0) return;

    const processNext = async () => {
      store.setAnimating(true);
      const event = store.consumeAnimation();
      if (!event) { store.setAnimating(false); return; }

      await playAnimation(event);

      // Small delay between animations
      await new Promise(r => setTimeout(r, 200));
      store.setAnimating(false);
    };

    processNext();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.animationQueue.length, store.isAnimating]);

  // Show result modal when battle ends
  useEffect(() => {
    if (store.status === 'VICTORY' || store.status === 'DEFEAT') {
      const timer = setTimeout(() => setShowResult(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [store.status]);

  const playAnimation = async (event: AnimationEvent) => {
    switch (event.type) {
      case 'PLAYER_ATTACK':
      case 'PLAYER_SKILL':
        await playerControls.start({
          x: [0, 60, 0],
          transition: { duration: 0.4, times: [0, 0.4, 1] },
        });
        break;

      case 'BOSS_ATTACK':
        await bossControls.start({
          x: [0, -60, 0],
          transition: { duration: 0.4, times: [0, 0.4, 1] },
        });
        break;

      case 'DAMAGE_NUMBER':
        addFloatingNumber(event.value || 0, event.isCritical ? 'damage' : 'damage', event.target || 'BOSS');
        if (event.isCritical) {
          triggerScreenShake();
        }
        await new Promise(r => setTimeout(r, 600));
        break;

      case 'HEAL_NUMBER':
        addFloatingNumber(event.value || 0, 'heal', event.target || 'PLAYER');
        await new Promise(r => setTimeout(r, 600));
        break;

      case 'MISS':
        addFloatingNumber(0, 'miss', event.target || 'BOSS');
        await new Promise(r => setTimeout(r, 600));
        break;

      case 'SCREEN_SHAKE':
        triggerScreenShake();
        await new Promise(r => setTimeout(r, 400));
        break;

      case 'PLAYER_DEFEND':
        await playerControls.start({
          scale: [1, 1.1, 1],
          transition: { duration: 0.4 },
        });
        await new Promise(r => setTimeout(r, 300));
        break;

      case 'PLAYER_ITEM':
        // Sparkle effect
        await new Promise(r => setTimeout(r, 400));
        break;

      case 'PHASE_TRANSITION':
        // Flash white
        triggerScreenShake();
        await new Promise(r => setTimeout(r, 1000));
        break;

      case 'VICTORY':
      case 'DEFEAT':
        await new Promise(r => setTimeout(r, 500));
        break;
    }
  };

  const addFloatingNumber = (value: number, type: 'damage' | 'heal' | 'miss', target: 'PLAYER' | 'BOSS') => {
    const id = `float_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    setFloatingNumbers(prev => [...prev, { id, value, type, target }]);
  };

  const removeFloatingNumber = (id: string) => {
    setFloatingNumbers(prev => prev.filter(f => f.id !== id));
  };

  const triggerScreenShake = () => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 400);
  };

  // ─── Submit Action ──────────────────────────────────────────────────
  const submitAction = async (action: string, skillId?: string, itemId?: string) => {
    if (actionLoading || !store.isPlayerTurn) return;
    setActionLoading(true);
    setShowSkills(false);
    setShowItems(false);

    const headers = await getAuthHeader();
    if (!headers) { setActionLoading(false); return; }

    try {
      const res = await fetch(`${API_URL}/battle/${battleId}/action`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action,
          ...(skillId && { skill_id: skillId }),
          ...(itemId && { item_id: itemId }),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        store.processTurnResponse(data);
      }
    } catch (e) {
      console.error("Error submitting action:", e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAbandon = async () => {
    const headers = await getAuthHeader();
    if (!headers) return;
    try {
      await fetch(`${API_URL}/battle/${battleId}/abandon`, { method: "POST", headers });
      router.push("/battle");
    } catch (e) {
      console.error(e);
    }
  };

  // ─── Derived State ──────────────────────────────────────────────────
  const currentPlayer = store.participants.find(p => p.userId === store.currentUserId);
  const boss = store.boss;
  const isActive = store.status === 'ACTIVE';
  const canAct = isActive && store.isPlayerTurn && !actionLoading && !store.isAnimating;
  const bossHpPercent = boss ? Math.max(0, (boss.currentHp / boss.maxHp) * 100) : 0;
  const playerHpPercent = currentPlayer ? Math.max(0, (currentPlayer.currentHp / currentPlayer.maxHp) * 100) : 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a12] text-foreground font-sans flex flex-col relative overflow-hidden">

      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a12] via-[#12081e] to-[#1a0a2e] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.08)_0%,transparent_70%)] pointer-events-none" />

      {/* Floating particles */}
      {mounted && Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-purple-500/30"
          style={{
            left: `${10 + Math.random() * 80}%`,
            top: `${20 + Math.random() * 60}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        />
      ))}

      {/* Top Bar */}
      <header className="relative z-20 flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={handleAbandon}
            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 transition-colors group"
            title="Abbandona"
          >
            <X className="w-4 h-4 text-foreground/50 group-hover:text-red-400" />
          </button>
          <div>
            <span className="text-xs text-foreground/40">Turno {store.turnNumber}</span>
            <span className="text-xs text-foreground/30 mx-1.5">·</span>
            <span className="text-xs text-foreground/40">Fase {store.currentPhase}/{store.totalPhases}</span>
          </div>
        </div>
        <div className={`text-xs font-bold px-3 py-1 rounded-full ${
          store.isPlayerTurn && isActive
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse"
            : !isActive
              ? "bg-foreground/10 text-foreground/40"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
        }`}>
          {!isActive
            ? store.status === 'VICTORY' ? '🏆 VITTORIA' : store.status === 'DEFEAT' ? '💀 SCONFITTA' : store.status
            : store.isPlayerTurn ? "⚔️ IL TUO TURNO" : "🐉 TURNO DEL BOSS"
          }
        </div>
      </header>

      {/* Boss HP Section */}
      <div className="relative z-10 px-4 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Skull className="w-4 h-4 text-red-400" />
            <span className="text-sm font-bold">{boss?.name || "Boss"}</span>
            <div className="flex items-center gap-0.5 ml-1">
              {Array.from({ length: boss?.tier || 1 }).map((_, s) => (
                <Star key={s} className="w-3 h-3 text-primary fill-primary" />
              ))}
            </div>
          </div>
          <span className="text-xs font-mono text-foreground/50">
            {boss?.currentHp || 0} / {boss?.maxHp || 0}
          </span>
        </div>
        <div className="h-4 w-full bg-surface-border/30 rounded-full overflow-hidden relative">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 relative"
            initial={false}
            animate={{ width: `${bossHpPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
            <motion.div
              className="absolute top-0 bottom-0 right-0 w-6 bg-gradient-to-l from-white/50 to-transparent blur-sm"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
          {/* Phase markers */}
          {store.totalPhases > 1 && Array.from({ length: store.totalPhases - 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-0.5 bg-white/30"
              style={{ left: `${((i + 1) / store.totalPhases) * 100}%` }}
            />
          ))}
        </div>
      </div>

      {/* Battle Arena */}
      <motion.div
        ref={arenaRef}
        className="relative z-10 flex-1 flex items-center justify-center px-4 min-h-[280px]"
        animate={screenShake ? {
          x: [0, 8, -8, 6, -6, 4, -4, 0],
          transition: { duration: 0.4 }
        } : {}}
      >
        {/* Player Sprite */}
        <motion.div
          animate={playerControls}
          className="absolute left-[15%] sm:left-[20%] bottom-[20%] flex flex-col items-center"
        >
          <div className="relative">
            {/* Defending Shield */}
            <AnimatePresence>
              {currentPlayer?.isDefending && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute -inset-4 rounded-full border-2 border-cyan-400/50 bg-cyan-400/10 z-10"
                />
              )}
            </AnimatePresence>

            {/* Player Avatar */}
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 ${
              (currentPlayer?.currentHp || 0) <= 0
                ? "border-gray-600 grayscale opacity-50"
                : "border-emerald-500/50"
            } bg-surface/80 backdrop-blur-sm flex items-center justify-center overflow-hidden shadow-xl shadow-emerald-500/10`}>
              {currentPlayer?.avatarId ? (
                <img
                  src={`/avatars/${currentPlayer.avatarId}.png`}
                  className="w-full h-full object-cover"
                  alt="Player"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <Swords className="w-8 h-8 text-emerald-400" />
              )}
            </div>

            {/* Player floating damage numbers */}
            {floatingNumbers.filter(f => f.target === 'PLAYER').map(f => (
              <FloatingNumber
                key={f.id}
                value={f.value}
                type={f.type}
                onComplete={() => removeFloatingNumber(f.id)}
              />
            ))}
          </div>
          <span className="text-xs font-bold mt-2 text-foreground/70">{currentPlayer?.username || "Tu"}</span>
        </motion.div>

        {/* VS Divider */}
        <motion.div
          className="text-2xl font-black text-foreground/10 select-none z-0"
          animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          VS
        </motion.div>

        {/* Boss Sprite */}
        <motion.div
          animate={bossControls}
          className="absolute right-[15%] sm:right-[20%] bottom-[20%] flex flex-col items-center"
        >
          <div className="relative">
            {/* Boss Avatar */}
            <motion.div
              className={`w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-2 ${
                (boss?.currentHp || 0) <= 0
                  ? "border-gray-600 grayscale opacity-50"
                  : "border-red-500/50"
              } bg-surface/80 backdrop-blur-sm flex items-center justify-center overflow-hidden shadow-xl shadow-red-500/10`}
              animate={isActive && (boss?.currentHp || 0) > 0 ? {
                y: [0, -5, 0],
              } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Skull className={`w-12 h-12 sm:w-16 sm:h-16 ${(boss?.currentHp || 0) <= 0 ? "text-gray-500" : "text-red-400"}`} />
            </motion.div>

            {/* Boss glow */}
            {isActive && (boss?.currentHp || 0) > 0 && (
              <motion.div
                className="absolute -inset-3 rounded-2xl bg-red-500/10 blur-xl -z-10"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}

            {/* Boss floating damage numbers */}
            {floatingNumbers.filter(f => f.target === 'BOSS').map(f => (
              <FloatingNumber
                key={f.id}
                value={f.value}
                type={f.type}
                onComplete={() => removeFloatingNumber(f.id)}
              />
            ))}
          </div>
          <span className="text-xs font-bold mt-2 text-red-400/70">{boss?.name || "Boss"}</span>
        </motion.div>
      </motion.div>

      {/* Player Stats */}
      <div className="relative z-10 px-4 py-3 space-y-2 bg-gradient-to-t from-[#0a0a12] via-[#0a0a12]/90 to-transparent">
        <HPBar
          current={currentPlayer?.currentHp || 0}
          max={currentPlayer?.maxHp || 1}
          label="HP"
          color="bg-gradient-to-r from-emerald-600 to-cyan-500"
          icon={<Heart className="w-3.5 h-3.5 text-emerald-400" />}
        />
        <HPBar
          current={currentPlayer?.mana || 0}
          max={currentPlayer?.maxMana || 1}
          label="MP"
          color="bg-gradient-to-r from-blue-600 to-purple-500"
          icon={<Droplets className="w-3.5 h-3.5 text-blue-400" />}
        />
      </div>

      {/* Action Menu */}
      <div className="relative z-20 px-4 pb-6 pt-2 bg-[#0a0a12]">
        {/* Main Actions */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <button
            onClick={() => submitAction('ATTACK')}
            disabled={!canAct}
            className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 group"
          >
            <Swords className="w-5 h-5 text-red-400 group-hover:text-red-300" />
            <span className="text-[10px] font-bold text-red-400/80 uppercase tracking-wider">Attacco</span>
          </button>

          <button
            onClick={() => { setShowSkills(!showSkills); setShowItems(false); }}
            disabled={!canAct}
            className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 group ${
              showSkills
                ? "bg-purple-500/20 border-purple-500/40"
                : "bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/40"
            }`}
          >
            <Sparkles className="w-5 h-5 text-purple-400 group-hover:text-purple-300" />
            <span className="text-[10px] font-bold text-purple-400/80 uppercase tracking-wider">Skill</span>
          </button>

          <button
            onClick={() => submitAction('DEFEND')}
            disabled={!canAct}
            className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 hover:border-cyan-500/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 group"
          >
            <ShieldAlert className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300" />
            <span className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-wider">Difesa</span>
          </button>

          <button
            onClick={() => { setShowItems(!showItems); setShowSkills(false); }}
            disabled={!canAct}
            className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 group ${
              showItems
                ? "bg-amber-500/20 border-amber-500/40"
                : "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40"
            }`}
          >
            <FlaskConical className="w-5 h-5 text-amber-400 group-hover:text-amber-300" />
            <span className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider">Oggetto</span>
          </button>
        </div>

        {/* Skills Panel */}
        <AnimatePresence>
          {showSkills && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-2">
                {store.availableSkills.map(skill => (
                  <SkillButton
                    key={skill.id}
                    skill={skill}
                    disabled={!canAct || (currentPlayer?.mana || 0) < skill.manaCost}
                    onUse={() => submitAction('SKILL', skill.id)}
                  />
                ))}
                {store.availableSkills.length === 0 && (
                  <p className="col-span-full text-xs text-foreground/30 text-center py-3">
                    Nessuna abilità disponibile
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Items Panel */}
        <AnimatePresence>
          {showItems && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-2">
                {store.inventory.map(item => (
                  <button
                    key={item.itemId}
                    onClick={() => submitAction('ITEM', undefined, item.itemId)}
                    disabled={!canAct || item.quantity <= 0}
                    className="bg-gradient-to-r from-amber-600/20 to-amber-900/10 border border-amber-500/30 rounded-xl px-3 py-2 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 hover:border-amber-400/50"
                    title={item.description}
                  >
                    <div className="text-xs font-bold truncate">{item.name}</div>
                    <div className="text-[10px] text-foreground/50 mt-0.5">x{item.quantity}</div>
                  </button>
                ))}
                {store.inventory.length === 0 && (
                  <p className="col-span-full text-xs text-foreground/30 text-center py-3">
                    Inventario vuoto
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Battle Log */}
        <div className="mt-2 max-h-24 overflow-y-auto bg-white/[0.02] rounded-xl border border-white/5 p-2.5 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
          {store.battleLogs.slice(0, 8).map((log, i) => (
            <div key={i} className="text-[11px] text-foreground/50 flex items-start gap-1.5">
              <span className="text-foreground/20 font-mono text-[10px] shrink-0">T{log.turnNumber}</span>
              <span className={
                log.actorType === 'BOSS' ? 'text-red-400/70' :
                log.isCritical ? 'text-yellow-400/70 font-bold' :
                'text-foreground/50'
              }>
                {log.narrative}
              </span>
            </div>
          ))}
          {store.battleLogs.length === 0 && (
            <div className="text-[11px] text-foreground/20 text-center">La battaglia è iniziata...</div>
          )}
        </div>
      </div>

      {/* Result Modal */}
      <AnimatePresence>
        {showResult && (store.status === 'VICTORY' || store.status === 'DEFEAT') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
              className={`w-full max-w-md rounded-2xl border p-8 text-center space-y-6 shadow-2xl ${
                store.status === 'VICTORY'
                  ? "bg-gradient-to-b from-yellow-900/30 to-surface border-yellow-500/30"
                  : "bg-gradient-to-b from-red-900/30 to-surface border-red-500/30"
              }`}
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2, damping: 10, stiffness: 200 }}
              >
                {store.status === 'VICTORY' ? (
                  <Trophy className="w-20 h-20 text-yellow-400 mx-auto" />
                ) : (
                  <Skull className="w-20 h-20 text-red-400 mx-auto" />
                )}
              </motion.div>

              <div>
                <h2 className={`text-3xl font-black ${
                  store.status === 'VICTORY' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {store.status === 'VICTORY' ? 'VITTORIA!' : 'SCONFITTA'}
                </h2>
                <p className="text-sm text-foreground/50 mt-2">
                  {store.status === 'VICTORY'
                    ? `Hai sconfitto ${boss?.name || 'il Boss'}!`
                    : `${boss?.name || 'Il Boss'} ti ha sconfitto...`
                  }
                </p>
              </div>

              {/* Rewards */}
              {store.rewards && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Star className="w-5 h-5 text-primary" />
                    <span className="text-xl font-bold text-primary">
                      +{store.rewards.xpAwarded} XP
                    </span>
                    {store.rewards.bonusXp > 0 && (
                      <span className="text-xs text-emerald-400 font-medium">
                        (+{store.rewards.bonusXp} bonus)
                      </span>
                    )}
                  </div>

                  {store.rewards.lootDrops.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs text-foreground/40 uppercase tracking-wider">Bottino</span>
                      {store.rewards.lootDrops.map((loot, i) => (
                        <div key={i} className="flex items-center justify-center gap-2 text-sm">
                          <FlaskConical className="w-4 h-4 text-amber-400" />
                          <span className="text-foreground/70">{loot.itemId} x{loot.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              <div className="flex gap-3 pt-2">
                <Link href="/battle" className="flex-1">
                  <button className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-semibold text-sm">
                    Arena
                  </button>
                </Link>
                <Link href="/" className="flex-1">
                  <button className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-primary/80 to-primary text-[#09090b] font-bold text-sm hover:from-primary hover:to-primary/90 transition-all">
                    Taverna
                  </button>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
