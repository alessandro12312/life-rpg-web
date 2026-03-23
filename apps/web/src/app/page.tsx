"use client";

import { motion } from "framer-motion";
import { User, Swords, BookOpen, Clock, Activity, Flame, LogOut, Trophy, History } from "lucide-react";
import Link from "next/link";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function TavernDashboard() {
  const { currentXP, xpToNextLevel, level, setAuth, initStats, username, stats, userId, currentStreak, logout } = usePlayerStore();
  const [mounted, setMounted] = useState(false);
  const [characterClass, setCharacterClass] = useState("Novice");
  const [characterRace, setCharacterRace] = useState("Umano");
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [completingQuest, setCompletingQuest] = useState<number | null>(null);
  const [completedQuests, setCompletedQuests] = useState<number[]>([]);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const user = session.user;
      const uname = user.user_metadata?.username || user.email?.split('@')[0] || "Hero";
      setAuth(user.id, uname);

      // Hydrate with Real Engine Data
      try {
        const res = await fetch(`http://localhost:3001/player/me`, {
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
          initStats(data.level, data.xp_current, data.xp_to_next, pStats, data.current_streak, data.highest_streak);
          setCharacterClass(data.class_name || "Novice");
          setCharacterRace(data.race || "Umano");
          setAvatarId(data.avatar_id || null);
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

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') router.push("/login");
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, [router, setAuth, initStats]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    router.push("/login");
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
      const res = await fetch(`http://localhost:3001/player/activity`, {
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
        initStats(data.level, data.xp_current, data.xp_to_next, pStats, data.current_streak, data.highest_streak);
        setCompletedQuests(prev => [...prev, questId]);
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
    <main className="min-h-screen bg-background text-foreground p-4 lg:p-8 font-sans selection:bg-primary/30">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header / Player Status */}
        <section className="bg-surface/50 border border-surface-border p-6 rounded-2xl backdrop-blur-md flex flex-col md:flex-row items-center gap-6 shadow-2xl relative">

          <button
            onClick={handleLogout}
            className="absolute top-4 right-4 p-2 rounded-lg bg-surface hover:bg-surface-border text-foreground/50 hover:text-[#ef4444] transition-colors border border-surface-border/50 group"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>

          <div className="relative group cursor-pointer">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/40 transition duration-500"></div>
            <div className="w-24 h-24 bg-surface-border rounded-full border-2 border-primary/50 flex items-center justify-center relative z-10 overflow-hidden">
              {avatarId ? (
                <img
                  src={`/avatars/${avatarId}.png`}
                  className="w-full h-full object-cover"
                  alt="Avatar"
                  onError={(e) => { e.currentTarget.style.display = 'none'; setAvatarId(null); }}
                />
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
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-primary/50 to-primary rounded-full"
              >
                <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-white/30 to-transparent blur-sm"></div>
              </motion.div>
              <div className="absolute z-10 text-[10px] md:hidden font-mono font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-wider">
                {mounted ? Math.floor(currentXP) : 0} / {mounted ? Math.floor(xpToNextLevel) : 1000} XP
              </div>
            </div>
          </div>
        </section>

        {/* Middle Area: Stats & Quick Actions */}
        <section className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-surface/30 border border-surface-border rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/5 rounded-full blur-3xl"></div>
            <h2 className="text-lg font-semibold mb-4 text-foreground/80 flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent" />
              Stat Attributes
            </h2>
            <div className="flex items-center justify-center h-64 border border-white/5 rounded-xl bg-surface/20 p-2">
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
            </div>
          </div>

          <div className="space-y-4">
            <Link href="/sanctum" className="block w-full">
              <button className="w-full relative group overflow-hidden bg-surface hover:bg-surface-border transition-colors border border-surface-border p-5 rounded-2xl flex flex-col items-center justify-center gap-3">
                <div className="absolute inset-0 bg-gradient-to-tr from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <span className="font-semibold tracking-wide">Enter The Sanctum</span>
                <span className="text-xs text-foreground/50">Start Focus Session</span>
              </button>
            </Link>

            <Link href="/log-activity" className="block w-full">
              <button
                className="w-full relative group overflow-hidden bg-surface hover:bg-surface-border transition-colors border border-surface-border p-5 rounded-2xl flex flex-col items-center justify-center gap-3"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-[#ef4444]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-12 h-12 rounded-full bg-[#ef4444]/10 text-[#ef4444] flex items-center justify-center">
                  <Swords className="w-6 h-6" />
                </div>
                <span className="font-semibold tracking-wide">Log Activity</span>
                <span className="text-xs text-foreground/50">Sync Workout or Manual Log</span>
              </button>
            </Link>
          </div>
        </section>

        {/* Navigation Links */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/history" className="block w-full">
            <button className="w-full bg-surface border border-surface-border hover:bg-surface-border transition p-4 rounded-xl flex flex-col items-center gap-2">
              <History className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-medium">Cronologia</span>
            </button>
          </Link>
          <Link href="/library" className="block w-full">
            <button className="w-full bg-surface border border-surface-border hover:bg-surface-border transition p-4 rounded-xl flex flex-col items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#3b82f6]" />
              <span className="text-sm font-medium">Scrittoio</span>
            </button>
          </Link>
          <Link href="/grimoire" className="block w-full">
            <button className="w-full bg-surface border border-surface-border hover:bg-surface-border transition p-4 rounded-xl flex flex-col items-center gap-2">
              <User className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium">Grimorio</span>
            </button>
          </Link>
          <Link href="/achievements" className="block w-full">
            <button className="w-full bg-surface border border-surface-border hover:bg-surface-border transition p-4 rounded-xl flex flex-col items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Trofei</span>
            </button>
          </Link>
        </section>

        {/* Quest Board */}
        <section>
          <div className="flex justify-between items-end mb-4 px-1">
            <h2 className="text-lg font-semibold text-foreground/80">Daily Quests</h2>
            <span className="text-sm text-primary/80 font-mono">Resets in 6h 24m</span>
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
                  <div className="flex-1">
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
    </main>
  );
}
