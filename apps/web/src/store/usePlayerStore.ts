import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PlayerStats {
    intelligence: number;
    strength: number;
    endurance: number;
    discipline: number;
    focus: number;
    knowledge: number;
    health: number;
}

interface PlayerState {
    level: number;
    currentXP: number;
    xpToNextLevel: number;
    stats: PlayerStats;
    userId: string | null;
    username: string | null;
    currentStreak: number;
    highestStreak: number;
    setAuth: (userId: string, username: string) => void;
    initStats: (
        level: number,
        currentXP: number,
        xpToNextLevel: number,
        stats?: PlayerStats,
        currentStreak?: number,
        highestStreak?: number
    ) => void;
    addXP: (amount: number) => void;
    resetStats: () => void;
    isOnboarded: boolean;
    completeOnboarding: () => void;
}

export const usePlayerStore = create<PlayerState>()(
    persist(
        (set) => ({
            level: 1,
            currentXP: 0,
            xpToNextLevel: 1000,
            stats: { intelligence: 1, strength: 1, endurance: 1, discipline: 1, focus: 1, knowledge: 1, health: 1 },
            userId: null,
            username: null,
            isOnboarded: false,
            currentStreak: 0,
            highestStreak: 0,

            setAuth: (userId: string, username: string) => set({ userId, username }),

            initStats: (
                level: number,
                currentXP: number,
                xpToNextLevel: number,
                stats?: PlayerStats,
                currentStreak?: number,
                highestStreak?: number
            ) =>
                set((state) => ({
                    level,
                    currentXP,
                    xpToNextLevel,
                    stats: stats || state.stats,
                    currentStreak: currentStreak ?? state.currentStreak,
                    highestStreak: highestStreak ?? state.highestStreak,
                })),

            addXP: (amount: number) => set((state) => {
                let newXp = state.currentXP + amount;
                let newLevel = state.level;
                let nextLevelXp = state.xpToNextLevel;

                while (newXp >= nextLevelXp) {
                    newXp -= nextLevelXp;
                    newLevel += 1;
                    nextLevelXp = Math.floor(1000 * Math.pow(newLevel, 1.5));
                }

                return { currentXP: newXp, level: newLevel, xpToNextLevel: nextLevelXp };
            }),

            resetStats: () => set({ level: 1, currentXP: 0, xpToNextLevel: 1000 }),

            completeOnboarding: () => set({ isOnboarded: true })
        }),
        {
            name: 'life-rpg-player-storage',
        }
    )
);
