import { create } from 'zustand';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BattleParticipant {
    id: string;
    userId: string;
    username: string;
    className: string;
    race: string;
    avatarId: string | null;
    maxHp: number;
    currentHp: number;
    atk: number;
    def: number;
    spd: number;
    mana: number;
    maxMana: number;
    isDefending: boolean;
    statusEffects: any[];
    turnOrder: number;
    xpEarned: number;
}

export interface BossState {
    id: string;
    name: string;
    description: string | null;
    type: string;
    tier: number;
    currentHp: number;
    maxHp: number;
    atk: number;
    def: number;
}

export interface BattleLogEntry {
    turnNumber: number;
    actorType: 'PLAYER' | 'BOSS';
    actorId: string | null;
    actionType: string;
    skillId: string | null;
    damageDealt: number;
    damageBlocked: number;
    healingDone: number;
    isCritical: boolean;
    isMiss: boolean;
    narrative: string;
    createdAt: string;
}

export interface TurnLogEntry {
    actorType: string;
    actionType: string;
    damageDealt: number;
    healingDone: number;
    isCritical: boolean;
    isMiss: boolean;
    narrative: string;
    damageBlocked: number;
}

export interface AvailableSkill {
    id: string;
    name: string;
    description: string;
    manaCost: number;
    cooldown: number;
    effectType: string;
}

export interface InventoryItem {
    itemId: string;
    name: string;
    description: string;
    quantity: number;
    effectType: string;
}

export interface AnimationEvent {
    id: string;
    type: 'PLAYER_ATTACK' | 'BOSS_ATTACK' | 'PLAYER_SKILL' | 'PLAYER_DEFEND'
        | 'PLAYER_ITEM' | 'DAMAGE_NUMBER' | 'HEAL_NUMBER' | 'SCREEN_SHAKE'
        | 'PHASE_TRANSITION' | 'VICTORY' | 'DEFEAT' | 'MISS';
    value?: number;
    target?: 'PLAYER' | 'BOSS';
    isCritical?: boolean;
    narrative?: string;
}

export interface BattleRewards {
    status: string;
    xpAwarded: number;
    bonusXp: number;
    lootDrops: Array<{ itemId: string; quantity: number }>;
}

// ─── Store ──────────────────────────────────────────────────────────────────

interface BattleState {
    // Core state
    battleId: string | null;
    status: 'IDLE' | 'WAITING' | 'ACTIVE' | 'VICTORY' | 'DEFEAT' | 'ABANDONED';
    mode: 'SOLO' | 'PARTY' | 'RAID' | null;

    // Boss
    boss: BossState | null;
    currentPhase: number;
    totalPhases: number;

    // Participants
    participants: BattleParticipant[];
    currentUserId: string | null;

    // Turn
    isPlayerTurn: boolean;
    turnNumber: number;
    activeParticipantId: string | null;

    // Animation queue
    animationQueue: AnimationEvent[];
    isAnimating: boolean;

    // Battle logs
    battleLogs: BattleLogEntry[];

    // Skills & Items
    availableSkills: AvailableSkill[];
    inventory: InventoryItem[];

    // Rewards
    rewards: BattleRewards | null;

    // Actions
    setBattleFromServer: (data: any, currentUserId: string) => void;
    processTurnResponse: (data: any) => void;
    addAnimationEvent: (event: AnimationEvent) => void;
    consumeAnimation: () => AnimationEvent | null;
    setAnimating: (value: boolean) => void;
    reset: () => void;
}

const initialState = {
    battleId: null,
    status: 'IDLE' as const,
    mode: null,
    boss: null,
    currentPhase: 1,
    totalPhases: 1,
    participants: [],
    currentUserId: null,
    isPlayerTurn: false,
    turnNumber: 1,
    activeParticipantId: null,
    animationQueue: [],
    isAnimating: false,
    battleLogs: [],
    availableSkills: [],
    inventory: [],
    rewards: null,
};

