"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { MobileHeader } from "./MobileHeader";
import { AnimationLayer } from "@/components/AnimationLayer";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid flash of unstyled content
  if (!mounted) {
    return <div className="min-h-screen bg-background text-foreground" />;
  }

  // Paths that do not show the unified navigation layout shell (Auth & Immersive Battle screen)
  const isExcludedRoute = 
    pathname === "/login" || 
    pathname === "/onboarding" || 
    /^\/battle\/[^/]+$/.test(pathname);

  if (isExcludedRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 bg-[#09090b] -z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-surface)/40,_var(--color-background)_80%)] -z-10 pointer-events-none" />

      {/* Global animation overlays */}
      <AnimationLayer />

      {/* Desktop Sidebar Navigation */}
      <Sidebar />

      {/* Mobile Navigation Header */}
      <MobileHeader />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scrollbar-thin scrollbar-thumb-surface-border scrollbar-track-transparent">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -15, filter: "blur(4px)" }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="max-w-5xl mx-auto w-full pb-12"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
