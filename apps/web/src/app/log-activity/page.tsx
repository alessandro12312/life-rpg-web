"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { usePlayerStore } from "@/store/usePlayerStore";
import { Swords, BookOpen, Activity, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api";
import { GlassCard } from "@/components/ui/glass-card";

export default function LogActivityPage() {
    const router = useRouter();
    const { userId, initStats } = usePlayerStore();
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        title: "",
        category: "WORKOUT" as "WORKOUT" | "STUDY" | "MIXED",
        duration: 30,
        intensity: 1.0,
        statType: "strength" as "strength" | "endurance" | "intelligence" | "discipline" | "health"
    });

    const categories = [
        { id: "WORKOUT", icon: <Swords className="w-5 h-5" />, label: "Allenamento", color: "text-red-500", bg: "bg-red-500/10" },
        { id: "STUDY", icon: <BookOpen className="w-5 h-5" />, label: "Studio", color: "text-blue-500", bg: "bg-blue-500/10" },
        { id: "MIXED", icon: <Activity className="w-5 h-5" />, label: "Altro", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId || !form.title) return;
        setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API_URL}/player/activity`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    category: form.category,
                    custom_name: form.title,
                    duration_minutes: form.duration,
                    stat_type: form.statType,
                    intensity_multiplier: form.intensity
                })
            });

            if (res.ok) {
                const data = await res.json();
                const pStats = Array.isArray(data.character_stats) ? data.character_stats[0] : data.character_stats;
                initStats(data.level, data.xp_current, data.xp_to_next, pStats, data.current_streak, data.highest_streak, undefined, data.avatar_id);
                router.push("/");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[70vh] py-8">
            <div className="max-w-md w-full relative mt-8">
                <Link href="/" className="absolute -top-10 left-0 text-foreground/50 hover:text-primary transition flex items-center gap-2 text-sm">
                    <ArrowLeft className="w-4 h-4" /> Torna alla Dashboard
                </Link>

                <GlassCard glow={true} glowColor="primary" hoverEffect={false} className="p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

                    <h1 className="text-2xl font-bold tracking-tight mb-6 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-primary" /> Log Manuale
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Categoria */}
                        <div className="grid grid-cols-3 gap-3">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setForm({
                                        ...form,
                                        category: cat.id as any,
                                        statType: cat.id === 'WORKOUT' ? 'strength' : cat.id === 'STUDY' ? 'intelligence' : 'health'
                                    })}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${form.category === cat.id
                                            ? `border-primary bg-primary/10`
                                            : 'border-surface-border bg-surface hover:bg-surface-border'
                                        }`}
                                >
                                    <div className={`mb-2 ${form.category === cat.id ? cat.color : 'text-foreground/50'}`}>
                                        {cat.icon}
                                    </div>
                                    <span className="text-xs font-semibold">{cat.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Nome Quest */}
                        <div>
                            <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Nome Quest (Es: Corsa 5km, Analisi 1)</label>
                            <input
                                required
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                type="text"
                                className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                                placeholder="Cosa hai fatto di epico?"
                            />
                        </div>

                        {/* Durata e Intensità */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Durata (Minuti)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={form.duration}
                                    onChange={e => setForm({ ...form, duration: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground/80 mb-1.5 block">Intensità</label>
                                <select
                                    value={form.intensity}
                                    onChange={e => setForm({ ...form, intensity: parseFloat(e.target.value) })}
                                    className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                                >
                                    <option value={0.8}>Leggera (x0.8)</option>
                                    <option value={1.0}>Media (x1.0)</option>
                                    <option value={1.5}>Estrema (x1.5)</option>
                                </select>
                            </div>
                        </div>

                        <Button type="submit" disabled={loading || !form.title} className="w-full py-6 text-lg font-bold">
                            {loading ? "Registrando nel DB..." : "Reclama Ricompensa"}
                        </Button>

                    </form>
                </GlassCard>
            </div>
        </div>
    );
}
