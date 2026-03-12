import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PlayerState {
    level: number;
    currentXP: number;
    xpToNextLevel: number;
    addXP: (amount: number) => void;
    resetStats: () => void;
}

export const usePlayerStore = create<PlayerState>()(
    persist(
        (set) => ({
            level: 1,
            currentXP: 0,
            xpToNextLevel: 1000,

            addXP: (amount: number) => set((state) => {
                let newXp = state.currentXP + amount;
                let newLevel = state.level;
                let nextLevelXp = state.xpToNextLevel;

                // Level Up Logic: Recursively check if we have enough XP to level up
                while (newXp >= nextLevelXp) {
                    newXp -= nextLevelXp;
                    newLevel += 1;
                    // XP required for next level formula: 1000 * (Level ^ 1.5)
                    nextLevelXp = Math.floor(1000 * Math.pow(newLevel, 1.5));
                }

                return { currentXP: newXp, level: newLevel, xpToNextLevel: nextLevelXp };
            }),

            resetStats: () => set({ level: 1, currentXP: 0, xpToNextLevel: 1000 })
        }),
        {
            name: 'life-rpg-player-storage', // saves to local storage
        }
    )
);
