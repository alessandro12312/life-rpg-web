import { create } from 'zustand';

export interface ActivityAnimationEvent {
  id: string;
  xpGained: number;
  levelsGained: number;
  oldLevel: number;
  newLevel: number;
  statGains: Record<string, number>;
}

interface AnimationState {
  pendingEvent: ActivityAnimationEvent | null;
  triggerActivity: (event: Omit<ActivityAnimationEvent, 'id'>) => void;
  clearEvent: () => void;
}

export const useAnimationStore = create<AnimationState>((set) => ({
  pendingEvent: null,
  triggerActivity: (event) =>
    set({ pendingEvent: { ...event, id: Date.now().toString() } }),
  clearEvent: () => set({ pendingEvent: null }),
}));
