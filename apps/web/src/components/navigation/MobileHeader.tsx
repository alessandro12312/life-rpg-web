"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  User,
  Shield,
  Flame,
  LogOut,
  Home,
  Swords,
  Clock,
  BookOpen,
  Trophy,
  History,
  PlusCircle,
} from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const navigationItems: NavigationItem[] = [
  { name: "Taverna", href: "/", icon: Home, color: "text-amber-500" },
  { name: "Arena", href: "/battle", icon: Swords, color: "text-red-500" },
  { name: "Sanctum", href: "/sanctum", icon: Clock, color: "text-accent" },
  { name: "Scrittoio", href: "/library", icon: BookOpen, color: "text-blue-400" },
  { name: "Grimorio", href: "/grimoire", icon: User, color: "text-purple-400" },
  { name: "Trofei", href: "/achievements", icon: Trophy, color: "text-primary" },
  { name: "Gilda", href: "/guild", icon: Shield, color: "text-amber-500" },
  { name: "Cronologia", href: "/history", icon: History, color: "text-emerald-400" },
];

export function MobileHeader() {
  const [isOpen, setIsOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);

  const {
    currentXP,
    xpToNextLevel,
    level,
    username,
    currentStreak,
    logout,
  } = usePlayerStore();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Close drawer on path change
  React.useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    router.push("/login");
  };

  const progressPercent = mounted ? (currentXP / xpToNextLevel) * 100 : 0;

  // Find active item to show title
  const activeItem = navigationItems.find((item) => item.href === pathname);
  const activeTitle = activeItem ? activeItem.name : "Life RPG";

  return (
    <>
      <header className="md:hidden h-16 w-full sticky top-0 bg-surface/80 backdrop-blur-md border-b border-surface-border z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-white/5 text-foreground/80 active:scale-95 transition-all"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <h1 className="font-bold text-md tracking-wide text-foreground/90 uppercase">
            {activeTitle}
          </h1>
        </div>

        <Link href="/" className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded bg-gradient-to-tr from-primary to-orange-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-black" />
          </div>
          <span className="text-xs font-black tracking-widest text-primary">LIFE RPG</span>
        </Link>
      </header>

      {/* Drawer Overlay & Content */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
            />

            {/* Main Drawer panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-[#09090b] border-r border-surface-border z-50 md:hidden flex flex-col h-full shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="h-16 flex items-center justify-between px-4 border-b border-surface-border/50 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-orange-600 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-black" />
                  </div>
                  <span className="font-bold text-sm tracking-widest text-foreground/90">LIFE RPG</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/5 text-foreground/60 hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Profile Status Card */}
              <div className="p-4 border-b border-surface-border/30 shrink-0">
                <div className="bg-surface/50 border border-surface-border/50 rounded-xl p-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent pointer-events-none" />
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 rounded-full bg-surface-border border border-primary/40 flex items-center justify-center overflow-hidden">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground/90">{mounted ? username : "Hero"}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-foreground/50">
                        <span className="text-primary font-bold">LVL {mounted ? level : "-"}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Flame className="w-3 h-3 text-orange-500" />
                          {mounted ? `${currentStreak}d streak` : "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 relative z-10">
                    <div className="flex justify-between text-[10px] text-foreground/40 font-mono mb-1">
                      <span>XP PROGRESS</span>
                      <span>
                        {mounted ? Math.floor(currentXP) : 0} / {mounted ? Math.floor(xpToNextLevel) : 1000}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-border rounded-full overflow-hidden">
                      <div
                        style={{ width: `${progressPercent}%` }}
                        className="h-full bg-gradient-to-r from-primary to-orange-500 rounded-full transition-[width] duration-500"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Global Quick Log Action Button */}
                <div className="mt-3">
                  <Link href="/log-activity" className="block">
                    <button
                      type="button"
                      className="w-full py-2.5 px-4 text-xs font-bold rounded-xl bg-gradient-to-r from-primary to-orange-500 hover:from-primary/95 hover:to-orange-500/95 text-black shadow-md shadow-primary/10 hover:shadow-primary/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <PlusCircle className="w-4 h-4 text-black" />
                      Registra Attività
                    </button>
                  </Link>
                </div>
              </div>

              {/* Navigation Items List */}
              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link key={item.href} href={item.href}>
                      <div
                        className={cn(
                          "flex items-center rounded-xl p-3.5 cursor-pointer transition-colors group",
                          isActive
                            ? "bg-primary/10 text-white font-medium border border-primary/20"
                            : "hover:bg-white/5 text-foreground/60 hover:text-foreground border border-transparent"
                        )}
                      >
                        <Icon className={cn("w-5 h-5 mr-3 transition-transform group-active:scale-95", item.color)} />
                        <span className="text-sm tracking-wide">{item.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>

              {/* Bottom Actions */}
              <div className="p-4 border-t border-surface-border/30 shrink-0">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-surface-border bg-surface/50 hover:bg-[#ef4444]/10 hover:border-[#ef4444]/20 text-[#ef4444] font-semibold text-sm transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
