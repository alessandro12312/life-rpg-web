"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Target, Plus, ArrowLeft, CheckCircle, Clock, Swords, BookOpen, Dumbbell } from "lucide-react";
import Link from "next/link";
import { usePlayerStore } from "@/store/usePlayerStore";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

interface Achievement {
    id: string; name: string; description: string; icon: string;
}

interface UnlockedAchievement {
    achievement_id: string; unlocked_at: string;
}

interface Goal {
    id: string; title: string; category: string;
    target_minutes: number; current_minutes: number;
    completed: boolean; xp_reward: number; deadline?: string;
}

const getRarity = (name: string) => {
    const lowercase = name.toLowerCase();
    if (lowercase.includes("leggend") || lowercase.includes("lord") || lowercase.includes("master") || lowercase.includes("s-rank") || lowercase.includes("100 ore") || lowercase.includes("oro") || lowercase.includes("gold")) {
        return "LEGENDARY";
    }
    if (lowercase.includes("epic") || lowercase.includes("campione") || lowercase.includes("veterano") || lowercase.includes("focus") || lowercase.includes("50h") || lowercase.includes("perfect") || lowercase.includes("argento") || lowercase.includes("silver")) {
        return "EPIC";
    }
    return "COMMON";
};

export default function AchievementsPage() {
    const { userId } = usePlayerStore();
    const [catalog, setCatalog] = useState<Achievement[]>([]);
    const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
    const [unlockedMap, setUnlockedMap] = useState<Record<string, string>>({});
    const [goals, setGoals] = useState<Goal[]>([]);
    const [showNewGoal, setShowNewGoal] = useState(false);
    const [newGoal, setNewGoal] = useState({ title: '', category: 'STUDY', target_hours: 5 });
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'achievements' | 'goals'>('achievements');

    useEffect(() => {
        if (!userId) return;
        const fetchData = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const [achRes, goalsRes] = await Promise.all([
                    fetch(`${API_URL}/player/achievements`, { headers: { 'Authorization': `Bearer ${session?.access_token}` } }),
                    fetch(`${API_URL}/player/goals`, { headers: { 'Authorization': `Bearer ${session?.access_token}` } }),
                ]);
                if (achRes.ok) {
                    const achData = await achRes.json();
                    setCatalog(achData.catalog);
                    setUnlockedIds(achData.unlockedIds);
                    const map: Record<string, string> = {};
                    (achData.unlocked as UnlockedAchievement[]).forEach(u => { map[u.achievement_id] = u.unlocked_at; });
                    setUnlockedMap(map);
                }
                if (goalsRes.ok) {
                    const goalsData = await goalsRes.json();
                    setGoals(goalsData);
                }
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        fetchData();
    }, [userId]);

    const handleCreateGoal = async () => {
        if (!userId || !newGoal.title.trim()) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API_URL}/player/goals`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    title: newGoal.title,
                    category: newGoal.category,
                    target_minutes: newGoal.target_hours * 60,
                    xp_reward: 200,
                }),
            });
            if (res.ok) {
                const created = await res.json();
                setGoals(prev => [created, ...prev]);
                setNewGoal({ title: '', category: 'STUDY', target_hours: 5 });
                setShowNewGoal(false);
            }
        } catch (e) { console.error(e); }
    };

    const categoryIcon = (cat: string) => {
        if (cat === 'STUDY') return <BookOpen className="w-4 h-4" />;
        if (cat === 'WORKOUT') return <Dumbbell className="w-4 h-4" />;
        return <Swords className="w-4 h-4" />;
    };

    const categoryColor = (cat: string) => {
        if (cat === 'STUDY') return 'text-blue-400 bg-blue-400/10';
        if (cat === 'WORKOUT') return 'text-red-400 bg-red-400/10';
        return 'text-purple-400 bg-purple-400/10';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-pulse text-foreground/50 font-mono">Loading...</div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header / Navigation */}
            <header className="flex items-center gap-4 pb-2">
                <Link href="/">
                    <button className="p-3 bg-surface/80 backdrop-blur border border-surface-border hover:bg-surface rounded-full transition-colors text-foreground">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary drop-shadow-[0_0_10px_rgba(245,158,11,0.5)] flex items-center gap-3">
                        <Trophy className="w-6 h-6 text-primary opacity-80" /> Trofei & Obiettivi
                    </h1>
                    <p className="text-foreground/70 text-sm mt-1">Conquiste e traguardi raggiunti nel tuo viaggio.</p>
                </div>
            </header>

                {/* Tabs */}
                <div className="flex gap-2 mb-8">
                    <button
                        onClick={() => setTab('achievements')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                            tab === 'achievements'
                                ? 'bg-primary/20 text-primary border border-primary/30'
                                : 'bg-surface/40 text-foreground/50 border border-surface-border hover:text-foreground/80'
                        }`}
                    >
                        <Trophy className="w-4 h-4" />
                        Trofei ({unlockedIds.length}/{catalog.length})
                    </button>
                    <button
                        onClick={() => setTab('goals')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                            tab === 'goals'
                                ? 'bg-accent/20 text-accent border border-accent/30'
                                : 'bg-surface/40 text-foreground/50 border border-surface-border hover:text-foreground/80'
                        }`}
                    >
                        <Target className="w-4 h-4" />
                        Obiettivi ({goals.filter(g => !g.completed).length} attivi)
                    </button>
                </div>

                {/* ── Achievements Tab ── */}
                {tab === 'achievements' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                    >
                        {catalog.map((ach, i) => {
                            const isUnlocked = unlockedIds.includes(ach.id);
                            const unlockedDate = unlockedMap[ach.id];
                            const rarity = getRarity(ach.name);
                            
                            const rarityStyle = rarity === 'LEGENDARY'
                                ? {
                                    border: 'border-amber-500/30 hover:border-amber-400/60',
                                    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_30px_rgba(245,158,11,0.35)]',
                                    text: 'text-amber-400 font-serif',
                                    bg: 'bg-gradient-to-b from-amber-500/5 via-[#0c0c14]/95 to-amber-950/15',
                                    badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                                    label: 'Leggendario',
                                    light: 'from-amber-400/20 to-transparent'
                                }
                                : rarity === 'EPIC'
                                ? {
                                    border: 'border-purple-500/30 hover:border-purple-400/60',
                                    glow: 'shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:shadow-[0_0_30px_rgba(168,85,247,0.35)]',
                                    text: 'text-purple-400',
                                    bg: 'bg-gradient-to-b from-purple-500/5 via-[#0c0c14]/95 to-purple-950/15',
                                    badge: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
                                    label: 'Epico',
                                    light: 'from-purple-400/20 to-transparent'
                                }
                                : {
                                    border: 'border-blue-500/30 hover:border-blue-400/60',
                                    glow: 'shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_30px_rgba(59,130,246,0.35)]',
                                    text: 'text-blue-400',
                                    bg: 'bg-gradient-to-b from-blue-500/5 via-[#0c0c14]/95 to-blue-950/15',
                                    badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
                                    label: 'Raro',
                                    light: 'from-blue-400/20 to-transparent'
                                };

                            return (
                                <motion.div
                                    key={ach.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    className={`relative p-5 rounded-2xl border text-center transition-all duration-300 group flex flex-col justify-between min-h-[220px] ${
                                        isUnlocked
                                            ? `${rarityStyle.bg} ${rarityStyle.border} ${rarityStyle.glow}`
                                            : 'bg-zinc-950/40 border-zinc-900/65 opacity-40 hover:opacity-50'
                                    }`}
                                >
                                    {/* Glass reflection line */}
                                    <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />

                                    {/* Unlocked background rarity ray of light */}
                                    {isUnlocked && (
                                        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-20 h-28 bg-gradient-to-b ${rarityStyle.light} blur-2xl opacity-40 pointer-events-none rounded-full`} />
                                    )}

                                    {/* Trophy / Icon container floating on pedestal */}
                                    <div className="relative my-4 flex flex-col items-center justify-center flex-1">
                                        <motion.div
                                            animate={isUnlocked ? {
                                                y: [0, -6, 0],
                                            } : {}}
                                            transition={{
                                                duration: 4,
                                                repeat: Infinity,
                                                ease: "easeInOut",
                                                delay: i * 0.15
                                            }}
                                            className="text-4xl filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
                                        >
                                            {isUnlocked ? ach.icon : '🔒'}
                                        </motion.div>
                                        
                                        {/* Physical pedestal base visual */}
                                        <div className="w-12 h-1 bg-zinc-800 rounded-full mt-2 shadow-[0_1px_2px_rgba(255,255,255,0.05)] border-t border-zinc-700/50" />
                                    </div>

                                    {/* Rarity and name details */}
                                    <div className="space-y-1 relative z-10">
                                        {isUnlocked ? (
                                            <>
                                                <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${rarityStyle.badge}`}>
                                                    {rarityStyle.label}
                                                </span>
                                                <h3 className={`text-xs font-black truncate mt-1.5 ${rarityStyle.text}`}>
                                                    {ach.name}
                                                </h3>
                                                <p className="text-[10px] text-foreground/50 line-clamp-2 leading-relaxed">
                                                    {ach.description}
                                                </p>
                                                {unlockedDate && (
                                                    <p className="text-[9px] text-foreground/30 font-mono mt-1">
                                                        Ottenuto il {new Date(unlockedDate).toLocaleDateString('it-IT')}
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-600 border border-zinc-800">
                                                    Misterioso
                                                </span>
                                                <h3 className="text-xs font-bold text-zinc-500 mt-1.5">
                                                    ???
                                                </h3>
                                                <p className="text-[10px] text-zinc-600 italic">
                                                    Completa le imprese per sbloccare.
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}

                {/* ── Goals Tab ── */}
                {tab === 'goals' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        {/* New Goal Button */}
                        <button
                            onClick={() => setShowNewGoal(!showNewGoal)}
                            className="w-full mb-6 py-3 rounded-xl border-2 border-dashed border-accent/30 text-accent/60 hover:text-accent hover:border-accent/60 transition-all flex items-center justify-center gap-2 text-sm font-semibold"
                        >
                            <Plus className="w-5 h-5" />
                            Nuovo Obiettivo
                        </button>

                        {/* New Goal Form */}
                        <AnimatePresence>
                            {showNewGoal && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden mb-6"
                                >
                                    <div className="bg-surface/40 border border-surface-border rounded-2xl p-5 space-y-4">
                                        <input
                                            type="text"
                                            placeholder="Es: Studia 10h questa settimana"
                                            value={newGoal.title}
                                            onChange={e => setNewGoal(g => ({ ...g, title: e.target.value }))}
                                            className="w-full px-4 py-3 rounded-xl bg-background/50 border border-surface-border text-foreground placeholder:text-foreground/30 focus:border-accent/50 focus:outline-none transition text-sm"
                                        />
                                        <div className="flex gap-3">
                                            <select
                                                value={newGoal.category}
                                                onChange={e => setNewGoal(g => ({ ...g, category: e.target.value }))}
                                                className="flex-1 px-4 py-3 rounded-xl bg-background/50 border border-surface-border text-foreground text-sm focus:border-accent/50 focus:outline-none"
                                            >
                                                <option value="STUDY">📚 Studio</option>
                                                <option value="WORKOUT">💪 Allenamento</option>
                                                <option value="MIXED">⚔️ Misto</option>
                                            </select>
                                            <div className="flex items-center gap-2 flex-1">
                                                <input
                                                    type="number"
                                                    min={1} max={100}
                                                    value={newGoal.target_hours}
                                                    onChange={e => setNewGoal(g => ({ ...g, target_hours: +e.target.value }))}
                                                    className="w-20 px-3 py-3 rounded-xl bg-background/50 border border-surface-border text-foreground text-sm text-center focus:border-accent/50 focus:outline-none"
                                                />
                                                <span className="text-foreground/50 text-sm">ore</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleCreateGoal}
                                            disabled={!newGoal.title.trim()}
                                            className="w-full py-3 rounded-xl font-bold bg-accent text-[#09090b] hover:scale-[1.01] transition-transform disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            Crea Obiettivo (+200 XP al completamento)
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Goals List */}
                        <div className="space-y-3">
                            {goals.map((goal, i) => {
                                const progress = Math.min(100, Math.round((goal.current_minutes / goal.target_minutes) * 100));
                                const hours = Math.floor(goal.current_minutes / 60);
                                const targetHours = Math.floor(goal.target_minutes / 60);
                                return (
                                    <GlassCard
                                        key={goal.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        glow={goal.completed}
                                        glowColor="end"
                                        className={cn(
                                            "p-4",
                                            goal.completed && "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 shadow-emerald-500/5"
                                        )}
                                        hoverEffect={!goal.completed}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${categoryColor(goal.category)}`}>
                                                    {categoryIcon(goal.category)}
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-semibold ${goal.completed ? 'text-emerald-400 line-through' : 'text-foreground'}`}>
                                                        {goal.title}
                                                    </p>
                                                    <p className="text-xs text-foreground/40">
                                                        {hours}h / {targetHours}h — +{goal.xp_reward} XP
                                                    </p>
                                                </div>
                                            </div>
                                            {goal.completed ? (
                                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                                            ) : (
                                                <span className="text-xs font-mono text-accent">{progress}%</span>
                                            )}
                                        </div>
                                        {/* Progress bar */}
                                        <div className="w-full h-2 bg-background/50 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                                className={`h-full rounded-full ${goal.completed ? 'bg-emerald-400' : 'bg-accent'}`}
                                            />
                                        </div>
                                    </GlassCard>
                                );
                            })}
                            {goals.length === 0 && (
                                <div className="text-center py-12 text-foreground/30">
                                    <Target className="w-10 h-10 mx-auto mb-3 opacity-50" />
                                    <p className="text-sm">Nessun obiettivo ancora. Creane uno!</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
        </div>
    );
}
