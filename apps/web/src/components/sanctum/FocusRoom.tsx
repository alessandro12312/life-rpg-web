import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, X, Music, CheckCircle, Users, Send, Coffee, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api";
import { usePlayerStore } from "@/store/usePlayerStore";
import { applyActivityResponse } from "@/lib/triggerActivityAnimation";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

export interface FocusLobby {
  id: string;
  title: string;
  category: "STUDY" | "WORKOUT" | "MIXED" | "CUSTOM";
  status: "WAITING" | "FOCUSING" | "BREAK" | "FINISHED";
  host_id: string;
  focus_duration: number;
  break_duration: number;
  max_participants: number;
  started_at: string | null;
}

export interface LobbyMember {
  user_id: string;
  username: string;
  avatar_id: string | null;
}

export interface ChatMessage {
  id: number;
  text: string;
  user: string;
  avatar: string | null;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  scale: number;
  duration: number;
}

export function FocusRoom({ initialLobby, onLeave }: { initialLobby: FocusLobby; onLeave: () => void }) {
  const { userId, username } = usePlayerStore();
  const [lobby, setLobby] = useState<FocusLobby>(initialLobby);
  
  // Timer Realtime
  const [timeLeft, setTimeLeft] = useState(lobby.focus_duration * 60);
  const [isFinished, setIsFinished] = useState(false);
  
  // XP Tracking (Personal Local Seconds)
  const [localFocusSecs, setLocalFocusSecs] = useState(0);
  const focusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Unload Session Sync
  const sessionTokenRef = useRef<string | null>(null);
  
  // Realtime Room State
  const [members, setMembers] = useState<LobbyMember[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Focus Particles
  const [particles, setParticles] = useState<Particle[]>([]);

  // Audio
  const audioRef = useRef<HTMLAudioElement>(null);
  const [selectedTrack, setSelectedTrack] = useState<string>("https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3");
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window === "undefined") return 0.5;
    const stored = window.localStorage.getItem("sanctum_music_volume");
    return stored !== null ? Number(stored) : 0.5;
  });

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
    };
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
    } else if (lobby.status === 'WAITING') {
      setTimeLeft(lobby.focus_duration * 60);
      setIsFinished(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lobby.status, lobby.started_at, lobby.focus_duration, lobby.break_duration]);

  // Generate particles for focusing state
  useEffect(() => {
    if (lobby.status === 'FOCUSING') {
      const generated = Array.from({ length: 15 }).map((_, i) => ({
        id: i,
        x: Math.random() * 200 - 100, // offset range from center
        y: Math.random() * 120 - 40,
        scale: Math.random() * 0.8 + 0.4,
        duration: Math.random() * 2.5 + 2,
      }));
      setParticles(generated);
    } else {
      setParticles([]);
    }
  }, [lobby.status]);

  // Audio: handled separately so it doesn't restart the timer interval
  useEffect(() => {
    if (!audioRef.current || !selectedTrack) return;
    if (lobby.status === 'FOCUSING') {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [lobby.status, selectedTrack]);

  // Apply volume changes to the audio element and persist the preference
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    window.localStorage.setItem("sanctum_music_volume", String(volume));
  }, [volume, selectedTrack]);

  // Supabase Channels Setup
  useEffect(() => {
    if (!userId || !lobby.id) return;

    const ch = supabase.channel(`room:${lobby.id}`, {
      config: { presence: { key: userId } }
    });

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      const activeMembers = Object.keys(state).map(k => state[k][0] as unknown as LobbyMember);
      setMembers(activeMembers);
    })
    .on('broadcast', { event: 'chat' }, (payload) => {
      setMessages(prev => [...prev, payload.payload as ChatMessage]);
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sanctum_lobbies', filter: `id=eq.${lobby.id}` }, (payload) => {
      setLobby(payload.new as FocusLobby);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const { data } = await supabase.from('users').select('avatar_id, username').eq('id', userId).single();
        await ch.track({
          user_id: userId,
          username: data?.username || username,
          avatar_id: data?.avatar_id || null
        });
      }
    });

    channelRef.current = ch;
    return () => { ch.unsubscribe(); };
  }, [lobby.id, userId, username]);

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
      fetch(`${API_URL}/sanctum/lobbies/${lobbyRef.current.id}/leave`, {
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
      avatar: myData?.avatar_id || null
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
      await fetch(`${API_URL}/sanctum/lobbies/${lobby.id}/start`, {
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
      await fetch(`${API_URL}/sanctum/lobbies/${lobby.id}/break`, {
        method: "POST",
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
    } catch (e) {
      console.error(e);
    }
  };

  const claimXPAndLeave = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let nextHostId = undefined;
      if (lobby.host_id === userId) {
        const otherMember = members.find(m => m.user_id !== userId);
        if (otherMember) nextHostId = otherMember.user_id;
      }
      fetch(`${API_URL}/sanctum/lobbies/${lobby.id}/leave`, {
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
    
    const minutesCompleted = Math.max(1, Math.floor(localFocusSecs / 60));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/player/activity`, {
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
        applyActivityResponse(data);
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
    <div className="w-full flex flex-col lg:flex-row gap-6">
      
      {/* Left: Room Info & Chat */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        {/* Lobby Info */}
        <GlassCard hoverEffect={false} className="p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-[10px] font-bold uppercase text-accent mb-1 tracking-wider">{lobby.category}</div>
              <h2 className="font-bold text-lg truncate text-foreground/90">{lobby.title}</h2>
            </div>
            <div className="text-right text-[10px] font-mono text-foreground/40 bg-surface px-2 py-1 rounded border border-surface-border shrink-0">
              F: {lobby.focus_duration}m | B: {lobby.break_duration}m
            </div>
          </div>
          <p className="text-xs text-foreground/50 mt-2 font-medium flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-accent" />
            {members.length} / {lobby.max_participants} Eroi Sincronizzati
          </p>
        </GlassCard>

        {/* Presence List */}
        <div className="flex -space-x-2.5 overflow-hidden px-2 py-1 shrink-0">
          {members.map((m, i) => (
            <div key={i} className="w-9 h-9 rounded-full border-2 border-background bg-surface-border flex-shrink-0 relative group shadow-md">
              {m.avatar_id ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/avatars/${m.avatar_id}.png`} className="w-full h-full object-cover rounded-full" alt={m.username} />
              ) : (
                <Users className="w-4 h-4 m-2 text-foreground/60" />
              )}
              <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-background" />
            </div>
          ))}
        </div>

        {/* Chat */}
        <GlassCard hoverEffect={false} className="flex-1 flex flex-col overflow-hidden min-h-[280px]">
          <div className="bg-background/40 p-3 border-b border-surface-border text-[10px] font-bold tracking-wider text-foreground/50 uppercase">
            Sussurri della Sala
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-surface-border scrollbar-track-transparent">
            {messages.length === 0 ? (
              <div className="text-center text-xs text-foreground/30 mt-10">La sala è silenziosa...</div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex items-start gap-2 ${msg.user === username ? 'flex-row-reverse' : ''}`}>
                  <div className="w-6 h-6 rounded-full bg-background border border-surface-border overflow-hidden shrink-0">
                    {msg.avatar && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/avatars/${msg.avatar}.png`} className="w-full h-full object-cover" alt="Avatar" />
                    )}
                  </div>
                  <div className={`text-xs py-1.5 px-3 rounded-xl max-w-[80%] ${msg.user === username ? 'bg-accent/20 text-accent border border-accent/20' : 'bg-background border border-surface-border text-foreground/80'}`}>
                    <div className={`text-[9px] font-bold mb-0.5 ${msg.user === username ? 'text-accent' : 'text-primary'}`}>{msg.user}</div>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={sendChatMessage} className="p-3 border-t border-surface-border/50 flex gap-2 bg-background/20">
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Scrivi un messaggio..." className="flex-1 bg-background/50 border border-surface-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-accent transition-colors" />
            <button type="submit" disabled={!chatInput.trim()} className="px-3 bg-accent/20 text-accent border border-accent/20 rounded-lg flex items-center justify-center hover:bg-accent hover:text-black transition-all disabled:opacity-50 active:scale-95 cursor-pointer"><Send className="w-3.5 h-3.5" /></button>
          </form>
        </GlassCard>
      </div>

      {/* Right: Timer Core */}
      <GlassCard hoverEffect={false} className="flex-1 flex flex-col items-center justify-center relative overflow-hidden p-6 min-h-[450px]">
        
        {/* Background glow: breathing animation */}
        {isActive && (
          <motion.div
            animate={{ scale: [1, 1.06, 1], opacity: [0.12, 0.22, 0.12] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className={`absolute inset-0 bg-gradient-radial ${lobby.status === 'BREAK' ? 'from-primary/10' : 'from-accent/15'} to-transparent flex items-center justify-center pointer-events-none`}
            style={{ willChange: 'transform, opacity' }}
          />
        )}

        <div className="w-full flex justify-between absolute top-4 px-6 z-10">
          <button onClick={claimXPAndLeave} className="text-foreground/50 hover:text-red-400 transition flex items-center gap-2 group text-xs font-semibold cursor-pointer">
            <X className="w-4 h-4" /> Abbandona {localFocusSecs >= 60 ? "& Incassa" : ""}
          </button>
          {(localFocusSecs >= 60) && (
            <div className="text-primary font-mono text-xs font-bold px-3 py-1 bg-primary/10 rounded-lg border border-primary/20 animate-pulse">
              XP Attivi: {Math.max(1, Math.floor(localFocusSecs / 60)) * 12}
            </div>
          )}
          <div className="flex items-center gap-2 text-foreground/60 transition px-3 py-1.5 text-xs rounded-full bg-background/60 backdrop-blur-md border border-surface-border">
            <Music className="w-3 h-3 text-accent" />
            <select value={selectedTrack} onChange={(e) => setSelectedTrack(e.target.value)} className="bg-transparent text-[10px] font-bold focus:outline-none appearance-none cursor-pointer pr-1">
              <option value="https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3">Lofi Study</option>
              <option value="https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=ambient-piano-10874.mp3">Workout Ambient</option>
              <option value="">Nessuna Musica</option>
            </select>
            <div className="w-px h-3 bg-surface-border" />
            <button
              type="button"
              onClick={() => setVolume((v) => (v > 0 ? 0 : 0.5))}
              className="text-foreground/60 hover:text-accent transition cursor-pointer"
              aria-label={volume > 0 ? "Disattiva audio" : "Attiva audio"}
            >
              {volume > 0 ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-16 h-1 accent-accent cursor-pointer"
              aria-label="Volume musica"
            />
          </div>
        </div>

        <div className="relative w-80 h-80 flex items-center justify-center z-10 my-8 shrink-0 select-none">
          {/* Rotating outer JRPG circle */}
          {isActive && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
              className="absolute inset-1.5 border border-dashed border-accent/15 rounded-full pointer-events-none"
            />
          )}
          {isActive && (
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
              className="absolute inset-4.5 border border-dotted border-accent/20 rounded-full pointer-events-none"
            />
          )}

          {/* Focus Particles */}
          <AnimatePresence>
            {lobby.status === 'FOCUSING' && particles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute w-1.5 h-1.5 rounded-full bg-accent pointer-events-none blur-[0.5px]"
                initial={{ x: p.x, y: p.y, opacity: 0 }}
                animate={{
                  y: [p.y, p.y - 80],
                  opacity: [0, 0.7, 0],
                  scale: [p.scale, p.scale * 1.5, 0],
                }}
                transition={{
                  duration: p.duration,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </AnimatePresence>

          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 320 320">
            <defs>
              <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              <linearGradient id="breakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <filter id="svgGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Static outer ring */}
            <circle cx="160" cy="160" r="145" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
            
            {/* Dynamic progress circle */}
            <motion.circle 
              cx="160" 
              cy="160" 
              r="145" 
              fill="none" 
              stroke={lobby.status === 'BREAK' ? "url(#breakGradient)" : "url(#focusGradient)"} 
              strokeWidth="5" 
              strokeLinecap="round" 
              strokeDasharray="911"
              filter="url(#svgGlow)"
              initial={{ strokeDashoffset: 911 }}
              animate={{ strokeDashoffset: 911 - (911 * progressPercent) / 100 }}
              transition={{ duration: 1, ease: "linear" }}
            />
          </svg>

          <div className="flex flex-col items-center relative z-10">
            {isFinished && lobby.status === 'BREAK' ? (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-accent">
                <CheckCircle className="w-14 h-14 mb-2 drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]" />
                <span className="text-sm font-bold tracking-widest uppercase">Pronto per Iniziare</span>
              </motion.div>
            ) : isFinished && lobby.status === 'FOCUSING' ? (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-primary">
                <Coffee className="w-14 h-14 mb-2 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
                <span className="text-sm font-bold tracking-widest uppercase text-primary">Tempo di Pausa</span>
              </motion.div>
            ) : (
              <span className={`text-6xl md:text-7xl font-mono font-bold tracking-tighter ${lobby.status === 'FOCUSING' ? 'text-accent drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]' : lobby.status === 'BREAK' ? 'text-primary drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]' : 'text-foreground/70'}`}>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
            )}
            {!isFinished && (
              <span className="text-[10px] font-bold text-foreground/40 mt-3 uppercase tracking-widest">
                {lobby.status === 'FOCUSING' ? 'Sincronizzazione Attiva' : lobby.status === 'BREAK' ? 'Riposo di Gruppo' : 'In attesa dell\'Host...'}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 z-10 h-16 shrink-0 justify-center">
          {lobby.status === 'WAITING' && isHost && (
            <Button onClick={hostStartTimer} size="lg" className="w-48 font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] bg-accent hover:bg-accent/90 text-black border-none cursor-pointer">
              <Play className="w-4 h-4 mr-2 text-black fill-current" /> Inizia Sessione
            </Button>
          )}
          {lobby.status === 'WAITING' && !isHost && (
            <div className="text-foreground/40 text-xs font-medium animate-pulse">In attesa che l'Host avvii la sessione...</div>
          )}
          
          {isFinished && lobby.status === 'FOCUSING' && isHost && (
            <Button onClick={hostStartBreak} size="lg" className="bg-primary hover:bg-primary/90 text-black border-none shadow-[0_0_25px_rgba(245,158,11,0.3)] font-bold cursor-pointer">
              <Coffee className="w-4 h-4 mr-2" /> Inizia Pausa {lobby.break_duration}m
            </Button>
          )}

          {isFinished && lobby.status === 'BREAK' && isHost && (
            <Button onClick={hostStartTimer} size="lg" className="bg-accent hover:bg-accent/90 text-black border-none shadow-[0_0_25px_rgba(6,182,212,0.3)] font-bold cursor-pointer">
              <Play className="w-4 h-4 mr-2" /> Inizia Prossimo Focus
            </Button>
          )}

          {isFinished && !isHost && (
            <div className="text-foreground/40 text-xs font-medium animate-pulse">L'Host sta per avviare il prossimo step...</div>
          )}
        </div>

        {selectedTrack && <audio ref={audioRef} src={selectedTrack} loop preload="auto" />}
      </GlassCard>
    </div>
  );
}
