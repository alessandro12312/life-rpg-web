"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

const STAT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  strength:     { label: "FOR", color: "text-red-400",    bg: "bg-red-500/15 border-red-500/25" },
  intelligence: { label: "INT", color: "text-blue-400",   bg: "bg-blue-500/15 border-blue-500/25" },
  endurance:    { label: "END", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/25" },
  discipline:   { label: "DIS", color: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/25" },
  focus:        { label: "FOC", color: "text-cyan-400",   bg: "bg-cyan-500/15 border-cyan-500/25" },
  knowledge:    { label: "KNO", color: "text-sky-400",    bg: "bg-sky-500/15 border-sky-500/25" },
  health:       { label: "VIT", color: "text-green-400",  bg: "bg-green-500/15 border-green-500/25" },
};

interface XPGainNotificationProps {
  show: boolean;
  xpGained: number;
  statGains: Record<string, number>;
  onDone: () => void;
}

export function XPGainNotification({ show, xpGained, statGains, onDone }: XPGainNotificationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 400);
    }, 3200);
    return () => clearTimeout(timer);
  }, [show, onDone]);

  const statEntries = Object.entries(statGains).filter(([, v]) => v > 0);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 60, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 60, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-8 right-6 z-[200] flex flex-col gap-2 pointer-events-none max-w-[200px]"
        >
          {/* XP Gain Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex items-center gap-2.5 px-4 py-3 rounded-2xl border border-primary/30 bg-surface/80 backdrop-blur-md shadow-lg shadow-primary/10"
          >
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
            <span
              className="font-black text-primary text-lg tracking-wide"
              style={{ textShadow: "0 0 12px rgba(245,158,11,0.6)" }}
            >
              +{xpGained} XP
            </span>
          </motion.div>

          {/* Stat gain badges */}
          {statEntries.map(([stat, val], i) => {
            const cfg = STAT_CONFIG[stat];
            if (!cfg) return null;
            return (
              <motion.div
                key={stat}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold ${cfg.bg} backdrop-blur-md`}
              >
                <span className={`text-xs font-black tracking-widest ${cfg.color}`}>
                  {cfg.label}
                </span>
                <span className={`${cfg.color}`}>+{val.toFixed(2)}</span>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
