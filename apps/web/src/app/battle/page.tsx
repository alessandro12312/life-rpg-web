"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Swords, Plus, Shield, Skull, Star, ArrowLeft, Flame, Crown, Zap, Users, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Boss {
  id: string;
  creator_id?: string;
  name: string;
  description: string | null;
  boss_type: string;
  tier: number;
  difficulty_factor: number;
  phase_count: number;
  base_hp: number;
  base_atk: number;
  base_def: number;
  xp_reward: number;
}

const TIER_RANKS = ["", "RANK D", "RANK C", "RANK B", "RANK A", "RANK S"];
const TIER_POSTER_COLORS = [
  "",
  "border-emerald-500/20 bg-emerald-950/10 hover:border-emerald-500/40 shadow-emerald-500/5",
  "border-blue-500/20 bg-blue-950/10 hover:border-blue-500/40 shadow-blue-500/5",
  "border-purple-500/20 bg-purple-950/10 hover:border-purple-500/40 shadow-purple-500/5",
  "border-orange-500/20 bg-orange-950/10 hover:border-orange-500/40 shadow-orange-500/5",
  "border-red-500/20 bg-red-950/10 hover:border-red-500/40 shadow-red-500/5"
];


const TIER_COLORS = [
  "", // 0 unused
  "from-emerald-500/20 to-emerald-900/10 border-emerald-500/30",
  "from-blue-500/20 to-blue-900/10 border-blue-500/30",
  "from-purple-500/20 to-purple-900/10 border-purple-500/30",
  "from-orange-500/20 to-orange-900/10 border-orange-500/30",
  "from-red-500/20 to-red-900/10 border-red-500/30",
];

const TIER_GLOW = [
  "", "shadow-emerald-500/10", "shadow-blue-500/10",
  "shadow-purple-500/10", "shadow-orange-500/10", "shadow-red-500/10",
];

const TIER_LABELS = ["", "Facile", "Normale", "Difficile", "Epico", "Leggendario"];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  GOAL: <Crown className="w-4 h-4" />,
  TRAINING: <Zap className="w-4 h-4" />,
  RAID: <Flame className="w-4 h-4" />,
};

