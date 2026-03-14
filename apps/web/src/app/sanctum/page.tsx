"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, X, Music, CheckCircle } from "lucide-react";
import Link from "next/link";
import { usePlayerStore } from "@/store/usePlayerStore";
import { supabase } from "@/lib/supabase";

export default function Sanctum() {
    const { userId, initStats } = usePlayerStore();
    const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
    const [isActive, setIsActive] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    // Derived state
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const progressPercent = ((25 * 60 - timeLeft) / (25 * 60)) * 100;

    // Calculate estimated XP: 10 XP per minute completed
    const minutesCompleted = 25 - minutes - (seconds > 0 ? 1 : 0);
    const estimatedXP = Math.max(0, minutesCompleted * 10);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((time) => time - 1);
            }, 1000);
        } else if (timeLeft === 0 && isActive) {
            if (interval) clearInterval(interval);
            setIsActive(false);
            setIsFinished(true);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, timeLeft]);

    const toggleTimer = () => {
        if (!isFinished) {
            setIsActive(!isActive);
        }
    };

    const endSessionEarly = () => {
        setIsActive(false);
        setIsFinished(true);
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
                            <span className="text-sm font-medium">Abandon</span>
                        </button>
                    </Link>
                    <div className="text-right">
                        <p className="text-xs text-foreground/50">Current Yield</p>
                        <p className="text-primary font-mono font-bold">+{estimatedXP} XP</p>
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
                    ) : (
                        <button
                            onClick={async () => {
                                if (!userId) return;
                                const minutesLog = estimatedXP > 0 ? minutesCompleted : 25; // if finished full timer, log 25
                                try {
                                    const res = await fetch(`http://localhost:3001/player/${userId}/activity`, {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            category: 'FOCUS',
                                            custom_name: 'Sanctum Deep Focus',
                                            duration_minutes: minutesLog,
                                            stat_type: 'focus',
                                            intensity_multiplier: 1.2 // Focus sessions have x1.2 intensity bonus
                                        })
                                    });
                                    if (res.ok) {
                                        const data = await res.json();
                                        const pStats = Array.isArray(data.character_stats) ? data.character_stats[0] : data.character_stats;
                                        initStats(data.level, data.xp_current, data.xp_to_next, pStats);
                                        window.location.href = '/'; // Go back to dashboard on finish
                                    }
                                } catch (e) {
                                    console.error(e);
                                    window.location.href = '/';
                                }
                            }}
                            className="w-full py-4 rounded-xl font-bold bg-primary text-[#09090b] shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:scale-[1.02] transition-transform"
                        >
                            Claim {Math.floor((estimatedXP > 0 ? minutesCompleted : 25) * 10 * 1.2)} XP
                        </button>
                    )}

                    {/* Utilities Bar */}
                    <div className="flex justify-center mt-4">
                        <button
                            onClick={() => alert("Lofi Music Player Integration COMING SOON")}
                            className="flex items-center gap-2 text-foreground/40 hover:text-foreground/80 transition px-4 py-2 rounded-full bg-surface/30 border border-surface-border"
                        >
                            <Music className="w-4 h-4" />
                            <span className="text-xs font-medium">Ambient Lo-Fi</span>
                        </button>
                    </div>
                </div>

            </div>
        </main >
    );
}
