import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, X, Music, CheckCircle, Users, Send, Coffee } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePlayerStore } from "@/store/usePlayerStore";
import { Button } from "@/components/ui/button";

export function FocusRoom({ initialLobby, onLeave }: { initialLobby: any, onLeave: () => void }) {
    const { userId, username, initStats } = usePlayerStore();
    const [lobby, setLobby] = useState(initialLobby);
    
    // Timer Realtime
    const [timeLeft, setTimeLeft] = useState(lobby.focus_duration * 60);
    const [isFinished, setIsFinished] = useState(false);
    
    // XP Tracking (Personal Local Seconds)
    const [localFocusSecs, setLocalFocusSecs] = useState(0);
    const focusIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Unload Session Sync
    const sessionTokenRef = useRef<string | null>(null);
    
    // Realtime Room State
    const [members, setMembers] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState("");
    const channelRef = useRef<any>(null);

    // Audio
    const audioRef = useRef<HTMLAudioElement>(null);
    const [selectedTrack, setSelectedTrack] = useState<string>("https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3");

    // Fetch Auth globally for beforeunload
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            sessionTokenRef.current = session?.access_token || null;
        });
    }, []);

    // XP Tracking loop
    useEffect(() => {
        if (lobby.status === 'FOCUSING') {
            if (!focusIntervalRef.current) {
                focusIntervalRef.current = setInterval(() => {
                    setLocalFocusSecs(prev => prev + 1);
                }, 1000);
            }
        } else {
            if (focusIntervalRef.current) {
                clearInterval(focusIntervalRef.current);
                focusIntervalRef.current = null;
            }
        }
        return () => {
            if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
            focusIntervalRef.current = null;
        }
    }, [lobby.status]);

    // Recalculate Timer
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if ((lobby.status === 'FOCUSING' || lobby.status === 'BREAK') && lobby.started_at) {
            const durationMins = lobby.status === 'FOCUSING' ? lobby.focus_duration : lobby.break_duration;
            const targetMs = new Date(lobby.started_at).getTime() + (durationMins * 60000);
            
            interval = setInterval(() => {
                const now = new Date().getTime();
                const remainder = Math.floor((targetMs - now) / 1000);
                
                if (remainder <= 0) {
                    setTimeLeft(0);
                    setIsFinished(true);
                    clearInterval(interval);
                    if (audioRef.current && lobby.status === 'FOCUSING') audioRef.current.pause();
                } else {
                    setTimeLeft(remainder);
                    setIsFinished(false);
                }
            }, 1000);
            
            if (audioRef.current && selectedTrack) {
                if (lobby.status === 'FOCUSING') audioRef.current.play().catch(() => {});
                else audioRef.current.pause();
            }
        } else if (lobby.status === 'WAITING') {
            setTimeLeft(lobby.focus_duration * 60);
            setIsFinished(false);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [lobby.status, lobby.started_at, lobby.focus_duration, lobby.break_duration, selectedTrack]);

    // Supabase Channels Setup
    useEffect(() => {
        if (!userId || !lobby.id) return;

        const ch = supabase.channel(`room:${lobby.id}`, {
            config: { presence: { key: userId } }
        });

        ch.on('presence', { event: 'sync' }, () => {
            const state = ch.presenceState();
            const activeMembers = Object.keys(state).map(k => state[k][0]);
            setMembers(activeMembers);
        })
        .on('broadcast', { event: 'chat' }, (payload) => {
            setMessages(prev => [...prev, payload.payload]);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sanctum_lobbies', filter: `id=eq.${lobby.id}` }, (payload) => {
            setLobby(payload.new);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                const { data } = await supabase.from('users').select('avatar_id, username').eq('id', userId).single();
                await ch.track({
                    user_id: userId,
                    username: data?.username || username,
                    avatar_id: data?.avatar_id
                });
            }
        });

        channelRef.current = ch;
        return () => { ch.unsubscribe(); };
    }, [lobby.id, userId]);

    // State Refs per unmount affidabile
    const membersRef = useRef(members);
    const lobbyRef = useRef(lobby);
    useEffect(() => {
        membersRef.current = members;
        lobbyRef.current = lobby;
    }, [members, lobby]);

    // Prevent Orphan Lobbies on Tab Close & React Unmount
    useEffect(() => {
        const leaveServer = () => {
            if (!sessionTokenRef.current) return;
            let nextHostId = undefined;
            if (lobbyRef.current.host_id === userId) {
                const otherMember = membersRef.current.find(m => m.user_id !== userId);
                if (otherMember) nextHostId = otherMember.user_id;
            }
            fetch(`http://localhost:3001/sanctum/lobbies/${lobbyRef.current.id}/leave`, {
                method: "POST",
                keepalive: true,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${sessionTokenRef.current}`
                },
                body: JSON.stringify(nextHostId ? { nextHostId } : {})
            }).catch(() => {});
        };

        const handleBeforeUnload = () => leaveServer();
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            leaveServer();
        };
    }, [userId]);


    const sendChatMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !channelRef.current) return;
        
        const myData = members.find(m => m.user_id === userId);
        const msg = {
            id: Date.now(),
            text: chatInput,
            user: myData?.username || "Hero",
            avatar: myData?.avatar_id
        };

        await channelRef.current.send({
            type: 'broadcast',
            event: 'chat',
            payload: msg
        });
        
        setMessages(prev => [...prev, msg]);
        setChatInput("");
    };

    const hostStartTimer = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(`http://localhost:3001/sanctum/lobbies/${lobby.id}/start`, {
                method: "POST",
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
        } catch (e) {
            console.error(e);
        }
    };

    const hostStartBreak = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(`http://localhost:3001/sanctum/lobbies/${lobby.id}/break`, {
                method: "POST",
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
        } catch (e) {
            console.error(e);
        }
    };

    const claimXPAndLeave = async () => {
        // Handle Host Migration or Lobby Deletion before leaving
        try {
            const { data: { session } } = await supabase.auth.getSession();
            let nextHostId = undefined;
            if (lobby.host_id === userId) {
                const otherMember = members.find(m => m.user_id !== userId);
                if (otherMember) nextHostId = otherMember.user_id;
            }
            fetch(`http://localhost:3001/sanctum/lobbies/${lobby.id}/leave`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token}`
                },
                body: JSON.stringify(nextHostId ? { nextHostId } : {})
            }).catch(console.error);
        } catch (e) { console.error(e); }

        if (lobby.status === 'WAITING' || localFocusSecs < 60) {
            onLeave();
            return;
        }
        
        // Claim logic purely personal
        const minutesCompleted = Math.max(1, Math.floor(localFocusSecs / 60));
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`http://localhost:3001/player/activity`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    category: lobby.category,
                    custom_name: `${lobby.category === 'STUDY' ? 'Sanctum Focus' : 'Sanctum Workout'} (Lobby)`,
                    duration_minutes: minutesCompleted,
                    stat_type: 'focus',
                    intensity_multiplier: 1.2
                })
            });
            if (res.ok) {
                const data = await res.json();
                const pStats = Array.isArray(data.character_stats) ? data.character_stats[0] : data.character_stats;
                initStats(data.level, data.xp_current, data.xp_to_next, pStats, data.current_streak, data.highest_streak);
            }
        } catch (e) { console.error(e); }
        
        onLeave();
    };

    // UI Derived
    const isHost = lobby.host_id === userId;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const durationForAnim = lobby.status === 'BREAK' ? lobby.break_duration : lobby.focus_duration;
    const progressPercent = ((durationForAnim * 60 - timeLeft) / (durationForAnim * 60)) * 100;
    const isActive = lobby.status === 'FOCUSING' || lobby.status === 'BREAK';

    return (
        <div className="w-full h-[85vh] max-w-6xl mx-auto flex flex-col md:flex-row gap-6 p-4">
            
            {/* Left: Room Info & Chat */}
            <div className="w-full md:w-80 flex flex-col gap-4">
                {/* Lobby Info */}
                <div className="bg-surface/60 border border-surface-border p-4 rounded-2xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-[10px] font-bold uppercase text-primary mb-1">{lobby.category}</div>
                            <h2 className="font-bold text-xl truncate">{lobby.title}</h2>
                        </div>
                        <div className="text-right text-xs text-foreground/50">
                            F: {lobby.focus_duration}m<br/>
                            B: {lobby.break_duration}m
                        </div>
                    </div>
                    <p className="text-xs text-foreground/60 mt-2">{members.length} / {lobby.max_participants} Eroi Sincronizzati</p>
                </div>

                {/* Presence List */}
                <div className="flex -space-x-3 overflow-hidden px-2 py-1">
                    {members.map((m, i) => (
                        <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-surface-border flex-shrink-0 relative group">
                            {m.avatar_id ? <img src={`/avatars/${m.avatar_id}.png`} className="w-full h-full object-cover rounded-full" /> : <Users className="w-5 h-5 m-2" />}
                            <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                        </div>
                    ))}
                </div>

                {/* Chat */}
                <div className="flex-1 bg-surface border border-surface-border rounded-2xl flex flex-col overflow-hidden min-h-[300px]">
                    <div className="bg-background/50 p-3 border-b border-surface-border text-xs font-bold text-foreground/50 uppercase">
                        Sussurri della Sala
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                        {messages.length === 0 ? (
                            <div className="text-center text-xs text-foreground/40 mt-10">La sala è silenziosa...</div>
                        ) : (
                            messages.map(msg => (
                                <div key={msg.id} className={`flex items-start gap-2 ${msg.user === username ? 'flex-row-reverse' : ''}`}>
                                    <div className="w-6 h-6 rounded-full bg-background border border-surface-border overflow-hidden">
                                        {msg.avatar && <img src={`/avatars/${msg.avatar}.png`} className="w-full h-full object-cover" />}
                                    </div>
                                    <div className={`text-sm py-1.5 px-3 rounded-xl max-w-[80%] ${msg.user === username ? 'bg-primary text-[#09090b]' : 'bg-background border border-surface-border text-foreground/80'}`}>
                                        <div className={`text-[10px] font-bold mb-0.5 ${msg.user === username ? 'text-black/60' : 'text-primary'}`}>{msg.user}</div>
                                        {msg.text}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <form onSubmit={sendChatMessage} className="p-3 border-t border-surface-border flex gap-2">
                        <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Scrivi un messaggio..." className="flex-1 bg-background border border-surface-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
                        <button type="submit" disabled={!chatInput.trim()} className="w-10 h-10 bg-primary/20 text-primary rounded-lg flex items-center justify-center hover:bg-primary/40 disabled:opacity-50"><Send className="w-4 h-4" /></button>
                    </form>
                </div>
            </div>

            {/* Right: Timer Core */}
            <div className="flex-1 bg-surface/30 border border-surface-border rounded-3xl flex flex-col items-center justify-center relative overflow-hidden">
                <motion.div animate={{ scale: isActive ? [1, 1.05, 1] : 1, opacity: isActive ? [0.1, 0.2, 0.1] : 0.05 }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-0 bg-gradient-radial from-accent/20 to-transparent flex items-center justify-center pointer-events-none" />

                <div className="w-full flex justify-between absolute top-4 px-6 z-10">
                    <button onClick={claimXPAndLeave} className="text-foreground/50 hover:text-red-400 transition flex items-center gap-2 group text-sm font-medium">
                        <X className="w-4 h-4" /> Abbandona {localFocusSecs > 60 ? "& Incassa" : ""}
                    </button>
                    {(localFocusSecs > 0) && (
                        <div className="text-primary font-mono text-sm px-3 py-1 bg-primary/10 rounded-lg">
                            XP Attivi: {Math.max(1, Math.floor(localFocusSecs / 60)) * 10 * 1.2}
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-foreground/60 transition px-3 py-1.5 text-sm rounded-full bg-background border border-surface-border">
                        <Music className="w-3 h-3 text-accent" />
                        <select value={selectedTrack} onChange={(e) => setSelectedTrack(e.target.value)} className="bg-transparent text-xs font-medium focus:outline-none appearance-none cursor-pointer">
                            <option value="https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3">Lofi Study</option>
                            <option value="https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=ambient-piano-10874.mp3">Workout Ambient</option>
                            <option value="">Nessuna Musica</option>
                        </select>
                    </div>
                </div>

                <div className="relative w-80 h-80 flex items-center justify-center z-10 my-10">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle cx="160" cy="160" r="150" fill="none" stroke="var(--surface-border)" strokeWidth="4" />
                        <motion.circle cx="160" cy="160" r="150" fill="none" stroke={lobby.status === 'BREAK' ? "var(--primary)" : "var(--accent)"} strokeWidth="6" strokeLinecap="round" strokeDasharray="942"
                            initial={{ strokeDashoffset: 942 }}
                            animate={{ strokeDashoffset: 942 - (942 * progressPercent) / 100 }}
                            transition={{ duration: 1, ease: "linear" }}
                        />
                    </svg>

                    <div className="flex flex-col items-center">
                        {isFinished && lobby.status === 'BREAK' ? (
                            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-accent">
                                <CheckCircle className="w-16 h-16 mb-2 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
                                <span className="text-xl font-bold tracking-widest text-[#09090b]">SESSION READY</span>
                            </motion.div>
                        ) : isFinished && lobby.status === 'FOCUSING' ? (
                            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-primary">
                                <Coffee className="w-16 h-16 mb-2 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                                <span className="text-xl font-bold tracking-widest">BREAK TIME</span>
                            </motion.div>
                        ) : (
                            <span className={`text-7xl font-mono font-bold tracking-tighter ${lobby.status === 'FOCUSING' ? 'text-accent drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]' : lobby.status === 'BREAK' ? 'text-primary drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'text-foreground'}`}>
                                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                            </span>
                        )}
                        {!isFinished && <span className="text-xs font-medium text-foreground/50 mt-2 uppercase tracking-widest">
                            {lobby.status === 'FOCUSING' ? 'Sincronizzazione Attiva' : lobby.status === 'BREAK' ? 'Riposo di Gruppo' : 'In attesa dell\'Host...'}
                        </span>}
                    </div>
                </div>

                <div className="flex flex-col items-center gap-4 z-10 h-20">
                    {lobby.status === 'WAITING' && isHost && (
                        <Button onClick={hostStartTimer} size="lg" className="w-48 font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                            <Play className="w-5 h-5 mr-2" /> Inizia Sessione
                        </Button>
                    )}
                    {lobby.status === 'WAITING' && !isHost && (
                        <div className="text-foreground/50 text-sm animate-pulse">In attesa che l'Host avvii il Focus...</div>
                    )}
                    
                    {isFinished && lobby.status === 'FOCUSING' && isHost && (
                        <Button onClick={hostStartBreak} size="lg" className="bg-primary text-[#09090b] shadow-[0_0_30px_rgba(245,158,11,0.4)] font-bold">
                            <Coffee className="w-5 h-5 mr-2" /> Inizia Pausa {lobby.break_duration}m
                        </Button>
                    )}

                    {isFinished && lobby.status === 'BREAK' && isHost && (
                        <Button onClick={hostStartTimer} size="lg" className="bg-accent text-[#09090b] shadow-[0_0_30px_rgba(6,182,212,0.4)] font-bold">
                            <Play className="w-5 h-5 mr-2" /> Inizia Prossimo Focus
                        </Button>
                    )}

                    {isFinished && !isHost && (
                        <div className="text-foreground/50 text-sm animate-pulse">L'Host sta per avviare il prossimo step...</div>
                    )}
                </div>

                {selectedTrack && <audio ref={audioRef} src={selectedTrack} loop preload="auto" />}
            </div>
        </div>
    );
}
