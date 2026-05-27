"use client";

import { motion } from "framer-motion";
import { User, Swords, BookOpen, Clock, Activity, Flame } from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { GlassCard } from "@/components/ui/glass-card";
import { QuickLogger } from "@/components/dashboard/QuickLogger";
import { BossTracker } from "@/components/dashboard/BossTracker";
import { BuffsTracker } from "@/components/dashboard/BuffsTracker";

export default function TavernDashboard() {
  const { currentXP, xpToNextLevel, level, username, stats, userId, currentStreak, statPoints, avatarId } = usePlayerStore();
  const [mounted, setMounted] = useState(false);
  const [characterClass, setCharacterClass] = useState("Novice");
  const [characterRace, setCharacterRace] = useState("Umano");
  const [completingQuest, setCompletingQuest] = useState<number | null>(null);
  const [completedQuests, setCompletedQuests] = useState<number[]>([]);
  const [statView, setStatView] = useState<'chart' | 'table'>('chart');
  const [timeStr, setTimeStr] = useState("");
  const [allocating, setAllocating] = useState<string | null>(null);
  const [resetCountdown, setResetCountdown] = useState("");
  const router = useRouter();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load completed quests from localStorage on mount
  useEffect(() => {
    const getTodayDateString = () => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    };

    try {
      const stored = localStorage.getItem("life-rpg-completed-quests");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === getTodayDateString()) {
          setCompletedQuests(parsed.completed || []);
        } else {
          // New day, reset
          setCompletedQuests([]);
          localStorage.setItem("life-rpg-completed-quests", JSON.stringify({
            date: getTodayDateString(),
            completed: []
          }));
        }
      } else {
        localStorage.setItem("life-rpg-completed-quests", JSON.stringify({
          date: getTodayDateString(),
          completed: []
        }));
      }
    } catch (e) {
      console.error("Error reading completed quests from localStorage", e);
    }
  }, []);

  // Update countdown timer and handle daily reset
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0); // Next midnight

      const diff = midnight.getTime() - now.getTime();
      if (diff <= 0) {
        // Midnight crossed! Reset quests
        setCompletedQuests([]);
        const nextDayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        localStorage.setItem("life-rpg-completed-quests", JSON.stringify({
          date: nextDayStr,
          completed: []
        }));
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setResetCountdown(`Resets in ${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const user = session.user;
      const uname = user.user_metadata?.username || user.email?.split('@')[0] || "Hero";
      usePlayerStore.getState().setAuth(user.id, uname);

      // Hydrate with Real Engine Data
      try {
        const res = await fetch(`${API_URL}/player/me`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          
          // Verify actual DB onboarding status
          const isDbOnboarded = data.class_name !== 'Novice' || data.xp_current > 0;
          if (!isDbOnboarded) {
             router.push("/onboarding");
             return;
          }
          
          // Sync local state if DB confirms
          if (!usePlayerStore.getState().isOnboarded) {
             usePlayerStore.getState().completeOnboarding();
          }

          const pStats = Array.isArray(data.character_stats) ? data.character_stats[0] : data.character_stats;
          usePlayerStore.getState().initStats(data.level, data.xp_current, data.xp_to_next, pStats, data.current_streak, data.highest_streak, data.stat_points, data.avatar_id);
          setCharacterClass(data.class_name || "Novice");
          setCharacterRace(data.race || "Umano");
        } else {
          // Player missing in backend, assume new account
          router.push("/onboarding");
          return;
        }
      } catch (e) {
        console.error("Engine API unreachable, falling back to local Zustand cache.", e);
        if (!usePlayerStore.getState().isOnboarded) {
          router.push("/onboarding");
          return;
        }
      } finally {
        setMounted(true);
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push("/login");
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, [router]);

  const handleAllocateStat = async (statKey: string) => {
    if (!userId || allocating) return;
    setAllocating(statKey);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/player/allocate-stats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          stat: statKey,
          points: 1
        })
      });
      if (res.ok) {
        const data = await res.json();
        const pStats = Array.isArray(data.character_stats) ? data.character_stats[0] : data.character_stats;
        usePlayerStore.getState().initStats(data.level, data.xp_current, data.xp_to_next, pStats, data.current_streak, data.highest_streak, data.stat_points, data.avatar_id);
      } else {
        const err = await res.json();
        alert(err.message || "Errore durante l'allocazione dei punti");
      }
    } catch (e) {
      console.error("Error allocating stat:", e);
    } finally {
      setAllocating(null);
    }
  };

  const handleQuestComplete = async (
    questId: number,
    questTitle: string,
    duration: number,
    statType: string,
    category: 'STUDY' | 'WORKOUT' | 'MIXED' | 'CUSTOM'
  ) => {
    if (!mounted || !userId || completedQuests.includes(questId)) return;
    setCompletingQuest(questId);

    const statMapping: Record<string, string> = {
      int: 'intelligence', str: 'strength', end: 'endurance'
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/player/activity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          category,
          custom_name: questTitle,
          duration_minutes: duration,
          stat_type: statMapping[statType] || null,
          intensity_multiplier: 1.0
        })
      });
      if (res.ok) {
        const data = await res.json();
        const pStats = Array.isArray(data.character_stats) ? data.character_stats[0] : data.character_stats;
        usePlayerStore.getState().initStats(data.level, data.xp_current, data.xp_to_next, pStats, data.current_streak, data.highest_streak, data.stat_points, data.avatar_id);
        
        // Save to localStorage
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        setCompletedQuests(prev => {
          const next = [...prev, questId];
          localStorage.setItem("life-rpg-completed-quests", JSON.stringify({
            date: dateStr,
            completed: next
          }));
          return next;
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCompletingQuest(null);
    }
  };

  const progressPercent = mounted ? (currentXP / xpToNextLevel) * 100 : 0;
  const displayUsername = username || "Hero";

  const dailyQuests = [
    { id: 1, title: "Deep Focus (45m)", icon: <BookOpen className="w-5 h-5" />, duration: 45, type: "int", category: "STUDY" as const },
    { id: 2, title: "Physical Training", icon: <Swords className="w-5 h-5" />, duration: 60, type: "str", category: "WORKOUT" as const },
    { id: 3, title: "Stay Hydrated (2L)", icon: <Activity className="w-5 h-5" />, duration: 5, type: "end", category: "MIXED" as const },
  ];

  // Dynamic scale: the chart "breathes" with the player. At low stats the polygon
  // fills ~60-70% of the area so progress is always visible. As stats grow the
  // scale expands smoothly — no sudden shrink moments.
  const dynamicMax = mounted && stats
    ? Math.max(
      stats.intelligence, stats.strength, stats.endurance,
      stats.discipline, stats.focus, stats.knowledge, stats.health
    ) * 1.5
    : 5;
  const fullMark = Math.max(Math.ceil(dynamicMax), 5);

  const radarData = mounted && stats ? [
    { subject: 'INT', A: stats.intelligence || 1, fullMark },
    { subject: 'STR', A: stats.strength || 1, fullMark },
    { subject: 'END', A: stats.endurance || 1, fullMark },
    { subject: 'DIS', A: stats.discipline || 1, fullMark },
    { subject: 'FOC', A: stats.focus || 1, fullMark },
    { subject: 'KNO', A: stats.knowledge || 1, fullMark },
    { subject: 'HLT', A: stats.health || 1, fullMark },
  ] : [];

  return (
    <div className="space-y-8">

      {/* Header / Player Status */}
      <GlassCard glow glowColor="primary" className="p-6 flex flex-col md:flex-row items-center gap-6 shadow-2xl relative" hoverEffect={false}>

          <div className="relative group cursor-pointer">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/40 transition duration-500"></div>
            <div className="w-24 h-24 bg-surface-border rounded-full border-2 border-primary/50 flex items-center justify-center relative z-10 overflow-hidden">
              {avatarId ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/avatars/${avatarId}.png`}
                    className="w-full h-full object-cover"
                    alt="Avatar"
                    onError={(e) => { e.currentTarget.style.display = 'none'; usePlayerStore.setState({ avatarId: null }); }}
                  />
                </>
              ) : (
                <User className="w-10 h-10 text-primary" />
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-primary text-[#09090b] text-xs font-bold px-2 py-1 rounded-md z-20 shadow-lg">
              LVL {mounted ? level : '-'}
            </div>
          </div>

          <div className="flex-1 w-full md:pr-8">
            <div className="flex justify-between items-end mb-3 md:mb-2 pr-10 md:pr-0">
              <div className="w-full md:w-auto">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight break-all md:break-normal">{displayUsername}</h1>
                <p className="text-xs md:text-sm text-foreground/60 flex flex-wrap items-center gap-1.5 md:gap-2 mt-1">
                  <span className="text-accent font-medium capitalize">{mounted ? `${characterRace} ${characterClass}` : 'Umano Novice'}</span>
                  <span className="inline-flex items-center gap-1 bg-surface-border px-2 py-0.5 rounded text-[10px] md:text-xs">
                    <Flame className="w-3 h-3 text-orange-500" />
                    {mounted ? `Day ${currentStreak} Streak` : 'Day - Streak'}
                  </span>
                </p>
              </div>
              <div className="hidden md:block text-right whitespace-nowrap pl-4">
                <span className="text-primary font-mono font-bold">{mounted ? Math.floor(currentXP) : 0}</span>
                <span className="text-foreground/40 font-mono text-sm"> / {mounted ? Math.floor(xpToNextLevel) : 1000} XP</span>
              </div>
            </div>

            <div className="h-5 md:h-3 w-full bg-surface-border rounded-full overflow-hidden shadow-inner relative flex items-center justify-center">
              <div
                style={{ width: `${progressPercent}%` }}
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-primary/50 to-primary rounded-full transition-[width] duration-[1500ms] ease-out"
              >
                <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-white/30 to-transparent blur-sm"></div>
              </div>
              <div className="absolute z-10 text-[10px] md:hidden font-mono font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-wider">
                {mounted ? Math.floor(currentXP) : 0} / {mounted ? Math.floor(xpToNextLevel) : 1000} XP
              </div>
            </div>
          </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stats, Buffs, and Quest Board */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stat Attributes */}
          <GlassCard className="p-6 relative overflow-hidden" hoverEffect={false}>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex justify-between items-center mb-4 relative z-10">
              <h2 className="text-lg font-semibold text-foreground/80 flex items-center gap-2">
                <Activity className="w-5 h-5 text-accent" />
                Stat Attributes
              </h2>
              <div className="flex bg-surface/50 border border-surface-border rounded-lg p-1">
                <button
                  onClick={() => setStatView('chart')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${statView === 'chart' ? 'bg-primary text-[#09090b] shadow-sm' : 'text-foreground/60 hover:text-foreground hover:bg-white/5'}`}
                >
                  Grafico
                </button>
                <button
                  onClick={() => setStatView('table')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${statView === 'table' ? 'bg-primary text-[#09090b] shadow-sm' : 'text-foreground/60 hover:text-foreground hover:bg-white/5'}`}
                >
                  Tabella
                </button>
              </div>
            </div>
            
            <div className="relative">
              {statView === 'chart' ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center justify-center h-64 border border-white/5 rounded-xl bg-surface/20 p-2"
                >
                  {mounted && radarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#ffffff20" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#ffffff80', fontSize: 11, fontWeight: 600 }} />
                        <PolarRadiusAxis angle={30} domain={[0, fullMark]} tick={false} axisLine={false} />
                        <Radar
                          name="Attributes"
                          dataKey="A"
                          stroke="#f59e0b"
                          fill="#f59e0b"
                          fillOpacity={0.4}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#09090b', borderColor: '#ffffff20', borderRadius: '12px' }}
                          itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="border border-white/5 rounded-xl bg-surface/10 overflow-hidden flex flex-col justify-center min-h-[16rem] p-4 space-y-4"
                >
                  {mounted && statPoints > 0 && (
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                      <span className="text-primary font-extrabold flex items-center gap-1.5 animate-pulse">
                        ✨ Hai {statPoints} Punti Statistica!
                      </span>
                      <span className="text-foreground/50">Clicca sul pulsante "+" per assegnarli.</span>
                    </div>
                  )}

                  <table className="w-full text-sm text-left">
                    <thead className="bg-surface/30 text-foreground/60 text-xs uppercase border-b border-white/5">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Statistica</th>
                        <th className="px-4 py-3 font-semibold text-right">Valore</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {mounted && stats ? (
                        [
                          { key: 'intelligence', label: 'Intelligence (INT)', value: stats.intelligence || 0 },
                          { key: 'strength', label: 'Strength (STR)', value: stats.strength || 0 },
                          { key: 'endurance', label: 'Endurance (END)', value: stats.endurance || 0 },
                          { key: 'discipline', label: 'Discipline (DIS)', value: stats.discipline || 0 },
                          { key: 'focus', label: 'Focus (FOC)', value: stats.focus || 0 },
                          { key: 'knowledge', label: 'Knowledge (KNO)', value: stats.knowledge || 0 },
                          { key: 'health', label: 'Health (HLT)', value: stats.health || 0 },
                        ].map((stat, i) => (
                          <tr key={i} className="hover:bg-white/5 transition-colors group">
                            <td className="px-4 py-2 font-medium text-foreground/80 group-hover:text-foreground transition-colors">{stat.label}</td>
                            <td className="px-4 py-2 text-right flex items-center justify-end gap-3">
                              <span className="font-mono text-primary font-bold">{Number(stat.value).toFixed(2)}</span>
                              {statPoints > 0 && (
                                <button
                                  onClick={() => handleAllocateStat(stat.key)}
                                  disabled={allocating !== null}
                                  className="px-2 py-0.5 rounded bg-primary text-[#09090b] text-[10px] font-black hover:bg-primary/90 transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
                                  title={`Assegna 1 punto a ${stat.label}`}
                                >
                                  {allocating === stat.key ? '...' : '+'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="text-center py-8 text-foreground/50 text-xs">Caricamento...</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </motion.div>
              )}
            </div>
          </GlassCard>

          {/* Buffs and Skills Tracker */}
          <BuffsTracker characterClass={characterClass} currentStreak={currentStreak} />

          {/* Quest Board */}
          <section className="bg-surface/10 border border-surface-border/50 rounded-2xl p-6">
            <div className="flex justify-between items-end mb-4 px-1">
              <h2 className="text-lg font-semibold text-foreground/80">Daily Quests</h2>
              <span className="text-sm text-primary/80 font-mono">{resetCountdown || "Resets in --:--:--"}</span>
            </div>

            <div className="space-y-3">
              {dailyQuests.map((quest) => {
                return (
                  <div
                    key={quest.id}
                    onClick={() => handleQuestComplete(quest.id, quest.title, quest.duration, quest.type, quest.category)}
                    className={`bg-surface/40 hover:bg-surface/60 transition duration-300 border border-surface-border p-4 rounded-xl flex items-center gap-4 relative overflow-hidden group ${completingQuest === quest.id || completedQuests.includes(quest.id) ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
                  >
                    <div className={`p-3 rounded-lg flex items-center justify-center ${quest.type === 'int' ? 'bg-[#3b82f6]/10 text-[#3b82f6]' :
                      quest.type === 'str' ? 'bg-[#ef4444]/10 text-[#ef4444]' :
                        'bg-[#10b981]/10 text-[#10b981]'
                      }`}>
                      {completingQuest === quest.id ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        quest.icon
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-medium text-foreground transition-colors">{quest.title}</h3>
                      <p className="text-xs text-foreground/50 mt-1">Reward: +{quest.duration * 10} XP &amp; +{((quest.duration / 60) * 0.1).toFixed(2)} {quest.type.toUpperCase()}</p>
                    </div>
                    <div className="text-right min-w-[60px]">
                      <button className="text-xs font-bold text-primary bg-primary/10 px-4 py-2 rounded-lg group-hover:bg-primary group-hover:text-[#09090b] transition-all duration-300 shadow-sm">
                        {completedQuests.includes(quest.id) ? '✓ DONE' : 'COMPLETE'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column: Interactive Actions, Boss Tracker, Quick Logger */}
        <div className="space-y-6">
          {/* Sanctum Portal */}
          <GlassCard
            glow
            glowColor="accent"
            className="p-6 overflow-hidden relative group cursor-pointer flex flex-col justify-between min-h-[220px]"
            hoverEffect={true}
            onClick={() => router.push("/sanctum")}
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl pointer-events-none"></div>
            
            {/* Spinning vector rings */}
            <div className="absolute -right-8 -bottom-8 w-44 h-44 flex items-center justify-center opacity-30 group-hover:opacity-50 transition duration-500">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                className="absolute w-40 h-40 border border-dashed border-accent rounded-full"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                className="absolute w-32 h-32 border border-dotted border-accent/70 rounded-full"
              />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                className="absolute w-20 h-20 border border-accent/40 rounded-full flex items-center justify-center"
              >
                <Clock className="w-8 h-8 text-accent animate-pulse" />
              </motion.div>
            </div>

            <div className="relative z-10 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-accent bg-accent/10 px-2.5 py-1 rounded-full">
                    Aether Focus Chamber
                  </span>
                  <h3 className="text-xl font-bold tracking-tight mt-2 text-foreground/90 group-hover:text-accent transition duration-300">
                    Portale del Sanctum
                  </h3>
                </div>
              </div>

              <div>
                <p className="text-xs text-foreground/60 max-w-[200px]">
                  Accedi allo spazio di focalizzazione per canalizzare il mana e sconfiggere i boss in tempo reale.
                </p>
              </div>
            </div>

            <div className="relative z-10 flex justify-between items-center mt-6">
              <div className="flex flex-col">
                <span className="text-[10px] text-foreground/40 font-mono uppercase tracking-wider">Aether Time</span>
                <span className="text-2xl font-mono font-bold text-accent drop-shadow-[0_0_8px_rgba(20,184,166,0.4)]">
                  {mounted ? timeStr || "00:00:00" : "00:00:00"}
                </span>
              </div>
              
              <button className="flex items-center gap-1.5 text-xs font-bold text-accent bg-accent/10 hover:bg-accent hover:text-[#09090b] px-4 py-2.5 rounded-lg transition-all duration-300 shadow-lg border border-accent/20 active:scale-95">
                <span>ENTRA</span>
                <Swords className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </GlassCard>

          {/* Boss Tracker */}
          <BossTracker />

          {/* Quick Logger */}
          <QuickLogger />
        </div>
      </div>

    </div>
  );
}