export const useBattleStore = create<BattleState>()((set, get) => ({
    ...initialState,

    setBattleFromServer: (data: any, currentUserId: string) => {
        const state = get();
        const newLogs = data.logs || [];
        const oldLogs = state.battleLogs;

        // If the battle ID is the same, we check for new logs to animate
        const queue: AnimationEvent[] = [];
        if (state.battleId === data.battle.id && oldLogs.length > 0 && newLogs.length > oldLogs.length) {
            // Find logs that are in newLogs but not in oldLogs
            // Since logs are sorted by createdAt descending, newLogs[0] is the latest log.
            // We use the unique combination of createdAt and narrative to identify seen logs.
            const oldLogKeys = new Set(oldLogs.map((l: any) => `${l.createdAt || l.created_at}_${l.narrative}`));
            const freshLogs = newLogs.filter((l: any) => !oldLogKeys.has(`${l.createdAt || l.created_at}_${l.narrative}`));

            // Reverse freshLogs so they are animated in chronological order (oldest of the new logs first)
            freshLogs.reverse();

            for (const log of freshLogs) {
                const eventId = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

                // We only animate actions taken by other players or the boss,
                // because our own actions were already animated via submitAction / processTurnResponse.
                const isMyAction = log.actorType === 'PLAYER' && log.actorId === currentUserId;

                if (!isMyAction) {
                    if (log.actionType === 'ATTACK') {
                        queue.push({ id: eventId + '_atk', type: 'PLAYER_ATTACK', target: 'BOSS' });
                        if (log.isMiss) {
                            queue.push({ id: eventId + '_miss', type: 'MISS', target: 'BOSS', narrative: log.narrative });
                        } else {
                            queue.push({
                                id: eventId + '_dmg', type: 'DAMAGE_NUMBER',
                                value: log.damageDealt, target: 'BOSS', isCritical: log.isCritical,
                            });
                            if (log.isCritical) {
                                queue.push({ id: eventId + '_shake', type: 'SCREEN_SHAKE' });
                            }
                        }
                    } else if (log.actionType === 'SKILL') {
                        queue.push({ id: eventId + '_skill', type: 'PLAYER_SKILL', target: 'BOSS' });
                        if (log.damageDealt > 0) {
                            queue.push({
                                id: eventId + '_dmg', type: 'DAMAGE_NUMBER',
                                value: log.damageDealt, target: 'BOSS', isCritical: log.isCritical,
                            });
                        }
                        if (log.healingDone > 0) {
                            queue.push({
                                id: eventId + '_heal', type: 'HEAL_NUMBER',
                                value: log.healingDone, target: 'PLAYER',
                            });
                        }
                    } else if (log.actionType === 'DEFEND') {
                        queue.push({ id: eventId + '_def', type: 'PLAYER_DEFEND' });
                    } else if (log.actionType === 'ITEM') {
                        queue.push({ id: eventId + '_item', type: 'PLAYER_ITEM' });
                        if (log.healingDone > 0) {
                            queue.push({
                                id: eventId + '_heal', type: 'HEAL_NUMBER',
                                value: log.healingDone, target: 'PLAYER',
                            });
                        }
                        if (log.damageDealt > 0) {
                            queue.push({
                                id: eventId + '_dmg', type: 'DAMAGE_NUMBER',
                                value: log.damageDealt, target: 'BOSS',
                            });
                        }
                    } else if (log.actionType === 'BOSS_ATTACK' || log.actionType === 'BOSS_SKILL') {
                        if (log.narrative?.includes('Fase')) {
                            queue.push({ id: eventId + '_phase', type: 'PHASE_TRANSITION', narrative: log.narrative });
                        } else if (log.narrative?.includes('Vittoria')) {
                            queue.push({ id: eventId + '_victory', type: 'VICTORY', narrative: log.narrative });
                        } else if (log.narrative?.includes('sconfitto')) {
                            queue.push({ id: eventId + '_defeat', type: 'DEFEAT', narrative: log.narrative });
                        } else if (log.damageDealt > 0) {
                            queue.push({ id: eventId + '_boss_atk', type: 'BOSS_ATTACK', target: 'PLAYER' });
                            queue.push({
                                id: eventId + '_boss_dmg', type: 'DAMAGE_NUMBER',
                                value: log.damageDealt, target: 'PLAYER',
                            });
                            queue.push({ id: eventId + '_shake', type: 'SCREEN_SHAKE' });
                        }
                    }
                }
            }
        }

        set({
            battleId: data.battle.id,
            status: data.battle.status.toUpperCase(),
            mode: data.battle.mode,
            boss: data.boss,
            currentPhase: data.battle.currentPhase,
            totalPhases: data.battle.totalPhases,
            participants: data.participants,
            currentUserId,
            isPlayerTurn: data.battle.activeParticipantId === currentUserId,
            turnNumber: data.battle.currentTurn,
            activeParticipantId: data.battle.activeParticipantId,
            battleLogs: newLogs,
            availableSkills: data.availableSkills || [],
            inventory: data.inventory || [],
            animationQueue: [...state.animationQueue, ...queue],
        });
    },

    processTurnResponse: (data: any) => {
        const state = get();
        const queue: AnimationEvent[] = [];

        // Process turn logs into animation events
        if (data.turnLogs) {
            for (const log of data.turnLogs) {
                const eventId = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

                if (log.actorType === 'PLAYER') {
                    switch (log.actionType) {
                        case 'ATTACK':
                            queue.push({ id: eventId + '_atk', type: 'PLAYER_ATTACK', target: 'BOSS' });
                            if (log.isMiss) {
                                queue.push({ id: eventId + '_miss', type: 'MISS', target: 'BOSS', narrative: log.narrative });
                            } else {
                                queue.push({
                                    id: eventId + '_dmg', type: 'DAMAGE_NUMBER',
                                    value: log.damageDealt, target: 'BOSS', isCritical: log.isCritical,
                                });
                                if (log.isCritical) {
                                    queue.push({ id: eventId + '_shake', type: 'SCREEN_SHAKE' });
                                }
                            }
                            break;
                        case 'SKILL':
                            queue.push({ id: eventId + '_skill', type: 'PLAYER_SKILL', target: 'BOSS' });
                            if (log.damageDealt > 0) {
                                queue.push({
                                    id: eventId + '_dmg', type: 'DAMAGE_NUMBER',
                                    value: log.damageDealt, target: 'BOSS', isCritical: log.isCritical,
                                });
                            }
                            if (log.healingDone > 0) {
                                queue.push({
                                    id: eventId + '_heal', type: 'HEAL_NUMBER',
                                    value: log.healingDone, target: 'PLAYER',
                                });
                            }
                            break;
                        case 'DEFEND':
                            queue.push({ id: eventId + '_def', type: 'PLAYER_DEFEND' });
                            break;
                        case 'ITEM':
                            queue.push({ id: eventId + '_item', type: 'PLAYER_ITEM' });
                            if (log.healingDone > 0) {
                                queue.push({
                                    id: eventId + '_heal', type: 'HEAL_NUMBER',
                                    value: log.healingDone, target: 'PLAYER',
                                });
                            }
                            if (log.damageDealt > 0) {
                                queue.push({
                                    id: eventId + '_dmg', type: 'DAMAGE_NUMBER',
                                    value: log.damageDealt, target: 'BOSS',
                                });
                            }
                            break;
                    }
                } else if (log.actorType === 'BOSS') {
                    if (log.actionType === 'BOSS_ATTACK' || log.actionType === 'BOSS_SKILL') {
                        // Check for phase transitions/victory/defeat narratives
                        if (log.narrative?.includes('Fase')) {
                            queue.push({ id: eventId + '_phase', type: 'PHASE_TRANSITION', narrative: log.narrative });
                        } else if (log.narrative?.includes('Vittoria')) {
                            queue.push({ id: eventId + '_victory', type: 'VICTORY', narrative: log.narrative });
                        } else if (log.narrative?.includes('sconfitto')) {
                            queue.push({ id: eventId + '_defeat', type: 'DEFEAT', narrative: log.narrative });
                        } else if (log.damageDealt > 0) {
                            queue.push({ id: eventId + '_boss_atk', type: 'BOSS_ATTACK', target: 'PLAYER' });
                            queue.push({
                                id: eventId + '_boss_dmg', type: 'DAMAGE_NUMBER',
                                value: log.damageDealt, target: 'PLAYER',
                            });
                            queue.push({ id: eventId + '_shake', type: 'SCREEN_SHAKE' });
                        }
                    }
                }
            }
        }

        // Update state
        set({
            battleId: data.battle.id,
            status: data.battle.status.toUpperCase(),
            mode: data.battle.mode,
            boss: data.boss,
            currentPhase: data.battle.currentPhase,
            totalPhases: data.battle.totalPhases,
            participants: data.participants,
            isPlayerTurn: data.battle.activeParticipantId === state.currentUserId,
            turnNumber: data.battle.currentTurn,
            activeParticipantId: data.battle.activeParticipantId,
            battleLogs: data.logs || [],
            availableSkills: data.availableSkills || [],
            inventory: data.inventory || [],
            animationQueue: [...state.animationQueue, ...queue],
            rewards: data.rewards || null,
        });
    },

    addAnimationEvent: (event: AnimationEvent) => {
        set(state => ({ animationQueue: [...state.animationQueue, event] }));
    },

    consumeAnimation: () => {
        const state = get();
        if (state.animationQueue.length === 0) return null;
        const [next, ...rest] = state.animationQueue;
        set({ animationQueue: rest });
        return next;
    },

    setAnimating: (value: boolean) => set({ isAnimating: value }),

    reset: () => set(initialState),
}));
