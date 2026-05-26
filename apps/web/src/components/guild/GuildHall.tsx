"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Shield, Search, ChevronLeft, Crown, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";

interface Guild {
    id: string;
    name: string;
    description: string | null;
    motto: string | null;
    level: number;
    member_count: number;
    max_members: number;
    leader_id: string;
}

export function GuildHall({ onJoinGuild }: { onJoinGuild: (guild: any) => void }) {
    const [guilds, setGuilds] = useState<Guild[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ name: "", description: "", motto: "" });

    const fetchGuilds = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API_URL}/guild`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            if (res.ok) setGuilds(await res.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchGuilds(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API_URL}/guild`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                const guild = await res.json();
                onJoinGuild(guild);
            } else {
                const err = await res.json();
                alert(err.message || "Errore nella creazione");
            }
        } catch { alert("Errore di rete"); }
        setCreating(false);
    };

    const handleJoin = async (guildId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API_URL}/guild/${guildId}/join`, {
                method: "POST",
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            if (res.ok) {
                onJoinGuild({ id: guildId });
            } else {
                const err = await res.json();
                alert(err.message || "Impossibile entrare");
            }
        } catch { alert("Errore di rete"); }
    };

    const filteredGuilds = guilds.filter(g =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="text-foreground/60 hover:text-foreground">
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
                            <Shield className="w-7 h-7 text-amber-500" />
                            Sala delle Gilde
                        </h1>
                        <p className="text-sm text-foreground/50 mt-1">Unisciti a una gilda o fondane una nuova</p>
                    </div>
                </div>
                <Button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border border-amber-500/30"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Fonda Gilda
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Guild List */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                        <input
                            type="text"
                            placeholder="Cerca gilda per nome..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-surface border border-surface-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                        />
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filteredGuilds.length === 0 ? (
                        <div className="text-center py-16 text-foreground/40">
                            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>Nessuna gilda trovata</p>
                            <p className="text-xs mt-1">Sii il primo a fondare una gilda!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredGuilds.map((guild) => (
                                <GlassCard
                                    key={guild.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    glow={true}
                                    glowColor="primary"
                                    hoverEffect={true}
                                    onClick={() => handleJoin(guild.id)}
                                    className="p-4 cursor-pointer"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                                <Shield className="w-6 h-6 text-amber-500" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-foreground flex items-center gap-2">
                                                    {guild.name}
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-mono">
                                                        LV {guild.level}
                                                    </span>
                                                </h3>
                                                {guild.motto && (
                                                    <p className="text-xs text-foreground/40 italic mt-0.5">&ldquo;{guild.motto}&rdquo;</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5 text-xs text-foreground/50">
                                                <Users className="w-3.5 h-3.5" />
                                                <span>{guild.member_count}/{guild.max_members}</span>
                                            </div>
                                            <Button
                                                size="sm"
                                                className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                Unisciti
                                            </Button>
                                        </div>
                                    </div>
                                    {guild.description && (
                                        <p className="text-xs text-foreground/50 mt-2 pl-15">{guild.description}</p>
                                    )}
                                </GlassCard>
                            ))}
                        </div>
                    )}
                </div>

                {/* Creation Form */}
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-1"
                    >
                        <GlassCard glow={true} glowColor="primary" hoverEffect={false} className="p-6 sticky top-8">
                            <form onSubmit={handleCreate} className="space-y-4">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Crown className="w-5 h-5 text-amber-500" />
                                    Fonda la Tua Gilda
                                </h2>

                            <div>
                                <label className="block text-xs text-foreground/60 mb-1">Nome Gilda *</label>
                                <input
                                    type="text"
                                    required
                                    minLength={3}
                                    maxLength={50}
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-surface border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                                    placeholder="I Cavalieri della Luce"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-foreground/60 mb-1">Descrizione</label>
                                <textarea
                                    maxLength={200}
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-surface border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none h-20"
                                    placeholder="Una breve descrizione della tua gilda..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-foreground/60 mb-1">Motto</label>
                                <input
                                    type="text"
                                    maxLength={100}
                                    value={form.motto}
                                    onChange={(e) => setForm({ ...form, motto: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-surface border border-surface-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                                    placeholder="Verso la gloria!"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={creating}
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-[#09090b] font-semibold hover:from-amber-400 hover:to-orange-400"
                            >
                                {creating ? (
                                    <div className="w-4 h-4 border-2 border-[#09090b] border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    "⚔️ Fonda Gilda"
                                )}
                            </Button>
                            </form>
                        </GlassCard>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
