"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookMarked, Zap, Shield, Brain, X, Activity } from "lucide-react";
import Link from "next/link";
import { usePlayerStore } from "@/store/usePlayerStore";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api";
import { useRouter } from "next/navigation";

// Skill tree nodes — IDs match the backend SKILL_CATALOG
const SKILLS = [
  { id: "core_1", title: "Novice Awakening", x: 0, y: 0, icon: <BookMarked className="w-5 h-5" />, requires: [], desc: "Your journey begins. Base XP yield unlocked." },

  // Intelligence Path
  { id: "int_1", title: "Rapid Learner", x: -120, y: -100, icon: <Brain className="w-5 h-5" />, requires: ["core_1"], desc: "+5% XP from Study activities." },
  { id: "int_2", title: "Deep Focus I", x: -250, y: -180, icon: <Brain className="w-5 h-5" />, requires: ["int_1"], desc: "Focus sessions yield +10% more stat gains." },

  // Strength Path
  { id: "str_1", title: "Iron Lungs", x: 120, y: -100, icon: <Zap className="w-5 h-5" />, requires: ["core_1"], desc: "+10% XP from Workout activities." },
  { id: "str_2", title: "Berserker's Will", x: 250, y: -180, icon: <Zap className="w-5 h-5" />, requires: ["str_1"], desc: "Streak multiplier grants +5% extra bonus XP." },

  // Defense / Consistency Path
  { id: "def_1", title: "Steadfast", x: 0, y: -160, icon: <Shield className="w-5 h-5" />, requires: ["core_1"], desc: "+5% XP from every activity regardless of category." },
  { id: "def_2", title: "Aegis of Time", x: 0, y: -300, icon: <Shield className="w-5 h-5" />, requires: ["def_1"], desc: "Additional +10% global XP bonus on all activities." },

  // Endurance / Vitality Path
  { id: "end_1", title: "Resilient Blood", x: 0, y: 160, icon: <Activity className="w-5 h-5" />, requires: ["core_1"], desc: "Bonus Endurance gain based on your active login streak." },
  { id: "end_2", title: "Unbroken Spirit", x: 0, y: 300, icon: <Activity className="w-5 h-5" />, requires: ["end_1"], desc: "Further increases the Endurance streak multiplier." },
];

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