export default function BattleArenaPage() {
  const router = useRouter();
  const [bosses, setBosses] = useState<Boss[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [startingBattle, setStartingBattle] = useState<string | null>(null);
  const [selectedBossForBattle, setSelectedBossForBattle] = useState<string | null>(null);
  const [partyLobbies, setPartyLobbies] = useState<any[]>([]);

  // Current session/combat state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeBattle, setActiveBattle] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTier, setFormTier] = useState(1);
  const [formDifficulty, setFormDifficulty] = useState(1.0);
  const [formPhases, setFormPhases] = useState(1);
  const [formType, setFormType] = useState("GOAL");
  const [formGoalId, setFormGoalId] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setCurrentUserId(session.user.id);
    });
    loadBosses();
    loadPartyLobbies();
    loadActiveBattle();
    loadGoals();
    const interval = setInterval(() => {
      loadPartyLobbies();
      loadActiveBattle();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return null; }
    return { "Authorization": `Bearer ${session.access_token}`, "Content-Type": "application/json" };
  };

  const loadBosses = async () => {
    const headers = await getAuthHeader();
    if (!headers) return;
    try {
      const res = await fetch(`${API_URL}/battle/boss/list`, { headers });
      if (res.ok) setBosses(await res.json());
    } catch (e) {
      console.error("Error loading bosses:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadPartyLobbies = async () => {
    const headers = await getAuthHeader();
    if (!headers) return;
    try {
      const res = await fetch(`${API_URL}/battle/party/open`, { headers });
      if (res.ok) setPartyLobbies(await res.json());
    } catch (e) {
      console.error("Error loading lobbies:", e);
    }
  };

  const loadActiveBattle = async () => {
    const headers = await getAuthHeader();
    if (!headers) return;
    try {
      const res = await fetch(`${API_URL}/battle/active`, { headers });
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        setActiveBattle(data);
      }
    } catch (e) {
      console.error("Error loading active battle:", e);
    }
  };

  const loadGoals = async () => {
    const headers = await getAuthHeader();
    if (!headers) return;
    try {
      const res = await fetch(`${API_URL}/player/goals`, { headers });
      if (res.ok) {
        const data = await res.json();
        setGoals(data.filter((g: any) => !g.completed));
      }
    } catch (e) {
      console.error("Error loading goals:", e);
    }
  };

  const handleCreateBoss = async () => {
    if (!formName.trim()) return;
    setCreating(true);
    const headers = await getAuthHeader();
    if (!headers) return;

    try {
      const res = await fetch(`${API_URL}/battle/boss`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          boss_type: formType,
          tier: formTier,
          difficulty_factor: formDifficulty,
          phase_count: formPhases,
          source_goal_id: formGoalId || undefined,
        }),
      });
      if (res.ok) {
        setShowCreateForm(false);
        setFormName(""); setFormDescription(""); setFormTier(1); setFormDifficulty(1.0); setFormPhases(1);
        setFormGoalId("");
        await loadBosses();
      }
    } catch (e) {
      console.error("Error creating boss:", e);
    } finally {
      setCreating(false);
    }
  };

  const handleStartBattle = async (bossId: string, mode: "SOLO" | "PARTY") => {
    setStartingBattle(bossId);
    const headers = await getAuthHeader();
    if (!headers) return;

    try {
      const res = await fetch(`${API_URL}/battle/start`, {
        method: "POST",
        headers,
        body: JSON.stringify({ boss_id: bossId, mode }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/battle/${data.battle.id}`);
      } else {
        const err = await res.json();
        alert(err.message || "Errore nell'avvio della battaglia.");
      }
    } catch (e) {
      console.error("Error starting battle:", e);
    } finally {
      setStartingBattle(null);
      setSelectedBossForBattle(null);
    }
  };

  const handleJoinLobby = async (lobbyId: string) => {
    const headers = await getAuthHeader();
    if (!headers) return;
    try {
      const res = await fetch(`${API_URL}/battle/${lobbyId}/join`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        router.push(`/battle/${lobbyId}`);
      } else {
        alert("Impossibile unirsi alla battaglia. Potrebbe essere piena o già iniziata.");
      }
    } catch (e) {
      console.error("Error joining lobby:", e);
    }
  };

  const handleAbandonBattle = async (battleId: string) => {
    if (!confirm("Sei sicuro di voler abbandonare questa battaglia? Tutti i progressi andranno persi.")) return;
    const headers = await getAuthHeader();
    if (!headers) return;
    try {
      const res = await fetch(`${API_URL}/battle/${battleId}/abandon`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        setActiveBattle(null);
        await loadBosses();
      }
    } catch (e) {
      console.error("Error abandoning battle:", e);
    }
  };

  const handleDeleteBoss = async (bossId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo boss? Tutte le battaglie associate verranno cancellate.")) return;
    const headers = await getAuthHeader();
    if (!headers) return;
    try {
      const res = await fetch(`${API_URL}/battle/boss/${bossId}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        await loadBosses();
        if (activeBattle?.bossId === bossId) {
          setActiveBattle(null);
        }
      }
    } catch (e) {
      console.error("Error deleting boss:", e);
    }
  };

  return (
    <div className="space-y-6">

        {/* Header */}
        <header className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-3 bg-surface/80 backdrop-blur border border-surface-border hover:bg-surface rounded-full transition-colors text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-primary drop-shadow-[0_0_10px_rgba(245,158,11,0.5)] flex items-center gap-3">
                <Swords className="w-6 h-6 text-red-500 opacity-80" /> Arena dei Boss
              </h1>
              <p className="text-foreground/70 text-sm mt-1">Affronta i tuoi obiettivi come battaglie epiche</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-semibold transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/40 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Crea Boss</span>
          </button>
        </header>

        {/* Create Boss Modal */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setShowCreateForm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-surface border border-surface-border rounded-2xl p-6 w-full max-w-lg space-y-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Skull className="w-5 h-5 text-red-500" />
                  Crea Nuovo Boss
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1">Nome del Boss</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Es: Drago dell'Analisi 1"
                      className="w-full bg-background border border-surface-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-foreground/30"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1">Descrizione (opzionale)</label>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Descrivi il boss..."
                      rows={2}
                      className="w-full bg-background border border-surface-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-foreground/30 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground/70 mb-1">Tipo</label>
                      <select
                        value={formType}
                        onChange={(e) => setFormType(e.target.value)}
                        className="w-full bg-background border border-surface-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="GOAL">🎯 Obiettivo</option>
                        <option value="TRAINING">⚡ Allenamento</option>
                        <option value="RAID">🔥 Raid</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground/70 mb-1">
                        Tier: {formTier} — {TIER_LABELS[formTier]}
                      </label>
                      <input
                        type="range" min={1} max={5} value={formTier}
                        onChange={(e) => setFormTier(Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground/70 mb-1">
                        Difficoltà: {formDifficulty.toFixed(1)}x
                      </label>
                      <input
                        type="range" min={0.5} max={5.0} step={0.5} value={formDifficulty}
                        onChange={(e) => setFormDifficulty(Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground/70 mb-1">
                        Fasi: {formPhases}
                      </label>
                      <input
                        type="range" min={1} max={3} value={formPhases}
                        onChange={(e) => setFormPhases(Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1">
                      Associa a un Obiettivo (Goal) — Facoltativo
                    </label>
                    <select
                      value={formGoalId}
                      onChange={(e) => setFormGoalId(e.target.value)}
                      className="w-full bg-background border border-surface-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Nessun obiettivo associato</option>
                      {goals.map((goal) => (
                        <option key={goal.id} value={goal.id}>
                          {goal.title} ({goal.category})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-foreground/40 mt-1 leading-normal">
                      Registrare progressi su questo obiettivo infliggerà danni automatici a questo boss durante la battaglia!
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-surface-border hover:bg-surface-border transition-colors text-sm font-medium"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleCreateBoss}
                    disabled={!formName.trim() || creating}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold transition-all hover:from-red-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {creating ? "Creazione..." : "Evoca Boss ⚔️"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Battle Banner */}
        {activeBattle && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-primary/5"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
              <div>
                <p className="text-sm font-bold text-primary">Battaglia attiva in corso!</p>
                <p className="text-xs text-foreground/60 mt-0.5">Sei attualmente in una sessione di combattimento in modalità {activeBattle.mode}.</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleAbandonBattle(activeBattle.battleId)}
                className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-xl border border-red-500/30 hover:bg-red-500/10 text-red-400 transition-colors"
              >
                Abbandona
              </button>
              <button
                onClick={() => router.push(`/battle/${activeBattle.battleId}`)}
                className="flex-1 sm:flex-none px-5 py-2 text-xs font-black rounded-xl bg-primary text-[#09090b] hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
              >
                Riprendi ⚔️
              </button>
            </div>
          </motion.div>
        )}

        {/* Arena Content Layout */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Left Column: Boss List */}
          <div className="flex-1 w-full space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : bosses.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="text-center py-20 space-y-4 border border-dashed border-surface-border rounded-2xl"
              >
                <Skull className="w-16 h-16 text-foreground/20 mx-auto" />
                <h3 className="text-lg font-semibold text-foreground/40">Nessun boss creato</h3>
                <p className="text-sm text-foreground/30">Crea il tuo primo boss per iniziare a combattere!</p>
              </motion.div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-6">
                {bosses.map((boss, i) => (
                  <motion.div
                    key={boss.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "relative flex flex-col overflow-hidden rounded-2xl border bg-surface/30 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl",
                      TIER_POSTER_COLORS[boss.tier] || TIER_POSTER_COLORS[1]
                    )}
                  >
                    {/* Metal Rivets / Corner ornaments in JRPG Style */}
                    <div className="absolute top-2.5 left-2.5 w-1.5 h-1.5 rounded-full bg-zinc-700 border border-zinc-500 opacity-60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]" />
                    <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-zinc-700 border border-zinc-500 opacity-60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]" />
                    <div className="absolute bottom-2.5 left-2.5 w-1.5 h-1.5 rounded-full bg-zinc-700 border border-zinc-500 opacity-60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]" />
                    <div className="absolute bottom-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-zinc-700 border border-zinc-500 opacity-60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]" />

                    {/* Wanted Header */}
                    <div className="pt-5 pb-2.5 text-center border-b border-surface-border bg-black/20">
                      <div className="text-[9px] font-mono tracking-[0.25em] text-foreground/40 uppercase">Bounty Target</div>
                      <div className="text-xl font-extrabold tracking-[0.15em] text-red-500/90 font-serif my-0.5">WANTED</div>
                      <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-amber-500/80 tracking-wider">
                        <span>{TIER_RANKS[boss.tier] || "RANK D"}</span>
                        <span>•</span>
                        <span>{TIER_LABELS[boss.tier] || "Facile"}</span>
                      </div>
                    </div>

                    {/* Boss Image / Center Emblem */}
                    <div className="p-4 flex flex-col items-center justify-center bg-black/10 relative overflow-hidden h-40 border-b border-surface-border/50">
                      {/* Concentric rotating glowing runes behind the icon */}
                      <div className="absolute w-28 h-28 rounded-full border border-dashed border-foreground/5 animate-[spin_45s_linear_infinite]" />
                      <div className="absolute w-24 h-24 rounded-full border border-dotted border-foreground/10 animate-[spin_20s_linear_infinite_reverse]" />
                      
                      {/* Glowing background radial blur */}
                      <div className={cn(
                        "absolute w-16 h-16 rounded-full blur-xl opacity-20 pointer-events-none",
                        boss.tier === 1 && "bg-emerald-500",
                        boss.tier === 2 && "bg-blue-500",
                        boss.tier === 3 && "bg-purple-500",
                        boss.tier === 4 && "bg-orange-500",
                        boss.tier === 5 && "bg-red-500"
                      )} />

                      {/* Boss type badge */}
                      <span className="absolute top-3 left-3 text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-bold uppercase tracking-wider flex items-center gap-1">
                        {TYPE_ICONS[boss.boss_type] || TYPE_ICONS.GOAL}
                        {boss.boss_type}
                      </span>

                      {/* Phase count badge if more than 1 */}
                      {boss.phase_count > 1 && (
                        <span className="absolute top-3 right-3 text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-bold uppercase tracking-wider">
                          {boss.phase_count} Fasi
                        </span>
                      )}

                      {/* Skull Icon */}
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                        className="relative z-10 p-3 rounded-full bg-surface/80 border border-surface-border shadow-lg"
                      >
                        <Skull className={cn(
                          "w-7 h-7",
                          boss.tier === 1 && "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]",
                          boss.tier === 2 && "text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]",
                          boss.tier === 3 && "text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]",
                          boss.tier === 4 && "text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]",
                          boss.tier === 5 && "text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                        )} />
                      </motion.div>

                      <div className="mt-2.5 text-center relative z-10 w-full px-2">
                        <h3 className="font-extrabold text-sm tracking-tight text-foreground truncate">{boss.name}</h3>
                        {boss.description ? (
                          <p className="text-[10px] text-foreground/50 mt-0.5 truncate">{boss.description}</p>
                        ) : (
                          <p className="text-[10px] text-foreground/30 mt-0.5 italic">Nessuna descrizione</p>
                        )}
                      </div>
                    </div>

                    {/* Stat Plate */}
                    <div className="p-4 bg-black/5 flex-1 flex flex-col justify-between gap-4">
                      <div className="grid grid-cols-3 gap-1 bg-surface/50 border border-surface-border/30 rounded-xl p-2 text-center text-[10px]">
                        <div>
                          <div className="text-foreground/40 font-mono text-[8px]">HP</div>
                          <div className="font-bold font-mono text-red-400">{boss.base_hp}</div>
                        </div>
                        <div className="border-x border-surface-border/30">
                          <div className="text-foreground/40 font-mono text-[8px]">ATK</div>
                          <div className="font-bold font-mono text-amber-500">{boss.base_atk}</div>
                        </div>
                        <div>
                          <div className="text-foreground/40 font-mono text-[8px]">DEF</div>
                          <div className="font-bold font-mono text-cyan-400">{boss.base_def}</div>
                        </div>
                      </div>

                      {/* Reward XP Badge */}
                      <div className="text-center py-1.5 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                        <span className="text-[8px] font-bold text-amber-500/70 uppercase tracking-widest block leading-none mb-0.5">Reward Bounty</span>
                        <span className="text-xs font-black text-amber-400 font-mono">⭐ {boss.xp_reward} XP</span>
                      </div>

                      {/* Buttons Container */}
                      <div className="flex gap-2 pt-2 border-t border-surface-border/30">
                        {currentUserId === boss.creator_id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBoss(boss.id);
                            }}
                            className="p-2.5 rounded-xl bg-red-950/20 border border-red-500/20 hover:bg-red-500/20 text-red-400 transition-colors active:scale-95 shrink-0 animate-fade-in"
                            title="Elimina Boss"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        
                        {activeBattle && activeBattle.bossId === boss.id ? (
                          <button
                            onClick={() => router.push(`/battle/${activeBattle.battleId}`)}
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            <Swords className="w-3.5 h-3.5" />
                            Riprendi
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedBossForBattle(boss.id)}
                            disabled={startingBattle === boss.id || activeBattle !== null}
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold text-xs transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/40 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                            title={activeBattle ? "Hai già una battaglia attiva con un altro boss" : ""}
                          >
                            {startingBattle === boss.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Swords className="w-3.5 h-3.5" />
                            )}
                            Combatti
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Lobbies */}
          <div className="w-full lg:w-80 space-y-4 shrink-0 bg-surface/30 border border-surface-border p-6 rounded-2xl">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Lobby Attive
            </h2>
            <div className="space-y-3">
              {partyLobbies.length === 0 ? (
                <p className="text-xs text-foreground/40 text-center py-8 border border-dashed border-surface-border rounded-xl leading-relaxed">
                  Nessuna lobby attiva.<br />Crea una lobby in modalità Party per iniziare!
                </p>
              ) : (
                partyLobbies.map((lobby) => (
                  <div key={lobby.id} className="bg-surface/50 border border-surface-border p-4 rounded-xl space-y-3 hover:bg-surface/80 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase text-primary mb-0.5">{lobby.mode}</div>
                        <h3 className="font-bold text-sm leading-tight truncate">{lobby.boss.name}</h3>
                        <p className="text-[10px] text-foreground/50 mt-0.5">Tier {lobby.boss.tier} · {lobby.boss.phase_count} Fasi</p>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded font-semibold whitespace-nowrap shrink-0">
                        {lobby.participantCount} / {lobby.maxParticipants}
                      </span>
                    </div>

                    {lobby.host && (
                      <div className="flex items-center gap-1.5 text-[11px] text-foreground/60">
                        <div className="w-4 h-4 rounded-full overflow-hidden bg-surface-border shrink-0 flex items-center justify-center">
                          {lobby.host.avatar_id ? (
                            <img src={`/avatars/${lobby.host.avatar_id}.png`} className="w-full h-full object-cover" alt="Host" />
                          ) : (
                            <Users className="w-2.5 h-2.5 text-foreground/55" />
                          )}
                        </div>
                        <span className="truncate">Host: {lobby.host.username}</span>
                      </div>
                    )}

                    <button
                      onClick={() => handleJoinLobby(lobby.id)}
                      className="w-full py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary text-primary hover:text-[#09090b] text-xs font-bold transition-all"
                    >
                      {lobby.isParticipant ? "Rientra" : "Unisciti"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Mode Selection Modal */}
        <AnimatePresence>
          {selectedBossForBattle && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setSelectedBossForBattle(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-surface border border-surface-border rounded-2xl p-6 w-full max-w-sm space-y-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Swords className="w-5 h-5 text-red-500" />
                  Seleziona Modalità
                </h2>
                <p className="text-sm text-foreground/60">Scegli come affrontare questa battaglia:</p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => handleStartBattle(selectedBossForBattle, 'SOLO')}
                    disabled={startingBattle !== null}
                    className="w-full p-4 rounded-xl border border-surface-border bg-surface hover:bg-surface-border hover:border-primary/50 transition-all flex items-center gap-3 text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">I</div>
                    <div>
                      <div className="font-bold text-sm group-hover:text-primary transition-colors">Solo (Inizia Subito)</div>
                      <div className="text-xs text-foreground/50 mt-0.5">Affronta il boss da solo e metti alla prova le tue forze.</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleStartBattle(selectedBossForBattle, 'PARTY')}
                    disabled={startingBattle !== null}
                    className="w-full p-4 rounded-xl border border-surface-border bg-surface hover:bg-surface-border hover:border-red-500/50 transition-all flex items-center gap-3 text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center font-bold shrink-0">III</div>
                    <div>
                      <div className="font-bold text-sm group-hover:text-red-400 transition-colors">Party (Crea Lobby)</div>
                      <div className="text-xs text-foreground/50 mt-0.5">Crea una lobby cooperativa per combattere insieme ai tuoi alleati.</div>
                    </div>
                  </button>
                </div>

                <div className="flex pt-2">
                  <button
                    onClick={() => setSelectedBossForBattle(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-surface-border hover:bg-surface-border transition-colors text-xs font-semibold"
                  >
                    Annulla
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}
