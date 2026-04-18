"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Swords, Plus, Shield, Skull, Star, ArrowLeft, Flame, Crown, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api";

interface Boss {
  id: string;
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

  // Create form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTier, setFormTier] = useState(1);
  const [formDifficulty, setFormDifficulty] = useState(1.0);
  const [formPhases, setFormPhases] = useState(1);
  const [formType, setFormType] = useState("GOAL");

  useEffect(() => {
    loadBosses();
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
        }),
      });
      if (res.ok) {
        setShowCreateForm(false);
        setFormName(""); setFormDescription(""); setFormTier(1); setFormDifficulty(1.0); setFormPhases(1);
        await loadBosses();
      }
    } catch (e) {
      console.error("Error creating boss:", e);
    } finally {
      setCreating(false);
    }
  };

  const handleStartBattle = async (bossId: string) => {
    setStartingBattle(bossId);
    const headers = await getAuthHeader();
    if (!headers) return;

    try {
      const res = await fetch(`${API_URL}/battle/start`, {
        method: "POST",
        headers,
        body: JSON.stringify({ boss_id: bossId, mode: "SOLO" }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/battle/${data.battle.id}`);
      }
    } catch (e) {
      console.error("Error starting battle:", e);
    } finally {
      setStartingBattle(null);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-4 lg:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <section className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 rounded-lg bg-surface/50 border border-surface-border hover:bg-surface-border transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Swords className="w-6 h-6 text-red-500" />
                Arena dei Boss
              </h1>
              <p className="text-sm text-foreground/50 mt-0.5">Affronta i tuoi obiettivi come battaglie epiche</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-semibold transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/40 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Crea Boss</span>
          </button>
        </section>

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

        {/* Boss List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bosses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 space-y-4"
          >
            <Skull className="w-16 h-16 text-foreground/20 mx-auto" />
            <h3 className="text-lg font-semibold text-foreground/40">Nessun boss creato</h3>
            <p className="text-sm text-foreground/30">Crea il tuo primo boss per iniziare a combattere!</p>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {bosses.map((boss, i) => (
              <motion.div
                key={boss.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`group relative bg-gradient-to-r ${TIER_COLORS[boss.tier] || TIER_COLORS[1]} border rounded-2xl p-5 shadow-lg ${TIER_GLOW[boss.tier]} hover:shadow-xl transition-all duration-300`}
              >
                {/* Decorative glow */}
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <div className="flex items-start justify-between relative z-10">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-white/10 font-medium flex items-center gap-1">
                        {TYPE_ICONS[boss.boss_type] || TYPE_ICONS.GOAL}
                        {boss.boss_type}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: boss.tier }).map((_, s) => (
                          <Star key={s} className="w-3 h-3 text-primary fill-primary" />
                        ))}
                      </div>
                      {boss.phase_count > 1 && (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-white/10 font-medium">
                          {boss.phase_count} Fasi
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold truncate">{boss.name}</h3>
                    {boss.description && (
                      <p className="text-xs text-foreground/50 mt-1 line-clamp-1">{boss.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-foreground/60">
                      <span className="flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-blue-400" />
                        HP: {boss.base_hp}
                      </span>
                      <span className="flex items-center gap-1">
                        <Swords className="w-3.5 h-3.5 text-red-400" />
                        ATK: {boss.base_atk}
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-cyan-400" />
                        DEF: {boss.base_def}
                      </span>
                      <span className="flex items-center gap-1 text-primary font-medium">
                        ⭐ {boss.xp_reward} XP
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartBattle(boss.id)}
                    disabled={startingBattle === boss.id}
                    className="ml-4 px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold text-sm transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                  >
                    {startingBattle === boss.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Swords className="w-4 h-4" />
                    )}
                    Combatti
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
