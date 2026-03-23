"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Swords, Activity, Clock, Flame } from "lucide-react";
import Link from "next/link";
import { usePlayerStore } from "@/store/usePlayerStore";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface ActivityLog {
    id: number;
    created_at: string;
    category: string;
    custom_name: string;
    duration_minutes: number;
    xp_yield: number;
    stats_yield: Record<string, number>;
}

export default function TheChronicles() {
    const { userId, setAuth } = usePlayerStore();
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push("/login"); return; }
            const user = session.user;
            setAuth(user.id, user.user_metadata?.username || user.email?.split("@")[0] || "Hero");

            try {
                const res = await fetch(`http://localhost:3001/player/activities`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setActivities(data);
                }
            } catch (e) {
                console.error("Failed to fetch chronicles", e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [router, setAuth]);

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'STUDY': return <BookOpen className="w-5 h-5 text-blue-400" />;
            case 'WORKOUT': return <Swords className="w-5 h-5 text-red-400" />;
            default: return <Activity className="w-5 h-5 text-emerald-400" />;
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'STUDY': return 'bg-blue-500/10 border-blue-500/20';
            case 'WORKOUT': return 'bg-red-500/10 border-red-500/20';
            default: return 'bg-emerald-500/10 border-emerald-500/20';
        }
    };

    const formatDate = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <main className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 flex flex-col relative overflow-y-auto pb-12">
            <div className="absolute inset-0 bg-[#09090b] -z-10 fixed" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-surface/40 via-background to-background -z-10 fixed"></div>

            <div className="max-w-3xl mx-auto w-full p-6 pt-12 space-y-8 relative z-10">
                <header className="flex items-center gap-4 mb-2">
                    <Link href="/">
                        <button className="p-3 bg-surface/80 backdrop-blur border border-surface-border hover:bg-surface rounded-full transition-colors text-foreground">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-primary drop-shadow-[0_0_10px_rgba(245,158,11,0.5)] flex items-center gap-3">
                            <Flame className="w-6 h-6 text-orange-500 opacity-80" /> The Chronicles
                        </h1>
                        <p className="text-foreground/70 text-sm mt-1">L'eco delle tue gesta passate nel mondo reale.</p>
                    </div>
                </header>

                <div className="space-y-6">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="text-center p-12 bg-surface/50 rounded-2xl border border-surface-border">
                            <p className="text-foreground/50">Nessuna impresa è stata ancora compiuta.</p>
                        </div>
                    ) : (
                        activities.map((act, index) => (
                            <motion.div
                                key={act.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`p-5 rounded-2xl relative overflow-hidden border backdrop-blur-xl flex gap-4 ${getCategoryColor(act.category)}`}
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                                
                                <div className="flex flex-col items-center justify-start mt-1">
                                    <div className="p-3 bg-background/50 rounded-xl shadow-inner border border-white/5">
                                        {getCategoryIcon(act.category)}
                                    </div>
                                    <div className="w-px h-full bg-white/10 mt-4 rounded-full"></div>
                                </div>
                                
                                <div className="flex-1 pb-2">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="text-lg font-bold text-foreground/90">{act.custom_name}</h3>
                                        <span className="text-xs font-mono text-foreground/40">{formatDate(act.created_at)}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs font-medium text-foreground/60 mb-4 uppercase tracking-wider">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {act.duration_minutes}m
                                        </span>
                                        <span>•</span>
                                        <span className="text-primary/80 drop-shadow-[0_0_4px_rgba(245,158,11,0.4)]">
                                            +{act.xp_yield} XP
                                        </span>
                                    </div>

                                    {act.stats_yield && Object.keys(act.stats_yield).length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(act.stats_yield).map(([stat, val]) => (
                                                <span key={stat} className="px-3 py-1 bg-background/60 border border-white/5 rounded-lg text-xs font-semibold text-foreground/80 flex items-center gap-1.5 shadow-sm">
                                                    <span className="text-accent">+{Number(val).toFixed(2)}</span>
                                                    {stat.toUpperCase()}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </main>
    );
}
