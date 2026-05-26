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
    statPoints: number;
    setAuth: (userId: string, username: string) => void;
    initStats: (
        level: number,
        currentXP: number,
        xpToNextLevel: number,
        stats?: PlayerStats,
        currentStreak?: number,
        highestStreak?: number,
        statPoints?: number
    ) => void;
    addXP: (amount: number) => void;
    resetStats: () => void;
    isOnboarded: boolean;
    completeOnboarding: () => void;
    logout: () => void;
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
            statPoints: 0,

            setAuth: (userId: string, username: string) => set({ userId, username }),

            initStats: (
                level: number,
                currentXP: number,
                xpToNextLevel: number,
                stats?: PlayerStats,
                currentStreak?: number,
                highestStreak?: number,
                statPoints?: number
            ) =>
                set((state) => ({
                    level,
                    currentXP,
                    xpToNextLevel,
                    stats: stats || state.stats,
                    currentStreak: currentStreak ?? state.currentStreak,
                    highestStreak: highestStreak ?? state.highestStreak,
                    statPoints: statPoints ?? state.statPoints,
                })),

            addXP: (amount: number) => set((state) => {
                let newXp = state.currentXP + amount;
                let newLevel = state.level;
                let nextLevelXp = state.xpToNextLevel;
                let levelsGained = 0;

                while (newXp >= nextLevelXp) {
                    newXp -= nextLevelXp;
                    newLevel += 1;
                    levelsGained += 1;
                    nextLevelXp = Math.floor(100 * Math.pow(newLevel, 1.15) + 900);
                }

                return { 
                    currentXP: newXp, 
                    level: newLevel, 
                    xpToNextLevel: nextLevelXp,
                    statPoints: state.statPoints + (levelsGained * 5)
                };
            }),

            resetStats: () => set({ level: 1, currentXP: 0, xpToNextLevel: 1000, statPoints: 0 }),

            completeOnboarding: () => set({ isOnboarded: true }),

            logout: () => set({ 
                level: 1, currentXP: 0, xpToNextLevel: 1000, 
                stats: { intelligence: 1, strength: 1, endurance: 1, discipline: 1, focus: 1, knowledge: 1, health: 1 },
                userId: null, username: null, isOnboarded: false, currentStreak: 0, highestStreak: 0, statPoints: 0
            })
        }),
        {
            name: 'life-rpg-player-storage',
        }
    )
);
