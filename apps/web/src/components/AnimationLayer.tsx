"use client";

import { useState, useEffect, useCallback } from "react";
import { useAnimationStore } from "@/store/useAnimationStore";
import { LevelUpOverlay } from "@/components/ui/LevelUpOverlay";
import { XPGainNotification } from "@/components/ui/XPGainNotification";

export function AnimationLayer() {
  const { pendingEvent, clearEvent } = useAnimationStore();
  const [showXP, setShowXP] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(useAnimationStore.getState().pendingEvent);

  useEffect(() => {
    if (!pendingEvent) return;
    setCurrentEvent(pendingEvent);
    setShowXP(true);

    if (pendingEvent.levelsGained > 0) {
      const timer = setTimeout(() => setShowLevelUp(true), 1400);
      return () => clearTimeout(timer);
    }
  }, [pendingEvent?.id]);

  const handleXPDone = useCallback(() => {
    setShowXP(false);
    if (!currentEvent || currentEvent.levelsGained <= 0) {
      clearEvent();
    }
  }, [currentEvent, clearEvent]);

  const handleLevelUpDismiss = useCallback(() => {
    setShowLevelUp(false);
    clearEvent();
  }, [clearEvent]);

  if (!currentEvent) return null;

  return (
    <>
      <XPGainNotification
        show={showXP}
        xpGained={currentEvent.xpGained}
        statGains={currentEvent.statGains}
        onDone={handleXPDone}
      />
      <LevelUpOverlay
        show={showLevelUp}
        oldLevel={currentEvent.oldLevel}
        newLevel={currentEvent.newLevel}
        onDismiss={handleLevelUpDismiss}
      />
    </>
  );
}
