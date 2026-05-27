"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Swords,
  History,
  BookOpen,
  User,
  Trophy,
  Shield,
  Clock,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Flame,
} from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  shadow: string;
}

const navigationItems: NavigationItem[] = [
  {
    name: "Taverna",
    href: "/",
    icon: Home,
    color: "text-amber-500",
    shadow: "shadow-amber-500/10",
  },
  {
    name: "Arena",
    href: "/battle",
    icon: Swords,
    color: "text-red-500",
    shadow: "shadow-red-500/10",
  },
  {
    name: "Sanctum",
    href: "/sanctum",
    icon: Clock,
    color: "text-accent",
    shadow: "shadow-accent/10",
  },
  {
    name: "Scrittoio",
    href: "/library",
    icon: BookOpen,
    color: "text-blue-400",
    shadow: "shadow-blue-500/10",
  },
  {
    name: "Grimorio",
    href: "/grimoire",
    icon: User,
    color: "text-purple-400",
    shadow: "shadow-purple-500/10",
  },
  {
    name: "Trofei",
    href: "/achievements",
    icon: Trophy,
    color: "text-primary",
    shadow: "shadow-primary/10",
  },
  {
    name: "Gilda",
    href: "/guild",
    icon: Shield,
    color: "text-amber-500",
    shadow: "shadow-amber-500/10",
  },
  {
    name: "Cronologia",
    href: "/history",
    icon: History,
    color: "text-emerald-400",
    shadow: "shadow-emerald-500/10",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  const {
    currentXP,
    xpToNextLevel,
    level,
    username,
    currentStreak,
    logout,
    avatarId,
  } = usePlayerStore();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    router.push("/login");
  };

  const progressPercent = mounted ? (currentXP / xpToNextLevel) * 100 : 0;

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 76 : 280 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="hidden md:flex flex-col h-screen sticky top-0 bg-surface/30 backdrop-blur-md border-r border-surface-border text-foreground z-30 overflow-hidden"
    >
      {/* Brand Logo Header */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-surface-border/50 shrink-0">
        <AnimatePresence mode="wait">
          {!isCollapsed ? (
            <motion.div
              key="logo-full"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-orange-600 flex items-center justify-center shadow-lg shadow-primary/20">
                <Shield className="w-5 h-5 text-black font-bold" />
              </div>
              <span className="font-bold text-lg tracking-wider bg-gradient-to-r from-white via-foreground/90 to-primary bg-clip-text text-transparent">
                LIFE <span className="text-primary">RPG</span>
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="logo-collapsed"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-orange-600 flex items-center justify-center shadow-lg shadow-primary/20 mx-auto"
            >
              <Shield className="w-5 h-5 text-black" />
            </motion.div>
          )}
        </AnimatePresence>

        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded-md hover:bg-white/5 text-foreground/40 hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Player Quick Info Panel */}
      <div className="p-4 border-b border-surface-border/30 shrink-0">
        <AnimatePresence mode="wait">
          {!isCollapsed ? (
            <motion.div
              key="profile-expanded"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-surface/50 border border-surface-border/50 rounded-xl p-3.5 relative overflow-hidden"
            >
              {/* Inner ambient glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent pointer-events-none" />

              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-full bg-surface-border border border-primary/40 flex items-center justify-center shadow-md relative overflow-hidden shrink-0">
                  {mounted && avatarId ? (
                    <img
                      src={`/avatars/${avatarId}.png`}
                      className="w-full h-full object-cover"
                      alt="Avatar"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <User className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate text-foreground/90">
                    {mounted ? username : "Hero"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-foreground/50">
                    <span className="text-primary font-bold">LVL {mounted ? level : "-"}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 font-medium">
                      <Flame className="w-3 h-3 text-orange-500 shrink-0" />
                      {mounted ? `${currentStreak}d` : "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* XP Bar */}
              <div className="mt-3 relative z-10">
                <div className="flex justify-between text-[10px] text-foreground/40 font-mono mb-1">
                  <span>EXP PROGRESS</span>
                  <span>
                    {mounted ? Math.floor(currentXP) : 0} / {mounted ? Math.floor(xpToNextLevel) : 1000}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-surface-border rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="profile-collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <div
                className="w-10 h-10 rounded-full bg-surface-border border border-primary/40 flex items-center justify-center cursor-pointer relative shadow-md"
                title={`${username} | Level ${level}`}
              >
                {mounted && avatarId ? (
                  <img
                    src={`/avatars/${avatarId}.png`}
                    className="w-full h-full object-cover rounded-full"
                    alt="Avatar"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <User className="w-5 h-5 text-primary" />
                )}
                <span className="absolute -bottom-1 -right-1 bg-primary text-[#09090b] text-[9px] font-bold px-1 rounded z-10">
                  {level}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Quick Log Action Button */}
        <div className="mt-3">
          <Link href="/log-activity" className="block">
            {!isCollapsed ? (
              <button
                type="button"
                className="w-full py-2.5 px-4 text-xs font-bold rounded-xl bg-gradient-to-r from-primary to-orange-500 hover:from-primary/95 hover:to-orange-500/95 text-black shadow-md shadow-primary/10 hover:shadow-primary/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <PlusCircle className="w-4 h-4 text-black" />
                Registra Attività
              </button>
            ) : (
              <button
                type="button"
                className="w-10 h-10 mx-auto rounded-full bg-gradient-to-tr from-primary to-orange-500 text-black flex items-center justify-center shadow-md shadow-primary/15 hover:shadow-primary/25 transition-all cursor-pointer active:scale-95"
                title="Registra Attività"
              >
                <PlusCircle className="w-5 h-5 text-black" />
              </button>
            )}
          </Link>
        </div>
      </div>

      {/* Main Nav Links */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 scrollbar-thin scrollbar-thumb-surface-border scrollbar-track-transparent">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "relative flex items-center rounded-xl p-3 cursor-pointer transition-all duration-200 group",
                  isActive
                    ? "bg-primary/10 text-white font-medium border border-primary/20 shadow-md " + item.shadow
                    : "hover:bg-white/5 text-foreground/60 hover:text-foreground border border-transparent"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                {/* Active Indicator Line */}
                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute left-0 w-1 h-6 bg-primary rounded-r-md"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}

                <div className={cn("shrink-0 transition-transform group-hover:scale-110", isCollapsed ? "mx-auto" : "mr-3")}>
                  <Icon className={cn("w-5 h-5", item.color)} />
                </div>

                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm tracking-wide"
                  >
                    {item.name}
                  </motion.span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Footer Actions */}
      <div className="p-4 border-t border-surface-border/30 shrink-0">
        {!isCollapsed ? (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-surface-border bg-surface/50 hover:bg-[#ef4444]/10 hover:border-[#ef4444]/20 text-foreground/50 hover:text-[#ef4444] transition-all duration-200 text-sm font-semibold"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        ) : (
          <div className="flex flex-col gap-2 items-center">
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-2 rounded-lg hover:bg-white/5 text-foreground/40 hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-lg border border-surface-border hover:bg-[#ef4444]/10 hover:text-[#ef4444] text-foreground/40 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
