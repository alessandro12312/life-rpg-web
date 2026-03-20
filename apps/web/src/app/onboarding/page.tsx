"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { usePlayerStore } from "@/store/usePlayerStore";
import { BookOpen, Swords, Brain, ArrowRight, User, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function OnboardingPage() {
    const router = useRouter();
    const { userId, completeOnboarding, initStats } = usePlayerStore();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        studyHoursWeekly: 5,
        workoutHoursWeekly: 3,
        primaryGoal: "balanced",
        race: "umano",
        className: "guerriero"
    });

    const steps = [
        {
            title: "L'Inizio del Viaggio",
            desc: "Benvenuto viaggiatore. Prima di varcare le porte, i Custodi devono conoscere il tuo potenziale.",
            icon: <Brain className="w-16 h-16 text-primary mb-4" />
        },
        {
            title: "Il Tomo della Conoscenza",
            desc: "Quante ore a settimana dedichi abitualmente allo studio o alla lettura?",
            icon: <BookOpen className="w-12 h-12 text-[#3b82f6] mb-4" />,
            input: (
                <div className="w-full mt-6 space-y-4">
                    <input
                        type="range" min="0" max="40" step="1"
                        value={formData.studyHoursWeekly}
                        onChange={(e) => setFormData({ ...formData, studyHoursWeekly: parseInt(e.target.value) })}
                        className="w-full h-2 bg-surface-border rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="text-2xl font-bold text-center text-primary">{formData.studyHoursWeekly} Ore</div>
                </div>
            )
        },
        {
            title: "L'Arena",
            desc: "Quante ore a settimana dedichi all'allenamento fisico?",
            icon: <Swords className="w-12 h-12 text-[#ef4444] mb-4" />,
            input: (
                <div className="w-full mt-6 space-y-4">
                    <input
                        type="range" min="0" max="20" step="1"
                        value={formData.workoutHoursWeekly}
                        onChange={(e) => setFormData({ ...formData, workoutHoursWeekly: parseInt(e.target.value) })}
                        className="w-full h-2 bg-surface-border rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="text-2xl font-bold text-center text-primary">{formData.workoutHoursWeekly} Ore</div>
                </div>
            )
        },
        {
            title: "Scegli la tua Stirpe",
            desc: "Ogni razza possiede un dono innato. Chi sei?",
            icon: <User className="w-12 h-12 text-emerald-400 mb-4" />,
            input: (
                <div className="grid grid-cols-2 gap-4 w-full mt-6">
                    {["Umano", "Elfo", "Nano", "Orco"].map(r => (
                        <button
                            key={r}
                            onClick={() => setFormData({ ...formData, race: r.toLowerCase() })}
                            className={`p-3 rounded-xl border transition-all ${formData.race === r.toLowerCase() ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-surface border-surface-border hover:bg-surface/80'}`}
                        >
                            <div className="font-bold">{r}</div>
                            <div className="text-[10px] text-foreground/50 mt-1">
                                {r === 'Umano' && '+1 Tutte le Stat'}
                                {r === 'Elfo' && '+3 INT, +2 FOC'}
                                {r === 'Nano' && '+3 DIS, +2 END'}
                                {r === 'Orco' && '+3 STR, +2 END'}
                            </div>
                        </button>
                    ))}
                </div>
            )
        },
        {
            title: "Il tuo Destino",
            desc: "Quale sentiero percorrerai in questo mondo?",
            icon: <Sparkles className="w-12 h-12 text-purple-400 mb-4" />,
            input: (
                <div className="grid grid-cols-2 gap-4 w-full mt-6">
                    {["Guerriero", "Mago", "Ladro", "Chierico"].map(c => (
                        <button
                            key={c}
                            onClick={() => setFormData({ ...formData, className: c.toLowerCase() })}
                            className={`p-3 rounded-xl border transition-all ${formData.className === c.toLowerCase() ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-surface border-surface-border hover:bg-surface/80'}`}
                        >
                            <div className="font-bold">{c}</div>
                            <div className="text-[10px] text-foreground/50 mt-1">
                                {c === 'Guerriero' && '+2 STR, +2 END'}
                                {c === 'Mago' && '+2 INT, +2 KNO'}
                                {c === 'Ladro' && '+2 FOC, +2 STR'}
                                {c === 'Chierico' && '+2 KNO, +2 DIS'}
                            </div>
                        </button>
                    ))}
                </div>
            )
        }
    ];

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            submitOnboarding();
        }
    };

    const submitOnboarding = async () => {
        setLoading(true);

        try {
            let currentUserId = userId;
            if (!currentUserId) {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    router.push("/login");
                    return;
                }
                currentUserId = session.user.id;
            }

            const res = await fetch(`http://localhost:3001/player/${currentUserId}/onboard`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify({
                    studyHoursWeekly: formData.studyHoursWeekly,
                    workoutHoursWeekly: formData.workoutHoursWeekly,
                    race: formData.race,
                    className: formData.className
                })
            });

            if (res.ok) {
                const data = await res.json();
                const pStats = Array.isArray(data.character_stats) ? data.character_stats[0] : data.character_stats;
                initStats(data.level, data.xp_current, data.xp_to_next, pStats, data.current_streak, data.highest_streak);
                completeOnboarding();
                router.push("/");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />

                <div className="bg-surface/50 border border-surface-border p-8 rounded-2xl backdrop-blur-md relative z-10 shadow-2xl min-h-[400px] flex flex-col items-center justify-between text-center">

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col items-center w-full"
                        >
                            {steps[step].icon}
                            <h1 className="text-2xl font-bold tracking-tight mb-2">{steps[step].title}</h1>
                            <p className="text-foreground/70">{steps[step].desc}</p>
                            {steps[step].input}
                        </motion.div>
                    </AnimatePresence>

                    <div className="w-full mt-10">
                        <Button
                            onClick={handleNext}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 group" size="lg"
                        >
                            {loading ? "Forgiando Statistiche..." : step === steps.length - 1 ? "Inizia il Viaggio" : "Avanti"}
                            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                        </Button>
                        <div className="flex gap-2 justify-center mt-4">
                            {steps.map((_, i) => (
                                <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-primary' : 'bg-surface-border'}`} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
