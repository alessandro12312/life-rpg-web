"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Shield, Crown, Star, LogOut, UserMinus, ArrowUpCircle, Target, ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ui/confirm-modal";

interface GuildMember {
    user_id: string;
    role: string;
    joined_at: string;
    username: string;
    avatar_url: string | null;
    level: number;
    class_name: string;
    race: string;
}

interface GuildQuest {
    id: string;
    title: string;
    description: string;
    category: string;
    target_minutes: number;
    current_minutes: number;
    completed: boolean;
    xp_reward: number;
}

interface GuildDetail {
    id: string;
    name: string;
    description: string | null;
    motto: string | null;
    level: number;
    xp_current: number;
    max_members: number;
    leader_id: string;
    members: GuildMember[];
    quests: GuildQuest[];
    myRole: string;
}

export function GuildView({ guildId, onLeave }: { guildId: string; onLeave: () => void }) {
    const router = useRouter();
    const [guild, setGuild] = useState<GuildDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"members" | "quests">("members");
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        confirmText: string;
        isDestructive: boolean;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: "",
        description: "",
        confirmText: "Conferma",
        isDestructive: false,
        onConfirm: () => {},
    });

    const openConfirm = (title: string, description: string, confirmText: string, isDestructive: boolean, onConfirm: () => void) => {
        setConfirmState({
            isOpen: true,
            title,
            description,
            confirmText,
            isDestructive,
            onConfirm: () => {
                setConfirmState(s => ({ ...s, isOpen: false }));
                onConfirm();
            }
        });
    };

    const fetchGuild = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API_URL}/guild/me`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data) setGuild(data);
                else onLeave(); // Non è più in una gilda
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => {
        fetchGuild();
        // Realtime listener per cambiamenti nella gilda
        const channel = supabase.channel('guild_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'guild_members' }, () => fetchGuild())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'guilds' }, () => fetchGuild())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [guildId]);

    const handleLeave = () => {
        openConfirm(
            "Abbandona Gilda",
            "Sei sicuro di voler abbandonare la gilda? Perderai tutti i progressi nelle quest settimanali.",
            "Abbandona",
            true,
            async () => {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    await fetch(`${API_URL}/guild/${guildId}/leave`, {
                        method: "POST",
                        headers: { 'Authorization': `Bearer ${session?.access_token}` }
                    });
                    onLeave();
                } catch { alert("Errore"); }
            }
        );
    };

    const handleKick = (targetUserId: string) => {
        openConfirm(
            "Espelli Membro",
            "Sei sicuro di voler espellere questo membro dalla gilda?",
            "Espelli",
            true,
            async () => {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    await fetch(`${API_URL}/guild/${guildId}/kick`, {
                        method: "POST",
                        headers: {
                            'Authorization': `Bearer ${session?.access_token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ userId: targetUserId })
                    });
                    fetchGuild();
                } catch { alert("Errore"); }
            }
        );
    };

    const handlePromote = (targetUserId: string) => {
        openConfirm(
            "Promuovi Membro",
            "Vuoi promuovere questo membro a Officer? Potrà gestire ed espellere altri player dalla gilda.",
            "Promuovi",
            false,
            async () => {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    await fetch(`${API_URL}/guild/${guildId}/promote`, {
                        method: "POST",
                        headers: {
                            'Authorization': `Bearer ${session?.access_token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ userId: targetUserId })
                    });
                    fetchGuild();
                } catch { alert("Errore"); }
            }
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!guild) return null;

    const isLeader = guild.myRole === 'LEADER';
    const isOfficer = guild.myRole === 'OFFICER';
    const guildXpToNext = Math.floor(1000 * Math.pow(guild.level, 1.5));
    const guildProgressPercent = (guild.xp_current / guildXpToNext) * 100;

    const roleIcon = (role: string) => {
        if (role === 'LEADER') return <Crown className="w-3.5 h-3.5 text-amber-500" />;
        if (role === 'OFFICER') return <Star className="w-3.5 h-3.5 text-blue-400" />;
        return <Users className="w-3.5 h-3.5 text-foreground/40" />;
    };

    const roleBadgeColor = (role: string) => {
        if (role === 'LEADER') return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        if (role === 'OFFICER') return 'bg-blue-400/10 text-blue-400 border-blue-400/20';
        return 'bg-surface-border text-foreground/50 border-surface-border';
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-4 lg:p-8 space-y-6">
            {/* Guild Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface/50 border border-amber-500/20 rounded-2xl p-6 relative overflow-hidden"
            >
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-amber-500/5 rounded-full blur-3xl" />

                <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/')} className="p-2 rounded-lg hover:bg-surface-border transition-colors">
                            <ChevronLeft className="w-5 h-5 text-foreground/60" />
                        </button>
                        <div className="w-16 h-16 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <Shield className="w-8 h-8 text-amber-500" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold tracking-tight">{guild.name}</h1>
                            {guild.motto && (
                                <p className="text-sm text-foreground/40 italic">&ldquo;{guild.motto}&rdquo;</p>
                            )}
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-mono font-bold">
                                    LV {guild.level}
                                </span>
                                <span className="text-xs text-foreground/40 flex items-center gap-1">
                                    <Users className="w-3 h-3" /> {guild.members.length}/{guild.max_members}
                                </span>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={handleLeave}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    >
                        <LogOut className="w-4 h-4 mr-1" />
                        Abbandona
                    </Button>
                </div>

                {/* Guild XP Bar */}
                <div className="mt-4 relative z-10">
                    <div className="flex justify-between text-xs text-foreground/40 mb-1">
                        <span>XP Gilda</span>
                        <span className="font-mono">{guild.xp_current} / {guildXpToNext}</span>
                    </div>
                    <div className="h-2 w-full bg-surface-border rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${guildProgressPercent}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-amber-500/50 to-amber-500 rounded-full"
                        />
                    </div>
                </div>
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveTab("members")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "members" ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-foreground/50 hover:text-foreground'}`}
                >
                    <Users className="w-4 h-4 inline mr-1.5" />
                    Membri ({guild.members.length})
                </button>
                <button
                    onClick={() => setActiveTab("quests")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "quests" ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-foreground/50 hover:text-foreground'}`}
                >
                    <Target className="w-4 h-4 inline mr-1.5" />
                    Quest Settimanali ({guild.quests.length})
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === "members" && (
                <div className="space-y-2">
                    {guild.members
                        .sort((a, b) => {
                            const order = { LEADER: 0, OFFICER: 1, MEMBER: 2 };
                            return (order[a.role as keyof typeof order] ?? 2) - (order[b.role as keyof typeof order] ?? 2);
                        })
                        .map((member) => (
                            <motion.div
                                key={member.user_id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="bg-surface/40 border border-surface-border rounded-xl p-4 flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-surface-border flex items-center justify-center overflow-hidden">
                                        {member.avatar_url ? (
                                            <img src={member.avatar_url} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <Users className="w-5 h-5 text-foreground/30" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{member.username}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${roleBadgeColor(member.role)}`}>
                                                {roleIcon(member.role)}
                                                {member.role}
                                            </span>
                                        </div>
                                        <p className="text-xs text-foreground/40">
                                            LV {member.level} · {member.race} {member.class_name}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions (Leader/Officer only) */}
                                {(isLeader || isOfficer) && member.role === 'MEMBER' && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {isLeader && (
                                            <button
                                                onClick={() => handlePromote(member.user_id)}
                                                className="p-1.5 rounded-lg hover:bg-blue-400/10 text-blue-400 transition-colors"
                                                title="Promuovi a Officer"
                                            >
                                                <ArrowUpCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleKick(member.user_id)}
                                            className="p-1.5 rounded-lg hover:bg-red-400/10 text-red-400 transition-colors"
                                            title="Espelli"
                                        >
                                            <UserMinus className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                </div>
            )}

            {activeTab === "quests" && (
                <div className="space-y-3">
                    {guild.quests.length === 0 ? (
                        <div className="text-center py-12 text-foreground/40">
                            <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p>Nessuna quest questa settimana</p>
                        </div>
                    ) : (
                        guild.quests.map((quest) => {
                            const progress = Math.min((quest.current_minutes / quest.target_minutes) * 100, 100);
                            const categoryColor = quest.category === 'STUDY' ? 'blue-400'
                                : quest.category === 'WORKOUT' ? 'red-400' : 'emerald-400';

                            return (
                                <motion.div
                                    key={quest.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className={`bg-surface/40 border rounded-xl p-4 ${quest.completed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-surface-border'}`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                                {quest.completed && <span className="text-emerald-400">✓</span>}
                                                {quest.title}
                                            </h3>
                                            <p className="text-xs text-foreground/40 mt-0.5">{quest.description}</p>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded bg-${categoryColor}/10 text-${categoryColor} font-mono`}>
                                            {quest.category}
                                        </span>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-foreground/40">
                                            <span>{quest.current_minutes} / {quest.target_minutes} min</span>
                                            <span className="text-amber-500 font-mono">+{quest.xp_reward} XP</span>
                                        </div>
                                        <div className="h-2 w-full bg-surface-border rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                                className={`h-full rounded-full ${quest.completed ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500/50 to-amber-500'}`}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            )}

            <ConfirmModal
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                description={confirmState.description}
                confirmText={confirmState.confirmText}
                isDestructive={confirmState.isDestructive}
                onConfirm={confirmState.onConfirm}
                onCancel={() => setConfirmState(s => ({ ...s, isOpen: false }))}
            />
        </div>
    );
}