const getSkillColor = (id: string, status: "unlocked" | "available" | "locked") => {
  const isUnlocked = status === "unlocked";
  const isAvailable = status === "available";
  
  if (id.startsWith("core")) {
    return {
      border: isUnlocked ? "border-primary" : isAvailable ? "border-primary/50 hover:border-primary" : "border-surface-border",
      bg: isUnlocked ? "bg-primary/20" : isAvailable ? "bg-primary/5 hover:bg-primary/10" : "bg-surface/30",
      text: isUnlocked ? "text-primary" : isAvailable ? "text-primary/70" : "text-foreground/20",
      glow: isUnlocked ? "shadow-[0_0_30px_rgba(245,158,11,0.4)]" : isAvailable ? "hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]" : "",
      colorHex: "#f59e0b",
    };
  }
  if (id.startsWith("int")) {
    return {
      border: isUnlocked ? "border-cyan-500" : isAvailable ? "border-cyan-500/50 hover:border-cyan-500" : "border-surface-border",
      bg: isUnlocked ? "bg-cyan-500/20" : isAvailable ? "bg-cyan-500/5 hover:bg-cyan-500/10" : "bg-surface/30",
      text: isUnlocked ? "text-cyan-400" : isAvailable ? "text-cyan-400/70" : "text-foreground/20",
      glow: isUnlocked ? "shadow-[0_0_30px_rgba(6,182,212,0.4)]" : isAvailable ? "hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]" : "",
      colorHex: "#06b6d4",
    };
  }
  if (id.startsWith("str")) {
    return {
      border: isUnlocked ? "border-red-500" : isAvailable ? "border-red-500/50 hover:border-red-500" : "border-surface-border",
      bg: isUnlocked ? "bg-red-500/20" : isAvailable ? "bg-red-500/5 hover:bg-red-500/10" : "bg-surface/30",
      text: isUnlocked ? "text-red-400" : isAvailable ? "text-red-400/70" : "text-foreground/20",
      glow: isUnlocked ? "shadow-[0_0_30px_rgba(239,68,68,0.4)]" : isAvailable ? "hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]" : "",
      colorHex: "#ef4444",
    };
  }
  if (id.startsWith("def")) {
    return {
      border: isUnlocked ? "border-purple-500" : isAvailable ? "border-purple-500/50 hover:border-purple-500" : "border-surface-border",
      bg: isUnlocked ? "bg-purple-500/20" : isAvailable ? "bg-purple-500/5 hover:bg-purple-500/10" : "bg-surface/30",
      text: isUnlocked ? "text-purple-400" : isAvailable ? "text-purple-400/70" : "text-foreground/20",
      glow: isUnlocked ? "shadow-[0_0_30px_rgba(168,85,247,0.4)]" : isAvailable ? "hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]" : "",
      colorHex: "#a855f7",
    };
  }
  return {
    border: isUnlocked ? "border-emerald-500" : isAvailable ? "border-emerald-500/50 hover:border-emerald-500" : "border-surface-border",
    bg: isUnlocked ? "bg-emerald-500/20" : isAvailable ? "bg-emerald-500/5 hover:bg-emerald-500/10" : "bg-surface/30",
    text: isUnlocked ? "text-emerald-400" : isAvailable ? "text-emerald-400/70" : "text-foreground/20",
    glow: isUnlocked ? "shadow-[0_0_30px_rgba(16,185,129,0.4)]" : isAvailable ? "hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]" : "",
    colorHex: "#10b981",
  };
};

