"use client";

import { motion, AnimatePresence, useAnimation } from "framer-motion";
import {
  Swords, Shield, Heart, Droplets, Star, ArrowLeft, Skull,
  Zap, FlaskConical, ShieldAlert, Sparkles, Trophy, X, Users
} from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api";
import { useBattleStore, AnimationEvent } from "@/store/useBattleStore";
import { RetroAvatar } from "@/components/ui/RetroAvatar";

// ─── Floating Damage Number ─────────────────────────────────────────────────
function FloatingNumber({ value, type, onComplete }: {
  value: number; type: 'damage' | 'heal' | 'miss' | 'critical'; onComplete: () => void;
}) {
  const isCritical = type === 'critical';
  const color = type === 'heal' 
    ? 'text-emerald-400' 
    : type === 'miss' 
      ? 'text-gray-400' 
      : isCritical
        ? 'text-yellow-400 font-extrabold uppercase'
        : 'text-red-400';

  const prefix = type === 'heal' ? '+' : type === 'miss' ? '' : '-';
  const text = type === 'miss' 
    ? 'MISS!' 
    : isCritical
      ? `CRIT! -${value}`
      : `${prefix}${value}`;

  // Random angle and drift for retro feel
  const randRotate = isCritical ? -15 : Math.random() * 20 - 10;
  const randX = Math.random() * 40 - 20;

  return (
    <motion.div
      className={`absolute font-press-start pointer-events-none z-50 text-[10px] sm:text-xs select-none ${color}`}
      style={{ 
        textShadow: '2px 2px 0px #000000',
        whiteSpace: 'nowrap'
      }}
      initial={isCritical ? {
        opacity: 1, 
        y: 10,
        x: 0,
        scale: 0.5, 
        rotate: -15 
      } : { 
        opacity: 1, 
        y: 0,
        x: 0,
        scale: 0.8,
        rotate: randRotate
      }}
      animate={isCritical ? {
        opacity: [1, 1, 0],
        y: [10, -40, -100],
        x: [0, randX * 0.5, randX],
        scale: [0.5, 1.5, 1.2],
        rotate: [-15, 10, -5],
      } : { 
        opacity: [1, 1, 0], 
        y: [0, -35, -75],
        x: [0, randX * 0.5, randX],
        scale: [0.8, 1.2, 1.0] 
      }}
      transition={{ 
        duration: isCritical ? 1.3 : 1.0, 
        times: [0, 0.25, 1],
        ease: "easeOut" 
      }}
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

  const barBg = color.includes("emerald")
    ? "bg-[#10b981]" 
    : color.includes("blue")
      ? "bg-[#3b82f6]" 
      : color;

  return (
    <div className="space-y-1 font-vt323">
      <div className="flex items-center justify-between text-base leading-none">
        <span className="flex items-center gap-1 font-bold text-foreground/70 uppercase tracking-wider">
          {icon} {label}
        </span>
        <span className="font-mono font-bold text-sm tracking-tight">
          <span className={isLow ? "text-red-400 animate-pulse font-extrabold" : ""}>{current}</span>
          <span className="text-foreground/45"> / {max}</span>
        </span>
      </div>
      <div className="h-4 w-full border-2 border-retro-border bg-black/60 p-0.5 relative">
        <motion.div
          className={`h-full ${barBg} relative overflow-hidden`}
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div 
            className="absolute inset-0 opacity-25 animate-[pulse_3s_infinite]"
            style={{
              backgroundImage: `repeating-linear-gradient(
                90deg,
                transparent,
                transparent 4px,
                #000 4px,
                #000 6px
              )`
            }}
          />
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
    DAMAGE: "bg-red-950/40 text-red-400 border-red-500/40 hover:bg-red-900/30",
    HEAL: "bg-emerald-950/40 text-emerald-400 border-emerald-500/40 hover:bg-emerald-900/30",
    BUFF: "bg-blue-950/40 text-blue-400 border-blue-500/40 hover:bg-blue-900/30",
    DEBUFF: "bg-purple-950/40 text-purple-400 border-purple-500/40 hover:bg-purple-900/30",
  };
  const colorClass = effectColors[skill.effectType] || effectColors.DAMAGE;

  return (
    <button
      onClick={onUse}
      disabled={disabled}
      className={`border-2 border-black p-2.5 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none select-none cursor-pointer group font-silkscreen text-[9px] sm:text-[10px] leading-tight ${colorClass}`}
      title={skill.description}
    >
      <div className="font-bold truncate">{skill.name}</div>
      <div className="flex items-center gap-1 mt-1 font-vt323 text-xs leading-none">
        <Droplets className="w-3.5 h-3.5 text-blue-400" />
        <span>{skill.manaCost} MP</span>
      </div>
    </button>
  );
}

// ─── Combat Avatar Component with Fallback ───────────────────────────────────
function CombatAvatar({ avatarId, race, characterClass, gender, size = 64 }: {
  avatarId?: string; race: string; characterClass?: string; gender?: string; size?: number;
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Resolve gender dynamically from avatarId suffix (e.g. umano-guerriero-f)
  const resolvedGender = avatarId
    ? (avatarId.endsWith("-f") ? "f" : avatarId.endsWith("-m") ? "m" : gender)
    : gender;

  // If no avatarId is provided or is empty, fallback immediately
  if (!avatarId) {
    return <RetroAvatar race={race} characterClass={characterClass} gender={resolvedGender} size={size} showBackdrop={false} />;
  }

  // Pre-normalized image path
  const src = `/avatars/${avatarId}.png`;

  if (hasError) {
    return <RetroAvatar race={race} characterClass={characterClass} gender={resolvedGender} size={size} showBackdrop={false} />;
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <RetroAvatar race={race} characterClass={characterClass} gender={resolvedGender} size={size} showBackdrop={false} />
        </div>
      )}
      <img
        src={src}
        alt={`${race} ${characterClass}`}
        className="w-full h-full object-cover pixelated"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        style={{ display: isLoaded ? 'block' : 'none' }}
      />
    </div>
  );
}

