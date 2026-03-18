"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Target, Plus, ArrowLeft, CheckCircle, Clock, Swords, BookOpen, Dumbbell } from "lucide-react";
import Link from "next/link";
import { usePlayerStore } from "@/store/usePlayerStore";
import { supabase } from "@/lib/supabase";

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
                    fetch(`http://localhost:3001/player/${userId}/achievements`, { headers: { 'Authorization': `Bearer ${session?.access_token}` } }),
                    fetch(`http://localhost:3001/player/${userId}/goals`, { headers: { 'Authorization': `Bearer ${session?.access_token}` } }),
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
            const res = await fetch(`http://localhost:3001/player/${userId}/goals`, {
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
            <main className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-pulse text-foreground/50 font-mono">Loading...</div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-background text-foreground p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <Link href="/">
                        <button className="text-foreground/50 hover:text-foreground transition flex items-center gap-2">
                            <ArrowLeft className="w-5 h-5" />
                            <span className="text-sm">Dashboard</span>
                        </button>
                    </Link>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        Trofei & Obiettivi
                    </h1>
                    <div className="w-20" />
                </div>

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
                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
                    >
                        {catalog.map((ach, i) => {
                            const isUnlocked = unlockedIds.includes(ach.id);
                            const unlockedDate = unlockedMap[ach.id];
                            return (
                                <motion.div
                                    key={ach.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    className={`relative p-4 rounded-2xl border text-center transition-all group ${
                                        isUnlocked
                                            ? 'bg-primary/5 border-primary/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                                            : 'bg-surface/30 border-surface-border opacity-50'
                                    }`}
                                >
                                    <div className={`text-3xl mb-2 ${isUnlocked ? '' : 'grayscale'}`}>
                                        {isUnlocked ? ach.icon : '🔒'}
                                    </div>
                                    <p className={`text-xs font-bold ${isUnlocked ? 'text-primary' : 'text-foreground/40'}`}>
                                        {isUnlocked ? ach.name : '???'}
                                    </p>
                                    {isUnlocked && (
                                        <p className="text-[10px] text-foreground/40 mt-1">{ach.description}</p>
                                    )}
                                    {isUnlocked && unlockedDate && (
                                        <p className="text-[10px] text-foreground/30 mt-1">
                                            {new Date(unlockedDate).toLocaleDateString('it-IT')}
                                        </p>
                                    )}
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
                                    <motion.div
                                        key={goal.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className={`p-4 rounded-2xl border transition-all ${
                                            goal.completed
                                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                                : 'bg-surface/40 border-surface-border'
                                        }`}
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
                                    </motion.div>
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
        </main>
    );
}
