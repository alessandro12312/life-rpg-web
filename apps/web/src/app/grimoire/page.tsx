"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BookMarked, Zap, Shield, Brain, X } from "lucide-react";
import Link from "next/link";
import { usePlayerStore } from "@/store/usePlayerStore";
import { supabase } from "@/lib/supabase";
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
];

export default function TheGrimoire() {
    const { level, userId, setAuth, initStats } = usePlayerStore();
    const [activeNode, setActiveNode] = useState<string | null>(null);
    const [unlockedIds, setUnlockedIds] = useState<string[]>(["core_1"]);
    const [unlocking, setUnlocking] = useState(false);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    // SP: earned 1 per level after 5, minus those already spent
    const spentSP = unlockedIds.filter(id => id !== "core_1").length;
    const skillPoints = Math.max(0, level - 5) - spentSP;

    // Status is computed from real unlocked list
    const getStatus = useCallback((skill: typeof SKILLS[number]): "unlocked" | "available" | "locked" => {
        if (unlockedIds.includes(skill.id)) return "unlocked";
        if (skill.requires.every(r => unlockedIds.includes(r)) && skillPoints > 0) return "available";
        return "locked";
    }, [unlockedIds, skillPoints]);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push("/login"); return; }
            const user = session.user;
            setAuth(user.id, user.user_metadata?.username || user.email?.split("@")[0] || "Hero");
            try {
                const [statsRes, skillsRes] = await Promise.all([
                    fetch(`http://localhost:3001/player/${user.id}`, { headers: { 'Authorization': `Bearer ${session.access_token}` } }),
                    fetch(`http://localhost:3001/player/${user.id}/skills`, { headers: { 'Authorization': `Bearer ${session.access_token}` } }),
                ]);
                if (statsRes.ok) {
                    const data = await statsRes.json();
                    const pStats = Array.isArray(data.character_stats) ? data.character_stats[0] : data.character_stats;
                    initStats(data.level, data.xp_current, data.xp_to_next, pStats, data.current_streak, data.highest_streak);
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
    }, [router, setAuth, initStats]);

    const handleUnlock = async (skillId: string) => {
        if (!userId || unlocking) return;
        setUnlocking(true);
        try {
            const res = await fetch(`http://localhost:3001/player/${userId}/skills/unlock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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

    return (
        <main className="h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30 flex flex-col relative">
            <div className="absolute inset-0 bg-[#09090b] z-0" />

            {/* Dynamic Starfield Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-surface/40 via-background to-background z-0"></div>
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%23ffffff\\' fill-opacity=\\'1\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }}></div>

            {/* Header Overlay */}
            <header className="relative z-20 flex items-center justify-between p-6 bg-gradient-to-b from-background to-transparent pointer-events-none">
                <div className="flex items-center gap-4 pointer-events-auto">
                    <Link href="/">
                        <button className="p-2 bg-surface/80 backdrop-blur border border-surface-border hover:bg-surface rounded-full transition-colors text-foreground">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-primary drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                            The Grimoire
                        </h1>
                        <p className="text-foreground/70 text-sm">Constellation of Abilities</p>
                    </div>
                </div>

                <div className="pointer-events-auto bg-surface/80 backdrop-blur border border-surface-border px-4 py-2 rounded-xl flex items-center gap-3">
                    <span className="text-sm text-foreground/60 uppercase tracking-widest font-semibold">Skill Points</span>
                    <span className="text-xl font-bold text-accent drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">{skillPoints}</span>
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
                        <svg width="800" height="800" className="opacity-40">
                            <line x1="400" y1="400" x2="280" y2="300" stroke="var(--primary)" strokeWidth="2" strokeDasharray="4 4" />
                            <line x1="280" y1="300" x2="150" y2="220" stroke="var(--surface-border)" strokeWidth="2" />

                            <line x1="400" y1="400" x2="520" y2="300" stroke="var(--primary)" strokeWidth="2" strokeDasharray="4 4" />
                            <line x1="520" y1="300" x2="650" y2="220" stroke="var(--surface-border)" strokeWidth="2" />

                            <line x1="400" y1="400" x2="400" y2="240" stroke="var(--primary)" strokeWidth="3" />
                            <line x1="400" y1="240" x2="400" y2="100" stroke="var(--surface-border)" strokeWidth="2" />
                        </svg>
                    </div>

                    {/* Render Nodes */}
                    {SKILLS.map((skill) => {
                        const status = mounted ? getStatus(skill) : (skill.id === "core_1" ? "unlocked" : "locked");
                        return (
                            <motion.div
                                key={skill.id}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setActiveNode(skill.id)}
                                className="absolute pointer-events-auto"
                                style={{
                                    x: skill.x,
                                    y: skill.y
                                }}
                            >
                                <div className={`relative group w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-300
                ${status === 'unlocked' ? 'bg-primary/20 border-primary text-primary shadow-[0_0_30px_rgba(245,158,11,0.4)]' :
                                        status === 'available' ? 'bg-accent/10 border-accent/50 text-accent hover:border-accent hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer' :
                                            'bg-surface/50 border-surface-border text-foreground/20 cursor-not-allowed'}
              `}>
                                    {skill.icon}

                                    {/* Ping animation for available skills if user has points */}
                                    {status === 'available' && skillPoints > 0 && (
                                        <span className="absolute flex h-full w-full inset-0">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-20"></span>
                                        </span>
                                    )}
                                </div>
                                <p className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-mono font-semibold tracking-wider opacity-60">
                                    {skill.title}
                                </p>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>

            {/* Bottom Node Inspector Modals */}
            {activeNode && (() => {
                const skill = SKILLS.find(s => s.id === activeNode);
                const status = skill ? (mounted ? getStatus(skill) : "locked") : "locked";
                return (
                    <motion.div
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="absolute bottom-0 left-0 right-0 z-30 p-6 pointer-events-none"
                    >
                        <div className="max-w-2xl mx-auto bg-surface/90 backdrop-blur-xl border border-surface-border p-6 rounded-2xl shadow-2xl pointer-events-auto flex items-start gap-6">
                            <div className="p-4 bg-background rounded-xl border border-surface-border">
                                {skill?.icon}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold">{skill?.title}</h3>
                                <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
                                    {skill?.desc}
                                </p>

                                <div className="mt-6 flex justify-between items-center">
                                    <span className="text-xs font-mono uppercase text-foreground/40">Status: {status}</span>
                                    {status === 'available' && skillPoints > 0 && skill && (
                                        <button
                                            onClick={() => handleUnlock(skill.id)}
                                            disabled={unlocking}
                                            className="px-6 py-2 bg-accent text-[#09090b] font-bold rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:scale-105 transition-transform disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {unlocking && <span className="w-4 h-4 border-2 border-[#09090b] border-t-transparent rounded-full animate-spin" />}
                                            Unlock (1 SP)
                                        </button>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setActiveNode(null)} className="p-2 text-foreground/40 hover:text-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                );
            })()}

        </main>
    );
}