// ─── Boss Avatar Component with Fallback ─────────────────────────────────────
function BossAvatar({ boss, size = 128, isKO = false }: {
  boss: { name: string; currentHp: number } | null; size?: number; isKO?: boolean;
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const name = boss?.name || "";
  const isGorgon = name.toLowerCase().includes("gorgon") || name.toLowerCase().includes("gorgone");

  if (!isGorgon || hasError) {
    return (
      <div className="flex items-center justify-center bg-black/40 border-2 border-retro-magenta p-4" style={{ width: size, height: size }}>
        <Skull className={`w-1/2 h-1/2 ${isKO ? "text-gray-500" : "text-retro-magenta animate-pulse"}`} />
      </div>
    );
  }

  return (
    <div className="relative border-2 border-retro-magenta p-1 bg-black/40" style={{ width: size, height: size }}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Skull className="w-12 h-12 text-retro-magenta/50 animate-pulse" />
        </div>
      )}
      <img
        src="/avatars/boss-gorgon.png"
        alt={name}
        className={`w-full h-full object-cover pixelated ${isKO ? "grayscale opacity-50" : ""}`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        style={{ display: isLoaded ? 'block' : 'none' }}
      />
    </div>
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
    id: string; value: number; type: 'damage' | 'heal' | 'miss' | 'critical'; target: 'PLAYER' | 'BOSS';
  }>>([]);
  const [screenShake, setScreenShake] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isInverted, setIsInverted] = useState(false);
  const [phaseBannerText, setPhaseBannerText] = useState<string | null>(null);
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

  // Periodic polling when battle is WAITING or ACTIVE
  useEffect(() => {
    if (!mounted || (store.status !== 'WAITING' && store.status !== 'ACTIVE')) return;

    const interval = setInterval(() => {
      if (!actionLoading) {
        loadBattle();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [mounted, store.status, actionLoading, loadBattle]);

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
        addFloatingNumber(event.value || 0, event.isCritical ? 'critical' : 'damage', event.target || 'BOSS');
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
        // Invert and shake and flash phase text
        setIsInverted(true);
        setPhaseBannerText(`WARNING: PHASE ${store.currentPhase} ACTIVATED!`);
        triggerScreenShake();
        setTimeout(() => setIsInverted(false), 500);
        setTimeout(() => setPhaseBannerText(null), 2500);
        await new Promise(r => setTimeout(r, 2500));
        break;

      case 'VICTORY':
      case 'DEFEAT':
        await new Promise(r => setTimeout(r, 500));
        break;
    }
  };

  const addFloatingNumber = (value: number, type: 'damage' | 'heal' | 'miss' | 'critical', target: 'PLAYER' | 'BOSS') => {
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

  const handleAbandonClick = () => {
    if (confirm("Sei sicuro di volerti arrendere? La battaglia verrà considerata persa!")) {
      handleAbandon();
    }
  };

  const handleExit = () => {
    router.push("/battle");
  };

  const handleStartCombat = async () => {
    setActionLoading(true);
    const headers = await getAuthHeader();
    if (!headers) { setActionLoading(false); return; }
    try {
      const res = await fetch(`${API_URL}/battle/${battleId}/start-combat`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        store.setBattleFromServer(data, currentPlayer!.userId);
      }
    } catch (e) {
      console.error("Error starting combat:", e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToSolo = async () => {
    if (!confirm("Convertire questa battaglia in modalità Solo? Eventuali altri membri del party verranno rimossi e la battaglia inizierà subito.")) return;
    setActionLoading(true);
    const headers = await getAuthHeader();
    if (!headers) { setActionLoading(false); return; }
    try {
      const res = await fetch(`${API_URL}/battle/${battleId}/convert-to-solo`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        store.setBattleFromServer(data, currentPlayer!.userId);
      } else {
        const err = await res.json();
        alert(err.message || "Errore nella conversione a Solo");
      }
    } catch (e) {
      console.error("Error converting to solo:", e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToParty = async () => {
    if (!confirm("Sei sicuro di voler convertire questa battaglia in modalità Party? La battaglia tornerà in stato di Lobby (WAITING) per consentire ad altri giocatori di unirsi.")) return;
    setActionLoading(true);
    const headers = await getAuthHeader();
    if (!headers) { setActionLoading(false); return; }
    try {
      const res = await fetch(`${API_URL}/battle/${battleId}/convert-to-party`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        store.setBattleFromServer(data, currentPlayer!.userId);
      } else {
        const err = await res.json();
        alert(err.message || "Errore nella conversione a Party");
      }
    } catch (e) {
      console.error("Error converting to party:", e);
    } finally {
      setActionLoading(false);
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

  if (store.status === 'WAITING') {
    const hostParticipant = store.participants.find(p => p.turnOrder === 1);
    const isHost = currentPlayer?.turnOrder === 1;

    return (
      <main className="min-h-screen bg-black text-foreground font-silkscreen flex flex-col items-center justify-center p-4 lg:p-8 relative overflow-hidden">
        {/* CRT Scanline and Flicker Simulation */}
        <div className="absolute inset-0 crt-screen-overlay crt-flicker-active z-0 pointer-events-none" />
        <div className="absolute inset-0 crt-scanline-scroll-effect z-0 pointer-events-none" />

        <div className="max-w-2xl w-full retro-window-classic p-6 relative z-10 shadow-2xl space-y-6">
          <div className="flex justify-between items-start border-b-2 border-retro-border/25 pb-4">
            <div>
              <span className="text-[10px] font-bold text-retro-magenta uppercase tracking-widest font-press-start retro-text-shadow">LOBBY DI BATTAGLIA</span>
              <h1 className="text-xl font-black mt-2 flex items-center gap-2 text-retro-magenta uppercase">
                <Skull className="w-5 h-5 text-retro-magenta" />
                {boss?.name}
              </h1>
              <p className="text-xs text-foreground/50 mt-1 font-vt323 text-base leading-tight">{boss?.description || "PREPARATI AD AFFRONTARE IL BOSS INSIEME AL TUO PARTY"}</p>
            </div>
            <button
              onClick={handleAbandon}
              className="px-3.5 py-1.5 border-2 border-black bg-red-950/40 text-red-400 font-bold text-[10px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-900/40 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none select-none cursor-pointer transition-all"
            >
              Abbandona
            </button>
          </div>

          {/* Boss Stats */}
          <div className="border-2 border-black bg-black/45 p-4 rounded-sm flex justify-around text-center font-vt323 text-base">
            <div>
              <span className="text-foreground/45 uppercase text-[9px] font-silkscreen font-bold tracking-wider">HP Boss</span>
              <div className="text-lg font-bold text-red-400 mt-0.5">{boss?.maxHp}</div>
            </div>
            <div className="w-0.5 bg-retro-border/10" />
            <div>
              <span className="text-foreground/45 uppercase text-[9px] font-silkscreen font-bold tracking-wider">ATK Boss</span>
              <div className="text-lg font-bold text-red-400 mt-0.5">{boss?.atk}</div>
            </div>
            <div className="w-0.5 bg-retro-border/10" />
            <div>
              <span className="text-foreground/45 uppercase text-[9px] font-silkscreen font-bold tracking-wider">DEF Boss</span>
              <div className="text-lg font-bold text-red-400 mt-0.5">{boss?.def}</div>
            </div>
            <div className="w-0.5 bg-retro-border/10" />
            <div>
              <span className="text-foreground/45 uppercase text-[9px] font-silkscreen font-bold tracking-wider">Premio</span>
              <div className="text-lg font-bold text-primary mt-0.5">⭐ {boss?.tier ? 100 * boss.tier : 200} XP</div>
            </div>
          </div>

          {/* Participants */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-foreground/75 flex items-center gap-2 uppercase tracking-wide">
              <Users className="w-4 h-4 text-retro-cyan" />
              Party ({store.participants.length} / 4)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {store.participants.map((p) => (
                <div key={p.id} className="border-2 border-black bg-black/35 p-3 rounded-sm flex items-center gap-3 relative group">
                  {p.turnOrder === 1 && (
                    <span className="absolute top-2 right-2 text-[8px] font-press-start font-black text-primary bg-primary/10 px-1 rounded uppercase tracking-wider scale-90">Host</span>
                  )}
                  <div className="w-12 h-12 border-2 border-retro-border/30 bg-black flex items-center justify-center overflow-hidden shrink-0">
                    <CombatAvatar avatarId={p.avatarId || undefined} race={p.race} characterClass={p.className} gender="m" size={48} />
                  </div>
                  <div className="min-w-0 font-vt323 leading-none">
                    <div className="font-bold text-base truncate">{p.username}</div>
                    <div className="text-[10px] text-retro-cyan uppercase font-silkscreen tracking-wider mt-1 truncate">{p.race} {p.className}</div>
                  </div>
                </div>
              ))}
              {Array.from({ length: 4 - store.participants.length }).map((_, i) => (
                <div key={i} className="border-2 border-dashed border-retro-border/10 p-3 rounded-sm flex items-center justify-center text-xs text-foreground/20 h-[72px]">
                  In attesa...
                </div>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t-2 border-retro-border/25 flex flex-col items-center gap-3">
            {isHost ? (
              <div className="w-full space-y-3">
                <button
                  onClick={handleStartCombat}
                  disabled={actionLoading}
                  className="w-full py-3.5 border-2 border-black bg-red-700 text-white font-press-start font-black text-xs tracking-widest uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-red-600 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all cursor-pointer select-none"
                >
                  {actionLoading ? "Avvio..." : "Avvia Combattimento ⚔️"}
                </button>
                <button
                  onClick={handleConvertToSolo}
                  disabled={actionLoading}
                  className="w-full py-2.5 border-2 border-black bg-primary text-black font-bold text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-primary/90 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer select-none"
                >
                  {actionLoading ? "Conversione..." : "Converti in Solo"}
                </button>
              </div>
            ) : (
              <div className="text-xs text-foreground/50 animate-pulse text-center py-2 uppercase font-press-start text-[8px] leading-relaxed">
                In attesa che l'host <strong>{hostParticipant?.username || "Leader"}</strong> avvii il combattimento...
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-foreground font-silkscreen flex flex-col relative overflow-hidden">

      {/* Retro CRT Screen Simulation Container */}
      <div className={`crt-screen-overlay crt-flicker-active flex-1 flex flex-col relative ${isInverted ? 'invert' : ''}`}>
        <div className="crt-scanline-scroll-effect" />

        {/* Red flash overlay for hit feedback */}
        <AnimatePresence>
          {screenShake && (
            <motion.div
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-red-600/15 pointer-events-none z-30 mix-blend-overlay"
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>

        {/* Floating particles (pixelated/square) */}
        {mounted && Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-purple-500/20"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${20 + Math.random() * 60}%`,
              shapeRendering: 'crispEdges'
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.1, 0.4, 0.1],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}

        {/* Warning Phase Banner */}
        <AnimatePresence>
          {phaseBannerText && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="absolute inset-x-0 top-1/3 z-40 bg-retro-magenta/90 text-white font-press-start text-[10px] sm:text-xs py-4 text-center border-y-4 border-black shadow-[0_4px_20px_rgba(255,0,85,0.5)] leading-relaxed"
            >
              ⚠️ {phaseBannerText} ⚠️
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Bar */}
        <header className="relative z-20 flex items-center justify-between px-4 py-3 border-b-4 border-retro-border bg-retro-bg font-press-start text-[8px] sm:text-[10px]">
          <div className="flex items-center gap-3">
            <button
              onClick={handleExit}
              className="p-1 border-2 border-black bg-black hover:bg-white/10 active:translate-y-0.5 transition-all text-white cursor-pointer"
              title="Esci dall'Arena (conserva scontro)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-retro-cyan retro-text-glow-cyan">
                {store.mode}
              </span>
              <span className="text-white/20">·</span>
              <span className="text-white/60">T{store.turnNumber}</span>
              <span className="text-white/20">·</span>
              <span className="text-white/60">FASE {store.currentPhase}/{store.totalPhases}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isActive && (
              <button
                onClick={handleAbandonClick}
                disabled={actionLoading}
                className="px-2.5 py-1 border-2 border-black bg-red-950/40 text-red-400 hover:bg-red-500 hover:text-white font-bold transition-all active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer text-[8px]"
                title="Arrenditi ed esci"
              >
                Resa
              </button>
            )}
            <div className={`font-bold px-2 py-0.5 border-2 ${
              store.isPlayerTurn && isActive
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse"
                : !isActive
                  ? "bg-white/10 text-white/40 border-white/20"
                  : "bg-red-500/20 text-red-400 border-red-500/40"
            }`}>
              {!isActive
                ? store.status === 'VICTORY' ? '🏆 VITTORIA' : store.status === 'DEFEAT' ? '💀 SCONFITTA' : store.status
                : store.isPlayerTurn ? "⚔️ TUO TURNO" : "🐉 TURNO BOSS"
              }
            </div>
            {isActive && store.mode === 'SOLO' && (
              <button
                onClick={handleConvertToParty}
                disabled={actionLoading}
                className="px-2.5 py-1 border-2 border-black bg-primary text-black hover:bg-primary/80 font-bold transition-all active:scale-95 disabled:opacity-50 shrink-0 text-[8px] cursor-pointer"
                title="Apri questa sessione a una lobby Party co-op"
              >
                COOP
              </button>
            )}
          </div>
        </header>

        {/* Boss HP HUD Section */}
        <div className="relative z-10 px-4 py-3 bg-retro-bg border-b-4 border-retro-border font-silkscreen">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Skull className="w-4 h-4 text-retro-magenta" />
              <span className="text-xs sm:text-sm font-bold text-retro-magenta uppercase tracking-wider">{boss?.name || "Boss"}</span>
              <div className="flex items-center gap-0.5 ml-1">
                {Array.from({ length: boss?.tier || 1 }).map((_, s) => (
                  <Star key={s} className="w-3 h-3 text-primary fill-primary" />
                ))}
              </div>
            </div>
            <span className="font-vt323 text-base text-foreground/50">
              HP: {boss?.currentHp || 0} / {boss?.maxHp || 0}
            </span>
          </div>
          <div className="h-4 w-full border-2 border-retro-border bg-black/60 p-0.5 relative">
            <motion.div
              className="h-full bg-gradient-to-r from-retro-magenta to-red-500 relative overflow-hidden"
              initial={false}
              animate={{ width: `${bossHpPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div 
                className="absolute inset-0 opacity-25 animate-[pulse_3s_infinite]"
                style={{
                  backgroundImage: `repeating-linear-gradient(
                    90deg,
                    transparent,
                    transparent 4px,
                    #000 4px,
                    #000 6px
                  )`
                }}
              />
            </motion.div>
          </div>
        </div>

        {/* Battle Arena */}
        <motion.div
          ref={arenaRef}
          className="relative z-10 flex-1 flex items-center justify-between px-6 sm:px-12 py-4 min-h-[300px] bg-gradient-to-b from-[#050414] to-[#0d0922]"
          animate={screenShake ? {
            x: [0, 8, -8, 6, -6, 4, -4, 0],
            transition: { duration: 0.4 }
          } : {}}
        >
          {/* Boss Sprite on Left */}
          <div className="flex flex-col items-center gap-2 relative">
            {/* Boss Glow Aura */}
            {isActive && (boss?.currentHp || 0) > 0 && (
              <motion.div
                className="absolute -inset-3 rounded-2xl bg-retro-magenta/15 blur-xl -z-10"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}

            {/* Boss Portrait Frame */}
            <motion.div
              animate={bossControls}
              className="retro-window-magenta p-1 flex items-center justify-center overflow-hidden"
              style={{ width: '120px', height: '120px' }}
            >
              <BossAvatar boss={boss} size={112} isKO={(boss?.currentHp || 0) <= 0} />
            </motion.div>
            <span className="font-press-start text-[8px] sm:text-[10px] text-retro-magenta uppercase tracking-wider">{boss?.name || "Boss"}</span>

            {/* Boss Damage Numbers */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              {floatingNumbers.filter(f => f.target === 'BOSS').map(f => (
                <FloatingNumber
                  key={f.id}
                  value={f.value}
                  type={f.type}
                  onComplete={() => removeFloatingNumber(f.id)}
                />
              ))}
            </div>
          </div>

          {/* VS Spacer */}
          <div className="font-press-start text-xs text-white/10 select-none animate-pulse">VS</div>

          {/* Player Party Column on Right */}
          <div className="flex flex-col gap-4 items-end pr-2 sm:pr-8">
            {store.participants.map((p, index) => {
              const isCurrentActive = store.activeParticipantId === p.userId;
              const isKO = p.currentHp <= 0;
              const pPercent = Math.max(0, (p.currentHp / p.maxHp) * 100);
              const mPercent = Math.max(0, (p.mana / p.maxMana) * 100);

              // Diagonal offset to simulate classic echelon lining
              const echelonX = -12 * index;

              return (
                <motion.div
                  key={p.id}
                  animate={p.userId === currentPlayer?.userId ? playerControls : {}}
                  style={{ x: echelonX }}
                  className="flex items-center gap-3"
                >
                  {/* Individual stats display */}
                  <div className="text-right font-vt323 leading-tight hidden sm:block">
                    <div className={`text-sm font-bold truncate ${isCurrentActive ? 'text-retro-cyan font-black' : 'text-foreground/60'}`}>
                      {p.username}
                    </div>
                    <div className="text-[10px] text-foreground/45 uppercase tracking-widest font-silkscreen mt-0.5">
                      {p.className}
                    </div>
                    <div className="text-[11px] text-emerald-400 font-mono mt-0.5">HP {p.currentHp}/{p.maxHp}</div>
                  </div>

                  <div className="relative">
                    {/* Defending Aura */}
                    <AnimatePresence>
                      {p.isDefending && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="absolute -inset-2 border-2 border-retro-cyan bg-retro-cyan/10 z-10 animate-pulse"
                        />
                      )}
                    </AnimatePresence>

                    {/* Character Frame */}
                    <div className={`p-1 ${
                      isKO
                        ? "border-2 border-gray-600 bg-black/40 grayscale opacity-40"
                        : isCurrentActive
                          ? "retro-window-cyan shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                          : "border-2 border-retro-border/40 bg-black/60"
                    } flex items-center justify-center overflow-hidden transition-all duration-300 relative`}
                    style={{ width: '64px', height: '64px' }}
                    >
                      <CombatAvatar
                        avatarId={p.avatarId || undefined}
                        race={p.race}
                        characterClass={p.className}
                        gender="m"
                        size={56}
                      />

                      {/* Active turn indicator badge */}
                      {isCurrentActive && (
                        <div className="absolute top-0.5 left-0.5 bg-retro-cyan text-[#050414] text-[6px] font-press-start px-0.5 py-0.2 rounded-sm z-20 font-black">
                          ACT
                        </div>
                      )}
                    </div>

                    {/* Player damage floating numbers */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      {floatingNumbers.filter(f => f.target === 'PLAYER' && (store.participants.length === 1 || p.userId === currentPlayer?.userId)).map(f => (
                        <FloatingNumber
                          key={f.id}
                          value={f.value}
                          type={f.type}
                          onComplete={() => removeFloatingNumber(f.id)}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Retro JRPG Command Box */}
        <div className="relative z-20 px-4 pb-6 pt-3 bg-retro-bg border-t-4 border-retro-border font-silkscreen grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left Column: Party Status */}
          <div className="retro-window-classic p-4 space-y-2">
            <div className="text-[10px] font-bold text-retro-cyan border-b border-white/20 pb-1 mb-2 tracking-widest font-press-start">PARTY STATUS</div>
            <div className="space-y-2.5 font-vt323 text-lg leading-none">
              {store.participants.map((p) => {
                const isCurrentActive = store.activeParticipantId === p.userId;
                const isKO = p.currentHp <= 0;
                return (
                  <div key={p.id} className={`flex justify-between items-center ${isCurrentActive ? "text-retro-cyan font-black" : "text-white/70"} ${isKO ? "line-through opacity-45" : ""}`}>
                    <span className="truncate max-w-[110px] uppercase font-bold">{p.username}</span>
                    <div className="flex gap-4 items-center shrink-0">
                      <span className={p.currentHp < p.maxHp * 0.25 ? "text-red-400 animate-pulse font-extrabold" : "text-emerald-400"}>
                        HP {p.currentHp}/{p.maxHp}
                      </span>
                      <span className="text-blue-400">
                        MP {p.mana}/{p.maxMana}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Column: Actions & Submenus */}
          <div className="retro-window-classic p-4 flex flex-col justify-between min-h-[140px]">
            {!showSkills && !showItems ? (
              <>
                <div className="text-[10px] font-bold text-primary border-b border-white/20 pb-1 mb-2 tracking-widest font-press-start">COMMANDS</div>
                <div className="grid grid-cols-2 gap-2.5 flex-1 items-center">
                  <button
                    onClick={() => submitAction('ATTACK')}
                    disabled={!canAct}
                    className="px-2 py-3 border-2 border-retro-border bg-black/40 hover:bg-white/10 active:translate-x-[2px] active:translate-y-[2px] shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:shadow-none disabled:shadow-none disabled:opacity-40 disabled:cursor-not-allowed text-[10px] font-press-start font-black text-center cursor-pointer select-none"
                  >
                    ⚔️ ATTACK
                  </button>
                  <button
                    onClick={() => { setShowSkills(true); setShowItems(false); }}
                    disabled={!canAct}
                    className="px-2 py-3 border-2 border-retro-border bg-black/40 hover:bg-white/10 active:translate-x-[2px] active:translate-y-[2px] shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:shadow-none disabled:shadow-none disabled:opacity-40 disabled:cursor-not-allowed text-[10px] font-press-start font-black text-center cursor-pointer select-none"
                  >
                    ✨ SKILLS
                  </button>
                  <button
                    onClick={() => submitAction('DEFEND')}
                    disabled={!canAct}
                    className="px-2 py-3 border-2 border-retro-border bg-black/40 hover:bg-white/10 active:translate-x-[2px] active:translate-y-[2px] shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:shadow-none disabled:shadow-none disabled:opacity-40 disabled:cursor-not-allowed text-[10px] font-press-start font-black text-center cursor-pointer select-none"
                  >
                    🛡️ DEFEND
                  </button>
                  <button
                    onClick={() => { setShowItems(true); setShowSkills(false); }}
                    disabled={!canAct}
                    className="px-2 py-3 border-2 border-retro-border bg-black/40 hover:bg-white/10 active:translate-x-[2px] active:translate-y-[2px] shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:shadow-none disabled:shadow-none disabled:opacity-40 disabled:cursor-not-allowed text-[10px] font-press-start font-black text-center cursor-pointer select-none"
                  >
                    🧪 ITEM
                  </button>
                </div>
              </>
            ) : showSkills ? (
              <div className="flex flex-col h-full justify-between">
                <div className="flex justify-between items-center border-b border-white/20 pb-1 mb-2">
                  <span className="text-[10px] font-bold text-purple-400 tracking-widest font-press-start">SELECT SKILL</span>
                  <button onClick={() => setShowSkills(false)} className="text-white hover:text-retro-magenta font-press-start text-[8px] cursor-pointer">X BACK</button>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-[110px] overflow-y-auto pr-1 flex-1">
                  {store.availableSkills.map(skill => (
                    <SkillButton
                      key={skill.id}
                      skill={skill}
                      disabled={!canAct || (currentPlayer?.mana || 0) < skill.manaCost}
                      onUse={() => submitAction('SKILL', skill.id)}
                    />
                  ))}
                  {store.availableSkills.length === 0 && (
                    <div className="text-center text-[10px] text-white/40 font-press-start py-4">NO SKILLS</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full justify-between">
                <div className="flex justify-between items-center border-b border-white/20 pb-1 mb-2">
                  <span className="text-[10px] font-bold text-amber-400 tracking-widest font-press-start">SELECT ITEM</span>
                  <button onClick={() => setShowItems(false)} className="text-white hover:text-retro-magenta font-press-start text-[8px] cursor-pointer">X BACK</button>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-[110px] overflow-y-auto pr-1 flex-1">
                  {store.inventory.map(item => (
                    <button
                      key={item.itemId}
                      onClick={() => submitAction('ITEM', undefined, item.itemId)}
                      disabled={!canAct || item.quantity <= 0}
                      className="border-2 border-retro-border p-2 bg-black/40 text-left hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed select-none cursor-pointer flex justify-between items-center font-silkscreen text-[9px]"
                      title={item.description}
                    >
                      <span className="font-bold truncate">{item.name}</span>
                      <span className="text-amber-400 font-press-start text-[8px] shrink-0">x{item.quantity}</span>
                    </button>
                  ))}
                  {store.inventory.length === 0 && (
                    <div className="text-center text-[10px] text-white/40 font-press-start py-4">NO ITEMS</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Battle Log */}
          <div className="retro-window-classic p-4">
            <div className="text-[10px] font-bold text-retro-magenta border-b border-white/20 pb-1 mb-2 tracking-widest font-press-start">BATTLE LOG</div>
            <div className="max-h-[120px] overflow-y-auto space-y-1.5 pr-1 font-vt323 text-base leading-tight">
              {store.battleLogs.slice(0, 8).map((log, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-white/30 font-mono text-sm shrink-0">T{log.turnNumber}</span>
                  <span className={
                    log.actorType === 'BOSS' ? 'text-retro-magenta' :
                    log.isCritical ? 'text-yellow-400 font-bold' :
                    'text-white/80'
                  }>
                    {log.narrative}
                  </span>
                </div>
              ))}
              {store.battleLogs.length === 0 && (
                <div className="text-center text-white/30 font-press-start text-[8px] py-4">COMBAT HAS BEGUN...</div>
              )}
            </div>
          </div>
        </div>

        {/* Result Modal */}
        <AnimatePresence>
          {showResult && (store.status === 'VICTORY' || store.status === 'DEFEAT') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 200 }}
                className={`w-full max-w-md retro-window-classic p-8 text-center space-y-6 shadow-2xl relative ${
                  store.status === 'VICTORY'
                    ? "border-primary"
                    : "border-retro-magenta"
                }`}
              >
                {/* Result Title */}
                <div>
                  {store.status === 'VICTORY' ? (
                    <Trophy className="w-16 h-16 text-primary mx-auto animate-bounce" />
                  ) : (
                    <Skull className="w-16 h-16 text-retro-magenta mx-auto animate-pulse" />
                  )}
                  <h2 className={`text-2xl font-press-start font-black mt-4 ${
                    store.status === 'VICTORY' ? 'text-primary retro-text-glow-gold' : 'text-retro-magenta retro-text-glow-magenta'
                  }`}>
                    {store.status === 'VICTORY' ? 'VICTORY!' : 'DEFEAT...'}
                  </h2>
                  <p className="text-xs text-white/60 mt-2 font-silkscreen uppercase tracking-wider">
                    {store.status === 'VICTORY'
                      ? `YOU DEFEATED ${boss?.name || 'THE BOSS'}!`
                      : `YOU WERE DEFEATED BY ${boss?.name || 'THE BOSS'}...`
                    }
                  </p>
                </div>

                {/* Rewards */}
                {store.rewards && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="border-2 border-black bg-black/60 p-4 font-press-start text-[9px] text-center space-y-3"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Star className="w-4 h-4 text-primary fill-primary" />
                      <span className="text-primary font-bold">
                        +{store.rewards.xpAwarded} XP
                      </span>
                      {store.rewards.bonusXp > 0 && (
                        <span className="text-emerald-400">
                          (+{store.rewards.bonusXp} BONUS)
                        </span>
                      )}
                    </div>

                    {store.rewards.lootDrops.length > 0 && (
                      <div className="space-y-1.5 border-t border-white/10 pt-2">
                        <span className="text-white/40 uppercase tracking-widest text-[8px]">LOOT DROPPED</span>
                        {store.rewards.lootDrops.map((loot, i) => (
                          <div key={i} className="flex items-center justify-center gap-2 text-white/80">
                            <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
                            <span>{loot.itemId} x{loot.quantity}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-4 pt-2">
                  <Link href="/battle" className="flex-1">
                    <button className="w-full py-3 border-2 border-retro-border bg-black/40 text-white font-press-start font-black text-[9px] uppercase shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-white/10 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none select-none cursor-pointer">
                      Arena
                    </button>
                  </Link>
                  <Link href="/" className="flex-1">
                    <button className="w-full py-3 border-2 border-black bg-primary text-black font-press-start font-black text-[9px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-primary/90 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none select-none cursor-pointer">
                      Taverna
                    </button>
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
