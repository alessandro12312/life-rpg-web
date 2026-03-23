import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Lock, Unlock, Play, Server, Search, ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function LobbyHub({ onJoin, userId }: { onJoin: (lobby: any) => void, userId: string }) {
    const [lobbies, setLobbies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [passwordPromptLobby, setPasswordPromptLobby] = useState<any>(null);
    const [joinPassword, setJoinPassword] = useState("");

    const [form, setForm] = useState({
        title: "Focus Session",
        category: "STUDY",
        maxParticipants: 4,
        isPrivate: false,
        password: "",
        focusDuration: 25,
        breakDuration: 5
    });

    const fetchLobbies = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API_URL}/sanctum/lobbies`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            if (res.ok) setLobbies(await res.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => {
        fetchLobbies();
        const interval = setInterval(fetchLobbies, 10000); 
        return () => clearInterval(interval);
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API_URL}/sanctum/lobbies`, {
                method: "POST",
                headers: { 
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                const lobby = await res.json();
                onJoin(lobby); 
            } else {
                const errorData = await res.json();
                alert(`Errore creazione: ${errorData.message || JSON.stringify(errorData)}`);
            }
        } catch (e) { 
            console.error(e); 
            alert("Errore di rete");
        }
    };

    const handleJoin = async (lobby: any) => {
        if (lobby.is_private) {
            setPasswordPromptLobby(lobby);
            setJoinPassword("");
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API_URL}/sanctum/lobbies/${lobby.id}/join`, {
                method: "POST",
                headers: { 
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password: "" })
            });

            if (res.ok) {
                onJoin(await res.json());
            } else {
                alert("Accesso Negato: La lobby potrebbe essere piena.");
            }
        } catch (e) {
            alert("Errore di connessione");
        }
    };

    const handleJoinConfirm = async () => {
        if (!passwordPromptLobby) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API_URL}/sanctum/lobbies/${passwordPromptLobby.id}/join`, {
                method: "POST",
                headers: { 
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password: joinPassword })
            });

            if (res.ok) {
                setPasswordPromptLobby(null);
                onJoin(await res.json());
            } else {
                alert("Accesso Negato: Controlla la password o la capienza.");
            }
        } catch (e) {
            alert("Errore di connessione");
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <Link href="/" className="inline-flex items-center gap-2 text-foreground/50 hover:text-primary transition-colors text-sm font-bold mb-4 uppercase tracking-wider">
                        <ChevronLeft className="w-4 h-4" /> Torna alla Gilda
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
                        <Server className="text-primary w-8 h-8" />
                        Lobby Sanctum
                    </h1>
                    <p className="text-foreground/60">Unisciti agli altri eroi per sessioni sincronizzate.</p>
                </div>
            </div>

            <div className="flex flex-col-reverse lg:flex-row gap-8 items-start">
                
                {/* Left: Active Lobbies */}
                <div className="flex-1 w-full">
                    <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">Stanziamenti Attivi <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">{lobbies.length}</span></h2>
                        <div className="relative w-full md:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                            <input 
                                type="text" 
                                placeholder="Cerca lobby..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-background border border-surface-border rounded-xl pl-9 pr-4 py-2 outline-none focus:border-primary text-sm" 
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {loading && lobbies.length === 0 ? (
                            <div className="col-span-full py-12 flex justify-center text-foreground/50"><Search className="animate-spin w-6 h-6" /></div>
                        ) : lobbies.filter(l => l.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                            <div className="col-span-full py-12 text-center text-foreground/50 border border-dashed border-surface-border rounded-2xl">
                                Nessuna lobby trovata. Forgia tu la prima!
                            </div>
                        ) : (
                            lobbies.filter(l => l.title.toLowerCase().includes(searchQuery.toLowerCase())).map(lobby => (
                                <div key={lobby.id} className="bg-surface/50 border border-surface-border p-5 rounded-2xl hover:bg-surface/80 transition group relative overflow-hidden">
                                    {lobby.status === 'FOCUSING' && <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/20 blur-xl rounded-full" />}
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="text-[10px] font-bold uppercase text-primary mb-1">{lobby.category} - {lobby.focusDuration} MIN</div>
                                            <h3 className="font-bold text-lg leading-tight truncate">{lobby.title}</h3>
                                        </div>
                                        {lobby.is_private ? <Lock className="text-foreground/40 w-4 h-4 mt-1" /> : <Unlock className="text-foreground/20 w-4 h-4 mt-1" />}
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-6 h-6 rounded-full overflow-hidden bg-surface-border">
                                            {lobby.host?.avatar_id && <img src={`/avatars/${lobby.host.avatar_id}.png`} className="w-full h-full object-cover" alt="Host" />}
                                        </div>
                                        <span className="text-xs text-foreground/60 truncate pr-2">Host: {lobby.host?.username}</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs text-foreground/60">
                                            <Users className="w-4 h-4" />
                                            <span>Max {lobby.max_participants}</span>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant={lobby.status === 'WAITING' ? 'default' : 'secondary'}
                                            onClick={() => handleJoin(lobby)}
                                            className="gap-2 h-8"
                                        >
                                            <Play className="w-3 h-3" /> {lobby.status === 'WAITING' ? 'Entra' : 'Rientra in Corsa'}
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Create Lobby Form */}
                <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 bg-surface border border-surface-border p-6 rounded-2xl sticky top-8">
                    <h2 className="text-xl font-bold mb-6">Forgia Stanza</h2>
                    <form onSubmit={handleCreate} className="flex flex-col gap-4">
                        <div>
                            <label className="text-xs uppercase text-foreground/50 mb-1 block">Titolo</label>
                            <input type="text" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-background border border-surface-border rounded-xl px-4 py-2 outline-none focus:border-primary text-sm" />
                        </div>
                        <div>
                            <label className="text-xs uppercase text-foreground/50 mb-1 block">Categoria</label>
                            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-background border border-surface-border rounded-xl px-4 py-2 outline-none focus:border-primary text-sm">
                                <option value="STUDY">Studio</option>
                                <option value="WORKOUT">Allenamento</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs uppercase text-foreground/50 mb-1 block">Focus (min)</label>
                                <input type="number" min="1" max="60" required value={form.focusDuration} onChange={e => setForm({...form, focusDuration: e.target.value === '' ? '' as any : parseInt(e.target.value)})} className="w-full bg-background border border-surface-border rounded-xl px-4 py-2 outline-none focus:border-primary text-sm" />
                            </div>
                            <div>
                                <label className="text-xs uppercase text-foreground/50 mb-1 block">Pausa (min)</label>
                                <input type="number" min="1" max="30" required value={form.breakDuration} onChange={e => setForm({...form, breakDuration: e.target.value === '' ? '' as any : parseInt(e.target.value)})} className="w-full bg-background border border-surface-border rounded-xl px-4 py-2 outline-none focus:border-primary text-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 items-end">
                            <div>
                                <label className="text-xs uppercase text-foreground/50 mb-1 block">Partecipanti</label>
                                <input type="number" min="1" max="8" required value={form.maxParticipants} onChange={e => setForm({...form, maxParticipants: e.target.value === '' ? '' as any : parseInt(e.target.value)})} className="w-full bg-background border border-surface-border rounded-xl px-4 py-2 outline-none focus:border-primary text-sm" />
                            </div>
                            <div className="flex h-10 items-center">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.isPrivate} onChange={e => setForm({...form, isPrivate: e.target.checked})} className="accent-primary" />
                                    <span className="text-sm font-medium">Lobby Privata</span>
                                </label>
                            </div>
                        </div>
                        {form.isPrivate && (
                            <div>
                                <label className="text-xs uppercase text-foreground/50 mb-1 block">Password</label>
                                <input type="text" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full bg-background border border-surface-border rounded-xl px-4 py-2 outline-none focus:border-primary text-sm" />
                            </div>
                        )}
                        <Button type="submit" className="w-full font-bold mt-2 hover:scale-[1.02] transition-transform">
                            Crea Lobby
                        </Button>
                    </form>
                </div>

            </div>

            {/* Modal Password Privata */}
            {passwordPromptLobby && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-surface border border-surface-border p-6 rounded-2xl w-full max-w-sm shadow-2xl">
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-primary" /> Lobby Privata
                        </h3>
                        <p className="text-sm text-foreground/60 mb-4">
                            Inserisci la parola d'ordine per accedere a <strong className="text-foreground">{passwordPromptLobby.title}</strong>.
                        </p>
                        <input 
                            type="password" 
                            autoFocus
                            value={joinPassword}
                            onChange={e => setJoinPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleJoinConfirm()}
                            className="w-full bg-background border border-surface-border rounded-xl px-4 py-3 mb-6 outline-none focus:border-primary text-sm tracking-widest text-center"
                            placeholder="Password segreta..."
                        />
                        <div className="flex gap-3 justify-end">
                            <Button variant="ghost" onClick={() => setPasswordPromptLobby(null)} className="text-sm">Annulla</Button>
                            <Button onClick={handleJoinConfirm} className="font-bold" disabled={!joinPassword}>Sblocca ed Entra</Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