export default function TheGrimoire() {
  const { level, userId } = usePlayerStore();
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [unlockedIds, setUnlockedIds] = useState<string[]>(["core_1"]);
  const [unlocking, setUnlocking] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [stars, setStars] = useState<Star[]>([]);
  const router = useRouter();

  // SP: earned 1 per level after 5, minus those already spent
  const spentSP = unlockedIds.filter(id => id !== "core_1").length;
  const skillPoints = Math.max(0, level - 5) - spentSP;

  // Status is computed from real unlocked list
  const getStatus = useCallback((skillId: string): "unlocked" | "available" | "locked" => {
    if (unlockedIds.includes(skillId)) return "unlocked";
    const skill = SKILLS.find(s => s.id === skillId);
    if (!skill) return "locked";
    if (skill.requires.every(r => unlockedIds.includes(r)) && skillPoints > 0) return "available";
    return "locked";
  }, [unlockedIds, skillPoints]);

  useEffect(() => {
    // Generate floating stars once on client-side
    const generatedStars = Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 20 + 20,
      delay: Math.random() * -20,
    }));
    setStars(generatedStars);

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const user = session.user;
      usePlayerStore.getState().setAuth(user.id, user.user_metadata?.username || user.email?.split("@")[0] || "Hero");
      try {
        const [statsRes, skillsRes] = await Promise.all([
          fetch(`${API_URL}/player/me`, { headers: { 'Authorization': `Bearer ${session.access_token}` } }),
          fetch(`${API_URL}/player/skills`, { headers: { 'Authorization': `Bearer ${session.access_token}` } }),
        ]);
        if (statsRes.ok) {
          const data = await statsRes.json();
          const pStats = Array.isArray(data.character_stats) ? data.character_stats[0] : data.character_stats;
          usePlayerStore.getState().initStats(data.level, data.xp_current, data.xp_to_next, pStats, data.current_streak, data.highest_streak, undefined, data.avatar_id);
        }
        if (skillsRes.ok) {
          const data = await skillsRes.json();
          setUnlockedIds(data.unlockedIds ?? ["core_1"]);
        }
      } catch (e) {
        console.error("API unreachable, using cached store.", e);
      } finally {
        setMounted(true);
      }
    };
    init();
  }, [router]);

  const handleUnlock = async (skillId: string) => {
    if (!userId || unlocking) return;
    setUnlocking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/player/skills/unlock`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ skillId }),
      });
      if (res.ok) {
        const data = await res.json();
        setUnlockedIds(data.unlockedIds ?? ["core_1"]);
        setActiveNode(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUnlocking(false);
    }
  };

  const inspectedSkill = SKILLS.find(s => s.id === activeNode);
  const inspectedStatus = inspectedSkill ? (mounted ? getStatus(inspectedSkill.id) : "locked") : "locked";
  const inspectedColor = inspectedSkill ? getSkillColor(inspectedSkill.id, inspectedStatus) : null;

  // Pre-compute SVG connection lines to avoid Turbopack parsing issues with nested maps inside SVG JSX
  const svgLines = SKILLS.flatMap((skill) =>
    skill.requires.map((reqId) => {
      const source = SKILLS.find(s => s.id === reqId);
      if (!source) return null;

      const x1 = 400 + source.x;
      const y1 = 400 + source.y;
      const x2 = 400 + skill.x;
      const y2 = 400 + skill.y;

      const isTargetUnlocked = unlockedIds.includes(skill.id);
      const isSourceUnlocked = unlockedIds.includes(source.id);

      const colorInfo = getSkillColor(skill.id, "unlocked");
      const strokeColor = colorInfo.colorHex;
      const lineKey = `${source.id}-${skill.id}`;

      if (isTargetUnlocked) {
        return (
          <g key={lineKey}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={strokeColor} strokeWidth="3.5" className="opacity-15" />
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={strokeColor} strokeWidth="2.5" strokeDasharray="8 12" className="animate-energy" />
          </g>
        );
      } else if (isSourceUnlocked) {
        return (
          <line key={lineKey} x1={x1} y1={y1} x2={x2} y2={y2} stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 6" className="opacity-30" />
        );
      }
      return (
        <line key={lineKey} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      );
    })
  );

  return (
    <main className="h-[calc(100vh-4rem)] md:h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30 flex flex-col relative">
      <style>{`
        @keyframes energy-flow {
          from { stroke-dashoffset: 40; }
          to { stroke-dashoffset: 0; }
        }
        .animate-energy {
          animation: energy-flow 1.5s linear infinite;
        }
      `}</style>

      <div className="absolute inset-0 bg-[#09090b] z-0" />

      {/* Dynamic Starfield Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-surface)/40,_var(--color-background)_80%)] z-0 pointer-events-none"></div>
      
      {/* Floating Stars */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
        {stars.map((star) => (
          <motion.div
            key={star.id}
            className="absolute bg-white rounded-full opacity-20"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.1, 0.5, 0.1],
            }}
            transition={{
              duration: star.duration,
              delay: star.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Header Overlay */}
      <header className="relative z-20 flex items-center justify-between p-6 bg-gradient-to-b from-background via-background/80 to-transparent">
        <div className="flex items-center gap-4">
          <Link href="/">
            <button className="p-2.5 bg-surface/85 backdrop-blur-md border border-surface-border hover:bg-surface rounded-full transition-all text-foreground hover:scale-105 active:scale-95 cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-primary drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]">
              Il Grimorio
            </h1>
            <p className="text-foreground/60 text-xs md:text-sm">Costellazione delle Abilità</p>
          </div>
        </div>

        <div className="bg-surface/85 backdrop-blur-md border border-surface-border px-4 py-2 rounded-xl flex items-center gap-3">
          <span className="text-[10px] md:text-xs text-foreground/50 uppercase tracking-widest font-semibold">Punti Abilità</span>
          <span className="text-lg md:text-xl font-mono font-bold text-accent drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">{skillPoints} SP</span>
        </div>
      </header>

      {/* Interactive Map Area */}
      <div className="flex-1 relative z-10 cursor-grab active:cursor-grabbing">
        <motion.div
          drag
          dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
          className="w-full h-full flex items-center justify-center"
        >
          {/* Node Connections (Lines) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <svg width="800" height="800" className="w-[800px] h-[800px]">
              {svgLines}
            </svg>
          </div>

          {/* Render Nodes */}
          {SKILLS.map((skill) => {
            const status = mounted ? getStatus(skill.id) : (skill.id === "core_1" ? "unlocked" : "locked");
            const visual = getSkillColor(skill.id, status);

            return (
              <motion.div
                key={skill.id}
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveNode(skill.id)}
                className="absolute pointer-events-auto flex flex-col items-center cursor-pointer"
                style={{
                  x: skill.x,
                  y: skill.y
                }}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-300 relative ${visual.border} ${visual.bg} ${visual.text} ${visual.glow}`}>
                  {skill.icon}

                  {/* Dynamic pulse ripple animation for available nodes */}
                  {status === 'available' && skillPoints > 0 && (
                    <span className="absolute flex h-full w-full inset-0">
                      <span 
                        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-20"
                        style={{ backgroundColor: visual.colorHex }}
                      ></span>
                    </span>
                  )}
                </div>
                <p className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono font-bold tracking-wider opacity-70 uppercase">
                  {skill.title}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Bottom Node Inspector Modals */}
      <AnimatePresence>
        {activeNode && inspectedSkill && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-4 left-4 right-4 z-30 pointer-events-none"
          >
            <div 
              className="max-w-2xl mx-auto bg-surface/90 backdrop-blur-xl p-5 md:p-6 rounded-2xl pointer-events-auto flex items-start gap-4 md:gap-6 border transition-all duration-300 shadow-2xl"
              style={{
                borderColor: inspectedColor ? `${inspectedColor.colorHex}25` : 'var(--surface-border)',
                boxShadow: inspectedColor ? `0 20px 40px -15px rgba(0,0,0,0.7), 0 0 25px 2px ${inspectedColor.colorHex}15` : ''
              }}
            >
              <div 
                className="p-4 rounded-xl border transition-all duration-300 hidden sm:block shrink-0"
                style={{
                  backgroundColor: inspectedColor ? `${inspectedColor.colorHex}08` : 'var(--background)',
                  borderColor: inspectedColor ? `${inspectedColor.colorHex}20` : 'var(--surface-border)',
                  color: inspectedColor?.colorHex
                }}
              >
                {inspectedSkill.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-md md:text-lg font-bold tracking-tight text-foreground">{inspectedSkill.title}</h3>
                  <span 
                    className="text-[9px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider"
                    style={{
                      borderColor: inspectedColor ? `${inspectedColor.colorHex}40` : 'var(--surface-border)',
                      backgroundColor: inspectedColor ? `${inspectedColor.colorHex}10` : 'transparent',
                      color: inspectedColor?.colorHex
                    }}
                  >
                    {inspectedStatus}
                  </span>
                </div>
                <p className="text-foreground/75 mt-2 text-xs md:text-sm leading-relaxed">
                  {inspectedSkill.desc}
                </p>

                <div className="mt-5 flex justify-between items-center">
                  <span className="text-[10px] font-mono uppercase text-foreground/40">Richiede: {inspectedSkill.requires.length > 0 ? inspectedSkill.requires.join(", ").toUpperCase() : "NESSUNO"}</span>
                  {inspectedStatus === 'available' && skillPoints > 0 && (
                    <button
                      onClick={() => handleUnlock(inspectedSkill.id)}
                      disabled={unlocking}
                      className="px-5 py-2 font-bold rounded-lg transition-all duration-300 disabled:opacity-50 flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer text-black text-xs"
                      style={{
                        backgroundColor: inspectedColor?.colorHex,
                        boxShadow: inspectedColor ? `0 0 15px ${inspectedColor.colorHex}60` : ''
                      }}
                    >
                      {unlocking && <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />}
                      SBLOCCA (1 SP)
                    </button>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setActiveNode(null)} 
                className="p-1 text-foreground/40 hover:text-foreground hover:bg-white/5 rounded transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
