"use client";

import { useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Zap, Shield } from "lucide-react";

interface LevelUpOverlayProps {
  show: boolean;
  oldLevel: number;
  newLevel: number;
  onDismiss: () => void;
}

export function LevelUpOverlay({ show, oldLevel, newLevel, onDismiss }: LevelUpOverlayProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!show) return;
    timerRef.current = setTimeout(onDismiss, 4500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [show, onDismiss]);

  const particles = useMemo(() =>
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      x: 5 + (i * 3.5) % 90,
      size: 4 + (i % 5) * 2,
      delay: (i * 0.12) % 1.2,
      duration: 1.8 + (i % 4) * 0.4,
      color: i % 3 === 0 ? "bg-primary" : i % 3 === 1 ? "bg-orange-400" : "bg-yellow-300",
    })), []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[300] flex items-center justify-center cursor-pointer select-none"
          onClick={onDismiss}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

          {/* Central radial gold glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,_rgba(245,158,11,0.18)_0%,_transparent_75%)]" />

          {/* Ambient ring */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.6, 1.4, 1.2], opacity: [0, 0.3, 0] }}
            transition={{ delay: 0.2, duration: 1.2, ease: "easeOut" }}
            className="absolute w-80 h-80 rounded-full border border-primary/40"
          />

          {/* Particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className={`absolute rounded-full ${p.color} opacity-0`}
              style={{ left: `${p.x}%`, bottom: "10%", width: p.size, height: p.size }}
              animate={{
                y: [0, -(120 + p.id * 8)],
                opacity: [0, 0.9, 0.9, 0],
                scale: [0, 1, 1, 0],
              }}
              transition={{
                delay: p.delay,
                duration: p.duration,
                ease: "easeOut",
                repeat: Infinity,
                repeatDelay: 0.8,
              }}
            />
          ))}

          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center gap-5 text-center px-8">
            {/* Top decoration */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="flex items-center gap-4 w-full justify-center"
            >
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-primary/50" />
              <Star className="w-4 h-4 text-primary fill-primary" />
              <Star className="w-5 h-5 text-primary fill-primary" />
              <Star className="w-4 h-4 text-primary fill-primary" />
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-primary/50" />
            </motion.div>

            {/* LEVEL UP text */}
            <motion.h1
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.25, type: "spring", stiffness: 280, damping: 14 }}
              className="text-primary drop-shadow-[0_0_40px_rgba(245,158,11,0.9)] uppercase tracking-widest"
              style={{
                fontFamily: "var(--font-press-start-2p), monospace",
                fontSize: "clamp(22px, 5vw, 52px)",
                textShadow: "0 0 20px rgba(245,158,11,0.8), 0 0 60px rgba(245,158,11,0.4)",
              }}
            >
              LEVEL UP!
            </motion.h1>

            {/* Level transition */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
              className="flex items-center gap-8 mt-1"
            >
              <div className="text-center">
                <div className="text-4xl font-black text-foreground/30 line-through decoration-foreground/20">
                  {oldLevel}
                </div>
                <div className="text-[10px] text-foreground/25 mt-1 tracking-widest uppercase">Prima</div>
              </div>

              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.6, type: "spring", stiffness: 300 }}
              >
                <Zap className="w-7 h-7 text-primary fill-primary/40" />
              </motion.div>

              <div className="text-center">
                <motion.div
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: [1.6, 1], opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.5, ease: "backOut" }}
                  className="font-black text-primary"
                  style={{
                    fontSize: "clamp(40px, 8vw, 72px)",
                    textShadow: "0 0 30px rgba(245,158,11,0.7)",
                  }}
                >
                  {newLevel}
                </motion.div>
                <div className="text-[10px] text-primary/70 mt-1 tracking-widest uppercase font-bold">
                  Nuovo Livello
                </div>
              </div>
            </motion.div>

            {/* Shield icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.9, type: "spring" }}
            >
              <Shield className="w-10 h-10 text-primary/50" />
            </motion.div>

            {/* Dismiss hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              transition={{ delay: 1.8, duration: 0.6 }}
              className="text-xs text-foreground/40 tracking-widest uppercase mt-1"
            >
              Tocca per continuare
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
