"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, X, Music, CheckCircle } from "lucide-react";
import Link from "next/link";
import { usePlayerStore } from "@/store/usePlayerStore";
import { supabase } from "@/lib/supabase";

export default function Sanctum() {
    const { userId, initStats, currentStreak } = usePlayerStore();
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [bonusPercent, setBonusPercent] = useState(0);

    // Audio
    const audioRef = useRef<HTMLAudioElement>(null);
    const [selectedTrack, setSelectedTrack] = useState<string>("https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3");

    // Derived state
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const progressPercent = ((25 * 60 - timeLeft) / (25 * 60)) * 100;

    // Base XP = minutes * 10 * 1.2 intensity
    const elapsedSeconds = 25 * 60 - timeLeft;
    const minutesCompleted = Math.floor(elapsedSeconds / 60);
    const baseXP = Math.floor(minutesCompleted * 10 * 1.2);
    const estimatedXP = Math.floor(baseXP * (1 + bonusPercent / 100));

    // Fetch active skill bonuses on mount
    useEffect(() => {
        if (!userId) return;
        // Skill effects that apply to STUDY category sessions
        const SKILL_EFFECTS: Record<string, { type: string; value: number }> = {
            int_1: { type: 'study', value: 5 },   // +5% XP from STUDY
            def_1: { type: 'global', value: 5 },   // +5% XP global
            def_2: { type: 'global', value: 10 },  // +10% XP global
        };
        const fetchBonus = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch(`http://localhost:3001/player/${userId}/skills`, {
                    headers: { 'Authorization': `Bearer ${session?.access_token}` }
                });
                if (!res.ok) return;
                const data = await res.json();
                const ids: string[] = data.unlockedIds ?? [];
                let total = 0;
                for (const id of ids) {
                    const fx = SKILL_EFFECTS[id];
                    if (fx) total += fx.value;
                }
                // Streak bonus
                if (currentStreak >= 7) total += 10;
                else if (currentStreak >= 3) total += 5;
                setBonusPercent(total);
            } catch { /* fallback 0 */ }
        };
        fetchBonus();
    }, [userId, currentStreak]);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((time) => time - 1);
            }, 1000);
            if (audioRef.current && selectedTrack) {
                audioRef.current.play().catch(e => console.log("Audio autoplay blocked:", e));
            }
        } else if (timeLeft === 0 && isActive) {
            if (interval) clearInterval(interval);
            setIsActive(false);
            setIsFinished(true);
            if (audioRef.current) audioRef.current.pause();
        } else {
            if (audioRef.current) audioRef.current.pause();
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, timeLeft, selectedTrack]);

    const toggleTimer = () => {
        if (!isFinished) {
            setIsActive(!isActive);
        }
    };

    const endSessionEarly = async () => {
        setIsActive(false);
        if (!userId) return;
        const mins = Math.max(minutesCompleted, 1);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`http://localhost:3001/player/${userId}/activity`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    category: 'STUDY',
                    custom_name: 'Sanctum Deep Focus',
                    duration_minutes: mins,
                    stat_type: 'focus',
                    intensity_multiplier: 1.2
                })
            });
            if (res.ok) {
                const data = await res.json();
                const pStats = Array.isArray(data.character_stats) ? data.character_stats[0] : data.character_stats;
                initStats(data.level, data.xp_current, data.xp_to_next, pStats, data.current_streak, data.highest_streak);
            }
        } catch (e) {
            console.error(e);
        }
        window.location.href = '/';
    };

    return (
        <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-accent/30">

            {/* Immersive background aura */}
            <motion.div
                animate={{
                    scale: isActive ? [1, 1.05, 1] : 1,
                    opacity: isActive ? [0.1, 0.2, 0.1] : 0.05
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-gradient-radial from-accent/20 to-transparent flex items-center justify-center pointer-events-none"
            />

            <div className="z-10 w-full max-w-md flex flex-col items-center">

                {/* HUD Top */}
                <div className="w-full flex justify-between items-center mb-16 px-4">
                    <Link href="/">
                        <button className="text-foreground/50 hover:text-foreground transition flex items-center gap-2 group">
                            <X className="w-5 h-5 group-hover:bg-red-500/20 group-hover:text-red-500 rounded-full transition-all" />
                            <span className="text-sm font-medium">Abbandona</span>
                        </button>
                    </Link>
                    <div className="text-right">
                        <p className="text-xs text-foreground/50">Current Yield</p>
                        <p className="text-primary font-mono font-bold">{estimatedXP} XP</p>
                        {bonusPercent > 0 && (
                            <p className="text-xs text-emerald-400 font-mono">+{bonusPercent}% bonus</p>
                        )}
                    </div>
                </div>

                {/* The Core / Timer */}
                <div className="relative w-72 h-72 flex items-center justify-center mb-16">
                    {/* SVG Progress Ring */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                        {/* Background Ring */}
                        <circle
                            cx="144"
                            cy="144"
                            r="135"
                            fill="none"
                            stroke="var(--surface-border)"
                            strokeWidth="4"
                        />
                        {/* Active Ring */}
                        <motion.circle
                            cx="144"
                            cy="144"
                            r="135"
                            fill="none"
                            stroke="var(--accent)"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray="848" /* 2 * PI * r */
                            initial={{ strokeDashoffset: 848 }}
                            animate={{
                                strokeDashoffset: 848 - (848 * progressPercent) / 100
                            }}
                            transition={{ duration: 0.5, ease: "linear" }}
                        />
                    </svg>

                    {/* Time Display */}
                    <div className="flex flex-col items-center">
                        {isFinished ? (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex flex-col items-center text-primary"
                            >
                                <CheckCircle className="w-16 h-16 mb-2 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                                <span className="text-xl font-bold tracking-widest">COMPLETE</span>
                            </motion.div>
                        ) : (
                            <span className={`text-6xl font-mono font-bold tracking-tighter ${isActive ? 'text-accent drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-foreground'}`}>
                                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                            </span>
                        )}
                        {!isFinished && (
                            <span className="text-sm font-medium text-foreground/50 mt-2 uppercase tracking-widest">
                                Deep Focus
                            </span>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col w-full gap-6">
                    {!isFinished ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={toggleTimer}
                                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isActive
                                        ? 'bg-surface border border-accent/30 text-accent shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                                        : 'bg-accent text-[#09090b] shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-105'
                                        }`}
                                >
                                    {isActive ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                                </button>
                            </div>
                            {/* End Early button — visible when paused and at least 1 full minute elapsed */}
                            {!isActive && minutesCompleted >= 1 && (
                                <button
                                    onClick={endSessionEarly}
                                    className="px-5 py-2 rounded-full text-sm font-semibold border border-primary/40 text-primary hover:bg-primary/10 transition-all flex items-center gap-2"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Concludi — {estimatedXP} XP
                                </button>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={async () => {
                                if (!userId) return;
                                const minutesLog = Math.max(minutesCompleted, 1);
                                try {
                                    const { data: { session } } = await supabase.auth.getSession();
                                    const res = await fetch(`http://localhost:3001/player/${userId}/activity`, {
                                        method: "POST",
                                        headers: {
                                            "Content-Type": "application/json",
                                            "Authorization": `Bearer ${session?.access_token}`
                                        },
                                        body: JSON.stringify({
                                            category: 'STUDY',
                                            custom_name: 'Sanctum Deep Focus',
                                            duration_minutes: minutesLog,
                                            stat_type: 'focus',
                                            intensity_multiplier: 1.2
                                        })
                                    });
                                    if (res.ok) {
                                        const data = await res.json();
                                        const pStats = Array.isArray(data.character_stats) ? data.character_stats[0] : data.character_stats;
                                        initStats(data.level, data.xp_current, data.xp_to_next, pStats, data.current_streak, data.highest_streak);
                                        window.location.href = '/';
                                    }
                                } catch (e) {
                                    console.error(e);
                                    window.location.href = '/';
                                }
                            }}
                            className="w-full py-4 rounded-xl font-bold bg-primary text-[#09090b] shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:scale-[1.02] transition-transform"
                        >
                            Claim {Math.floor(Math.max(minutesCompleted, 1) * 10 * 1.2)} XP
                        </button>
                    )}

                    {/* Utilities Bar */}
                    <div className="flex justify-center mt-4">
                        <div className="flex items-center gap-2 text-foreground/60 transition px-4 py-2 rounded-full bg-surface/30 border border-surface-border">
                            <Music className="w-4 h-4 text-accent" />
                            <select
                                value={selectedTrack}
                                onChange={(e) => setSelectedTrack(e.target.value)}
                                className="bg-transparent text-xs font-medium focus:outline-none appearance-none cursor-pointer"
                            >
                                <option value="https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3">Lofi Study</option>
                                <option value="https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=ambient-piano-10874.mp3">Workout</option>
                                <option value="">Nessuna Musica</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Hidden Audio Player */}
                {selectedTrack && (
                    <audio
                        ref={audioRef}
                        src={selectedTrack}
                        loop
                        preload="auto"
                    />
                )}
            </div>
        </main >
    );
}
