"use client";

import { useState, useEffect } from "react";
import { GuildHall } from "@/components/guild/GuildHall";
import { GuildView } from "@/components/guild/GuildView";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function GuildPage() {
    const [myGuild, setMyGuild] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const checkGuild = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push("/login"); return; }

            try {
                const res = await fetch(`${API_URL}/guild/me`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    // Backend returns { guild: null } when no guild, or the full guild object
                    if (data && !('guild' in data && data.guild === null)) {
                        setMyGuild(data);
                    }
                }
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        checkGuild();
    }, []);

    if (loading) {
        return (
            <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-background text-foreground relative overflow-hidden selection:bg-accent/30">
            {myGuild ? (
                <GuildView
                    guildId={myGuild.id}
                    onLeave={() => setMyGuild(null)}
                />
            ) : (
                <GuildHall
                    onJoinGuild={(guild) => setMyGuild(guild)}
                />
            )}
        </main>
    );
}
