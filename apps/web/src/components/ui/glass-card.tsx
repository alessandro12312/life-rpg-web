"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

export interface GlassCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  glow?: boolean;
  glowColor?: "primary" | "accent" | "str" | "int" | "end" | "purple";
  hoverEffect?: boolean;
  children?: React.ReactNode;
}

const glowColors = {
  primary: "group-hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] border-primary/20",
  accent: "group-hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] border-accent/20",
  str: "group-hover:shadow-[0_0_20px_rgba(239,68,68,0.15)] border-stat-str/20",
  int: "group-hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] border-stat-int/20",
  end: "group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] border-stat-end/20",
  purple: "group-hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] border-purple-500/20",
};

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, glow = false, glowColor = "primary", hoverEffect = true, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-surface-border bg-surface/30 backdrop-blur-md transition-all duration-300 group",
          hoverEffect && "hover:bg-surface/40 hover:border-surface-border/80 hover:-translate-y-0.5",
          glow && glowColors[glowColor],
          className
        )}
        {...props}
      >
        {/* Accent Top Light */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
        
        {/* Dynamic Glow Radial Gradient Background */}
        {glow && (
          <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-white/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl pointer-events-none" />
        )}
        
        <div className="relative z-10">{children}</div>
      </motion.div>
    );
  }
);

GlassCard.displayName = "GlassCard";

export { GlassCard };
